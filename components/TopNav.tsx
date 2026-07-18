"use client";

import { useAuth } from '@/lib/contexts/AuthContext';
import { Search, Bell, Wallet, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TopNav() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/market?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push(`/market`);
    }
  };

  const displayName = user?.creatorProfile?.channelName || user?.email?.split('@')[0] || "Trader";
  const formattedBalance = user?.walletBalance 
    ? `$${Number(user.walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : "$0.00";

  return (
    <header className="h-[68px] flex items-center justify-between px-8 border-b border-white/[0.06] shrink-0 bg-[#09090c]/80 backdrop-blur-md z-20">
      {/* Left: Quick Market Telemetry */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-medium tracking-wide text-zinc-300">
            MARKET ACTIVE
          </span>
        </div>
      </div>

      {/* Right: Search + Balance + Profile */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" size={15} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search channel or ticker..." 
            className="bg-white/[0.03] hover:bg-white/[0.05] focus:bg-[#111116] border border-white/[0.07] focus:border-white/20 rounded-xl py-2 pl-9 pr-10 text-xs w-60 focus:w-72 transition-all duration-200 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 border border-white/[0.08] rounded px-1.5 py-0.5 pointer-events-none">
            /
          </div>
        </form>

        {/* Wallet Balance Capsule */}
        {user && (
          <Link 
            href="/portfolio"
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-all group"
          >
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet size={12} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider leading-none">Balance</span>
              <span className="text-xs font-mono font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors leading-tight">
                {formattedBalance}
              </span>
            </div>
            <ArrowUpRight size={13} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
          </Link>
        )}

        {/* User Account Capsule */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/[0.06]">
          <div className="flex flex-col text-right hidden sm:flex">
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-medium text-xs text-zinc-200">{displayName}</span>
              {user?.role === 'CREATOR' && (
                <span className="px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-mono font-medium">
                  CREATOR
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[120px]">
              {user?.email || 'guest@exchange'}
            </span>
          </div>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/[0.1] flex items-center justify-center text-xs font-mono font-bold text-zinc-200 shadow-inner">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
