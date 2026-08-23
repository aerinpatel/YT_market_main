import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { matchingEngine } from '@/lib/engine/MatchingEngine';
import { OrderSide, OrderType, Order as EngineOrder } from '@/lib/engine/types';
import { processTrades, processSTPCancellations } from '@/lib/engine/reconciliation';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, side, type, price, quantity } = await req.json();

    if (!creatorId || !side || !type || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid order parameters' }, { status: 400 });
    }

    if (type === 'LIMIT' && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Limit orders require a valid price' }, { status: 400 });
    }

    if (type === 'MARKET' && side === 'BUY') {
      return NextResponse.json({ error: 'Market buys are temporarily disabled in v1 to protect wallet balances. Please use a Limit Buy.' }, { status: 400 });
    }

    // Escrow logic
    let dbOrder: any;

    await prisma.$transaction(async (tx) => {
      let isCreatorAction = false;
      
      if (side === 'BUY') {
        // Position Limit Enforcement (Cap at 5% of float)
        const MAX_POSITION_FLOAT_PERCENT = 0.05;
        const creator = await tx.creator.findUnique({ where: { id: creatorId } });
        
        if (!creator) {
          throw new Error('Creator not found. Ensure you are passing a valid creatorId from the IPO response.');
        }

        const isBuyback = creator.userId === payload.userId;
        isCreatorAction = isBuyback;

        if (!isBuyback) {
          const holding = await tx.holding.findUnique({ where: { userId_creatorId: { userId: payload.userId, creatorId } } });
          const currentQty = Number(holding?.quantity || 0);
          if ((currentQty + Number(quantity)) > (Number(creator.floatShares) * MAX_POSITION_FLOAT_PERCENT)) {
            throw new Error(`Position limit exceeded. You cannot hold more than ${MAX_POSITION_FLOAT_PERCENT * 100}% of the float.`);
          }
        }

        // Escrow Wallet Balance
        const totalCost = Number(price) * Number(quantity);
        const user = await tx.user.findUnique({ where: { id: payload.userId } });

        if (!user || Number(user.walletBalance) < totalCost) {
          throw new Error('Insufficient wallet balance');
        }

        await tx.user.update({
          where: { id: payload.userId },
          data: { walletBalance: { decrement: totalCost } },
        });

      } else {
        // Escrow Shares
        const creator = await tx.creator.findUnique({ where: { id: creatorId } });
        if (creator?.userId === payload.userId) {
          isCreatorAction = true; // Flag liquidations/float dumping
        }

        const holding = await tx.holding.findUnique({
          where: { userId_creatorId: { userId: payload.userId, creatorId } },
        });

        if (!holding || Number(holding.quantity) < Number(quantity)) {
          throw new Error('Insufficient shares to sell');
        }

        await tx.holding.update({
          where: { id: holding.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      // Create Order in DB
      dbOrder = await tx.order.create({
        data: {
          userId: payload.userId,
          creatorId,
          side: side as any,
          type: type as any,
          price: type === 'LIMIT' ? price : null,
          quantity: BigInt(quantity),
          remainingQuantity: BigInt(quantity),
          status: 'OPEN',
          isCreatorAction: isCreatorAction,
        },
      });
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    if (!dbOrder) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Send to In-Memory Matching Engine
    const engineOrder: EngineOrder = {
      id: dbOrder.id,
      userId: dbOrder.userId,
      creatorId: dbOrder.creatorId,
      side: side as OrderSide,
      type: type as OrderType,
      price: type === 'LIMIT' ? Number(price) : null,
      quantity: Number(quantity),
      remainingQuantity: Number(quantity),
      isCreatorAction: dbOrder.isCreatorAction,
      createdAt: dbOrder.createdAt.getTime(),
    };

    const { trades, stpCancelledOrders } = await matchingEngine.placeOrder(engineOrder);

    // Process STP Cancellations (Release DB Escrow & Mark CANCELLED)
    if (stpCancelledOrders && stpCancelledOrders.length > 0) {
      try {
        await processSTPCancellations(stpCancelledOrders);
      } catch (stpError) {
        console.error('Critical Error processing STP cancellations:', stpError);
      }
    }

    // Process Executed Trades (Ledger Reconciliation)
    if (trades.length > 0) {
      try {
        await processTrades(trades, engineOrder.price);
      } catch (tradeError) {
        console.error('Critical Error processing trades:', tradeError);
      }
    }

    return NextResponse.json({ 
      message: stpCancelledOrders.length > 0
        ? `Order placed. Self-Trade Prevention: ${stpCancelledOrders.length} resting order(s) cancelled and refunded.`
        : 'Order placed', 
      orderId: dbOrder.id, 
      executedTrades: trades.length,
      stpCancelled: stpCancelledOrders.length
    }, { status: 201 });

  } catch (error: any) {
    if (error.message && (
      error.message.includes('Insufficient') || 
      error.message.includes('Position limit exceeded') || 
      error.message.includes('Creator not found') ||
      error.message.includes('Limit orders require') ||
      error.message.includes('Invalid order')
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Order placement error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

