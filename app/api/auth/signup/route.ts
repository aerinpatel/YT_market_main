import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { getChannelByHandle } from '@/lib/youtube';
import { computeValuationFromStats } from '@/lib/scoreEngine';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, channelHandle, name, channelName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists. Please log in.' }, { status: 409 });
    }

    const isCreator = role === 'CREATOR';
    let channelInfo = null;
    let valuation = null;

    if (isCreator) {
      if (!channelHandle || !channelHandle.trim()) {
        return NextResponse.json({ error: 'YouTube channel handle or URL is required for Creator accounts (e.g. @MrBeast)' }, { status: 400 });
      }

      // Fast direct YouTube channel details fetch
      channelInfo = await getChannelByHandle(channelHandle);
      if (!channelInfo) {
        return NextResponse.json({ 
          error: `Could not verify YouTube channel for "${channelHandle}". Please check the handle or URL.` 
        }, { status: 400 });
      }

      // Check if YouTube channel ID is already linked to another creator
      const existingCreatorWithChannel = await prisma.creator.findUnique({
        where: { youtubeChannelId: channelInfo.channelId },
      });

      if (existingCreatorWithChannel) {
        return NextResponse.json({ 
          error: `The YouTube channel "${channelInfo.channelName}" is already registered on Creatr Exchange. Please sign in or use another channel.` 
        }, { status: 409 });
      }

      // Compute initial suggested score and IPO price
      valuation = computeValuationFromStats(channelInfo);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and creator profile atomically
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: isCreator ? 'CREATOR' : 'INVESTOR',
        },
      });

      let creatorProfile = null;
      if (isCreator && channelInfo && valuation) {
        const floatCount = Math.floor(valuation.defaultShares * (valuation.defaultFloatPercent / 100));
        const ownerCount = valuation.defaultShares - floatCount;

        creatorProfile = await tx.creator.create({
          data: {
            userId: newUser.id,
            channelName: name || channelName || channelInfo.channelName,
            youtubeChannelId: channelInfo.channelId,
            totalShares: BigInt(valuation.defaultShares),
            floatShares: BigInt(floatCount),
            ownerShares: BigInt(ownerCount),
            ipoStatus: 'PENDING',
            ipoPrice: valuation.suggestedPrice,
          },
        });

        // Save initial creator score snapshot
        await tx.creatorScore.create({
          data: {
            creatorId: creatorProfile.id,
            subscribers: BigInt(valuation.subscribers),
            totalViews: BigInt(valuation.totalViews),
            totalLikes: BigInt(0),
            totalComments: BigInt(0),
            videoCount: valuation.videoCount,
            uploadConsistency: 0.95,
            computedScore: valuation.computedScore,
          }
        });
      }

      return {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        walletBalance: newUser.walletBalance.toString(),
        creatorProfile: creatorProfile ? {
          id: creatorProfile.id,
          channelName: creatorProfile.channelName,
          youtubeChannelId: creatorProfile.youtubeChannelId,
          ipoStatus: creatorProfile.ipoStatus,
          suggestedPrice: valuation?.suggestedPrice,
          suggestedValuation: valuation?.suggestedValuation,
        } : undefined,
      };
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    const token = signToken({ userId: user.id, role: user.role });

    const response = NextResponse.json(
      { message: 'Signup successful', user },
      { status: 201 }
    );

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
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
