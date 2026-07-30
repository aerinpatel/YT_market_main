import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        creatorProfile: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email. Please check your email or sign up.' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid password. Please try again.' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });

    const response = NextResponse.json(
      { 
        message: 'Signin successful', 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          walletBalance: user.walletBalance.toString(),
          creatorProfile: user.creatorProfile ? {
            id: user.creatorProfile.id,
            channelName: user.creatorProfile.channelName,
            youtubeChannelId: user.creatorProfile.youtubeChannelId,
            ipoStatus: user.creatorProfile.ipoStatus,
          } : undefined
        } 
      },
      { status: 200 }
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
    console.error('Signin error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
