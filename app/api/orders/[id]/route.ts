import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { matchingEngine } from '@/lib/engine/MatchingEngine';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: orderId } = await params;

    // 1. Fetch order
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId !== payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (order.status !== 'OPEN' && order.status !== 'PARTIAL') {
      return NextResponse.json({ error: 'Cannot cancel a closed order' }, { status: 400 });
    }

    // 2. Cancel in Engine (O(1) Lazy Tombstone)
    const wasInEngine = matchingEngine.cancelOrder(order.creatorId, order.id);

    // 3. Release Escrow in DB
    await prisma.$transaction(async (tx) => {
      // Re-fetch to ensure we have latest remainingQuantity locked in transaction
      const lockedOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (!lockedOrder || (lockedOrder.status !== 'OPEN' && lockedOrder.status !== 'PARTIAL')) {
        throw new Error('Order state changed');
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      if (lockedOrder.side === 'BUY') {
        const refundAmount = Number(lockedOrder.remainingQuantity) * Number(lockedOrder.price || 0);
        await tx.user.update({
          where: { id: lockedOrder.userId },
          data: { walletBalance: { increment: refundAmount } }
        });
      } else {
        const holding = await tx.holding.findUnique({
          where: { userId_creatorId: { userId: lockedOrder.userId, creatorId: lockedOrder.creatorId } }
        });
        
        if (holding) {
          await tx.holding.update({
            where: { id: holding.id },
            data: { quantity: { increment: lockedOrder.remainingQuantity } }
          });
        }
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return NextResponse.json({ message: 'Order cancelled and escrow released successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
