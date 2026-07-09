import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import HomeSelector from './components/HomeSelector.jsx';
import MarketChat from './components/MarketChat.jsx';
import { LineChart, Sun, Moon, LogOut, Bell } from 'lucide-react';

const tickerData = [
  { ticker: 'AAPL', price: '182.30', change: '+1.65%', isUp: true },
  { ticker: 'TSLA', price: '168.10', change: '-2.40%', isUp: false },
  { ticker: 'MSFT', price: '415.60', change: '+0.88%', isUp: true },
  { ticker: 'NVDA', price: '875.12', change: '+3.45%', isUp: true },
  { ticker: 'AMD', price: '172.50', change: '-1.25%', isUp: false },
  { ticker: 'AMZN', price: '178.45', change: '+1.12%', isUp: true },
  { ticker: 'GOOGL', price: '152.35', change: '+0.45%', isUp: true },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [reportsList, setReportsList] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [researching, setResearching] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [tickers, setTickers] = useState(tickerData);

  const navigate = useNavigate();
  const location = useLocation();

  // Fetch real-time quotes directly from Finnhub 
  const fetchRealtimeTickerData = async () => {
    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
    const symbols = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMD', 'AMZN', 'GOOGL'];

    try {
      const quotes = await Promise.all(
        symbols.map(async (symbol) => {
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
          if (!response.ok) throw new Error("HTTP error");
          const data = await response.json();
          if (data && typeof data.c === 'number') {
            const price = data.c.toFixed(2);
            const dp = data.dp || 0;
            const change = `${dp >= 0 ? '+' : ''}${dp.toFixed(2)}%`;
            const isUp = dp >= 0;
            return { ticker: symbol, price, change, isUp };
          }
          throw new Error("Invalid response schema");
        })
      );
      setTickers(quotes);
    } catch (error) {
      // Apply active random-walk fluctuations on the client side to keep the marquee moving dynamically
      setTickers((prevTickers) =>
        prevTickers.map((t) => {
          const basePrice = parseFloat(t.price) || 150.00;
          const baseChange = parseFloat(t.change) || 0.0;
          const fluctuation = 1 + (Math.random() * 0.002 - 0.001); // Minor ±0.1% walk
          const newPrice = (basePrice * fluctuation).toFixed(2);
          const newChangeVal = baseChange + (Math.random() * 0.1 - 0.05);
          const change = `${newChangeVal >= 0 ? '+' : ''}${newChangeVal.toFixed(2)}%`;
          const isUp = newChangeVal >= 0;
          return { ...t, price: newPrice, change, isUp };
        })
      );
    }
  };

  // Run initial fetch and set up 10-second update interval
  useEffect(() => {
    fetchRealtimeTickerData();
    const interval = setInterval(fetchRealtimeTickerData, 10 * 1000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Sync token to localStorage
  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newToken ? newUser : null);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveReport(null);
    setReportsList([]);
    navigate('/login');
  };

  // Toggle Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch report generation history
  const fetchHistory = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/research/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReportsList(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

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

  // Trigger manual news poll & summarization
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

  // Setup notification polling
  useEffect(() => {
    if (!token) return;
    fetchNotifications();

    const triggerInitialCrawl = async () => {
      try {
        await fetch('/api/notifications/poll-now', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [token]);

  // Select a specific report from sidebar
  const handleSelectReport = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/research/report/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveReport(data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  // Delete a report
  const handleDeleteReport = async (id) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this research report?')) return;
    try {
      const response = await fetch(`/api/research/report/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setReportsList(reportsList.filter(r => r.id !== id));
        if (activeReport?.id === id) {
          setActiveReport(null);
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  // Trigger new agent research run
  const handleTriggerResearch = async (companyName) => {
    if (!token) return;
    setResearching(true);
    setLogs([]);
    setActiveReport(null);
    
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyName })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate research.');
      }
      
      setCurrentJobId(data.reportId);
    } catch (error) {
      console.error('Error starting research:', error);
      alert(error.message);
      setResearching(false);
    }
  };

  // Background Job Status Poller
  useEffect(() => {
    if (!currentJobId || !researching) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/research/status/${currentJobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;

        const data = await response.json();
        setLogs(data.logs || []);

        if (data.status === 'finished') {
          clearInterval(interval);
          setResearching(false);
          setCurrentJobId(null);
          await fetchHistory(); // refresh sidebar history
          await handleSelectReport(data.id); // load completed report
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setResearching(false);
          setCurrentJobId(null);
          alert(`Research run failed. Check execution log.`);
          await fetchHistory();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentJobId, researching, token]);

  // Download Report as Markdown File
  const handleDownloadMarkdown = (report) => {
    if (!report || !report.reportSections) return;
    
    const markdownContent = report.reportSections.fullReport || `
# Investment Memo: ${report.companyName} (${report.ticker})

## 1. Summary
${report.reportSections.summary || ''}

## 2. Financial Analysis
${report.reportSections.financialAnalysis || ''}

## 3. Business Analysis
${report.reportSections.businessAnalysis || ''}

## 4. Competitive Position
${report.reportSections.competitivePosition || ''}

## 5. Valuation
${report.reportSections.valuation || ''}

## 6. Risks
${report.reportSections.risks || ''}

## 7. Opportunities
${report.reportSections.opportunities || ''}

## 8. Investment Thesis
${report.reportSections.investmentThesis || ''}
`;

    const blob = new Blob([markdownContent.trim()], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.companyName.replace(/\s+/g, '_')}_Investment_Memo.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-dark-900 dark:text-slate-100 font-sans transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={!token ? <Login onAuthSuccess={handleAuthSuccess} /> : <Navigate to="/" replace />} 
        />

        {/* Protected Application Routes */}
        <Route 
          path="/*" 
          element={
            token ? (
              <div className="h-screen flex flex-col overflow-hidden w-full">
                {/* 1. PERSISTENT GLOBAL HEADER TOOLBAR WITH FLOATING TICKER */}
                <div className="w-full shrink-0 border-b border-slate-200 dark:border-white/5 relative z-40 bg-white/70 dark:bg-dark-900/70 glass">
                  
                  {/* Stock Marquee */}
                  <div className="w-full bg-slate-900 text-white py-2 overflow-hidden select-none border-b border-white/5 flex items-center relative z-20">
                    <div className="flex animate-marquee whitespace-nowrap text-xs font-mono font-bold tracking-wider">
                      {tickers.concat(tickers).concat(tickers).concat(tickers).map((stock, idx) => (
                        <span key={idx} className="inline-flex items-center mr-16">
                          <span>{stock.ticker}</span>
                          <span className="text-slate-300 ml-2">${stock.price}</span>
                          <span className={`inline-flex items-center ml-2 ${stock.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stock.isUp ? '▲' : '▼'} {stock.change}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Header Toolbar */}
                  <header className="px-8 py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => navigate('/')}>
                      <div className="bg-emerald-500 text-slate-955 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                        <LineChart className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-md font-black tracking-wider text-slate-955 dark:text-white uppercase leading-none">
                          QuantTerminal
                        </h1>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-1">
                          Intelligence Suite
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Quick menu navigation tag */}
                      {location.pathname !== '/' && (
                        <button
                          onClick={() => navigate('/')}
                          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all font-semibold"
                        >
                          Suite Menu
                        </button>
                      )}

                      {/* Theme Toggle */}
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300"
                        title="Toggle Theme"
                      >
                        {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                      </button>

                      {/* Notification Bell Dropdown Container */}
                      <div className="relative">
                        <button
                          onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                          className="relative p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300"
                          title="Notifications"
                        >
                          <Bell className="w-4 h-4" />
                          {notifications.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white dark:border-dark-900 shadow-md animate-pulse">
                              {notifications.length}
                            </span>
                          )}
                        </button>

                        {showNotifDropdown && (
                          <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto glass border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-4 bg-white dark:bg-dark-800">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5 mb-3">
                              <span className="text-xs font-bold text-slate-800 dark:text-white">Alerts & Summaries</span>
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
                                  No new notifications
                                </div>
                              ) : (
                                notifications.map(notif => (
                                  <div key={notif.id} className="p-3 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/3 rounded-xl text-left">
                                    <div className="flex justify-between items-start">
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20">{notif.ticker}</span>
                                      <span className="text-[9px] text-slate-400">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-xs font-bold mt-1 text-black dark:text-white">{notif.title}</h4>
                                    <p className="text-[11px] text-black dark:text-slate-350 leading-normal mt-1">{notif.message}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl border border-red-200 dark:border-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/5 text-red-600 dark:text-red-400 transition-all font-semibold text-sm"
                        title="Log Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </header>
                </div>

                {/* 2. ACTIVE VIEW AREA */}
                <div className="flex-1 flex overflow-hidden relative z-10 w-full">
                  <Routes>
                    <Route path="/" element={<HomeSelector user={user} />} />
                    <Route path="/chat" element={<MarketChat token={token} onBackToMenu={() => navigate('/')} />} />
                    <Route 
                      path="/audit" 
                      element={
                        <div className="flex-1 flex overflow-hidden w-full">
                          {/* Sidebar navigation */}
                          <Sidebar 
                            reportsList={reportsList}
                            activeReport={activeReport}
                            onSelectReport={handleSelectReport}
                            onDeleteReport={handleDeleteReport}
                            onNewResearch={() => {
                              setActiveReport(null);
                              setResearching(false);
                              setCurrentJobId(null);
                            }}
                            onLogout={handleLogout}
                            onBackToMenu={() => navigate('/')}
                            user={user}
                          />

                          {/* Main dashboard body */}
                          <main className="flex-1 flex flex-col relative overflow-hidden">
                            <Dashboard 
                              activeReport={activeReport}
                              researching={researching}
                              logs={logs}
                              onTriggerResearch={handleTriggerResearch}
                              onDownloadMarkdown={handleDownloadMarkdown}
                              token={token}
                              darkMode={darkMode}
                              setDarkMode={setDarkMode}
                            />
                          </main>
                        </div>
                      } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </div>
  );
}
