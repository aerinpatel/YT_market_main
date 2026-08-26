import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { walletBalance: true }
    });

    const holdings = await prisma.holding.findMany({
      where: { userId: payload.userId, quantity: { gt: 0 } },
      include: {
        creator: {
          select: {
            channelName: true,
            ipoPrice: true,
            scores: { orderBy: { recordedAt: 'desc' }, take: 1 }
          }
        }
      }
    });

    const realizedPnls = await prisma.realizedPnL.findMany({
      where: { userId: payload.userId },
      orderBy: { realizedAt: 'desc' }
    });

    const serializedHoldings = holdings.map(h => {
      const currentPrice = Number(h.creator.scores[0]?.computedScore || h.creator.ipoPrice || 0);
      const avgCost = Number(h.avgBuyPrice);
      const qty = Number(h.quantity);
      
      const unrealizedPnL = (currentPrice - avgCost) * qty;

      return {
        id: h.id,
        creatorId: h.creatorId,
        channelName: h.creator.channelName,
        quantity: qty,
        avgBuyPrice: avgCost,
        lowestBuyPrice: Number(h.lowestBuyPrice),
        highestBuyPrice: Number(h.highestBuyPrice),
        currentPrice,
        unrealizedPnL,
      };
    });

    const serializedPnLs = realizedPnls.map(p => ({
      id: p.id,
      creatorId: p.creatorId,
      amount: Number(p.pnl),
      realizedAt: p.realizedAt
    }));

    return NextResponse.json({ 
      walletBalance: Number(user?.walletBalance || 0),
      holdings: serializedHoldings,
      realizedPnL: serializedPnLs
    }, { status: 200 });

  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
