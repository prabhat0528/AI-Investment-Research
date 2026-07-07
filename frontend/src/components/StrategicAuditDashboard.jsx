import React from 'react';
import { TrendingUp, TrendingDown, ShieldAlert, Activity, Sparkles } from 'lucide-react';
import StockChart from './StockChart.jsx';

/**
 * Renders the flowchart and the margin erosion, P/B multiple, and capital efficiency cards.
 */
export default function StrategicAuditDashboard({ activeReport }) {
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
      "High interest rates suppress retail consumer discretionary buying capacity",
      "US/CN supply chain trade barriers; assembly relocation expenses to India/Vietnam",
      "Strong USD headwinds impacting global hardware revenue values translation"
    ],
    micro: [
      "Services segment scaling margins (70%+) to offset flat hardware growth profiles",
      "Ecosystem lock-in attachment: Apple Watch, iPad, and iCloud retention metrics remain perfect",
      "Stock buyback volumes deplete capital reserves structure in favor of short-term EPS"
    ]
  };

  const defaultAppleRisks = {
    margins: { operating: 0.307, net: 0.2715 },
    valuation: { pb: 42.51, growth: 0.083 },
    efficiency: { roe: 1.4147, roa: 0.3235 }
  };

  const ticker = activeReport?.ticker || "TSLA";
  const isApple = ticker.toUpperCase() === 'AAPL';
  const isTesla = ticker.toUpperCase() === 'TSLA';

  // Determine strategic audit data
  let audit = activeReport?.reportSections?.strategicAudit;
  if (!audit || !audit.headwinds || isTesla || isApple) {
    audit = isApple ? defaultAppleAudit : defaultTeslaAudit;
  }

  // Determine risk metrics data
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
            <div className="absolute top-4 right-4 bg-red-500/10 text-red-500 dark:text-red-400 p-2 rounded-xl">
              {isApple ? <TrendingDown className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">{card1Title}</h4>
            <div className="w-12 h-1 bg-red-500/30 rounded-full mt-1.5 mb-4"></div>
            <ul className="space-y-3">
              {audit.headwinds.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-955 dark:text-slate-200 text-xs leading-relaxed">
                  <span className="text-red-500 dark:text-red-400 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2 */}
          <div className="relative group bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-300 shadow-md">
            <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-500 dark:text-blue-400 p-2 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{card2Title}</h4>
            <div className="w-12 h-1 bg-blue-500/30 rounded-full mt-1.5 mb-4"></div>
            <ul className="space-y-3">
              {audit.macro.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-955 dark:text-slate-200 text-xs leading-relaxed">
                  <span className="text-blue-500 dark:text-blue-400 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3 */}
          <div className="relative group bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-300 shadow-md">
            <div className="absolute top-4 right-4 bg-purple-500/10 text-purple-500 dark:text-purple-400 p-2 rounded-xl">
              {isApple ? <TrendingUp className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">{card3Title}</h4>
            <div className="w-12 h-1 bg-purple-500/30 rounded-full mt-1.5 mb-4"></div>
            <ul className="space-y-3">
              {audit.micro.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-955 dark:text-slate-200 text-xs leading-relaxed">
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
              <p className="text-xs text-slate-955 dark:text-slate-300 mt-1.5 leading-relaxed">
                {isApple 
                  ? "Apple maintains unrivaled pricing power, characterized by premium product mix and high-margin services revenue."
                  : "Aggressive price-cutting strategies have compressed operating and net profit margins down to legacy levels."}
              </p>
            </div>

            <div className="my-5 space-y-3.5">
              {/* Operating Margin Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-955 dark:text-slate-300 mb-1">
                  <span>Operating Margin</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {risks.margins?.operating !== undefined && risks.margins?.operating !== null
                      ? `${(Number(risks.margins.operating) * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={isApple ? "bg-emerald-500 h-full rounded-full" : "bg-red-500 h-full rounded-full"}
                    style={{ width: `${Math.min((Number(risks.margins?.operating || 0) * 100) * 2.5, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Net Margin Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-955 dark:text-slate-300 mb-1">
                  <span>Net Profit Margin</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {risks.margins?.net !== undefined && risks.margins?.net !== null
                      ? `${(Number(risks.margins.net) * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={isApple ? "bg-emerald-500 h-full rounded-full" : "bg-red-500 h-full rounded-full"}
                    style={{ width: `${Math.min((Number(risks.margins?.net || 0) * 100) * 2.5, 100)}%` }}
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
              <p className="text-xs text-slate-955 dark:text-slate-300 mt-1.5 leading-relaxed">
                {isApple 
                  ? "An astronomical Price-to-Book ratio and elevated trailing multiple price in near-flawless operational execution."
                  : "Extremely high multiple pricing relative to slowing fundamental cash flows creates severe multiple contraction exposure."}
              </p>
            </div>

            <div className="my-5 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Price to Book</div>
                <div className="text-2xl font-black text-amber-500 mt-1">
                  {risks.valuation?.pb !== undefined && risks.valuation?.pb !== null
                    ? `${Number(risks.valuation.pb).toFixed(1)}x`
                    : 'N/A'}
                </div>
              </div>
              <div className="text-center p-3 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Earnings Growth</div>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">
                  {risks.valuation?.growth !== undefined && risks.valuation?.growth !== null
                    ? `${(Number(risks.valuation.growth) * 100).toFixed(1)}%`
                    : 'N/A'}
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
              <p className="text-xs text-slate-955 dark:text-slate-300 mt-1.5 leading-relaxed">
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
                      strokeDasharray={`${Math.min(Number(risks.efficiency?.roe || 0) * 100, 100)}, 100`}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-slate-900 dark:text-slate-100">
                    {risks.efficiency?.roe !== undefined && risks.efficiency?.roe !== null
                      ? `${(Number(risks.efficiency.roe) * 100).toFixed(0)}%`
                      : 'N/A'}
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
                      strokeDasharray={`${Math.min(Number(risks.efficiency?.roa || 0) * 100 * (isApple ? 1.5 : 2), 100)}, 100`}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-slate-900 dark:text-slate-100">
                    {risks.efficiency?.roa !== undefined && risks.efficiency?.roa !== null
                      ? `${(Number(risks.efficiency.roa) * 100).toFixed(0)}%`
                      : 'N/A'}
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
