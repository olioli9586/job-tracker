'use client';

import React, { useState } from 'react';
import { TrendingUp, Lock } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = '/';
      } else {
        setError('Wrong password. Try again.');
        setSubmitting(false);
      }
    } catch {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="hub-card p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%)', boxShadow: '0 0 16px var(--accent-glow)' }}>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>Job Hunt Hub</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>private tracker</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 pl-9 text-sm rounded-lg focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                placeholder="Enter password"
              />
              <Lock className="w-3.5 h-3.5 absolute left-3 top-3.5" style={{ color: 'var(--text-3)' }} />
            </div>
          </div>

          {error && (
            <div className="text-xs" style={{ color: '#d9a29a' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={!password || submitting}
            className="w-full py-2.5 text-sm font-semibold rounded-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', color: '#000' }}
          >
            {submitting ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </main>
  );
}
