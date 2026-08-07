import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { matchingEngine } from '@/lib/engine/MatchingEngine';
import { OrderSide, OrderType, Order as EngineOrder } from '@/lib/engine/types';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.role !== 'CREATOR') {
      return NextResponse.json({ error: 'Unauthorized. Only creators can IPO.' }, { status: 403 });
    }

    const { channelName, youtubeChannelId, price, valuation, totalShares, floatPercent } = await req.json();

    if (!channelName || !youtubeChannelId || !totalShares || !floatPercent) {
      return NextResponse.json({ error: 'Missing required IPO fields' }, { status: 400 });
    }

    const numTotalShares = Math.max(100, Number(totalShares));
    const numFloatPercent = Math.min(80, Math.max(5, Number(floatPercent)));

    // Calculate final IPO stock price
    const ipoPrice = price 
      ? Math.max(0.1, Number(price)) 
      : valuation 
        ? Math.max(0.1, Number(valuation) / numTotalShares) 
        : 1.0;

    const floatSharesCount = Math.floor(numTotalShares * (numFloatPercent / 100));
    const ownerSharesCount = numTotalShares - floatSharesCount;

    // Create or update the Creator profile and initial Holding atomically
    const creator = await prisma.$transaction(async (tx) => {
      const newCreator = await tx.creator.upsert({
        where: { userId: payload.userId },
        update: {
          channelName,
          youtubeChannelId,
          totalShares: BigInt(numTotalShares),
          floatShares: BigInt(floatSharesCount),
          ownerShares: BigInt(ownerSharesCount),
          ipoPrice: ipoPrice,
          ipoStatus: 'LISTED',
          listedAt: new Date(),
        },
        create: {
          userId: payload.userId,
          channelName,
          youtubeChannelId,
          totalShares: BigInt(numTotalShares),
          floatShares: BigInt(floatSharesCount),
          ownerShares: BigInt(ownerSharesCount),
          ipoPrice: ipoPrice,
          ipoStatus: 'LISTED', 
          listedAt: new Date(),
        }
      });

      // Grant the creator 100% of the shares initially
      await tx.holding.upsert({
        where: { userId_creatorId: { userId: payload.userId, creatorId: newCreator.id } },
        update: {
          quantity: BigInt(numTotalShares),
          avgBuyPrice: ipoPrice,
          lowestBuyPrice: ipoPrice,
          highestBuyPrice: ipoPrice,
        },
        create: {
          userId: payload.userId,
          creatorId: newCreator.id,
          quantity: BigInt(numTotalShares),
          avgBuyPrice: ipoPrice,
          lowestBuyPrice: ipoPrice,
          highestBuyPrice: ipoPrice,
        }
      });

      // Place the public float SELL order into the market
      const floatOrder = await tx.order.create({
        data: {
          userId: payload.userId,
          creatorId: newCreator.id,
          side: 'SELL',
          type: 'LIMIT',
          price: ipoPrice,
          quantity: BigInt(floatSharesCount),
          remainingQuantity: BigInt(floatSharesCount),
          status: 'OPEN',
          isCreatorAction: true,
        }
      });

      // Deduct the float shares from the creator's holding for market escrow
      await tx.holding.update({
        where: { userId_creatorId: { userId: payload.userId, creatorId: newCreator.id } },
        data: { quantity: { decrement: floatSharesCount } }
      });

      return { newCreator, floatOrder };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
    
    // Push the float order into the Matching Engine
    const engineOrder: EngineOrder = {
      id: creator.floatOrder.id,
      userId: payload.userId,
      creatorId: creator.newCreator.id,
      side: 'SELL' as OrderSide,
      type: 'LIMIT' as OrderType,
      price: Number(creator.newCreator.ipoPrice),
      quantity: floatSharesCount,
      remainingQuantity: floatSharesCount,
      isCreatorAction: true,
      createdAt: creator.floatOrder.createdAt.getTime(),
    };
    await matchingEngine.placeOrder(engineOrder);

    return NextResponse.json({ 
      message: 'IPO successful. Channel shares are now actively trading in the market!', 
      creator: {
        id: creator.newCreator.id,
        channelName: creator.newCreator.channelName,
        ipoPrice: creator.newCreator.ipoPrice,
        totalShares: creator.newCreator.totalShares.toString(),
        floatShares: creator.newCreator.floatShares.toString(),
        ownerShares: creator.newCreator.ownerShares.toString(),
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('IPO error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'You have already listed a channel or the channel ID is taken' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
