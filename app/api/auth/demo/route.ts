import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();
    const isCreator = role === 'CREATOR';
    const email = isCreator ? 'demo_creator@creatr.io' : 'demo_investor@creatr.io';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Find or auto-seed demo account
    let user = await prisma.user.findUnique({
      where: { email },
      include: { creatorProfile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: isCreator ? 'CREATOR' : 'INVESTOR',
          walletBalance: isCreator ? 5000 : 25000,
        },
        include: { creatorProfile: true },
      });
    }

    if (isCreator && !user.creatorProfile) {
      const creatorProfile = await prisma.creator.create({
        data: {
          userId: user.id,
          channelName: 'Veritasium Demo Channel',
          youtubeChannelId: 'UCHnyfMqiRRG1u-2MsSQLbXA_demo',
          totalShares: BigInt(10000),
          floatShares: BigInt(2000),
          ownerShares: BigInt(8000),
          ipoPrice: 2.50,
          ipoStatus: 'PENDING',
        }
      });

      await prisma.creatorScore.create({
        data: {
          creatorId: creatorProfile.id,
          subscribers: BigInt(16000000),
          totalViews: BigInt(2500000000),
          totalLikes: BigInt(0),
          totalComments: BigInt(0),
          videoCount: 420,
          uploadConsistency: 0.95,
          computedScore: 33000000,
        }
      });
    }

    const token = signToken({ userId: user.id, role: user.role });

    const response = NextResponse.json({
      message: 'Demo login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance.toString(),
      },
      redirectUrl: isCreator ? '/creator-options' : '/market',
    }, { status: 200 });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
