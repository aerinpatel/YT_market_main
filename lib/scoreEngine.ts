import { prisma } from './prisma';
import { getChannelStats, YouTubeStats } from './youtube';

export interface ValuationResult {
  computedScore: number;
  suggestedValuation: number;
  suggestedPrice: number;
  defaultShares: number;
  defaultFloatPercent: number;
  subscribers: number;
  totalViews: number;
  videoCount: number;
}

/**
 * Calculates a simple, transparent fundamental score & suggested IPO share price.
 *
 * Formula:
 * 1. Base Score = (Subs * 0.50) + (Views * 0.01) + (Videos * 50)
 *    - Subs ($0.50/sub): Long-term audience reach & community brand equity.
 *    - Views ($0.01/view): Estimated historical AdSense cash-generation power ($10 RPM).
 *    - Videos ($50/video): Value of the evergreen back-catalog library.
 *
 * 2. Suggested Valuation = Math.max(10,000, Base Score * 0.05)
 *    - 5% multiplier on the cumulative historical economic footprint.
 *    - Minimum floor of $10,000.
 *
 * 3. Suggested IPO Price = Suggested Valuation / 10,000 standard shares (min $1.00)
 */
export function computeValuationFromStats(stats: YouTubeStats): ValuationResult {
  const subscribers = Number(stats.subscribers || 0);
  const totalViews = Number(stats.totalViews || 0);
  const videoCount = Number(stats.videoCount || 0);

  // 1. Fundamental Base Score
  const rawScore = (subscribers * 0.50) + (totalViews * 0.01) + (videoCount * 50);
  const computedScore = Math.max(10, Number(rawScore.toFixed(2)));

  // 2. Channel Estimated Valuation
  const suggestedValuation = Math.max(10000, Number((computedScore * 0.05).toFixed(2)));

  // 3. Suggested Share Price based on 10,000 standard shares
  const defaultShares = 10000;
  const defaultFloatPercent = 20;
  const suggestedPrice = Math.max(1.00, Number((suggestedValuation / defaultShares).toFixed(2)));

  return {
    computedScore,
    suggestedValuation,
    suggestedPrice,
    defaultShares,
    defaultFloatPercent,
    subscribers,
    totalViews,
    videoCount,
  };
}

/**
 * Pulls latest live channel stats, calculates score, and records a snapshot in DB.
 */
export async function calculateCreatorScore(creatorId: string, channelId: string) {
  const stats = await getChannelStats(channelId);
  if (!stats) {
    console.error(`Failed to get stats for channel ${channelId}`);
    return null;
  }

  const { computedScore, subscribers, totalViews, videoCount } = computeValuationFromStats(stats);

  const scoreRecord = await prisma.creatorScore.create({
    data: {
      creatorId,
      subscribers: BigInt(subscribers),
      totalViews: BigInt(totalViews),
      totalLikes: BigInt(0),
      totalComments: BigInt(0),
      videoCount: videoCount,
      uploadConsistency: 0.95,
      computedScore: computedScore,
    }
  });

  return scoreRecord;
}
