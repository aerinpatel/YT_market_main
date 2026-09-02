"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Video, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Sliders,
  Sparkles,
  Users,
  Eye,
  Film,
  DollarSign
} from "lucide-react";

export default function CreatorOptionsClient({ creatorProfile }: { creatorProfile: any }) {
  const router = useRouter();
  
  // Default values from calculation or profile
  const initialPrice = creatorProfile?.ipoPrice && creatorProfile.ipoPrice > 0 ? String(creatorProfile.ipoPrice) : "2.50";
  const initialShares = creatorProfile?.totalShares && Number(creatorProfile.totalShares) > 0 ? String(creatorProfile.totalShares) : "10000";

  // State
  const [channelName, setChannelName] = useState(creatorProfile?.channelName || "");
  const [youtubeChannelId, setYoutubeChannelId] = useState(creatorProfile?.youtubeChannelId || "");
  const [stockPrice, setStockPrice] = useState(initialPrice);
  const [totalShares, setTotalShares] = useState(initialShares);
  const [floatPercent, setFloatPercent] = useState("20");
  const [ipoLoading, setIpoLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const numPrice = Number(stockPrice) || 1;
  const numTotalShares = Number(totalShares) || 10000;
  const numFloatPct = Number(floatPercent) || 20;

  // Real-time calculations
  const calculatedValuation = numPrice * numTotalShares;
  const calculatedFloatShares = Math.floor(numTotalShares * (numFloatPct / 100));
  const calculatedOwnerShares = numTotalShares - calculatedFloatShares;

  const handleLaunchIpo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIpoLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/creators/ipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName,
          youtubeChannelId,
          price: numPrice,
          valuation: calculatedValuation,
          totalShares: numTotalShares,
          floatPercent: numFloatPct
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to launch IPO");
      
      setMsg({ type: 'success', text: "IPO launched successfully! Your channel shares are now trading live on the exchange." });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || "Failed to launch IPO" });
    } finally {
      setIpoLoading(false);
    }
  };

  const scoreData = creatorProfile?.latestScore;

  // State 1: Creator has NOT yet launched an IPO (or is PENDING)
  if (!creatorProfile || creatorProfile.ipoStatus === 'PENDING') {
    return (
      <div className="flex flex-col h-full bg-[#08080a] text-zinc-100 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-2">
              <Sliders size={13} />
              Creator Studio • Launch IPO
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Configure Your Channel Equity IPO
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Review your YouTube algorithmic score, choose your stock price and public float, and list your shares on the market.
            </p>
          </div>

          {/* YouTube Channel Stats & Algorithmic Suggestion Card */}
          {scoreData && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
                    YouTube Fundamental Data & Valuation
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Live API Facts
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                    <Users size={12} /> Subscribers
                  </div>
                  <p className="text-base font-mono font-bold text-white mt-1">
                    {Number(scoreData.subscribers).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                    <Eye size={12} /> Total Views
                  </div>
                  <p className="text-base font-mono font-bold text-white mt-1">
                    {Number(scoreData.totalViews) > 1000000 
                      ? (Number(scoreData.totalViews) / 1000000).toFixed(1) + 'M'
                      : Number(scoreData.totalViews).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                    <Film size={12} /> Videos
                  </div>
                  <p className="text-base font-mono font-bold text-white mt-1">
                    {scoreData.videoCount}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Algorithmic Suggested Price (10,000 shares)
                  </span>
                  <span className="text-xl font-mono font-bold text-emerald-400">
                    ${creatorProfile.ipoPrice ? Number(creatorProfile.ipoPrice).toFixed(2) : initialPrice} / share
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 max-w-sm">
                  Calculated from your channel catalog and audience reach. You can adjust your final price below.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="p-6 rounded-2xl bg-[#101014] border border-white/[0.08] shadow-2xl">
            <form onSubmit={handleLaunchIpo} className="space-y-5">
              
              {msg && (
                <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
                  msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{msg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Channel Display Name
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={channelName} 
                    onChange={e => setChannelName(e.target.value)} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all font-mono" 
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      YouTube Channel ID
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  </div>
                  <div className="relative">
                    <Video size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" />
                    <input 
                      type="text" 
                      required 
                      readOnly
                      value={youtubeChannelId} 
                      className="w-full bg-white/[0.01] border border-white/[0.06] text-zinc-400 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Creator Pricing Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Stock / Share Price ($ USD)
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400">Creator Decision</span>
                  </div>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                    <input 
                      type="number" 
                      required 
                      step="0.01"
                      min="0.10"
                      value={stockPrice} 
                      onChange={e => setStockPrice(e.target.value)} 
                      className="w-full bg-white/[0.03] border border-emerald-500/30 focus:border-emerald-500/60 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:outline-none transition-all font-semibold" 
                    />
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    Pre-filled with algorithmic suggestion. You can customize this.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Total Share Supply
                  </label>
                  <input 
                    type="number" 
                    required 
                    min="100"
                    step="100"
                    value={totalShares} 
                    onChange={e => setTotalShares(e.target.value)} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-white/20 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all" 
                  />
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    Total number of shares to mint (default: 10,000).
                  </p>
                </div>
              </div>

              {/* Float Slider */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
                  <span className="uppercase tracking-wider">Public Float Percentage</span>
                  <span className="text-emerald-400 font-bold">{floatPercent}% Offered to Public</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="80" 
                  step="1"
                  value={floatPercent} 
                  onChange={e => setFloatPercent(e.target.value)} 
                  className="w-full accent-emerald-500 cursor-pointer" 
                />
                <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-0.5">
                  <span>5% (Conservative)</span>
                  <span>20% (Recommended)</span>
                  <span>80% (High Liquidity)</span>
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] grid grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Target Valuation</span>
                  <span className="font-bold text-white text-sm">
                    ${calculatedValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Public Float</span>
                  <span className="font-semibold text-emerald-400 text-sm">
                    {calculatedFloatShares.toLocaleString()} shares
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Retained by You</span>
                  <span className="font-semibold text-zinc-300 text-sm">
                    {calculatedOwnerShares.toLocaleString()} shares
                  </span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={ipoLoading}
                className="w-full mt-2 py-3.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wide hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 cursor-pointer"
              >
                {ipoLoading ? "Minting Shares & Launching..." : "Confirm & Launch Channel IPO"}
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // State 2: Creator HAS an active IPO
  return (
    <div className="flex flex-col h-full bg-[#08080a] text-zinc-100 p-6 sm:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Active Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Listed & Actively Trading
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {creatorProfile.channelName}
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              Channel ID: {creatorProfile.youtubeChannelId}
            </p>
          </div>

          <button 
            onClick={() => router.push(`/creator/${creatorProfile.id}`)}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-lg"
          >
            Open Live Trading Terminal
            <ExternalLink size={13} />
          </button>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.06]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">IPO Stock Price</span>
            <p className="text-2xl font-mono font-bold text-white mt-1">
              ${Number(creatorProfile.ipoPrice).toFixed(2)}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.06]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Shares</span>
            <p className="text-2xl font-mono font-bold text-white mt-1">
              {Number(creatorProfile.totalShares).toLocaleString()}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#101014] border border-white/[0.06]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Public Float</span>
            <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
              {Number(creatorProfile.floatShares).toLocaleString()} shares
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
