"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Mail,
  UserCheck,
  Video,
  LineChart,
  AtSign,
  User,
  Flame,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channelHandle, setChannelHandle] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'INVESTOR' | 'CREATOR'>('INVESTOR');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const endpoint = isLogin ? '/api/auth/signin' : '/api/auth/signup';
    const payload = isLogin 
      ? { email, password } 
      : role === 'CREATOR'
        ? { email, password, role, channelHandle, name }
        : { email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data.error || `Authentication failed (${res.status})`);
      }

      // Hard redirect to ensure fresh server component session cookies
      if (data.user?.role === 'CREATOR' || role === 'CREATOR') {
        window.location.href = '/creator-options';
      } else {
        window.location.href = '/market';
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: 'CREATOR' | 'INVESTOR') => {
    setError('');
    setDemoLoading(demoRole);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: demoRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      window.location.href = data.redirectUrl || (demoRole === 'CREATOR' ? '/creator-options' : '/market');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo login');
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-zinc-100 flex overflow-hidden">
      {/* Left Pane - Ambient Branding & Telemetry */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 bg-gradient-to-b from-[#0c0c10] via-[#09090c] to-[#08080a] border-r border-white/[0.06] overflow-hidden">
        {/* Background Ambient Glows & Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shadow-lg">
            <span className="font-mono font-bold text-sm tracking-tighter text-white">CR</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
              CREATR EXCHANGE
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-400">
                v2.4 PRO
              </span>
            </h1>
            <p className="text-[11px] font-mono text-zinc-500">Decentralized Creator Equity Protocol</p>
          </div>
        </div>

        {/* Centerpiece Feature Visual */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-6">
            <Sparkles size={13} />
            Next-Gen Financial Primitive for Creators
          </div>

          <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight text-white leading-tight mb-4">
            Trade fractional shares in YouTube creators.
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            Access fractional liquidity, real-time algorithmic valuation based on YouTube Data API metrics, and continuous limit order matching.
          </p>

          {/* Micro Telemetry Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-1">
                <Zap size={14} className="text-amber-400" />
                Order Types
              </div>
              <p className="text-lg font-mono font-bold text-white">Limit &amp; Market</p>
              <p className="text-[11px] text-zinc-500">Continuous Order Book</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-1">
                <LineChart size={14} className="text-emerald-400" />
                Valuation Engine
              </div>
              <p className="text-lg font-mono font-bold text-emerald-400">Live API Score</p>
              <p className="text-[11px] text-zinc-500">Suggested Price &amp; Float Controls</p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500/80" />
            Atomic Database Transactions
          </span>
          <span>WebSocket Real-Time Feed</span>
        </div>
      </div>

      {/* Right Pane - Authentication Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          
          {/* Form Container */}
          <div className="p-8 rounded-2xl bg-[#101014]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl relative">
            
            {/* Header Switcher */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/[0.06]">
              <div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {isLogin ? 'Access your creator equity portfolio' : 'Join the creator equity exchange'}
                </p>
              </div>

              <div className="flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    isLogin ? 'bg-white/[0.1] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    !isLogin ? 'bg-white/[0.1] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 text-xs text-rose-400 bg-rose-500/[0.08] border border-rose-500/20 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick 1-Click Demo Login Bar */}
            <div className="mb-6 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-400" /> Quick Instant Login
                </span>
                <span className="text-[9px] font-mono text-zinc-500">1-Click Access</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={demoLoading !== null || loading}
                  onClick={() => handleDemoLogin('CREATOR')}
                  className="py-2 px-3 text-[11px] font-mono font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Video size={12} />
                  {demoLoading === 'CREATOR' ? 'Signing in...' : 'Demo Creator'}
                </button>
                <button
                  type="button"
                  disabled={demoLoading !== null || loading}
                  onClick={() => handleDemoLogin('INVESTOR')}
                  className="py-2 px-3 text-[11px] font-mono font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck size={12} />
                  {demoLoading === 'INVESTOR' ? 'Signing in...' : 'Demo Investor'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Role Selection on Signup */}
              {!isLogin && (
                <div className="space-y-1.5 mb-2">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Account Role</label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setRole('INVESTOR')}
                      className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        role === 'INVESTOR' 
                          ? 'bg-white/[0.1] text-white border border-white/[0.1] shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <UserCheck size={14} />
                      Investor
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('CREATOR')}
                      className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        role === 'CREATOR' 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Video size={14} />
                      Creator
                    </button>
                  </div>
                </div>
              )}

              {/* Creator-Specific Fields on Signup */}
              {!isLogin && role === 'CREATOR' && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        YouTube Channel Handle / URL / ID
                      </label>
                      <span className="text-[10px] font-mono text-indigo-400">Auto-Scores Channel</span>
                    </div>
                    <div className="relative group">
                      <AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
                      <input 
                        type="text" 
                        value={channelHandle}
                        onChange={(e) => setChannelHandle(e.target.value)}
                        required
                        placeholder="@MrBeast or https://youtube.com/@veritasium"
                        className="w-full bg-white/[0.02] focus:bg-[#15151c] border border-indigo-500/30 focus:border-indigo-500/60 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500">
                      Supports @handle, full channel link, or channel ID.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Channel Display Name (Optional)
                    </label>
                    <div className="relative group">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Defaults to your YouTube Channel title"
                        className="w-full bg-white/[0.02] focus:bg-[#15151c] border border-white/[0.08] focus:border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@domain.com"
                    className="w-full bg-white/[0.02] focus:bg-[#15151c] border border-white/[0.08] focus:border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-white/[0.02] focus:bg-[#15151c] border border-white/[0.08] focus:border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading || demoLoading !== null}
                className="w-full mt-2 py-3 rounded-xl bg-white text-black font-semibold text-xs tracking-wide hover:bg-zinc-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>{!isLogin && role === 'CREATOR' ? 'Verifying YouTube Channel...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <>
                    {isLogin 
                      ? 'Sign In to Terminal' 
                      : role === 'CREATOR' 
                        ? 'Verify Channel & Create Creator Account' 
                        : 'Create Trading Account'}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
              <p className="text-[10px] text-zinc-500">
                Encrypted via bcrypt and authenticated with secure httpOnly session cookies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
