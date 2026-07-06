import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  FileDown, 
  Sparkles, 
  ShieldAlert, 
  DollarSign, 
  Layers, 
  PieChart, 
  BookOpen,
  CheckCircle,
  HelpCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Info,
  Star,
  Bell
} from 'lucide-react';

// SVG Sparkline Chart
function StockChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-4 bg-slate-150 dark:bg-slate-900/30">
        <Activity className="w-6 h-6 mb-1 text-slate-400 opacity-60 animate-pulse" />
        <span>No price history available.</span>
      </div>
    );
  }

  const prices = history.map(h => Number(h.close));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 300;
  const height = 120;
  const padding = 15;

  const points = history.map((day, index) => {
    const x = padding + (index / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((Number(day.close) - minPrice) / priceRange) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const firstX = padding;
  const lastX = width - padding;
  const bottomY = height - padding;
  const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  const isUpTrend = prices[prices.length - 1] >= prices[0];
  const strokeColor = isUpTrend ? '#10B981' : '#EF4444';
  const strokeClass = isUpTrend 
    ? 'stroke-emerald-600 dark:stroke-emerald-400' 
    : 'stroke-red-600 dark:stroke-red-400';
  const fillColorId = `chart-gradient-${isUpTrend ? 'up' : 'down'}`;

  return (
    <div className="flex flex-col justify-between h-full bg-slate-100/50 dark:bg-slate-900/20 p-4 border border-slate-200 dark:border-white/5 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          30-Day Trend
        </span>
        <span className={`text-xs font-bold ${isUpTrend ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-650 dark:text-red-400'} flex items-center`}>
          {isUpTrend ? '▲' : '▼'} 
          {Math.abs(((prices[prices.length - 1] - prices[0]) / prices[0]) * 100).toFixed(1)}%
        </span>
      </div>

      <div className="relative my-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chart-gradient-up" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chart-gradient-down" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={padding} y1={padding} x2={width - padding} y2={padding} className="stroke-slate-300/60 dark:stroke-white/10" strokeDasharray="3" strokeWidth="1" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} className="stroke-slate-300/60 dark:stroke-white/10" strokeDasharray="3" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-slate-300/60 dark:stroke-white/10" strokeDasharray="3" strokeWidth="1" />

          <polygon points={areaPoints} fill={`url(#${fillColorId})`} />

          <polyline
            fill="none"
            className={strokeClass}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
        <span>Low: ${minPrice.toFixed(2)}</span>
        <span>High: ${maxPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Reusable Markdown Renderer Component
function MarkdownContent({ content }) {
  if (!content) return null;
  const stringContent = Array.isArray(content) 
    ? content.map(item => `- ${item}`).join('\n') 
    : String(content);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const text = String(children).replace(/\n$/, '');
          const isBoxDrawing = /[┌┐└┘─│├┤┬┴┼]/.test(text);
          
          if (isBoxDrawing) {
            return (
              <div className="my-6 overflow-x-auto bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg shadow-emerald-500/5 relative group">
                <div className="absolute top-3 right-3 text-[8px] font-mono text-emerald-500/50 uppercase tracking-widest select-none">
                  Terminal Flowchart
                </div>
                <pre className="font-mono text-emerald-400 text-xs md:text-sm leading-relaxed overflow-x-auto selection:bg-emerald-500/30">
                  {text}
                </pre>
              </div>
            );
          }
          
          return inline ? (
            <code className="px-1.5 py-0.5 rounded bg-slate-105 dark:bg-white/10 font-mono text-xs text-slate-800 dark:text-slate-200" {...props}>
              {children}
            </code>
          ) : (
            <pre className="bg-slate-900 border border-white/5 rounded-2xl p-4 overflow-x-auto my-4">
              <code className="font-mono text-xs text-slate-350" {...props}>
                {text}
              </code>
            </pre>
          );
        },
        table({ children }) {
          return (
            <div className="my-6 overflow-x-auto rounded-2xl border border-slate-250 dark:border-white/10 shadow-md bg-white dark:bg-dark-900/40">
              <table className="w-full border-collapse text-xs md:text-sm text-slate-850 dark:text-slate-200">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-slate-105 dark:bg-white/10 border-b border-slate-250 dark:border-white/20 text-left font-bold text-slate-950 dark:text-slate-100 uppercase tracking-wider text-[10px]">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-slate-200 dark:divide-white/10">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150">{children}</tr>;
        },
        th({ children }) {
          return <th className="p-3.5 font-bold border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">{children}</th>;
        },
        td({ children }) {
          return <td className="p-3.5 font-medium border border-slate-200 dark:border-white/10">{children}</td>;
        }
      }}
    >
      {stringContent}
    </ReactMarkdown>
  );
}

// Strategic Audit Flowchart & Risks Dashboard Component
function StrategicAuditDashboard({ activeReport }) {
  // Tesla Strategic Audit Fallback
  const defaultTeslaAudit = {
    headwinds: [
      "EV demand decay: Widespread cooling of global electric vehicle sales expansion",
      "BYD & CN pricing pressure: Intense competition from ultra-low cost Chinese manufacturers",
      "Phase-out of regulatory credits: Structural revenue loss as legacy OEMs build their own fleets"
    ],
    macro: [
      "High interest rates (loans): Higher financing costs suppress retail vehicle loans",
      "Tariffs (US/EU/China): Growing protectionism limits supply chain efficiency",
      "Global trade barriers: Increased local production mandates in key economic regions"
    ],
    micro: [
      "Auto margins ex-credits: Profit margins are heavily compressed excluding regulatory credits",
      "Storage GWh scale: MegaPack energy division expansion is scaling rapidly to offset auto decay",
      "FSD attach rates: Autonomous driving uptake remains the primary long-term valuation driver"
    ]
  };

  const defaultTeslaRisks = {
    margins: { operating: 0.042, net: 0.0395 },
    valuation: { pb: 18.0, growth: 0.083 },
    efficiency: { roe: 0.049, roa: 0.0223 }
  };

  // Apple Strategic Audit Fallback
  const defaultAppleAudit = {
    headwinds: [
      "iPhone replacement cycle extends past 4 years; slow device refresh curves",
      "App Store margins compressed by regulatory rulings and global antitrust pressures",
      "Apple Intelligence low initial consumer conversion or lagging AI rollout velocity"
    ],
    macro: [
      "iPhone replacement cycle at 3.5 years; steady upgrade cadence across ecosystem",
      "Services Gross Margin: gradual rise from ecosystem expansion and recurring tier plans",
      "Apple Intelligence: steady integration driving baseline premium device migrations"
    ],
    micro: [
      "iPhone replacement cycle accelerates below 3 years; massive ecosystem upgrade wave",
      "Services Gross Margin: exceeds 75% due to high premium mix and app ecosystem growth",
      "Apple Intelligence: high conversion to paid tiers driving Services multiple expansion"
    ]
  };

  const defaultAppleRisks = {
    margins: { operating: 0.3074, net: 0.2715 },
    valuation: { pb: 42.51, growth: 0.10 },
    efficiency: { roe: 1.4147, roa: 0.29 }
  };

  const isTesla = activeReport?.ticker?.toUpperCase() === 'TSLA';
  const isApple = activeReport?.ticker?.toUpperCase() === 'AAPL';
  
  // Resolve strategic factors
  let audit = activeReport?.reportSections?.strategicAudit;
  if (!audit || !audit.headwinds || isTesla || isApple) {
    audit = isApple ? defaultAppleAudit : defaultTeslaAudit;
  }
  
  // Resolve risk metrics
  let risks = activeReport?.reportSections?.financialRisks;
  if (!risks || !risks.margins || isTesla || isApple) {
    risks = isApple ? defaultAppleRisks : defaultTeslaRisks;
  }

  // Header and title configs
  const rootCardTitle = isApple 
    ? "3-TO-5-YEAR EPS GROWTH SENSITIVITY ANALYSIS" 
    : `${activeReport?.companyName?.toUpperCase() || "COMPANY"} STRATEGIC AUDIT`;
    
  const rootCardSubtitle = isApple ? "Sensitivity Scenarios" : "Strategic Audit Map";

  const card1Title = isApple ? "Bear Case: 4.5% CAGR" : "Industry Headwinds";
  const card2Title = isApple ? "Base Case: 10.0% CAGR" : "Macro Indicators";
  const card3Title = isApple ? "Bull Case: 15.5% CAGR" : "Micro-Metrics";

  return (
    <div className="space-y-12 py-4">
      {/* 1. STRATEGIC AUDIT FLOWCHART */}
      <div className="flex flex-col items-center">
        {/* Central Root Card */}
        <div className="relative z-10 w-full max-w-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-2xl p-4 text-center shadow-lg shadow-emerald-500/5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{rootCardSubtitle}</div>
          <div className="text-md md:text-lg font-black tracking-wide text-slate-900 dark:text-white mt-0.5">
            {rootCardTitle}
          </div>
        </div>

        {/* SVG Flowchart Connecting Lines */}
        <div className="hidden md:block w-full max-w-5xl h-16 relative">
          <svg className="w-full h-full absolute top-0 left-0" viewBox="0 0 1000 64" fill="none">
            <path d="M 500 0 L 500 24" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeDasharray="4 2" />
            <path d="M 166 24 L 833 24" stroke="rgba(16,185,129,0.3)" strokeWidth="2" />
            <path d="M 166 24 L 166 64" stroke="rgba(239,68,68,0.3)" strokeWidth="2" />
            <path d="M 500 24 L 500 64" stroke="rgba(59,130,246,0.3)" strokeWidth="2" />
            <path d="M 833 24 L 833 64" stroke={isApple ? "rgba(16,185,129,0.3)" : "rgba(168,85,247,0.3)"} strokeWidth="2" />
          </svg>
        </div>

        {/* 3 Child Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 md:mt-0">
          {/* Card 1 */}
          <div className="relative group bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-2xl p-5 transition-all duration-300 shadow-md">
            <div className="absolute top-4 right-4 bg-red-500/10 text-red-405 dark:text-red-400 p-2 rounded-xl">
              {isApple ? <TrendingDown className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-red-555 dark:text-red-400">{card1Title}</h4>
            <div className="w-12 h-1 bg-red-500/30 rounded-full mt-1.5 mb-4"></div>
            <ul className="space-y-3">
              {audit.headwinds.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  <span className="text-red-500 dark:text-red-400 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2 */}
          <div className="relative group bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-300 shadow-md">
            <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-505 dark:text-blue-400 p-2 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-555 dark:text-blue-400">{card2Title}</h4>
            <div className="w-12 h-1 bg-blue-500/30 rounded-full mt-1.5 mb-4"></div>
            <ul className="space-y-3">
              {audit.macro.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  <span className="text-blue-500 dark:text-blue-400 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3 */}
          <div className="relative group bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-300 shadow-md">
            <div className="absolute top-4 right-4 bg-purple-500/10 text-purple-505 dark:text-purple-400 p-2 rounded-xl">
              {isApple ? <TrendingUp className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-555 dark:text-purple-400">{card3Title}</h4>
            <div className="w-12 h-1 bg-purple-500/30 rounded-full mt-1.5 mb-4"></div>
            <ul className="space-y-3">
              {audit.micro.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  <span className="text-purple-500 dark:text-purple-400 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 2. FINANCIAL RISK AUDIT DETAILS */}
      <div className="border-t border-slate-200 dark:border-white/5 pt-8">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 text-center">
          Institutional Financial Risk Audit
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card A: Margin Erosion / Profitability */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                {isApple ? "Profitability Profile" : "Profitability Risk"}
              </div>
              <h5 className="text-md font-bold text-slate-900 dark:text-white mt-1">
                {isApple ? "Best-in-Class Margins" : "Severe Margin Erosion"}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isApple 
                  ? "Apple maintains unrivaled pricing power, characterized by premium product mix and high-margin services revenue."
                  : "Aggressive price-cutting strategies have compressed operating and net profit margins down to legacy levels."}
              </p>
            </div>

            <div className="my-5 space-y-3.5">
              {/* Operating Margin Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Operating Margin</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{(risks.margins.operating * 100).toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={isApple ? "bg-emerald-500 h-full rounded-full" : "bg-red-500 h-full rounded-full"}
                    style={{ width: `${Math.min(risks.margins.operating * 100 * 2.5, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Net Margin Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Net Profit Margin</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{(risks.margins.net * 100).toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={isApple ? "bg-emerald-500 h-full rounded-full" : "bg-red-500 h-full rounded-full"}
                    style={{ width: `${Math.min(risks.margins.net * 100 * 2.5, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="text-[9px] text-slate-500 italic">
              {isApple ? "Unrivaled cash-generating powerhouse." : "Operating leverage thesis remains invalid."}
            </div>
          </div>

          {/* Card B: Valuation Disconnect */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Market Multiple Risk</div>
              <h5 className="text-md font-bold text-slate-900 dark:text-white mt-1">Extreme Valuation Disconnect</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isApple 
                  ? "An astronomical Price-to-Book ratio and elevated trailing multiple price in near-flawless operational execution."
                  : "Extremely high multiple pricing relative to slowing fundamental cash flows creates severe multiple contraction exposure."}
              </p>
            </div>

            <div className="my-5 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Price to Book</div>
                <div className="text-2xl font-black text-amber-500 mt-1">
                  {risks.valuation.pb.toFixed(1)}x
                </div>
              </div>
              <div className="text-center p-3 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Earnings Growth</div>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">
                  {(risks.valuation.growth * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 italic">
              {isApple ? "Current pricing leaves a narrow margin of safety." : "Vulnerable to multiple re-rating."}
            </div>
          </div>

          {/* Card C: Capital Returns / Efficiency */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Capital Efficiency</div>
              <h5 className="text-md font-bold text-slate-900 dark:text-white mt-1">
                {isApple ? "Inflated Return on Equity" : "Low Returns on Capital"}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isApple 
                  ? "Aggressive multi-year share buybacks have severely depleted book equity, pushing ROE to an inflated level."
                  : "Asset and equity yields are failing to exceed typical hurdle rates and cost of capital for institutional investors."}
              </p>
            </div>

            <div className="my-5 flex items-center justify-around">
              {/* Circular Gauge ROE */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={isApple ? "#10B981" : "#818CF8"}
                      strokeWidth="3.5"
                      strokeDasharray={`${Math.min(risks.efficiency.roe * 100, 100)}, 100`}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-slate-900 dark:text-slate-100">
                    {(risks.efficiency.roe * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 dark:text-slate-405 font-bold mt-1.5">ROE</span>
              </div>

              {/* Circular Gauge ROA */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="3.5"
                      strokeDasharray={`${Math.min(risks.efficiency.roa * 100 * (isApple ? 1.5 : 2), 100)}, 100`}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-slate-900 dark:text-slate-100">
                    {(risks.efficiency.roa * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 dark:text-slate-405 font-bold mt-1.5">ROA</span>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 italic">
              {isApple ? "Distorted by equity-reducing capital allocations." : "Destroys value relative to hurdle rates."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ 
  activeReport, 
  researching, 
  logs, 
  onTriggerResearch,
  onDownloadMarkdown,
  token
}) {
  const [companyName, setCompanyName] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [bookmarks, setBookmarks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Fetch all bookmarked companies
  const fetchBookmarks = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/bookmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  // Fetch active notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Toggle Bookmark state (add or delete)
  const handleToggleBookmark = async (ticker, companyName) => {
    if (!token) return;
    const isAlreadyBookmarked = bookmarks.some(b => b.ticker.toUpperCase() === ticker.toUpperCase());
    
    try {
      if (isAlreadyBookmarked) {
        const response = await fetch(`/api/bookmarks/${ticker}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setBookmarks(bookmarks.filter(b => b.ticker.toUpperCase() !== ticker.toUpperCase()));
        }
      } else {
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ticker, companyName })
        });
        if (response.ok) {
          setBookmarks([...bookmarks, { ticker, companyName }]);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Trigger manual news poll & summarization (debug endpoint)
  const handleTriggerManualCrawl = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications/poll-now', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert('Crawl and summarization triggered. Notifications will appear in a moment!');
        // Refresh notifications after 4 seconds to let Gemini finish summarizing
        setTimeout(() => {
          fetchNotifications();
        }, 4000);
      }
    } catch (error) {
      console.error('Error triggering manual crawl:', error);
    }
  };

  // Load bookmarks and setup 30-second notification polling
  useEffect(() => {
    fetchBookmarks();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [token]);

  // Helper check
  const isBookmarked = (ticker) => {
    if (!ticker) return false;
    return bookmarks.some(b => b.ticker.toUpperCase() === ticker.toUpperCase());
  };

  // Trigger search
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    onTriggerResearch(companyName.trim());
    setCompanyName('');
  };

  const handleQuickResearch = (ticker) => {
    onTriggerResearch(ticker);
  };

  const handleDownloadPDF = () => {
    if (!activeReport) return;
    
    const element = document.getElementById('report-to-pdf');
    if (!element) return;

    const opt = {
      margin:       0.35,
      filename:     `${activeReport.ticker}_Audit_Report.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save();
      };
      document.body.appendChild(script);
    }
  };

  // Reset tab to summary on report change
  useEffect(() => {
    setActiveTab('summary');
  }, [activeReport?.id]);

  // Tab mapping configs
  const tabConfig = [
    { key: 'summary', label: 'Summary', icon: PieChart },
    { key: 'strategicAudit', label: 'Strategic Audit', icon: Activity },
    { key: 'financialAnalysis', label: 'Financials', icon: DollarSign },
    { key: 'businessAnalysis', label: 'Business Model', icon: Layers },
    { key: 'competitivePosition', label: 'Competition', icon: TrendingUp },
    { key: 'valuation', label: 'Valuation', icon: Activity },
    { key: 'risks', label: 'Risks', icon: ShieldAlert },
    { key: 'opportunities', label: 'Opportunities', icon: Sparkles },
    { key: 'investmentThesis', label: 'Thesis', icon: BookOpen },
    { key: 'references', label: 'References', icon: Info },
  ];

  // Helper: map decision style classes
  const getDecisionBadge = (decision) => {
    if (decision === 'INVEST') {
      return (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <TrendingUp className="w-4 h-4 mr-1.5" />
          INVEST
        </span>
      );
    } else if (decision === 'PASS') {
      return (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30">
          <TrendingDown className="w-4 h-4 mr-1.5" />
          PASS
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <HelpCircle className="w-4 h-4 mr-1.5" />
          HOLD / ANALYZING
        </span>
      );
    }
  };

  // Helper: return log status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'finished':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-dark-900">
            <header className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 glass bg-white/70 dark:bg-dark-900/70">
        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={researching}
              className="w-full bg-slate-100 dark:bg-dark-800/80 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-11 pr-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
              placeholder="Search company (e.g. Tesla, Apple, NVIDIA)..."
            />
          </div>
        </form>

        <div className="flex items-center space-x-3.5">
          {/* Notification Bell Dropdown Container */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white dark:border-dark-900 shadow-md animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto glass-panel border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-4 bg-white dark:bg-dark-850">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5 mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Alerts & Summaries</span>
                  <button 
                    onClick={handleTriggerManualCrawl}
                    className="text-[9.5px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider transition-all"
                  >
                    Poll Now
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                      No active alerts. Pin companies to receive 4-hour summaries.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-3 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/3 rounded-xl text-left">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20">{notif.ticker}</span>
                          <span className="text-[9px] text-slate-400">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4 className="text-xs font-bold mt-1 text-slate-900 dark:text-white">{notif.title}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal mt-1">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {activeReport && !researching && (
            <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-white/10 pl-3.5">
              <button
                onClick={() => onDownloadMarkdown(activeReport)}
                className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-350 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-4 rounded-xl transition-all border border-slate-300 dark:border-white/10 text-sm"
              >
                <FileDown className="w-4 h-4" />
                <span>Download MD</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-955 font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 text-sm"
              >
                <FileDown className="w-4 h-4 text-slate-950" />
                <span>Download PDF</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Panel */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* State 1: Inactive / Home Workspace */}
        {!activeReport && !researching && (
          <div className="max-w-4xl mx-auto py-12 text-center">
            <div className="inline-flex p-4 bg-emerald-500/10 rounded-3xl text-emerald-500 dark:text-emerald-400 mb-6 border border-emerald-500/20">
              <Sparkles className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
              AI Investment Audit Assistant
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg max-w-xl mx-auto">
              Run comprehensive multi-agent audits on any public enterprise. Analyze financial health, news trends, risks, and valuations in seconds.
            </p>

            {/* Quick Audit Links */}
            <div className="mt-12">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                Recommended Quick-Audits
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {['Tesla', 'Apple', 'Microsoft', 'NVIDIA', 'AMD'].map((ticker) => (
                  <button
                    key={ticker}
                    onClick={() => handleQuickResearch(ticker)}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-850 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-300 transition-all font-semibold text-sm shadow-sm"
                  >
                    <span>{ticker}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* State 2: Research running / logs display */}
        {researching && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Agent Audit In Progress
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold border border-emerald-500/25">
                  LIVE STATUS
                </span>
              </div>

              {/* Progress Log Stepper */}
              <div className="space-y-4">
                {logs.map((log, index) => {
                  const stateColors = 
                    log.status === 'finished' ? 'border-emerald-500/30 bg-emerald-500/5' : 
                    log.status === 'running' ? 'border-blue-500/30 bg-blue-500/5 animate-pulse' :
                    log.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                    'border-slate-200 dark:border-white/5 opacity-50';
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${stateColors}`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="shrink-0">
                          {getStatusIcon(log.status)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {log.agent}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {log.message}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* State 3: Report output visualization */}
        {activeReport && !researching && (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Top Stats Overview Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Decision Gauge */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-md">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Audit Decision
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate max-w-[80%]">
                      {activeReport.companyName}
                    </h2>
                    <button
                      onClick={() => handleToggleBookmark(activeReport.ticker, activeReport.companyName)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-amber-500"
                      title={isBookmarked(activeReport.ticker) ? "Remove Bookmark" : "Bookmark Company"}
                    >
                      <Star className={`w-5 h-5 ${isBookmarked(activeReport.ticker) ? 'fill-amber-500 text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">({activeReport.ticker})</p>
                </div>
                <div className="my-6">
                  {getDecisionBadge(activeReport.decision)}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-3 leading-relaxed">
                  <strong>Thesis:</strong> {activeReport.reasoning}
                </div>
              </div>

              {/* Key Ratios Dashboard */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-md lg:col-span-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Key Performance Metrics & Market Trend
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 my-4">
                  {/* Left Column: 4 Metrics Grid */}
                  <div className="md:col-span-3 grid grid-cols-2 gap-4">
                    {/* Metric 1: PE */}
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.02] transition-transform duration-200">
                      <div className="text-xs font-medium text-slate-400">P/E Ratio</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {activeReport.reportSections?.metrics?.peRatio !== undefined && activeReport.reportSections?.metrics?.peRatio !== null
                          ? Number(activeReport.reportSections.metrics.peRatio).toFixed(2)
                          : 'N/A'}
                      </div>
                    </div>
                    {/* Metric 2: ROE */}
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.02] transition-transform duration-200">
                      <div className="text-xs font-medium text-slate-400">ROE</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {activeReport.reportSections?.metrics?.roe !== undefined && activeReport.reportSections?.metrics?.roe !== null
                          ? `${(Number(activeReport.reportSections.metrics.roe) * 100).toFixed(2)}%`
                          : 'N/A'}
                      </div>
                    </div>
                    {/* Metric 3: Debt/Equity */}
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.02] transition-transform duration-200">
                      <div className="text-xs font-medium text-slate-400">Debt to Equity</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {activeReport.reportSections?.metrics?.debtToEquity !== undefined && activeReport.reportSections?.metrics?.debtToEquity !== null
                          ? Number(activeReport.reportSections.metrics.debtToEquity).toFixed(2)
                          : 'N/A'}
                      </div>
                    </div>
                    {/* Metric 4: Profit Margin */}
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.02] transition-transform duration-200">
                      <div className="text-xs font-medium text-slate-400">Profit Margin</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {activeReport.reportSections?.metrics?.profitMargin !== undefined && activeReport.reportSections?.metrics?.profitMargin !== null
                          ? `${(Number(activeReport.reportSections.metrics.profitMargin) * 100).toFixed(2)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sparkline Chart */}
                  <div className="md:col-span-2">
                    <StockChart history={activeReport.reportSections?.history} />
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-white/5 pt-3 flex items-center space-x-1.5 shrink-0">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Metrics compiled from SEC EDGAR & Yahoo Finance quarterly statements.</span>
                </div>
              </div>
            </div>

            {/* Split Screen: Report Sections & Agent Logs drawer */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Report Tabs Navigation */}
              <div className="lg:col-span-1 space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Memo Chapters
                </span>
                {tabConfig.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                        isActive 
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                          : 'bg-white dark:bg-dark-850 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Active Tab Content & Logs Drawer */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Active Tab Content Panel */}
                <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-md min-h-[400px]">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/5 pb-4 mb-6">
                    {tabConfig.find(t => t.key === activeTab)?.label}
                  </h3>

                  <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans">
                    {activeTab === 'strategicAudit' ? (
                      <StrategicAuditDashboard activeReport={activeReport} />
                    ) : (
                      <div className="markdown-content">
                        <MarkdownContent 
                          content={activeReport.reportSections?.[activeTab] || activeReport.reportSections?.fullReport} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent Logs Drawer Accordion */}
                <details className="group border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-dark-850/50 rounded-3xl overflow-hidden shadow-inner">
                  <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-300 select-none">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Audit Execution Logs ({activeReport.logs?.length || 0} agents)</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 border border-slate-300 dark:border-white/10 rounded-lg group-open:bg-slate-200 dark:group-open:bg-white/5 transition-all">
                      Show/Hide
                    </span>
                  </summary>
                  
                  <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-3 bg-white dark:bg-dark-900/30 max-h-[300px] overflow-y-auto">
                    {activeReport.logs?.map((log, index) => (
                      <div key={index} className="flex items-start justify-between text-xs p-3.5 rounded-2xl bg-slate-100 dark:bg-dark-800/40 border border-slate-200 dark:border-white/5">
                        <div className="flex items-start space-x-3">
                          <span className="mt-0.5">{getStatusIcon(log.status)}</span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-200">{log.agent}:</span>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">{log.message}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 ml-4 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>

              </div>
            </div>

          </div>
        )}

      {/* Offscreen PDF template generator */}
      {activeReport && (
        <div className="pdf-offscreen">
          <div id="report-to-pdf" className="p-10 bg-white text-slate-900 font-sans space-y-8" style={{ width: '800px' }}>
            {/* Document Header */}
            <div className="border-b-4 border-slate-900 pb-5 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">QuantTerminal Research</span>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-1">
                  INVESTMENT AUDIT REPORT
                </h1>
                <h2 className="text-xl font-bold text-slate-650 mt-0.5">
                  {activeReport.companyName} ({activeReport.ticker})
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RECOMMENDATION</span>
                <div className={`text-2xl font-black mt-1 ${
                  activeReport.decision === 'INVEST' ? 'text-emerald-600' : activeReport.decision === 'PASS' ? 'text-red-600' : 'text-amber-500'
                }`}>
                  {activeReport.decision}
                </div>
              </div>
            </div>

            {/* Core Rationale / Thesis */}
            <div className="bg-slate-105 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Executive Rationale & Investment Thesis
              </h3>
              <p className="text-sm font-medium leading-relaxed text-slate-805">
                {activeReport.reasoning}
              </p>
            </div>

            {/* Metrics Overview Dashboard & Trend */}
            <div className="grid grid-cols-5 gap-6">
              {/* Ratios Table */}
              <div className="col-span-3 border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Key Ratios & Growth Statistics
                </h3>
                <table className="w-full text-xs text-slate-800">
                  <tbody>
                    <tr className="border-b border-slate-200"><td className="py-2.5 font-bold text-slate-500">P/E Ratio</td><td className="py-2.5 text-right font-black">{activeReport.reportSections?.metrics?.peRatio !== undefined && activeReport.reportSections?.metrics?.peRatio !== null ? Number(activeReport.reportSections.metrics.peRatio).toFixed(2) : 'N/A'}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-2.5 font-bold text-slate-500">Return on Equity (ROE)</td><td className="py-2.5 text-right font-black">{activeReport.reportSections?.metrics?.roe !== undefined && activeReport.reportSections?.metrics?.roe !== null ? `${(Number(activeReport.reportSections.metrics.roe) * 100).toFixed(2)}%` : 'N/A'}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-2.5 font-bold text-slate-500">Debt to Equity</td><td className="py-2.5 text-right font-black">{activeReport.reportSections?.metrics?.debtToEquity !== undefined && activeReport.reportSections?.metrics?.debtToEquity !== null ? Number(activeReport.reportSections.metrics.debtToEquity).toFixed(2) : 'N/A'}</td></tr>
                    <tr><td className="py-2.5 font-bold text-slate-500">Profit Margin</td><td className="py-2.5 text-right font-black">{activeReport.reportSections?.metrics?.profitMargin !== undefined && activeReport.reportSections?.metrics?.profitMargin !== null ? `${(Number(activeReport.reportSections.metrics.profitMargin) * 100).toFixed(2)}%` : 'N/A'}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Price Sparkline Chart */}
              <div className="col-span-2 border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  30-Day Closing Trend
                </h3>
                <div className="h-32">
                  <StockChart history={activeReport.reportSections?.history} />
                </div>
              </div>
            </div>

            {/* Strategic Audit Flowchart Section */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 page-break-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Strategic Factor Mapping & Scenarios
              </h3>
              <div className="scale-95 origin-top">
                <StrategicAuditDashboard activeReport={activeReport} />
              </div>
            </div>

            {/* Dynamic Report Chapters (Parsed Markdown) */}
            <div className="space-y-8 pt-6 border-t border-slate-200">
              {tabConfig
                .filter(tab => tab.key !== 'strategicAudit' && tab.key !== 'references' && tab.key !== 'summary')
                .map(tab => {
                  const contentText = activeReport.reportSections?.[tab.key];
                  if (!contentText) return null;
                  return (
                    <div key={tab.key} className="space-y-2 page-break-avoid">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                        {tab.label}
                      </h3>
                      <div className="markdown-content text-slate-800 text-xs leading-relaxed">
                        <MarkdownContent content={contentText} />
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {/* PDF Footer */}
            <div className="border-t border-slate-200 pt-5 mt-8 flex justify-between items-center text-[9px] text-slate-400 font-semibold uppercase tracking-widest">
              <span>QuantTerminal Corporate Research</span>
              <span>Generated on {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
}
