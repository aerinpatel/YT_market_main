"use client";

import { useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  ArrowDown, 
  ArrowUp, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Layers,
  Sparkles,
  Info,
  Video
} from 'lucide-react';
import Link from 'next/link';

interface CreatorScore {
  id: string;
  subscribers: string;
  totalViews: string;
  videoCount: number;
  uploadConsistency: number;
  computedScore: number;
  recordedAt: string;
}

interface CreatorProps {
  id: string;
  userId: string;
  channelName: string;
  youtubeChannelId: string;
  ticker: string;
  currentPrice: number;
  ipoPrice: number;
  ipoStatus: string;
  totalShares: string;
  floatShares: string;
  ownerShares: string;
  scores?: CreatorScore[];
}

interface OrderBookSnapshot {
  bids: Array<{ price: number; quantity: number }>;
  asks: Array<{ price: number; quantity: number }>;
}

export default function TradingTerminalClient({ 
  creator, 
  initialTrades 
}: { 
  creator: CreatorProps; 
  initialTrades: any[];
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookSnapshot>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<any[]>(initialTrades || []);
  const [currentPrice, setCurrentPrice] = useState<number>(creator.currentPrice);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  
  // Order Entry State
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState<string>(creator.currentPrice > 0 ? creator.currentPrice.toString() : '');
  const [quantity, setQuantity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Terminal Tab State (Chart vs Fundamentals)
  const [activeTab, setActiveTab] = useState<'chart' | 'fundamentals'>('chart');
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '1M' | 'ALL'>('24H');
  const [chartMode, setChartMode] = useState<'area' | 'candles'>('area');

  const { user, refreshUser } = useAuth();

  // Connect to WebSocket Server
  useEffect(() => {
    const socketIo = io({
      path: '/socket.io',
    });
    
    setSocket(socketIo);

    socketIo.on('connect', () => {
      socketIo.emit('subscribe', creator.id);
      if (user?.id) {
        socketIo.emit('subscribe_user', user.id);
      }
    });

    socketIo.on('depth', (snapshot: OrderBookSnapshot) => {
      setOrderBook(snapshot);
    });

    socketIo.on('trade', (trade) => {
      if (trade.creatorId === creator.id) {
        setRecentTrades((prev) => [trade, ...prev].slice(0, 50));
        setCurrentPrice((prev) => {
          if (trade.price > prev) setPriceFlash('up');
          else if (trade.price < prev) setPriceFlash('down');
          setTimeout(() => setPriceFlash(null), 1000);
          return trade.price;
        });
      }
    });

    socketIo.on('stp_alert', (alertData: { creatorId: string; count: number; message: string }) => {
      setFeedback({
        type: 'warning',
        text: `🛡️ ${alertData.message}`
      });
      refreshUser();
    });

    return () => {
      socketIo.disconnect();
    };
  }, [creator.id, user?.id]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          side,
          type,
          price: type === 'LIMIT' ? Number(price) : undefined,
          quantity: Number(quantity)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      
      let successMsg = `Order submitted: ${side} ${quantity} ${creator.ticker} (${data.executedTrades} immediate matches)`;
      if (data.stpCancelled && data.stpCancelled > 0) {
        successMsg += ` • 🛡️ Self-Trade Prevention: ${data.stpCancelled} resting order(s) cancelled & refunded.`;
      }

      setFeedback({
        type: data.stpCancelled > 0 ? 'warning' : 'success',
        text: successMsg
      });
      setQuantity('');
      await refreshUser();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        text: error.message || 'Execution error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Process and sort order book levels
  const bidsArray = useMemo(() => [...orderBook.bids].sort((a, b) => b.price - a.price), [orderBook.bids]);
  const asksArray = useMemo(() => [...orderBook.asks].sort((a, b) => a.price - b.price), [orderBook.asks]);

  // Compute depth volume scaling for visual ladder bars
  const maxBidVolume = useMemo(() => Math.max(...bidsArray.map(b => b.quantity), 1), [bidsArray]);
  const maxAskVolume = useMemo(() => Math.max(...asksArray.map(a => a.quantity), 1), [asksArray]);
  const maxTotalVolume = Math.max(maxBidVolume, maxAskVolume, 10);

  // Quick percentage balance fill helper
  const handleQuickPercent = (pct: number) => {
    if (!user) return;
    if (side === 'BUY') {
      const targetPrice = type === 'LIMIT' && Number(price) > 0 ? Number(price) : currentPrice || 1;
      const maxAffordable = Math.floor((Number(user.walletBalance) * (pct / 100)) / targetPrice);
      setQuantity(Math.max(1, maxAffordable).toString());
    } else {
      // Selling (if holding exists, default to 10 or float max)
      setQuantity(Math.floor(100 * (pct / 100)).toString());
    }
  };

  const estimatedTotal = (Number(price || currentPrice) * Number(quantity || 0)).toFixed(2);
  const latestScore = creator.scores?.[0];

  return (
    <div className="flex flex-col h-full bg-[#08080a] text-zinc-100 overflow-hidden">
      
      {/* Top Header Bar */}
      <header className="h-[72px] flex items-center justify-between px-8 border-b border-white/[0.06] bg-[#0c0c10]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center font-mono font-bold text-sm text-white">
              {creator.ticker.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-base text-white tracking-tight">{creator.channelName}</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
                  {creator.ipoStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                <span>${creator.ticker}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Video size={12} className="text-rose-500" />
                  {creator.youtubeChannelId}
                </span>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-white/[0.06] hidden md:block" />

          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-8 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-500 block">LAST PRICE</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-bold transition-colors ${
                  priceFlash === 'up' ? 'text-emerald-400' : priceFlash === 'down' ? 'text-rose-400' : 'text-white'
                }`}>
                  ${currentPrice.toFixed(2)}
                </span>
                {priceFlash === 'up' && <ArrowUp size={12} className="text-emerald-400" />}
                {priceFlash === 'down' && <ArrowDown size={12} className="text-rose-400" />}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 block">IPO PRICE</span>
              <span className="text-zinc-300 font-medium">${creator.ipoPrice.toFixed(2)}</span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 block">TOTAL FLOAT</span>
              <span className="text-zinc-300 font-medium">{Number(creator.floatShares).toLocaleString()} sh</span>
            </div>

            {latestScore && (
              <div>
                <span className="text-[10px] text-zinc-500 block">FUNDAMENTAL SCORE</span>
                <span className="text-indigo-400 font-bold">
                  {latestScore.computedScore > 1000000 
                    ? (latestScore.computedScore / 1000000).toFixed(2) + 'M' 
                    : latestScore.computedScore.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-3">
          <Link 
            href="/market"
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Market
          </Link>
        </div>
      </header>

      {/* Main Terminal Three-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: Interactive Chart & Fundamentals & Trades Tape */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06] bg-[#09090c]">
          
          {/* View Tabs */}
          <div className="h-12 border-b border-white/[0.06] px-6 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'chart' 
                    ? 'bg-white/[0.08] text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Price Action
              </button>
              <button
                onClick={() => setActiveTab('fundamentals')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'fundamentals' 
                    ? 'bg-white/[0.08] text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Channel Fundamentals
              </button>
            </div>

            {activeTab === 'chart' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06]">
                  {(['1H', '24H', '7D', '1M', 'ALL'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                        timeframe === tf ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'chart' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 bg-[#101014] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-xl">
                  {/* Chart Header Meta */}
                  <div className="flex items-center justify-between mb-4 z-10">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500">REALTIME EXECUTION CURVE</span>
                      <p className="text-xl font-mono font-bold text-white">${currentPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <Activity size={13} />
                      Live Stream
                    </div>
                  </div>

                  {/* Interactive Chart Canvas */}
                  <div className="flex-1 relative w-full flex items-center justify-center">
                    <InteractiveTradingChart currentPrice={currentPrice} ipoPrice={creator.ipoPrice} recentTrades={recentTrades} />
                  </div>

                  {/* Chart Footer Indicator */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-3 border-t border-white/[0.04] z-10">
                    <span>Live trade updates</span>
                    <span>Orderbook Depth Synchronized</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fundamentals' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[#101014] border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Video size={16} className="text-rose-500" />
                    YouTube Channel Performance Facts
                  </h3>

                  {latestScore ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Subscribers</span>
                        <p className="text-lg font-mono font-bold text-white mt-1">
                          {Number(latestScore.subscribers).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Views</span>
                        <p className="text-lg font-mono font-bold text-white mt-1">
                          {Number(latestScore.totalViews).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Video Count</span>
                        <p className="text-lg font-mono font-bold text-white mt-1">
                          {latestScore.videoCount}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Upload Consistency</span>
                        <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                          {(latestScore.uploadConsistency * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 font-mono py-6 text-center">
                      No score report recorded yet. The scoring engine periodically synchronizes facts from YouTube.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Stream: Live Recent Trades */}
          <div className="h-44 border-t border-white/[0.06] bg-[#0c0c10] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Live Trade Tape</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">Last 50 Executions</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] text-[11px] font-mono">
              {recentTrades.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-6">No recent trades recorded.</p>
              ) : (
                recentTrades.map((t, idx) => (
                  <div key={t.id || idx} className="flex items-center justify-between py-1.5 hover:bg-white/[0.02] px-2 rounded">
                    <span className="text-zinc-500">
                      {new Date(t.executedAt).toLocaleTimeString()}
                    </span>
                    <span className="text-zinc-300">{Number(t.quantity)} shares</span>
                    <span className="text-emerald-400 font-semibold">${Number(t.price).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Middle Column: Visual Order Book Depth Ladder */}
        <div className="w-72 border-r border-white/[0.06] bg-[#09090c] flex flex-col shrink-0 select-none">
          
          <div className="p-3.5 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Order Book</span>
            <span className="text-[10px] font-mono text-zinc-500">Depth</span>
          </div>

          {/* Book Header */}
          <div className="grid grid-cols-2 px-3 py-1.5 text-[10px] font-mono text-zinc-500 border-b border-white/[0.04]">
            <span>PRICE (USDT)</span>
            <span className="text-right">SIZE (SHARES)</span>
          </div>

          {/* Order Book Depth Rows */}
          <div className="flex-1 overflow-y-auto flex flex-col justify-between font-mono text-xs p-2">
            
            {/* ASKS (Top half, inverted so lowest ask is near spread) */}
            <div className="flex flex-col-reverse justify-end gap-1 flex-1">
              {asksArray.slice(0, 15).map((ask) => {
                const depthPct = Math.min(100, Math.round((ask.quantity / maxTotalVolume) * 100));
                return (
                  <div 
                    key={ask.price} 
                    onClick={() => setPrice(ask.price.toString())}
                    className="relative flex justify-between items-center px-2 py-1 rounded cursor-pointer group hover:bg-rose-500/10 transition-colors"
                  >
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/[0.08] rounded-r pointer-events-none transition-all duration-300"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-rose-400 font-medium relative z-10">${ask.price.toFixed(2)}</span>
                    <span className="text-zinc-400 relative z-10">{ask.quantity}</span>
                  </div>
                );
              })}
              {asksArray.length === 0 && (
                <p className="text-[11px] text-zinc-600 text-center py-4">No Sell Orders</p>
              )}
            </div>

            {/* Price Spread Divider */}
            <div className="py-2.5 px-3 my-1 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-mono text-[10px]">SPREAD</span>
              <span className="font-mono font-bold text-white text-sm">${currentPrice.toFixed(2)}</span>
            </div>

            {/* BIDS (Bottom half) */}
            <div className="flex flex-col gap-1 flex-1">
              {bidsArray.slice(0, 15).map((bid) => {
                const depthPct = Math.min(100, Math.round((bid.quantity / maxTotalVolume) * 100));
                return (
                  <div 
                    key={bid.price} 
                    onClick={() => setPrice(bid.price.toString())}
                    className="relative flex justify-between items-center px-2 py-1 rounded cursor-pointer group hover:bg-emerald-500/10 transition-colors"
                  >
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/[0.08] rounded-r pointer-events-none transition-all duration-300"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-emerald-400 font-medium relative z-10">${bid.price.toFixed(2)}</span>
                    <span className="text-zinc-400 relative z-10">{bid.quantity}</span>
                  </div>
                );
              })}
              {bidsArray.length === 0 && (
                <p className="text-[11px] text-zinc-600 text-center py-4">No Buy Orders</p>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Pro Order Ticket */}
        <div className="w-80 bg-[#0c0c10] p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white tracking-tight">Order Ticket</h2>
              {user && (
                <span className="text-[11px] font-mono text-zinc-400">
                  Bal: ${Number(user.walletBalance).toFixed(2)}
                </span>
              )}
            </div>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-5">
              <button 
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  side === 'BUY' 
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Buy {creator.ticker}
              </button>
              <button 
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  side === 'SELL' 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sell {creator.ticker}
              </button>
            </div>

            {/* Limit / Market Order Switcher */}
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setType('LIMIT')}
                className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  type === 'LIMIT' 
                    ? 'bg-white/[0.08] text-white border-white/20' 
                    : 'bg-transparent text-zinc-500 border-white/[0.06] hover:text-zinc-300'
                }`}
              >
                Limit
              </button>
              <button
                type="button"
                onClick={() => setType('MARKET')}
                className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  type === 'MARKET' 
                    ? 'bg-white/[0.08] text-white border-white/20' 
                    : 'bg-transparent text-zinc-500 border-white/[0.06] hover:text-zinc-300'
                }`}
              >
                Market
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              
              {/* Price Input (if Limit) */}
              {type === 'LIMIT' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>LIMIT PRICE</span>
                    <span>USDT</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.03] focus:bg-white/[0.06] border border-white/[0.08] focus:border-white/20 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-zinc-400 flex items-center gap-2">
                  <Info size={14} className="text-zinc-500" />
                  Executed immediately at best available resting price.
                </div>
              )}

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>QUANTITY</span>
                  <span>SHARES</span>
                </div>
                <input 
                  type="number" 
                  step="1"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/[0.03] focus:bg-white/[0.06] border border-white/[0.08] focus:border-white/20 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                />
              </div>

              {/* Quick Percent Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-zinc-400 hover:text-white transition-all"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Order Estimation Summary */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Est. Total</span>
                  <span className="text-white font-bold">${estimatedTotal} USDT</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Exchange Fee</span>
                  <span>0.00%</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Max Position Cap</span>
                  <span>5% of float</span>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading || !user}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 cursor-pointer ${
                  side === 'BUY' 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' 
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Executing...
                  </span>
                ) : (
                  `${side} ${creator.ticker}`
                )}
              </button>

              {/* Status Feedback Toast */}
              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-mono flex items-start gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : feedback.type === 'warning'
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {feedback.type === 'success' && <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />}
                  {feedback.type === 'warning' && <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-400" />}
                  {feedback.type === 'error' && <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              {!user && (
                <p className="text-xs text-rose-400 text-center pt-2 font-mono">
                  Sign in required to execute orders.
                </p>
              )}
            </form>

          </div>

          <div className="pt-6 border-t border-white/[0.06] text-center text-[10px] font-mono text-zinc-600">
            Escrow protected via PostgreSQL $transaction
          </div>

        </div>

      </div>

    </div>
  );
}

// Minimalist Interactive SVG Area Chart
function InteractiveTradingChart({ 
  currentPrice, 
  ipoPrice,
  recentTrades 
}: { 
  currentPrice: number; 
  ipoPrice: number;
  recentTrades: any[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate responsive mock points based on trades or baseline
  const priceData = useMemo(() => {
    if (recentTrades.length >= 5) {
      return [...recentTrades].reverse().map(t => Number(t.price));
    }
    // Baseline progression
    return [
      ipoPrice * 0.95,
      ipoPrice * 0.98,
      ipoPrice,
      ipoPrice * 1.02,
      ipoPrice * 1.05,
      currentPrice * 0.99,
      currentPrice
    ];
  }, [recentTrades, ipoPrice, currentPrice]);

  const min = Math.min(...priceData) * 0.98;
  const max = Math.max(...priceData) * 1.02;
  const range = max - min || 1;

  const width = 600;
  const height = 240;

  const points = priceData.map((val, idx) => {
    const x = (idx / (priceData.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="w-full h-full flex flex-col justify-center relative select-none">
      <svg 
        className="w-full h-56 overflow-visible" 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

        {/* Gradient Area Fill */}
        <polygon points={areaPoints} fill="url(#chartGradient)" />

        {/* Price Polyline */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Last Price Glowing Node */}
        {priceData.length > 0 && (
          <circle
            cx={width}
            cy={height - ((currentPrice - min) / range) * height}
            r="4"
            fill="#10b981"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
