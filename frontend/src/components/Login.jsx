import React, { useState } from 'react';
import { Lock, User, KeyRound, Loader2, ArrowRight } from 'lucide-react';

export default function Login({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Auth Card */}
      <div className="w-full max-w-md relative z-10 glass rounded-3xl shadow-2xl p-8 border border-white/10 text-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-400 mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Antigravity Intel
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isLogin ? 'Sign in to access your investment terminal' : 'Create a new quantitative audit account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold py-3 px-4 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setUsername('');
                setPassword('');
              }}
              className="ml-2 text-emerald-400 hover:text-emerald-300 font-semibold focus:outline-none"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
