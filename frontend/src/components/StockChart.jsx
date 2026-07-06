import React from 'react';
import { Activity } from 'lucide-react';

/**
 * Reusable Sparkline chart displaying a 30-day closing trend.
 */
export default function StockChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-405 text-xs border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-4 bg-slate-150 dark:bg-slate-900/30">
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
