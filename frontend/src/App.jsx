import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import HomeSelector from './components/HomeSelector.jsx';
import MarketChat from './components/MarketChat.jsx';

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

  // Render Suite Selector Landing Menu
  if (view === 'menu') {
    return (
      <HomeSelector 
        user={user} 
        onSelectView={setView} 
        onLogout={handleLogout} 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  // Render Conversational Market Assistant View
  if (view === 'market-chat') {
    return (
      <MarketChat 
        token={token} 
        onBackToMenu={() => setView('menu')}
      />
    );
  }

  // Default: Render Auditor Agent Workspace
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-dark-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
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
  );
}
