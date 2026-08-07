import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const creators = await prisma.creator.findMany({
      where: { ipoStatus: 'LISTED' },
      select: {
        id: true,
        channelName: true,
        ipoPrice: true,
        totalShares: true,
        floatShares: true,
        listedAt: true,
        scores: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        },
        trades: {
          orderBy: [
            { executedAt: 'desc' },
            { id: 'desc' }
          ],
          take: 1
        }
      }
    });

    // Handle BigInt serialization & last traded currentPrice
    const serializedCreators = creators.map(c => {
      const latestTrade = c.trades[0];
      const currentPrice = latestTrade ? latestTrade.price.toNumber() : (c.ipoPrice?.toNumber() || 0);

      return {
        ...c,
        currentPrice,
        totalShares: c.totalShares.toString(),
        floatShares: c.floatShares.toString(),
      };
    });

    return NextResponse.json({ creators: serializedCreators }, { status: 200 });
  } catch (error) {
    console.error('Fetch creators error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
