import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreatorOptionsClient from './CreatorOptionsClient';

export default async function CreatorOptionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    redirect('/login');
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'CREATOR') {
    redirect('/market');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      creatorProfile: {
        include: {
          scores: {
            orderBy: { recordedAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  const latestScore = user.creatorProfile?.scores[0];

  const creatorProfile = user.creatorProfile ? {
    id: user.creatorProfile.id,
    channelName: user.creatorProfile.channelName,
    youtubeChannelId: user.creatorProfile.youtubeChannelId,
    ipoStatus: user.creatorProfile.ipoStatus,
    ipoPrice: user.creatorProfile.ipoPrice?.toNumber() || 0,
    totalShares: user.creatorProfile.totalShares.toString(),
    floatShares: user.creatorProfile.floatShares.toString(),
    ownerShares: user.creatorProfile.ownerShares.toString(),
    latestScore: latestScore ? {
      subscribers: latestScore.subscribers.toString(),
      totalViews: latestScore.totalViews.toString(),
      videoCount: latestScore.videoCount,
      computedScore: latestScore.computedScore,
    } : null,
  } : null;

  return <CreatorOptionsClient creatorProfile={creatorProfile} />;
}
