"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Briefcase, 
  FileText,
  Layers, 
  LogOut,
  Radio,
  Video
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isCreator = user?.role === 'CREATOR';

  return (
    <aside className="w-[74px] h-screen bg-[#09090c] border-r border-white/[0.06] flex flex-col items-center py-6 justify-between shrink-0 z-30 select-none">
      {/* Navigation Items */}
      <div className="flex flex-col items-center gap-4 w-full">
        <nav className="flex flex-col gap-2.5 items-center w-full px-3">
          <NavItem 
            href="/market" 
            icon={<BarChart3 size={19} />} 
            label="Market Overview"
            active={pathname === '/market' || pathname === '/'} 
          />
          <NavItem 
            href="/portfolio" 
            icon={<Briefcase size={19} />} 
            label="Portfolio & Holdings"
            active={pathname.startsWith('/portfolio')} 
          />
          <NavItem 
            href="/reports" 
            icon={<FileText size={19} />} 
            label="Reports"
            active={pathname.startsWith('/reports')} 
          />
          {isCreator && (
            <NavItem 
              href="/creator-options" 
              icon={<Video size={19} />} 
              label="Creator Options"
              active={pathname.startsWith('/creator-options')} 
            />
          )}
        </nav>
      </div>

      {/* Bottom: Network Status & User / Logout */}
      <div className="flex flex-col gap-4 items-center w-full px-3">
        {/* Live Network Pill */}
        <div className="group relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio size={14} className="animate-pulse" />
          </div>
          {/* Tooltip */}
          <div className="absolute left-14 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity bg-zinc-900 border border-white/[0.08] text-zinc-300 text-[11px] font-mono px-2.5 py-1 rounded-md whitespace-nowrap z-50 shadow-xl">
            Live WS Engine
          </div>
        </div>

        {/* User Monogram */}
        <div className="group relative flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-xs font-mono font-medium text-zinc-300">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="absolute left-14 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity bg-zinc-900 border border-white/[0.08] text-zinc-300 text-[11px] font-mono px-2.5 py-1 rounded-md whitespace-nowrap z-50 shadow-xl">
            {user?.email || 'Logged In'}
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => logout()}
          title="Sign Out"
          className="w-9 h-9 rounded-xl bg-transparent hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 flex items-center justify-center text-zinc-500 hover:text-rose-400 transition-all duration-200"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  active = false,
  badge
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  badge?: string;
}) {
  return (
    <div className="group relative w-full flex items-center justify-center">
      <Link 
        href={href}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
          active 
            ? 'bg-white/[0.09] text-white shadow-sm border border-white/[0.12]' 
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
        }`}
      >
        {icon}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-400 rounded-r-full" />
        )}
        {badge && (
          <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
            {badge}
          </span>
        )}
      </Link>

      {/* Floating Tooltip */}
      <div className="absolute left-14 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity bg-zinc-900 border border-white/[0.08] text-zinc-200 text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap z-50 shadow-2xl">
        {label}
      </div>
    </div>
  );
}
