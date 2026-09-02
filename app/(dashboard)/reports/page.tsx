import TopNav from '@/components/TopNav';
import { FileText, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  return (
    <div className="flex flex-col h-full bg-[#08080a] text-zinc-100 overflow-hidden">
      <TopNav />

      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">
              <FileText size={13} className="text-emerald-400" />
              <span>Financial & Analytics Center</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              Comprehensive valuation reports, execution summaries, and audit logs.
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="p-12 rounded-2xl bg-[#101014] border border-white/[0.06] flex flex-col items-center justify-center text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-zinc-500">
            <FileText size={22} className="text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-white">No reports generated yet</h3>
          <p className="text-xs text-zinc-500 font-mono max-w-sm">
            Automated intelligence reports and transaction audits will appear here once generated.
          </p>
        </div>
      </div>
    </div>
  );
}
