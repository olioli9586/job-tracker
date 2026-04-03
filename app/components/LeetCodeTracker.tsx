'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Plus, Flame, Trophy, Code2, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { LeetCodeSession } from '../types';

const TOPICS = [
  'Arrays', 'Strings', 'Trees', 'Graphs', 'Dynamic Programming',
  'Backtracking', 'Binary Search', 'Stack/Queue', 'Linked List',
  'Two Pointers', 'Sliding Window', 'Math', 'Heap', 'Other',
];

const DIFFICULTY_COLORS = {
  easy: '#10b981',   // emerald-500
  medium: '#f59e0b', // amber-500
  hard: '#f43f5e',   // rose-500
};

const TOPIC_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#ef4444', '#64748b',
];

function parseSessionDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

function calculateStreaks(sessions: LeetCodeSession[]): { current: number; best: number } {
  if (!sessions.length) return { current: 0, best: 0 };

  const uniqueDates = [...new Set(sessions.map(s => s.date))]
    .map(d => parseSessionDate(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let best = 1;
  let streak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diffMs = uniqueDates[i].getTime() - uniqueDates[i - 1].getTime();
    const diffDays = Math.round(diffMs / 86400000);
    if (diffDays === 1) {
      streak++;
      if (streak > best) best = streak;
    } else {
      streak = 1;
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const lastDate = new Date(uniqueDates[uniqueDates.length - 1]); lastDate.setHours(0, 0, 0, 0);

  const isActive =
    lastDate.getTime() === today.getTime() ||
    lastDate.getTime() === yesterday.getTime();

  return { current: isActive ? streak : 0, best };
}

interface SessionFormState {
  date: string;
  easy: number;
  medium: number;
  hard: number;
  topics: string[];
  notes: string;
}

const todayFormatted = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

const toInputDate = (mmddyyyy: string) => {
  const [m, d, y] = mmddyyyy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const fromInputDate = (yyyy_mm_dd: string) => {
  const [y, m, d] = yyyy_mm_dd.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
};

export default function LeetCodeTracker() {
  const [sessions, setSessions] = useState<LeetCodeSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SessionFormState>({
    date: todayFormatted(),
    easy: 0,
    medium: 0,
    hard: 0,
    topics: [],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchSessions = async () => {
    const res = await fetch('/api/leetcode');
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleSave = async () => {
    if (form.easy + form.medium + form.hard === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchSessions();
        setForm({ date: todayFormatted(), easy: 0, medium: 0, hard: 0, topics: [], notes: '' });
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/leetcode/${id}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const toggleTopic = (topic: string) => {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  // ── Derived stats ──
  const totalEasy = sessions.reduce((s, x) => s + x.easy, 0);
  const totalMedium = sessions.reduce((s, x) => s + x.medium, 0);
  const totalHard = sessions.reduce((s, x) => s + x.hard, 0);
  const totalSolved = totalEasy + totalMedium + totalHard;
  const { current: currentStreak, best: bestStreak } = calculateStreaks(sessions);

  // 14-day daily chart (aggregate by date)
  const get14DayData = () => {
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      const daySessions = sessions.filter(s => s.date === dateStr);
      result.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        easy: daySessions.reduce((s, x) => s + x.easy, 0),
        medium: daySessions.reduce((s, x) => s + x.medium, 0),
        hard: daySessions.reduce((s, x) => s + x.hard, 0),
      });
    }
    return result;
  };

  // Topic distribution
  const getTopicData = () => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      let topics: string[] = [];
      try { topics = JSON.parse(s.topics); } catch { /* no-op */ }
      topics.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  // Cumulative progress (all time, grouped by week for readability)
  const getCumulativeData = () => {
    if (!sessions.length) return [];
    const sorted = [...sessions].sort(
      (a, b) => parseSessionDate(a.date).getTime() - parseSessionDate(b.date).getTime()
    );
    let cumulative = 0;
    const result: { label: string; total: number }[] = [];
    const seen = new Set<string>();
    sorted.forEach(s => {
      if (!seen.has(s.date)) {
        seen.add(s.date);
        const daySessions = sessions.filter(x => x.date === s.date);
        const dayTotal = daySessions.reduce((acc, x) => acc + x.easy + x.medium + x.hard, 0);
        cumulative += dayTotal;
        const d = parseSessionDate(s.date);
        result.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, total: cumulative });
      }
    });
    return result;
  };

  const dailyData = get14DayData();
  const topicData = getTopicData();
  const cumulativeData = getCumulativeData();

  const TOOLTIP_STYLE = { backgroundColor: '#141825', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '8px', fontSize: '12px', color: '#eceef4' };
  const TICK = '#4a5270';
  const GRID = 'rgba(255,255,255,0.04)';

  return (
    <div className="space-y-5">
      {/* Stats header */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 rounded-xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d1a2e 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(139,92,246,0.7)' }}>Total Solved</div>
          <div className="stat-num text-5xl" style={{ color: '#c4b5fd' }}>{totalSolved}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(139,92,246,0.5)' }}>problems</div>
          <div className="absolute right-4 bottom-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#8b5cf6', filter: 'blur(12px)' }} />
        </div>
        {[
          { label: 'Easy', val: totalEasy, color: '#10b981', dot: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Medium', val: totalMedium, color: '#f59e0b', dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Hard', val: totalHard, color: '#f43f5e', dot: '#f43f5e', bg: 'rgba(244,63,94,0.08)' },
          { label: 'Streak', val: currentStreak, color: '#f97316', dot: '#f97316', bg: 'rgba(249,115,22,0.08)', sub: `best: ${bestStreak}d` },
        ].map(({ label, val, color, dot, bg, sub }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${dot}22` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{label}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
            </div>
            <div className="stat-num text-2xl" style={{ color }}>{val}</div>
            {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Log Session */}
      <div className="hub-card overflow-hidden">
        <button onClick={() => setShowForm(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
          style={{ color: 'var(--text-1)' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Plus className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-syne)' }}>Log Session</span>
          </div>
          {showForm ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-3)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
        </button>

        {showForm && (
          <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'date', label: 'Date', type: 'date', color: 'var(--text-3)', borderColor: 'var(--border-md)' },
                { key: 'easy', label: 'Easy', type: 'number', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' },
                { key: 'medium', label: 'Medium', type: 'number', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' },
                { key: 'hard', label: 'Hard', type: 'number', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' },
              ].map(({ key, label, type, color, borderColor }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color }}>{label}</label>
                  <input type={type} min={type === 'number' ? 0 : undefined}
                    value={key === 'date' ? toInputDate(form.date) : form[key as 'easy'|'medium'|'hard']}
                    onChange={e => {
                      if (key === 'date') setForm(f => ({ ...f, date: fromInputDate(e.target.value) }));
                      else setForm(f => ({ ...f, [key]: Math.max(0, parseInt(e.target.value) || 0) }));
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ background: 'var(--bg-elevated)', border: `1px solid ${borderColor}`, color: 'var(--text-1)' }}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Topics</label>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(topic => (
                  <button key={topic} onClick={() => toggleTopic(topic)}
                    className="px-2.5 py-1 text-xs rounded-full font-medium"
                    style={form.topics.includes(topic)
                      ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }
                      : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
                  >{topic}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key insights, problems to revisit..."
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none h-20"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }} />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || form.easy + form.medium + form.hard === 0}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--accent), #d97706)', color: '#000' }}>
                {saving ? 'Saving…' : 'Save Session'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-sm font-medium rounded-lg"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hub-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Activity — Last 14 Days</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barSize={12}>
                <CartesianGrid strokeDasharray="2 4" stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="easy" stackId="a" fill="#10b981" name="Easy" />
                <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium" />
                <Bar dataKey="hard" stackId="a" fill="#f43f5e" radius={[3, 3, 0, 0]} name="Hard" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 justify-center">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <div key={d} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                <span className="w-2 h-2 rounded-sm" style={{ background: DIFFICULTY_COLORS[d] }} />
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </div>
            ))}
          </div>
        </div>

        <div className="hub-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Topic Distribution</h3>
          {topicData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topicData} cx="40%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                    {topicData.map((_, i) => <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={7}
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '8px', color: '#8892a8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
              Log sessions with topics to see distribution
            </div>
          )}
        </div>
      </div>

      {cumulativeData.length > 1 && (
        <div className="hub-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Cumulative Progress</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="lcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: TICK }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} fill="url(#lcGradient)" name="Total Solved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="hub-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Session History</h3>
          </div>
          <div>
            {sessions.slice(0, 20).map(session => {
              let topics: string[] = [];
              try { topics = JSON.parse(session.topics); } catch { /* no-op */ }
              const total = session.easy + session.medium + session.hard;
              return (
                <div key={session.id} className="px-5 py-3.5 flex items-start justify-between gap-4 group"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>{session.date}</span>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{total} solved</span>
                      <div className="flex gap-2">
                        {session.easy > 0 && <span className="text-xs font-semibold" style={{ color: '#10b981' }}>{session.easy}E</span>}
                        {session.medium > 0 && <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{session.medium}M</span>}
                        {session.hard > 0 && <span className="text-xs font-semibold" style={{ color: '#f43f5e' }}>{session.hard}H</span>}
                      </div>
                    </div>
                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {topics.map(t => (
                          <span key={t} className="px-1.5 py-0.5 text-xs rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.15)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {session.notes && <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-3)' }}>{session.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <Code2 className="w-8 h-8" style={{ color: 'rgba(139,92,246,0.5)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-2)' }}>No sessions logged yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Expand "Log Session" above to record your first practice.</p>
        </div>
      )}
    </div>
  );
}
