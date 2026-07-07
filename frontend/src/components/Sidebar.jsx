import React from 'react';
import { 
  History, 
  Trash2, 
  LogOut, 
  TrendingUp, 
  FileText, 
  ChevronRight,
  Plus,
  Home
} from 'lucide-react';

export default function Sidebar({ 
  reportsList, 
  activeReport, 
  onSelectReport, 
  onDeleteReport, 
  onNewResearch,
  onLogout,
  onBackToMenu,
  user
}) {
  return (
    <aside className="w-80 border-r border-slate-200 dark:border-white/5 bg-slate-900 text-slate-100 flex flex-col h-screen shrink-0">
      {/* Header Profile / Title */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              QuantTerminal
            </h2>
            <p className="text-xs text-slate-400 truncate max-w-[140px]">
              Hi, {user?.username}
            </p>
          </div>
        </div>
        {onBackToMenu && (
          <button
            onClick={onBackToMenu}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-slate-400 hover:text-white"
            title="Suite Menu"
          >
            <Home className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Research Button */}
      <div className="p-4 shrink-0">
        <button
          onClick={onNewResearch}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-5 h-5" />
          <span>New Research</span>
        </button>
      </div>

      {/* Chat / Audit History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
          <History className="w-3.5 h-3.5" />
          <span>Research History</span>
        </div>

        {reportsList.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-white/5 rounded-2xl">
            <p className="text-sm text-slate-500">No audits found</p>
            <p className="text-xs text-slate-600 mt-1">Start by typing a company name</p>
          </div>
        ) : (
          reportsList.map((report) => {
            const isActive = activeReport?.id === report.id;
            const date = new Date(report.created_at || report.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={report.id}
                className={`group flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white/10 text-white border border-white/10' 
                    : 'hover:bg-white/5 text-slate-300 border border-transparent'
                }`}
                onClick={() => onSelectReport(report.id)}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    report.decision === 'INVEST' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : report.decision === 'PASS'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate flex items-center">
                      <span className="truncate">{report.company_name}</span>
                      <span className="text-xs text-slate-400 ml-1.5 shrink-0">({report.ticker})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                      <span className={`font-semibold shrink-0 ${
                        report.decision === 'INVEST' 
                          ? 'text-emerald-400' 
                          : report.decision === 'PASS'
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}>
                        {report.decision}
                      </span>
                      <span>•</span>
                      <span className="truncate">{date}</span>
                    </div>
                  </div>
                </div>

                {/* Unified Right Control Area: physically separated to prevent any overlap */}
                <div className="relative w-8 h-8 flex items-center justify-center ml-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport(report.id);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-red-550/10 hover:bg-red-550/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Delete Audit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:opacity-0 transition-opacity duration-200" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-white/5 shrink-0 bg-slate-950/40">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all font-medium text-sm focus:outline-none"
        >
          <div className="flex items-center space-x-2">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
