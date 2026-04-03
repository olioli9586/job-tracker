import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Application, DailyEntry } from '../types';
import { TrendingUp, Users, XCircle, Zap, Target, Flame, BarChart2, Building2 } from 'lucide-react';

interface AnalyticsDashboardProps {
  applications: Application[];
  dailyEntries: DailyEntry[];
  rejectionCount: number;
  goalDate?: string; // "YYYY-MM-DD"
}

const STATUS_COLORS: Record<string, string> = {
  'Applied': '#3b82f6',
  'Waiting for Response': '#f59e0b',
  'Next Stage': '#8b5cf6',
  'Offer': '#10b981',
  'Rejected': '#f43f5e',
  'Ghosted': '#94a3b8',
};

function parseEntryDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

function ProgressRing({ pct, size = 100, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#8b5cf6" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  applications, dailyEntries, rejectionCount, goalDate = '2026-07-06',
}) => {

  const totalApplications = dailyEntries.reduce((s, e) => s + e.count, 0);
  const activePipeline = applications.filter(a =>
    ['Next Stage', 'Waiting for Response', 'Offer'].includes(a.status)
  ).length;
  const nextStageCount = applications.filter(a => a.status === 'Next Stage').length;
  const responseCount = applications.filter(a =>
    !['Applied', 'Ghosted'].includes(a.status)
  ).length;
  const daysWithEntries = dailyEntries.length;
  const avgPerDay = daysWithEntries > 0
    ? (totalApplications / daysWithEntries).toFixed(1)
    : '0';

  // This week vs last week
  const getWeekCount = (weeksAgo: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (weeksAgo + 1) * 7);
    const end = new Date(now);
    end.setDate(end.getDate() - weeksAgo * 7);
    return dailyEntries.filter(e => {
      const d = parseEntryDate(e.date);
      return d >= start && d < end;
    }).reduce((s, e) => s + e.count, 0);
  };
  const thisWeek = getWeekCount(0);
  const lastWeek = getWeekCount(1);
  const weekTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  // Streak
  const getStreak = () => {
    if (!dailyEntries.length) return 0;
    const sorted = [...dailyEntries]
      .sort((a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const latestDate = parseEntryDate(sorted[0].date); latestDate.setHours(0, 0, 0, 0);
    if (latestDate.getTime() < yesterday.getTime()) return 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const curr = parseEntryDate(sorted[i].date); curr.setHours(0, 0, 0, 0);
      const prev = parseEntryDate(sorted[i - 1].date); prev.setHours(0, 0, 0, 0);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  };
  const streak = getStreak();

  // Sprint (3-month goal) progress
  const getSprintInfo = () => {
    const goal = 1000;
    const target = new Date(goalDate + 'T00:00:00');
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - todayDate.getTime()) / 86400000));
    // Sprint start = earliest entry, or 90 days before target
    const sprintStart = dailyEntries.length > 0
      ? dailyEntries.reduce((earliest, e) => {
          const d = parseEntryDate(e.date);
          return d < earliest ? d : earliest;
        }, parseEntryDate(dailyEntries[0].date))
      : (() => { const s = new Date(target); s.setDate(s.getDate() - 90); return s; })();
    const sprintLength = Math.max(1, Math.round((target.getTime() - sprintStart.getTime()) / 86400000));
    const daysPassed = Math.max(1, sprintLength - daysLeft);
    const pct = Math.min(100, Math.round((daysPassed / sprintLength) * 100));
    const requiredPace = daysLeft > 0 ? ((goal - totalApplications) / daysLeft) : 0;
    const actualPace = totalApplications / daysPassed;
    const onTrack = actualPace >= goal / sprintLength;
    return { daysLeft, pct, goal, onTrack, requiredPace: Math.max(0, requiredPace) };
  };
  const sprint = getSprintInfo();

  // Daily chart (14 days)
  const getDailyData = () => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString();
      const entry = dailyEntries.find(e => e.date === dateStr);
      data.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, count: entry?.count ?? 0 });
    }
    return data;
  };

  // Weekly chart (last 8 weeks)
  const getWeeklyData = () => {
    const data = [];
    for (let w = 7; w >= 0; w--) {
      const start = new Date(); start.setDate(start.getDate() - (w + 1) * 7);
      const end = new Date(); end.setDate(end.getDate() - w * 7);
      const count = dailyEntries.filter(e => {
        const d = parseEntryDate(e.date);
        return d >= start && d < end;
      }).reduce((s, e) => s + e.count, 0);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      data.push({ week: `W${8 - w}`, count });
    }
    return data;
  };

  // Status distribution
  const getStatusData = () => {
    const counts: Record<string, number> = {
      'Applied': 0, 'Waiting for Response': 0, 'Next Stage': 0,
      'Offer': 0, 'Rejected': rejectionCount,
    };
    applications.forEach(a => {
      if (a.status !== 'Rejected') counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(x => x.value > 0);
  };

  // Stage funnel
  const getFunnelData = () => [
    { stage: 'Applied', count: totalApplications, color: '#3b82f6' },
    { stage: 'Responded', count: responseCount, color: '#f59e0b' },
    { stage: 'Next Stage', count: nextStageCount, color: '#8b5cf6' },
    { stage: 'Offer', count: applications.filter(a => a.status === 'Offer').length, color: '#10b981' },
  ];

  // Top companies
  const getTopCompanies = () => {
    const counts: Record<string, number> = {};
    applications.forEach(a => { counts[a.company] = (counts[a.company] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  };

  const dailyData = getDailyData();
  const weeklyData = getWeeklyData();
  const statusData = getStatusData();
  const funnelData = getFunnelData();
  const topCompanies = getTopCompanies();
  const conversionRate = totalApplications > 0
    ? ((nextStageCount / totalApplications) * 100).toFixed(1)
    : '0';
  const responseRate = totalApplications > 0
    ? ((responseCount / totalApplications) * 100).toFixed(1)
    : '0';

  const TOOLTIP_STYLE = {
    backgroundColor: '#141825',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#eceef4',
  };
  const GRID_COLOR = 'rgba(255,255,255,0.04)';
  const TICK_COLOR = '#4a5270';

  return (
    <div className="space-y-5">

      {/* Primary stats — 4 accent cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Apps', value: totalApplications, sub: null, color: '#f59e0b', icon: <TrendingUp className="w-3.5 h-3.5" />, bg: 'rgba(245,158,11,0.1)' },
          { label: 'Active Pipeline', value: activePipeline, sub: 'interviews/offers', color: '#3b82f6', icon: <Users className="w-3.5 h-3.5" />, bg: 'rgba(59,130,246,0.1)' },
          { label: 'Rejection Rate', value: `${totalApplications > 0 ? ((rejectionCount / totalApplications) * 100).toFixed(1) : 0}%`, sub: null, color: '#f43f5e', icon: <XCircle className="w-3.5 h-3.5" />, bg: 'rgba(244,63,94,0.1)' },
          { label: 'Current Streak', value: `${streak}d`, sub: 'consecutive days', color: '#f97316', icon: <Flame className="w-3.5 h-3.5" />, bg: 'rgba(249,115,22,0.1)' },
        ].map(({ label, value, sub, color, icon, bg }) => (
          <div key={label} className="hub-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg, color }}>{icon}</div>
            </div>
            <div className="stat-num text-3xl" style={{ color }}>{value}</div>
            {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Interview Rate', value: `${conversionRate}%`, sub: 'applied → stage', color: '#8b5cf6' },
          { label: 'Response Rate', value: `${responseRate}%`, sub: 'got any reply', color: '#3b82f6' },
          { label: 'Avg / Day', value: avgPerDay, sub: 'applications', color: 'var(--text-1)' },
          { label: 'This Week', value: thisWeek, sub: weekTrend !== null ? `${weekTrend >= 0 ? '+' : ''}${weekTrend}% vs last wk` : 'no data yet', color: weekTrend !== null && weekTrend < 0 ? '#f43f5e' : '#10b981' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="hub-card p-4">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>{label}</div>
            <div className="stat-num text-2xl" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Sprint progress */}
      <div className="hub-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Target className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>3-Month Sprint — Goal: {sprint.goal}</h3>
          <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full" style={
            sprint.onTrack
              ? { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
              : { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }
          }>
            {sprint.onTrack ? 'On Track' : 'Pick Up Pace'}
          </span>
        </div>
        <div className="flex items-center gap-8">
          <div className="relative flex-shrink-0">
            <ProgressRing pct={sprint.pct} size={108} stroke={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="stat-num text-xl" style={{ color: 'var(--accent)' }}>{sprint.pct}%</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>done</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Goal', value: sprint.goal, sub: 'applications' },
              { label: 'Progress', value: totalApplications, sub: 'logged', highlight: true },
              { label: 'Days Left', value: sprint.daysLeft, sub: 'of 90' },
              { label: 'Need/Day', value: sprint.requiredPace.toFixed(1), sub: 'to hit goal' },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label}>
                <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-3)' }}>{label}</div>
                <div className="stat-num text-lg" style={{ color: highlight ? 'var(--accent)' : 'var(--text-1)' }}>{value}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-2 rounded-full" style={{
            width: `${Math.min((totalApplications / sprint.goal) * 100, 100)}%`,
            background: 'linear-gradient(90deg, var(--accent), #fbbf24)',
            boxShadow: '0 0 12px var(--accent-glow)',
          }} />
        </div>
        <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
          <span>0</span><span>{Math.round(sprint.goal / 2)}</span><span>{sprint.goal}</span>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hub-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Daily Activity — 14 Days</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="2 4" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: TICK_COLOR }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK_COLOR }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Apps" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hub-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Weekly Activity — 8 Weeks</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="2 4" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: TICK_COLOR }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK_COLOR }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Apps" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hub-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Status Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="40%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#4a5270'} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={7}
                  wrapperStyle={{ fontSize: '11px', paddingLeft: '8px', color: '#8892a8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hub-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Application Funnel</h3>
          </div>
          <div className="space-y-4 mt-2">
            {funnelData.map(({ stage, count, color }) => {
              const pct = funnelData[0].count > 0 ? Math.round((count / funnelData[0].count) * 100) : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium" style={{ color: 'var(--text-2)' }}>{stage}</span>
                    <span style={{ color: 'var(--text-3)' }}>{count} · {pct}%</span>
                  </div>
                  <div className="rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}55` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top companies */}
      {topCompanies.length > 0 && (
        <div className="hub-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>Top Companies</h3>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCompanies} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="2 4" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: TICK_COLOR }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#8892a8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Applications" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
