import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import HomeSelector from './components/HomeSelector.jsx';
import MarketChat from './components/MarketChat.jsx';
import { LineChart, Sun, Moon, LogOut } from 'lucide-react';

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
  const [view, setView] = useState('menu');

  // Sync token to localStorage
  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveReport(null);
    setReportsList([]);
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

  // Fetch report history list on load/login
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

  // If not authenticated, render Login/Signup Screen
  if (!token) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-dark-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* 1. PERSISTENT GLOBAL HEADER TOOLBAR WITH FLOATING TICKER */}
      <div className="w-full shrink-0 border-b border-slate-200 dark:border-white/5 relative z-40 bg-white/70 dark:bg-dark-900/70 glass">
        
        {/* Stock Marquee */}
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
        <header className="px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setView('menu')}>
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
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
            {view !== 'menu' && (
              <button
                onClick={() => setView('menu')}
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
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {view === 'menu' && (
          <HomeSelector 
            user={user} 
            onSelectView={setView} 
          />
        )}

        {view === 'market-chat' && (
          <MarketChat 
            token={token} 
            onBackToMenu={() => setView('menu')}
          />
        )}

        {view === 'audit' && (
          <div className="flex-1 flex overflow-hidden">
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
              onBackToMenu={() => setView('menu')}
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
        )}

      </div>

    </div>
  );
}
