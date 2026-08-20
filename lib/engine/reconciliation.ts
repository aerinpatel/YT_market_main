import { prisma } from '@/lib/prisma';
import { Trade, Order } from './types';

export async function processSTPCancellations(cancelledOrders: Order[]) {
  for (const order of cancelledOrders) {
    await prisma.$transaction(async (tx) => {
      const dbOrder = await tx.order.findUnique({ where: { id: order.id } });
      if (!dbOrder || dbOrder.status === 'CANCELLED' || dbOrder.status === 'FILLED') return;

      // 1. Mark as CANCELLED in DB
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
      });

      // 2. Refund locked escrow funds / shares
      if (dbOrder.side === 'BUY') {
        const refundAmount = Number(dbOrder.remainingQuantity) * Number(dbOrder.price || 0);
        if (refundAmount > 0) {
          await tx.user.update({
            where: { id: dbOrder.userId },
            data: { walletBalance: { increment: refundAmount } }
          });
        }
      } else {
        const holding = await tx.holding.findUnique({
          where: { userId_creatorId: { userId: dbOrder.userId, creatorId: dbOrder.creatorId } }
        });
        if (holding) {
          await tx.holding.update({
            where: { id: holding.id },
            data: { quantity: { increment: dbOrder.remainingQuantity } }
          });
        }
      }
    }, {
      maxWait: 15000,
      timeout: 30000
    });
  }
}

export async function processTrades(trades: Trade[], originalBuyLimitPrice: number | null = null) {
  for (const trade of trades) {
    await prisma.$transaction(async (tx) => {
      // 1. Record Trade
      const dbTrade = await tx.trade.create({
        data: {
          creatorId: trade.creatorId,
          buyOrderId: trade.buyOrderId,
          sellOrderId: trade.sellOrderId,
          price: trade.price,
          quantity: BigInt(trade.quantity),
          executedAt: new Date(trade.executedAt),
        }
      });

      // 2. Update Buyer (Gets shares, potential refund)
      const existingBuyerHolding = await tx.holding.findUnique({
        where: { userId_creatorId: { userId: trade.buyerId, creatorId: trade.creatorId } }
      });
      
      const prevQty = Number(existingBuyerHolding?.quantity || 0);
      const prevAvgPrice = Number(existingBuyerHolding?.avgBuyPrice || 0);
      
      const newTotalQty = prevQty + trade.quantity;
      const newAvgPrice = ((prevQty * prevAvgPrice) + (trade.quantity * trade.price)) / newTotalQty;
      
      const lowest = Math.min(Number(existingBuyerHolding?.lowestBuyPrice || trade.price), trade.price);
      const highest = Math.max(Number(existingBuyerHolding?.highestBuyPrice || trade.price), trade.price);

      await tx.holding.upsert({
        where: { userId_creatorId: { userId: trade.buyerId, creatorId: trade.creatorId } },
        update: { 
          quantity: { increment: trade.quantity },
          avgBuyPrice: newAvgPrice,
          lowestBuyPrice: lowest,
          highestBuyPrice: highest
        },
        create: { 
          userId: trade.buyerId, 
          creatorId: trade.creatorId, 
          quantity: BigInt(trade.quantity),
          avgBuyPrice: newAvgPrice,
          lowestBuyPrice: lowest,
          highestBuyPrice: highest
        },
      });

      // Fetch buy order to determine exact limit price
      const buyOrder = await tx.order.findUnique({ where: { id: trade.buyOrderId } });
      const buyLimit = buyOrder?.price ? Number(buyOrder.price) : originalBuyLimitPrice;

      if (buyLimit !== null && trade.price < buyLimit) {
        // Refund the price improvement difference
        const refund = (buyLimit - trade.price) * trade.quantity;
        if (refund > 0) {
          await tx.user.update({
            where: { id: trade.buyerId },
            data: { walletBalance: { increment: refund } },
          });
        }
      }

      // 3. Update Seller (Gets cash, realizes PnL)
      const existingSellerHolding = await tx.holding.findUnique({
        where: { userId_creatorId: { userId: trade.sellerId, creatorId: trade.creatorId } }
      });
      
      const sellerAvgBuyPrice = Number(existingSellerHolding?.avgBuyPrice || 0);
      const realizedPnL = (trade.price - sellerAvgBuyPrice) * trade.quantity;
      
      const cashEarned = trade.price * trade.quantity;
      await tx.user.update({
        where: { id: trade.sellerId },
        data: { walletBalance: { increment: cashEarned } },
      });
      
      if (existingSellerHolding) {
        await tx.realizedPnL.create({
          data: {
            userId: trade.sellerId,
            creatorId: trade.creatorId,
            holdingId: existingSellerHolding.id,
            tradeId: dbTrade.id,
            avgCostAtSale: sellerAvgBuyPrice,
            sellPrice: trade.price,
            quantity: BigInt(trade.quantity),
            pnl: realizedPnL,
          }
        });
      }

      // 4. Update Order Statuses
      for (const orderId of [trade.buyOrderId, trade.sellOrderId]) {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (order) {
          const newRemaining = Number(order.remainingQuantity) - trade.quantity;
          await tx.order.update({
            where: { id: orderId },
            data: {
              remainingQuantity: BigInt(newRemaining),
              status: newRemaining === 0 ? 'FILLED' : 'PARTIAL',
            }
          });
        }
      }
    }, {
      maxWait: 15000, 
      timeout: 30000 
    });
  }
}
