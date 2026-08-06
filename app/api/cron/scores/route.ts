import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateCreatorScore } from '@/lib/scoreEngine';

export const dynamic = 'force-dynamic';

// Ideally this endpoint should be protected with a secret header (e.g., from Vercel Cron)
export async function GET(req: Request) {
  // Authentication: In production, verify auth header matches CRON_SECRET
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });

  try {
    const activeCreators = await prisma.creator.findMany({
      where: { ipoStatus: 'LISTED' },
    });

    for (const creator of activeCreators) {
      await calculateCreatorScore(creator.id, creator.youtubeChannelId);
    }

    return NextResponse.json({ success: true, processed: activeCreators.length });
  } catch (error) {
    console.error('Score cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
