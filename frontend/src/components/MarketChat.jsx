import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, MessageSquare, Loader2, LineChart, Sparkles } from 'lucide-react';
import MarkdownContent from './MarkdownContent.jsx';

/**
 * conversational chat interface for market queries, ticker metrics, and comparisons.
 */
export default function MarketChat({ token, onBackToMenu }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Market Analysis Assistant. You can ask me sector trends, compare multiples side-by-side (e.g., Apple vs Nvidia), or query specific company metrics. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const msg = textToSend || input.trim();
    if (!msg) return;

    if (!textToSend) setInput('');

    // Append user message
    const updatedMessages = [...messages, { role: 'user', content: msg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: msg,
          history: updatedMessages.slice(-6) // Send recent history for context
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate response.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const suggestionPrompts = [
    "Compare AAPL and NVDA profit margins side-by-side",
    "I want some top performing tech companies to invest in",
    "Show valuation multiples for Tesla (TSLA) and Microsoft (MSFT)",
    "What are some high-yield dividend stocks in finance?"
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-dark-900 transition-colors duration-300 font-sans">
      
      {/* 1. Header Toolbar */}
      <header className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 glass bg-white/70 dark:bg-dark-900/70 z-10 relative">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToMenu}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300"
            title="Back to Suite Menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="bg-blue-500 text-white p-2 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Market Analysis Agent</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Conversational Valuation & Sector Queries</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-blue-500 dark:text-blue-400 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Real-time Financial Data Connected</span>
        </div>
      </header>

      {/* 2. Chat Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 select-text">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex items-start space-x-3 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar Icon */}
                  <div className={`p-2 rounded-xl shrink-0 ${isUser ? 'bg-slate-205 dark:bg-slate-700 text-slate-800 dark:text-slate-100' : 'bg-blue-500 text-white'}`}>
                    {isUser ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider">ME</span>
                    ) : (
                      <LineChart className="w-4 h-4" />
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div className={`p-5 rounded-2xl border ${
                    isUser 
                      ? 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-100' 
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10 shadow-sm text-black dark:text-white'
                  }`}>
                    {isUser ? (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="markdown-content text-sm leading-relaxed font-sans">
                        <MarkdownContent content={msg.content} />
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 text-white p-2 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 bg-white dark:bg-dark-950/40 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-slate-400 font-semibold italic flex items-center space-x-2">
                  <span>Assistant is analyzing company indicators...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3. Input & suggestions panel */}
      <div className="shrink-0 p-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-dark-900/40 glass z-10 relative">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* Quick suggestions panel */}
          {messages.length === 1 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                Suggested Scenarios & Comparisons:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestionPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 bg-slate-100/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 transition-all font-semibold hover:scale-[1.01]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Input Row */}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              placeholder="Ask sector recommendations or side-by-side financial comparisons (e.g., AAPL and MSFT margins)..."
              className="flex-1 bg-slate-100 dark:bg-dark-800/80 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 text-sm"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="p-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50 disabled:hover:scale-100 hover:scale-105 shadow-md shadow-blue-500/10 flex items-center justify-center shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
