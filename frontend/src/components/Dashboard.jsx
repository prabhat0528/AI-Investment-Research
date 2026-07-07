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
  Bell,
  Sun,
  Moon
} from 'lucide-react';

import StockChart from './StockChart.jsx';
import MarkdownContent from './MarkdownContent.jsx';
import StrategicAuditDashboard from './StrategicAuditDashboard.jsx';

export default function Dashboard({ 
  activeReport, 
  researching, 
  logs, 
  onTriggerResearch,
  onDownloadMarkdown,
  token,
  darkMode,
  setDarkMode
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

  // Load bookmarks, trigger initial crawl, and setup 30-second notification polling
  useEffect(() => {
    fetchBookmarks();
    fetchNotifications();

    // Trigger an initial background crawl on mount to ensure fresh summaries
    const triggerInitialCrawl = async () => {
      if (!token) return;
      try {
        await fetch('/api/notifications/poll-now', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        // Wait 4 seconds for the crawl to finish, then fetch notifications again
        setTimeout(() => {
          fetchNotifications();
        }, 4000);
      } catch (e) {
        console.error('Initial notification crawl failed:', e);
      }
    };

    triggerInitialCrawl();

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
    
    // Temporarily disable dark mode on document element for clean PDF capture
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    }

    const element = document.getElementById('report-to-pdf');
    if (!element) {
      if (isDark) document.documentElement.classList.add('dark');
      return;
    }

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

    const generatePdf = () => {
      window.html2pdf().set(opt).from(element).save()
        .then(() => {
          if (isDark) document.documentElement.classList.add('dark');
        })
        .catch((err) => {
          console.error("PDF download failed:", err);
          if (isDark) document.documentElement.classList.add('dark');
        });
    };

    if (window.html2pdf) {
      generatePdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        generatePdf();
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
            <header className="relative z-30 px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 glass bg-white/70 dark:bg-dark-900/70">
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
              <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto glass-panel border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-4 bg-white dark:bg-dark-800">
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
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-800 hover:bg-emerald-50 hover:dark:bg-emerald-500/10 hover:border-emerald-300 hover:dark:border-emerald-500/30 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:dark:text-emerald-400 transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md hover:scale-[1.02]"
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
                <div className="text-sm text-slate-955 dark:text-slate-200 border-t border-slate-200 dark:border-white/5 pt-3 leading-relaxed">
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
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow-md hover:scale-[1.01] ${
                        isActive 
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                          : 'bg-white dark:bg-dark-800 hover:bg-emerald-50 hover:dark:bg-emerald-500/10 border border-slate-200 dark:border-white/5 hover:border-emerald-300 hover:dark:border-emerald-500/30 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:dark:text-emerald-400'
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
                  <h3 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100 border-b border-slate-200 dark:border-white/5 pb-4 mb-6">
                    {tabConfig.find(t => t.key === activeTab)?.label}
                  </h3>

                  <div className="text-slate-950 dark:text-slate-100 text-sm leading-relaxed font-sans">
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
                <details className="group border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-dark-800/50 rounded-3xl overflow-hidden shadow-inner">
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
          <div id="report-to-pdf" className="p-10 bg-white text-slate-900 font-sans space-y-8" style={{ width: '740px' }}>
            {/* Document Header */}
            <div className="border-b-4 border-slate-900 pb-5 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">QuantTerminal Research</span>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-1">
                  INVESTMENT AUDIT REPORT
                </h1>
                <h2 className="text-xl font-bold text-slate-800 mt-0.5">
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
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Executive Rationale & Investment Thesis
              </h3>
              <p className="text-sm font-medium leading-relaxed text-slate-800">
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
                    <div key={tab.key} className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 page-break-avoid">
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
