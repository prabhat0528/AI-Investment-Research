import React from 'react';
import { ShieldAlert, MessageSquare, LogOut, Sun, Moon, LineChart, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Aesthetic landing page shown after login, letting the user choose between the Auditor workspace and the Chat workspace.
 */
export default function HomeSelector({ user, onSelectView, onLogout, darkMode, setDarkMode }) {
  
  // Running marquee stock ticker mock data for premium market aesthetics
  const tickerData = [
    { ticker: 'AAPL', price: '182.30', change: '+1.65%', isUp: true },
    { ticker: 'TSLA', price: '168.10', change: '-2.40%', isUp: false },
    { ticker: 'MSFT', price: '415.60', change: '+0.88%', isUp: true },
    { ticker: 'NVDA', price: '875.12', change: '+3.45%', isUp: true },
    { ticker: 'AMD', price: '172.50', change: '-1.25%', isUp: false },
    { ticker: 'AMZN', price: '178.45', change: '+1.12%', isUp: true },
    { ticker: 'GOOGL', price: '152.35', change: '+0.45%', isUp: true },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-dark-900 transition-colors duration-300 relative overflow-hidden font-sans">
      
      {/* Background glowing gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none"></div>

      {/* 1. Header Area with Ticker */}
      <div className="w-full shrink-0">
        {/* Running Stock Marquee */}
        <div className="w-full bg-slate-900 text-white py-2 overflow-hidden select-none border-b border-white/5 flex items-center relative z-20">
          <div className="flex animate-marquee whitespace-nowrap space-x-12 px-4 text-xs font-mono font-bold tracking-wider">
            {tickerData.concat(tickerData).map((stock, idx) => (
              <span key={idx} className="inline-flex items-center space-x-2">
                <span>{stock.ticker}</span>
                <span className="text-slate-300">${stock.price}</span>
                <span className={stock.isUp ? 'text-emerald-400' : 'text-red-400'}>
                  {stock.isUp ? '▲' : '▼'} {stock.change}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Header Toolbar */}
        <header className="px-8 py-5 flex items-center justify-between border-b border-slate-200 dark:border-white/5 relative z-20 glass bg-white/70 dark:bg-dark-900/70">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <LineChart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-slate-950 dark:text-white uppercase">
                QuantTerminal
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                Intelligence Suite
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/5 text-red-600 dark:text-red-400 transition-all font-semibold text-sm"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </header>
      </div>

      {/* 2. Main Choice Grid */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10">
        <div className="max-w-4xl w-full text-center space-y-4 mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Welcome, {user?.name || 'Investor'}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
            Institutional Investment Auditing & Market Intelligence
          </h2>
          <p className="text-md text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Select a suite component below to deploy autonomous multi-agent systems or run real-time conversational valuation audits.
          </p>
        </div>

        {/* Feature Selector Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          
          {/* Card A: auditor workspace */}
          <div className="group relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 transition-all duration-300 shadow-md hover:shadow-2xl hover:border-emerald-500/30 flex flex-col justify-between hover:scale-[1.02] overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:scale-150 transition-transform duration-300"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl w-fit">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">
                Investment Audit Generator
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Deploy a cooperative team of AI agents (Planner, Financial, Risk, Sentiment, Valuation) to scan SEC filings, run technical indicators, audit warnings, and generate standard investment memos with PDF exports.
              </p>
            </div>

            <button
              onClick={() => onSelectView('audit')}
              className="mt-8 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.01]"
            >
              Launch Auditor Workspace
            </button>
          </div>

          {/* Card B: Market Chat Analysis */}
          <div className="group relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 transition-all duration-300 shadow-md hover:shadow-2xl hover:border-blue-500/30 flex flex-col justify-between hover:scale-[1.02] overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full group-hover:scale-150 transition-transform duration-300"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-2xl w-fit">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-955 dark:text-white">
                Market Analysis Assistant
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Query sectors, request list recommendations, or evaluate side-by-side multiple comparisons. The assistant dynamically extracts tickers, queries Yahoo Finance, and builds formatted multi-metrics charts.
              </p>
            </div>

            <button
              onClick={() => onSelectView('market-chat')}
              className="mt-8 w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-[1.01]"
            >
              Open Chat Assistant
            </button>
          </div>

        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full shrink-0 border-t border-slate-200 dark:border-white/5 py-5 px-8 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 relative z-20 bg-white/30 dark:bg-dark-950/30">
        <span>QuantTerminal Suite &copy; 2026. Institutional Grade.</span>
        <span>Secure connection established</span>
      </footer>

    </div>
  );
}
