import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        creatorProfile: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Exclude passwordHash and serialize types cleanly
    const safeUser: any = {
      id: user.id,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance.toString(),
      createdAt: user.createdAt.toISOString(),
      creatorProfile: user.creatorProfile ? {
        id: user.creatorProfile.id,
        channelName: user.creatorProfile.channelName,
        youtubeChannelId: user.creatorProfile.youtubeChannelId,
        totalShares: user.creatorProfile.totalShares.toString(),
        floatShares: user.creatorProfile.floatShares.toString(),
        ownerShares: user.creatorProfile.ownerShares.toString(),
        ipoStatus: user.creatorProfile.ipoStatus,
        ipoPrice: user.creatorProfile.ipoPrice ? user.creatorProfile.ipoPrice.toNumber() : null,
        listedAt: user.creatorProfile.listedAt ? user.creatorProfile.listedAt.toISOString() : null,
      } : null,
    };

    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
