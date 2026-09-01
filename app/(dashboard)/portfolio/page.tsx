import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import CancelOrderButton from '@/components/CancelOrderButton';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  ArrowUpRight, 
  History, 
  Clock, 
  Layers, 
  ArrowRight,
  Lock,
  FileText
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    redirect('/login');
  }

  const payload = verifyToken(token);
  if (!payload) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      holdings: {
        where: { quantity: { gt: 0 } },
        include: {
          creator: {
            include: {
              trades: {
                orderBy: [
                  { executedAt: 'desc' },
                  { id: 'desc' }
                ],
                take: 1
              }
            }
          }
        }
      },
      ordersPlaced: {
        where: { status: { in: ['OPEN', 'PARTIAL'] } },
        include: {
          creator: true
        },
        orderBy: { createdAt: 'desc' }
      },
      realizedPnls: {
        orderBy: { realizedAt: 'desc' },
        take: 10,
        include: {
          creator: { select: { channelName: true } }
        }
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  let totalValue = 0;
  let totalCost = 0;

  const holdingsList = user.holdings.map(h => {
    const latestTrade = h.creator.trades[0];
    const currentPrice = latestTrade ? latestTrade.price.toNumber() : (h.creator.ipoPrice?.toNumber() || 0);
    const value = currentPrice * Number(h.quantity);
    const cost = Number(h.avgBuyPrice) * Number(h.quantity);
    
    totalValue += value;
    totalCost += cost;

    const pnl = value - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

    return {
      id: h.id,
      creatorId: h.creatorId,
      name: h.creator.channelName,
      ticker: h.creator.channelName.substring(0, 4).toUpperCase(),
      quantity: Number(h.quantity),
      avgCost: Number(h.avgBuyPrice),
      currentPrice,
      value,
      pnl,
      pnlPercent
    };
  });

  // Calculate Escrow held in open buy orders
  const openOrdersList = user.ordersPlaced.map(o => {
    const price = o.price ? Number(o.price) : 0;
    const remaining = Number(o.remainingQuantity);
    const totalQty = Number(o.quantity);
    const escrowAmount = o.side === 'BUY' ? price * remaining : 0;

    return {
      id: o.id,
      creatorId: o.creatorId,
      channelName: o.creator.channelName,
      ticker: o.creator.channelName.substring(0, 4).toUpperCase(),
      side: o.side,
      type: o.type,
      price,
      quantity: totalQty,
      remainingQuantity: remaining,
      status: o.status,
      escrowAmount,
      createdAt: o.createdAt
    };
  });

  const totalEscrow = openOrdersList.reduce((sum, o) => sum + o.escrowAmount, 0);
  const cashBalance = Number(user.walletBalance);
  const netWorth = totalValue + cashBalance + totalEscrow;
  const overallPnl = totalValue - totalCost;
  const overallPnlPercent = totalCost > 0 ? (overallPnl / totalCost) * 100 : 0;

  const totalRealizedPnl = user.realizedPnls.reduce((sum, r) => sum + Number(r.pnl), 0);

  const colors = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

  return (
    <div className="flex flex-col h-full bg-[#08080a] text-zinc-100 overflow-hidden">
      <TopNav />

      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Portfolio & Wealth Ledger</h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">Real-time asset accounting with FIFO cost-basis reconciliation.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href="/market"
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all flex items-center gap-1.5"
            >
              Explore Market
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Hero Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.08] relative overflow-hidden shadow-lg">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Estimated Net Worth</span>
            <p className="text-2xl font-mono font-bold text-white mt-1.5">
              ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-mono text-zinc-400 mt-1">Cash + Assets + Escrow</p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.03] rounded-full blur-xl pointer-events-none" />
          </div>

          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.08] relative overflow-hidden shadow-lg">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Available Cash Balance</span>
            <p className="text-2xl font-mono font-bold text-white mt-1.5">
              ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-mono text-zinc-400 mt-1">Instant Buying Power</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.08] relative overflow-hidden shadow-lg">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Escrow in Open Orders</span>
            <p className="text-2xl font-mono font-bold text-amber-400 mt-1.5">
              ${totalEscrow.toFixed(2)}
            </p>
            <p className="text-[11px] font-mono text-zinc-400 mt-1">{openOrdersList.length} Active Orders</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.08] relative overflow-hidden shadow-lg">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Unrealized P&L</span>
            <p className={`text-2xl font-mono font-bold mt-1.5 ${overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {overallPnl >= 0 ? '+' : ''}${overallPnl.toFixed(2)}
            </p>
            <p className={`text-[11px] font-mono mt-1 ${overallPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {overallPnlPercent >= 0 ? '+' : ''}{overallPnlPercent.toFixed(2)}% Return on Equity
            </p>
          </div>

        </div>

        {/* Asset Allocation Bar */}
        {netWorth > 0 && (
          <div className="p-6 rounded-2xl bg-[#101014] border border-white/[0.06] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <PieChart size={14} className="text-indigo-400" />
                Asset Allocation Breakdown
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">100% Total Net Worth</span>
            </div>

            {/* Segmented Bar */}
            <div className="h-3.5 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
              {/* Cash Segment */}
              <div 
                className="h-full bg-zinc-600 transition-all duration-300"
                style={{ width: `${(cashBalance / netWorth) * 100}%` }}
                title={`Available Cash: $${cashBalance.toFixed(2)}`}
              />
              {/* Escrow Segment */}
              {totalEscrow > 0 && (
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${(totalEscrow / netWorth) * 100}%` }}
                  title={`Open Orders Escrow: $${totalEscrow.toFixed(2)}`}
                />
              )}
              {/* Creator Holdings Segments */}
              {holdingsList.map((h, i) => (
                <div
                  key={h.id}
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: `${(h.value / netWorth) * 100}%`,
                    backgroundColor: colors[i % colors.length]
                  }}
                  title={`${h.name}: $${h.value.toFixed(2)}`}
                />
              ))}
            </div>

            {/* Legend Pills */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                Available Cash ({((cashBalance / netWorth) * 100).toFixed(1)}%)
              </span>
              {totalEscrow > 0 && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Order Escrow ({((totalEscrow / netWorth) * 100).toFixed(1)}%)
                </span>
              )}
              {holdingsList.map((h, i) => (
                <span key={h.id} className="flex items-center gap-1.5 text-zinc-300">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: colors[i % colors.length] }} 
                  />
                  {h.ticker} ({((h.value / netWorth) * 100).toFixed(1)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Holdings Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white tracking-tight">Active Equity Positions</h2>
            <span className="text-xs font-mono text-zinc-500">{holdingsList.length} Positions</span>
          </div>

          <div className="rounded-2xl bg-[#101014] border border-white/[0.06] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-5 font-medium">CREATOR CHANNEL</th>
                    <th className="py-3.5 px-5 font-medium text-right">QUANTITY</th>
                    <th className="py-3.5 px-5 font-medium text-right">AVG COST BASIS</th>
                    <th className="py-3.5 px-5 font-medium text-right">MARKET PRICE</th>
                    <th className="py-3.5 px-5 font-medium text-right">TOTAL VALUE</th>
                    <th className="py-3.5 px-5 font-medium text-right">UNREALIZED P&L</th>
                    <th className="py-3.5 px-5 font-medium text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {holdingsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans">
                        You do not own any creator shares yet. Explore the market to buy your first channel equity!
                      </td>
                    </tr>
                  ) : (
                    holdingsList.map((h) => (
                      <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-5">
                          <Link href={`/creator/${h.creatorId}`} className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-white group-hover:border-white/20 transition-colors">
                              {h.ticker.substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-sans font-semibold text-white group-hover:text-emerald-400 transition-colors block">
                                {h.name}
                              </span>
                              <span className="text-[10px] text-zinc-500">${h.ticker}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-5 text-right font-medium text-white">{h.quantity.toLocaleString()}</td>
                        <td className="py-4 px-5 text-right text-zinc-400">${h.avgCost.toFixed(2)}</td>
                        <td className="py-4 px-5 text-right text-zinc-200 font-medium">${h.currentPrice.toFixed(2)}</td>
                        <td className="py-4 px-5 text-right text-white font-bold">${h.value.toFixed(2)}</td>
                        <td className={`py-4 px-5 text-right font-semibold ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)} ({h.pnlPercent.toFixed(2)}%)
                        </td>
                        <td className="py-4 px-5 text-right">
                          <Link 
                            href={`/creator/${h.creatorId}`}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-1 text-[11px]"
                          >
                            Trade <ArrowUpRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Active Open Orders (Resting in Order Book) */}
        {openOrdersList.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                Active Open Orders (Resting in Order Book)
              </h2>
              <span className="text-xs font-mono text-zinc-500">{openOrdersList.length} Resting Orders</span>
            </div>

            <div className="rounded-2xl bg-[#101014] border border-white/[0.06] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400">
                    <tr>
                      <th className="py-3.5 px-5 font-medium">PLACED AT</th>
                      <th className="py-3.5 px-5 font-medium">CHANNEL</th>
                      <th className="py-3.5 px-5 font-medium">SIDE / TYPE</th>
                      <th className="py-3.5 px-5 font-medium text-right">LIMIT PRICE</th>
                      <th className="py-3.5 px-5 font-medium text-right">UNFILLED / TOTAL</th>
                      <th className="py-3.5 px-5 font-medium text-right">ESCROW HELD</th>
                      <th className="py-3.5 px-5 font-medium text-right">CANCEL ORDER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {openOrdersList.map((o) => (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-5 text-zinc-500">{new Date(o.createdAt).toLocaleTimeString()}</td>
                        <td className="py-3.5 px-5">
                          <Link href={`/creator/${o.creatorId}`} className="font-sans font-medium text-white hover:text-emerald-400 transition-colors">
                            {o.channelName} <span className="text-[10px] text-zinc-500 font-mono ml-1">${o.ticker}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {o.side} {o.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-medium text-white">${o.price.toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right text-zinc-300">
                          {o.remainingQuantity} / {o.quantity} sh
                        </td>
                        <td className="py-3.5 px-5 text-right text-amber-400 font-semibold">
                          ${o.escrowAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex justify-end">
                            <CancelOrderButton orderId={o.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Realized PnL Closed Trades History */}
        {user.realizedPnls.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <History size={16} className="text-zinc-400" />
                Realized P&L Ledger (Closed Positions)
              </h2>
              <span className="text-xs font-mono text-zinc-500">Immutable Ledger</span>
            </div>

            <div className="rounded-2xl bg-[#101014] border border-white/[0.06] overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400">
                  <tr>
                    <th className="py-3 px-5 font-medium">TIMESTAMP</th>
                    <th className="py-3 px-5 font-medium">CHANNEL</th>
                    <th className="py-3 px-5 font-medium text-right">SHARES SOLD</th>
                    <th className="py-3 px-5 font-medium text-right">AVG COST AT SALE</th>
                    <th className="py-3 px-5 font-medium text-right">SELL PRICE</th>
                    <th className="py-3 px-5 font-medium text-right">REALIZED P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {user.realizedPnls.map((p) => {
                    const pnlVal = Number(p.pnl);
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.01]">
                        <td className="py-3.5 px-5 text-zinc-500">{new Date(p.realizedAt).toLocaleString()}</td>
                        <td className="py-3.5 px-5 font-sans font-medium text-white">{p.creator.channelName}</td>
                        <td className="py-3.5 px-5 text-right text-zinc-300">{Number(p.quantity)}</td>
                        <td className="py-3.5 px-5 text-right text-zinc-400">${Number(p.avgCostAtSale).toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right text-zinc-200">${Number(p.sellPrice).toFixed(2)}</td>
                        <td className={`py-3.5 px-5 text-right font-bold ${pnlVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
