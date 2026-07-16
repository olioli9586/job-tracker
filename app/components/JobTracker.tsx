'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, TrendingUp, Edit2, Trash2, Check, X, Upload, LayoutList, Kanban, BarChart2, Clock, Pin } from 'lucide-react';
import { Application, DailyEntry } from '../types';
import ImportModal from './ImportModal';
import KanbanBoard from './KanbanBoard';
import AnalyticsDashboard from './AnalyticsDashboard';

const GOAL_PER_DAY = 10;
// The 10/day goal starts counting from this date, not from the first entry
// ever logged — otherwise months of hiatus would count against the pace.
const GOAL_START = new Date(2026, 6, 15); // July 15, 2026

// Parse "M/D/YYYY" entry dates reliably
const parseEntryDate = (dateStr: string): Date => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};

const JobTracker = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [todayCount, setTodayCount] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [rejectionCount, setRejectionCount] = useState(0);
  const [lastAction, setLastAction] = useState<any>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [currentPage, setCurrentPage] = useState('main');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  // New states for detailed application tracking
  const [showApplicationPopup, setShowApplicationPopup] = useState(false);
  const [applicationDetails, setApplicationDetails] = useState({ company: '', position: '', jobDescription: '' });
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState(new Set<string>());
  const [positions, setPositions] = useState(new Set<string>());
  const [searchTerm, setSearchTerm] = useState('');
  const [ghostedSearchTerm, setGhostedSearchTerm] = useState('');
  const [rejectedSearchTerm, setRejectedSearchTerm] = useState('');
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [editingAppDetails, setEditingAppDetails] = useState({ company: '', position: '', jobDescription: '' });
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [showPositionSuggestions, setShowPositionSuggestions] = useState(false);
  const [showNextStagePopup, setShowNextStagePopup] = useState(false);
  const [nextStageAppId, setNextStageAppId] = useState<number | null>(null);
  const [nextStageDetails, setNextStageDetails] = useState({ type: '', deadline: '', notes: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [hasCheckedGhosting, setHasCheckedGhosting] = useState(false);
  
  // Search & Filter States
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Locked to en-US: this string is the DailyEntry DB key and is also
  // rendered during SSR — a locale mismatch breaks hydration and lookups.
  const today = new Date().toLocaleDateString('en-US');

  // Load data from API
  const fetchData = async () => {
    try {
      const [appRes, statsRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/stats')
      ]);
      
      if (appRes.ok) {
        const apps = await appRes.json();
        setApplications(apps);
        setCompanies(new Set(apps.map((a: Application) => a.company)));
        setPositions(new Set(apps.map((a: Application) => a.position)));
      }
      
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const parsedEntries = stats.entries.map((e: any) => ({
          ...e,
          timestamps: JSON.parse(e.timestamps || '[]')
        }));
        setEntries(parsedEntries);
        setRejectionCount(stats.rejectionCount);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  // Auto-ghost applications not updated in 3 months
  const checkAndGhostStaleApplications = async () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const activeStatuses = ['Applied', 'Waiting for Response', 'Next Stage', 'Offer'];
    const staleApps = applications.filter(app => {
      if (!activeStatuses.includes(app.status)) return false;
      // Check application date (fullDate), not lastUpdated
      const applicationDate = new Date(app.fullDate || app.date);
      return applicationDate < threeMonthsAgo;
    });

    // Update stale applications to Ghosted
    for (const app of staleApps) {
      try {
        await fetch(`/api/applications/${app.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Ghosted' })
        });
      } catch (error) {
        console.error(`Failed to ghost application ${app.id}`, error);
      }
    }

    // Refresh data if any apps were ghosted
    if (staleApps.length > 0) {
      fetchData();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check for ghosting once when applications are loaded
  useEffect(() => {
    if (applications.length > 0 && !hasCheckedGhosting) {
      checkAndGhostStaleApplications();
      setHasCheckedGhosting(true);
    }
  }, [applications, hasCheckedGhosting]);

  // Get today's entry if it exists
  const todayEntry = entries.find(entry => entry.date === today);
  const currentTodayCount = todayEntry ? todayEntry.count : 0;
  const todayTimestamps = todayEntry ? (Array.isArray(todayEntry.timestamps) ? todayEntry.timestamps : []) : [];

  // Filter and sort applications - show Applied, Next Stage, and Waiting for Response
  const getFilteredAndSortedApplications = () => {
    const activeStatuses = ['Applied', 'Next Stage', 'Waiting for Response'];
    
    let filtered = applications.filter(app => {
      // Status filter: a specific pick overrides the default active set
      if (filterStatus === 'All') {
        if (!activeStatuses.includes(app.status)) return false;
      } else if (app.status !== filterStatus) {
        return false;
      }

      // Date Range Filter
      if (filterDateStart) {
        const appDate = new Date(app.date);
        if (appDate < new Date(filterDateStart)) return false;
      }
      if (filterDateEnd) {
        const appDate = new Date(app.date);
        const endDate = new Date(filterDateEnd);
        endDate.setHours(23, 59, 59); // End of day
        if (appDate > endDate) return false;
      }

      // Search Term
      return (
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Sort: pinned first, then Next Stage (by deadline), then Waiting/Applied by newest date
    return filtered.sort((a, b) => {
      // Pinned applications always float to the top
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      // Priority: Next Stage first
      if (a.status === 'Next Stage' && b.status !== 'Next Stage') return -1;
      if (b.status === 'Next Stage' && a.status !== 'Next Stage') return 1;
      
      // Within Next Stage, sort by deadline
      if (a.status === 'Next Stage' && b.status === 'Next Stage') {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return a.deadline ? -1 : 1;
      }
      
      // For Waiting and Applied, show newest applications first
      const dateA = new Date(a.fullDate || a.date).getTime();
      const dateB = new Date(b.fullDate || b.date).getTime();
      return dateB - dateA;
    });
  };

  // Get ghosted applications
  const getGhostedApplications = () => {
    return applications.filter(app => {
      if (app.status !== 'Ghosted') return false;
      // Search filter
      if (ghostedSearchTerm) {
        return app.company.toLowerCase().includes(ghostedSearchTerm.toLowerCase()) ||
               app.position.toLowerCase().includes(ghostedSearchTerm.toLowerCase());
      }
      return true;
    }).sort((a, b) => new Date(b.lastUpdated || b.fullDate).getTime() - new Date(a.lastUpdated || a.fullDate).getTime());
  };

  // Get rejected applications
  const getRejectedApplications = () => {
    return applications.filter(app => {
      if (app.status !== 'Rejected') return false;
      // Search filter
      if (rejectedSearchTerm) {
        return app.company.toLowerCase().includes(rejectedSearchTerm.toLowerCase()) ||
               app.position.toLowerCase().includes(rejectedSearchTerm.toLowerCase());
      }
      return true;
    }).sort((a, b) => new Date(b.lastUpdated || b.fullDate).getTime() - new Date(a.lastUpdated || a.fullDate).getTime());
  };

  // Add one to today's count
  const addOneToToday = async () => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Optimistic update
    const existingIndex = entries.findIndex(entry => entry.date === today);
    const previousEntries = [...entries];
    
    if (existingIndex >= 0) {
      const updatedEntries = [...entries];
      const existingEntry = updatedEntries[existingIndex];
      updatedEntries[existingIndex] = {
        ...existingEntry,
        count: existingEntry.count + 1,
        timestamps: JSON.stringify([...(Array.isArray(existingEntry.timestamps) ? existingEntry.timestamps : []), currentTime])
      };
      setEntries(updatedEntries);
    } else {
      const newEntry = {
        date: today,
        count: 1,
        timestamps: JSON.stringify([currentTime]),
        id: Date.now() // temporary ID
      };
      setEntries([newEntry, ...entries]);
    }

    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'increment_daily',
          date: today,
          timestamp: currentTime
        })
      });
      
      if (!res.ok) throw new Error('Failed to update stats');
      
      // Refresh data to get real ID
      fetchData();
    } catch (error) {
      console.error(error);
      setEntries(previousEntries); // Rollback
    }
    
    setShowApplicationPopup(true);
  };

  // Save application details
  const saveApplicationDetails = async () => {
    if (applicationDetails.company.trim() && applicationDetails.position.trim()) {
      const currentTime = new Date();
      const newAppPayload = {
        company: applicationDetails.company.trim(),
        position: applicationDetails.position.trim(),
        date: today,
        timestamp: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        fullDate: currentTime,
        status: 'Applied',
        jobDescription: applicationDetails.jobDescription.trim() || null
      };
      
      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAppPayload)
        });
        
        if (res.ok) {
          const savedApp = await res.json();
          setApplications([savedApp, ...applications]);
          setCompanies(new Set([...companies, applicationDetails.company.trim()]));
          setPositions(new Set([...positions, applicationDetails.position.trim()]));
          setApplicationDetails({ company: '', position: '', jobDescription: '' });
          setShowApplicationPopup(false);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(`Save failed: ${err.error || res.statusText}`);
        }
      } catch (error) {
        alert(`Save failed: ${error}`);
      }
    }
  };

  // Skip adding details
  const skipApplicationDetails = () => {
    setApplicationDetails({ company: '', position: '', jobDescription: '' });
    setShowApplicationPopup(false);
  };

  // Update application status
  const updateApplicationStatus = async (id: number, newStatus: string) => {
    const app = applications.find(a => a.id === id);
    if (!app) return;

    const previousStatus = app.status;
    
    // Optimistic update
    const updatedApplications = applications.map(a => 
      a.id === id ? { ...a, status: newStatus, lastUpdated: new Date().toISOString() } : a
    );
    setApplications(updatedApplications);
    
    if (newStatus === 'Rejected') {
      setRejectionCount(prev => prev + 1);
      // Update rejection count in DB
      fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment_rejection' })
      }).catch(console.error);
    }

    try {
      await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) {
      console.error('Failed to update status', error);
      // Rollback logic could go here
    }
  };

  // Toggle pin on an application
  const togglePin = async (id: number) => {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    const newPinned = !app.pinned;
    setApplications(prev => prev.map(a => a.id === id ? { ...a, pinned: newPinned } : a));
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned })
      });
      if (!res.ok) throw new Error('Failed to update pin');
    } catch (error) {
      console.error(error);
      setApplications(prev => prev.map(a => a.id === id ? { ...a, pinned: !newPinned } : a));
    }
  };

  // Show next stage popup
  const showNextStage = (id: number) => {
    const app = applications.find(a => a.id === id);
    if (app && app.status === 'Next Stage') {
      setNextStageDetails({
        type: app.nextStageType || '',
        deadline: app.deadline ? new Date(app.deadline).toISOString().slice(0, 16) : '',
        notes: app.notes || ''
      });
    }
    setNextStageAppId(id);
    setShowNextStagePopup(true);
  };

  // Save next stage details
  const saveNextStage = async () => {
    if (nextStageDetails.type.trim() && nextStageAppId) {
      const updateData = {
        status: 'Next Stage',
        nextStageType: nextStageDetails.type.trim(),
        deadline: nextStageDetails.deadline ? new Date(nextStageDetails.deadline) : null,
        notes: nextStageDetails.notes.trim() || null,
      };

      try {
        const res = await fetch(`/api/applications/${nextStageAppId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (res.ok) {
          const updatedApp = await res.json();
          setApplications(applications.map(app => app.id === nextStageAppId ? updatedApp : app));
          setNextStageDetails({ type: '', deadline: '', notes: '' });
          setShowNextStagePopup(false);
          setNextStageAppId(null);
        }
      } catch (error) {
        console.error('Failed to save next stage', error);
      }
    }
  };

  // Cancel next stage
  const cancelNextStage = () => {
    setNextStageDetails({ type: '', deadline: '', notes: '' });
    setShowNextStagePopup(false);
    setNextStageAppId(null);
  };
  // Delete application
  const deleteApplication = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setApplications(applications.filter(app => app.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete application', error);
    }
  };

  // Open next stage popup
  const openNextStagePopup = (appId: number) => {
    setNextStageAppId(appId);
    setNextStageDetails({ type: '', deadline: '', notes: '' });
    setShowNextStagePopup(true);
  };

  // Start editing application
  const startEditingApp = (app: Application) => {
    setEditingAppId(app.id);
    setEditingAppDetails({ company: app.company, position: app.position, jobDescription: app.jobDescription || '' });
  };

  // Save edited application
  const saveEditApp = async () => {
    if (editingAppDetails.company.trim() && editingAppDetails.position.trim() && editingAppId) {
      try {
        const res = await fetch(`/api/applications/${editingAppId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: editingAppDetails.company.trim(),
            position: editingAppDetails.position.trim(),
            jobDescription: editingAppDetails.jobDescription.trim() || null
          })
        });

        if (res.ok) {
          const updatedApp = await res.json();
          setApplications(applications.map(app => app.id === editingAppId ? updatedApp : app));
        }
      } catch (error) {
        console.error('Failed to edit app', error);
      }
    }
    setEditingAppId(null);
    setEditingAppDetails({ company: '', position: '', jobDescription: '' });
  };

  // Cancel editing application
  const cancelEditApp = () => {
    setEditingAppId(null);
    setEditingAppDetails({ company: '', position: '', jobDescription: '' });
  };

  const totalApplications = entries.reduce((sum, entry) => sum + entry.count, 0);

  // Cumulative pace vs the 10/day goal. The target grows by 10 every day
  // since GOAL_START, so a 15-app day banks 5 toward the running total —
  // surplus carries over. Only entries since GOAL_START count.
  const getPaceInfo = () => {
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    const start = new Date(GOAL_START); start.setHours(0, 0, 0, 0);
    const daysTracked = Math.max(1, Math.floor((todayMid.getTime() - start.getTime()) / 86400000) + 1);
    const logged = entries.reduce((sum, e) => {
      const d = parseEntryDate(e.date); d.setHours(0, 0, 0, 0);
      return d >= start ? sum + e.count : sum;
    }, 0);
    const expected = daysTracked * GOAL_PER_DAY;
    const delta = logged - expected;
    const pct = expected > 0 ? Math.min(100, Math.round((logged / expected) * 100)) : 0;
    return { daysTracked, expected, delta, pct, logged };
  };
  const pace = getPaceInfo();

  const handleExport = () => {
    const data = {
      applications,
      entries,
      rejectionCount,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-1)' }}>
      {/* Sidebar Navigation */}
      <aside className="w-60 fixed h-full z-20 hidden md:flex flex-col" style={{ background: 'linear-gradient(180deg, #191512 0%, #131011 100%)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #a96b39 100%)', boxShadow: '0 0 16px var(--accent-glow)' }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>Job Hunt Hub</div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>{GOAL_PER_DAY} a day, every day</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {([
            { id: 'main', icon: LayoutList, label: 'Applications', count: applications.filter(a => ['Applied', 'Next Stage', 'Waiting for Response'].includes(a.status)).length },
            { id: 'analytics', icon: BarChart2, label: 'Analytics', count: null },
            { id: 'history', icon: Calendar, label: 'History', count: null },
            { id: 'rejected', icon: X, label: 'Rejected', count: rejectionCount > 0 ? rejectionCount : null },
            { id: 'ghosted', icon: Clock, label: 'Ghosted', count: applications.filter(a => a.status === 'Ghosted').length || null },
          ] as const).map(({ id, icon: Icon, label, count }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              style={currentPage === id ? {
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                borderLeft: '2px solid var(--accent)',
              } : {
                color: 'var(--text-3)',
                borderLeft: '2px solid transparent',
              }}
              className={`w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-r-lg text-sm font-medium ${
                currentPage === id ? '' : 'hover:bg-white/5 hover:!text-[var(--text-2)]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count != null && count > 0 && (
                <span className="text-xs py-0.5 px-1.5 rounded-full" style={{
                  background: currentPage === id ? 'var(--accent-dim)' : 'rgba(255,255,255,0.07)',
                  color: currentPage === id ? 'var(--accent)' : 'var(--text-3)',
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Daily stats */}
        <div className="px-3 pb-2 space-y-2">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Today</div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-bold stat-num" style={{ color: 'var(--text-1)' }}>{currentTodayCount}</span>
              <span className="text-xs mb-0.5 ml-1" style={{ color: 'var(--text-3)' }}>apps</span>
            </div>
            <div className="rounded-full h-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-1 rounded-full" style={{
                width: `${Math.min((currentTodayCount / GOAL_PER_DAY) * 100, 100)}%`,
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent-glow)',
              }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
              <span>goal: {GOAL_PER_DAY}/day</span>
              <span>{totalApplications} total</span>
            </div>
          </div>

          {/* Cumulative pace vs 10/day goal */}
          <div className="rounded-xl p-4 pb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Pace</span>
              <span className="text-xs font-semibold" style={{ color: pace.delta >= 0 ? '#9cc4a8' : '#d9a29a' }}>
                {pace.delta >= 0 ? `+${pace.delta} ahead` : `${pace.delta} behind`}
              </span>
            </div>
            <div className="rounded-full h-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-1 rounded-full" style={{
                width: `${pace.pct}%`,
                background: 'linear-gradient(90deg, var(--accent), #ddb27e)',
                boxShadow: '0 0 8px var(--accent-glow)',
              }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
              <span>{pace.logged} of {pace.expected} expected</span>
              <span>day {pace.daysTracked}</span>
            </div>
          </div>
        </div>

        {/* Export/Import at bottom */}
        <div className="px-3 pb-5 flex gap-1.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <Upload className="w-3.5 h-3.5 rotate-180" />
            Export
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-60">
        {/* Top Header */}
        <header className="sticky top-0 z-10 px-8 py-4 flex justify-between items-center backdrop-blur-md"
          style={{ background: 'rgba(19,16,17,0.85)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold font-display" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>
              {currentPage === 'main' ? 'Active Applications' :
               currentPage === 'rejected' ? 'Rejected Applications' :
               currentPage === 'ghosted' ? 'Ghosted Applications' :
               currentPage === 'analytics' ? 'Analytics' : 'History'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{today}</p>
          </div>

          <div className="flex items-center gap-3">
            {currentPage === 'main' && (
              <div className="flex p-1 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded-md transition-all"
                  style={viewMode === 'list' ? { background: 'var(--bg-surface)', color: 'var(--accent)' } : { color: 'var(--text-3)' }}
                  title="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className="p-2 rounded-md transition-all"
                  style={viewMode === 'kanban' ? { background: 'var(--bg-surface)', color: 'var(--accent)' } : { color: 'var(--text-3)' }}
                  title="Kanban View"
                >
                  <Kanban className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {/* Content */}
          {currentPage === 'main' ? (
            <>
              {/* Search Bar & Filters */}
              <div className="mb-6 space-y-3">
                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      placeholder="Search active applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 pl-11 rounded-xl focus:outline-none text-sm"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                    />
                    <div className="absolute left-4 top-3.5">
                      <svg className="w-4 h-4" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-3.5"
                        style={{ color: 'var(--text-3)' }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium"
                    style={showFilters
                      ? { background: 'var(--accent-dim)', border: '1px solid rgba(207,148,85,0.3)', color: 'var(--accent)' }
                      : { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    <LayoutList className="w-4 h-4" />
                    Filters
                  </button>
                </div>

                {showFilters && (
                  <div className="p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                      >
                        <option value="All">Active (Default)</option>
                        <option value="Applied">Applied</option>
                        <option value="Waiting for Response">Waiting for Response</option>
                        <option value="Next Stage">Next Stage</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Ghosted">Ghosted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Start Date</label>
                      <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>End Date</label>
                      <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                      />
                    </div>
                  </div>
                )}

                {(searchTerm || filterStatus !== 'All' || filterDateStart || filterDateEnd) && (
                  <div className="text-sm font-medium px-1" style={{ color: 'var(--text-3)' }}>
                    Found <span style={{ color: 'var(--text-1)' }}>{getFilteredAndSortedApplications().length}</span> application{getFilteredAndSortedApplications().length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {viewMode === 'kanban' ? (
                <KanbanBoard 
                  applications={applications} 
                  onStatusChange={updateApplicationStatus}
                />
              ) : (
                /* Active Application Tracking */
                getFilteredAndSortedApplications().length > 0 ? (
                  <div className="grid gap-3">
                    {getFilteredAndSortedApplications().map((app) => (
                      <div key={app.id} className={`hub-card group p-5 cursor-default${app.pinned ? ' pinned' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              {app.pinned && <Pin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />}
                              <h3 className="font-bold text-base" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>{app.company}</h3>
                              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full flex items-center gap-1.5" style={
                                app.status === 'Applied' ? { background: 'rgba(109,146,196,0.12)', color: '#9db9dd', border: '1px solid rgba(109,146,196,0.2)' } :
                                app.status === 'Waiting for Response' ? { background: 'rgba(207,148,85,0.12)', color: '#ddb27e', border: '1px solid rgba(207,148,85,0.2)' } :
                                app.status === 'Next Stage' ? { background: 'rgba(154,134,200,0.12)', color: '#b6a5da', border: '1px solid rgba(154,134,200,0.2)' } :
                                app.status === 'Offer' ? { background: 'rgba(110,165,131,0.12)', color: '#9cc4a8', border: '1px solid rgba(110,165,131,0.2)' } :
                                { background: 'rgba(194,109,99,0.12)', color: '#d9a29a', border: '1px solid rgba(194,109,99,0.2)' }
                              }>
                                <span className="w-1.5 h-1.5 rounded-full" style={{
                                  background: app.status === 'Applied' ? '#6d92c4' : app.status === 'Waiting for Response' ? '#cf9455' : app.status === 'Next Stage' ? '#9a86c8' : app.status === 'Offer' ? '#6ea583' : '#c26d63'
                                }} />
                                {app.status}
                              </span>
                            </div>
                            <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>{app.position}</div>
                            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{app.date}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{app.timestamp}</span>
                            </div>
                            {app.jobDescription && (
                              <div className="mt-3 text-xs line-clamp-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                                {app.jobDescription}
                              </div>
                            )}
                            {app.status === 'Next Stage' && app.nextStageType && (
                              <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(154,134,200,0.1)', color: '#b6a5da', border: '1px solid rgba(154,134,200,0.2)' }}>
                                <span className="font-semibold">Next:</span> {app.nextStageType}
                                {app.deadline && <span className="ml-auto opacity-70">due {new Date(app.deadline).toLocaleDateString('en-US')}</span>}
                              </div>
                            )}
                          </div>

                          <div className={`flex flex-col gap-1.5 transition-opacity ml-3 ${app.pinned ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button onClick={() => togglePin(app.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              title={app.pinned ? 'Unpin' : 'Pin to top'}
                              style={app.pinned ? { color: 'var(--accent)' } : { color: 'var(--text-3)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = app.pinned ? 'var(--accent)' : 'var(--text-3)'; }}
                            ><Pin className="w-3.5 h-3.5" style={app.pinned ? { fill: 'var(--accent)' } : undefined} /></button>
                            <button onClick={() => startEditingApp(app)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--text-3)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
                            ><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteApplication(app.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--text-3)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(194,109,99,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#c26d63'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                          {app.status === 'Applied' && (
                            <button onClick={() => openNextStagePopup(app.id)}
                              className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors"
                              style={{ background: 'rgba(154,134,200,0.1)', color: '#b6a5da', border: '1px solid rgba(154,134,200,0.2)' }}>
                              Next Stage
                            </button>
                          )}
                          {app.status === 'Next Stage' && (
                            <button onClick={() => updateApplicationStatus(app.id, 'Waiting for Response')}
                              className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors"
                              style={{ background: 'rgba(207,148,85,0.1)', color: '#ddb27e', border: '1px solid rgba(207,148,85,0.2)' }}>
                              Waiting for Response
                            </button>
                          )}
                          <button onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            style={{ color: '#d9a29a' }}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)' }}>
                      <Plus className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-1)' }}>No applications here</p>
                    <p className="text-sm">Click <span className="font-semibold" style={{ color: 'var(--accent)' }}>+ Log</span> in the bottom-right to add one.</p>
                  </div>
                )
              )}
            </>
          ) : currentPage === 'ghosted' ? (
            /* Ghosted Applications Page */
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search ghosted applications..."
                    value={ghostedSearchTerm}
                    onChange={(e) => setGhostedSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-11 rounded-xl focus:outline-none text-sm"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                  <div className="absolute left-4 top-3.5">
                    <svg className="w-4 h-4" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {ghostedSearchTerm && (
                    <button
                      onClick={() => setGhostedSearchTerm('')}
                      className="absolute right-4 top-3.5"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {ghostedSearchTerm && (
                  <div className="text-sm text-slate-500 font-medium px-1 mt-2">
                    Found <span className="text-slate-900">{getGhostedApplications().length}</span> application{getGhostedApplications().length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {getGhostedApplications().length > 0 ? (
                <div className="space-y-2">
                  <div className="mb-4 text-center">
                    <p style={{ color: 'var(--text-2)' }}>Total Ghosted: {applications.filter(app => app.status === 'Ghosted').length}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Applications not updated in 3+ months</p>
                  </div>
                  {getGhostedApplications().map((app) => (
                    <div key={app.id} className="hub-card p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{app.company}</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>{app.position}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                            Applied: {app.date} at {app.timestamp}
                            {app.lastUpdated && <span className="ml-2">| Last updated: {new Date(app.lastUpdated).toLocaleDateString('en-US')}</span>}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(148,138,125,0.15)', color: '#a0958a', border: '1px solid rgba(148,138,125,0.2)' }}>
                          Ghosted
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => updateApplicationStatus(app.id, 'Applied')}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium"
                          style={{ background: 'rgba(109,146,196,0.12)', color: '#9db9dd', border: '1px solid rgba(109,146,196,0.2)' }}>
                          Move to Active
                        </button>
                        <button onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium"
                          style={{ background: 'rgba(194,109,99,0.1)', color: '#d9a29a', border: '1px solid rgba(194,109,99,0.2)' }}>
                          Reject
                        </button>
                        <button onClick={() => deleteApplication(app.id)}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
                  <p className="text-base mb-1">No ghosted applications</p>
                  <p className="text-sm">Applications not updated in 3 months will appear here.</p>
                </div>
              )}
            </>
          ) : currentPage === 'rejected' ? (
            /* Rejected Applications Page */
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search rejected applications..."
                    value={rejectedSearchTerm}
                    onChange={(e) => setRejectedSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-11 rounded-xl focus:outline-none text-sm"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                  <div className="absolute left-4 top-3.5">
                    <svg className="w-4 h-4" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {rejectedSearchTerm && (
                    <button
                      onClick={() => setRejectedSearchTerm('')}
                      className="absolute right-4 top-3.5"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {rejectedSearchTerm && (
                  <div className="text-sm text-slate-500 font-medium px-1 mt-2">
                    Found <span className="text-slate-900">{getRejectedApplications().length}</span> application{getRejectedApplications().length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {getRejectedApplications().length > 0 ? (
                <div className="space-y-2">
                  <div className="mb-4 text-center">
                    <p style={{ color: 'var(--text-2)' }}>Total Rejected: {rejectionCount}</p>
                  </div>
                  {getRejectedApplications().map((app) => (
                    <div key={app.id} className="hub-card p-4">
                      {editingAppId === app.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" value={editingAppDetails.company}
                              onChange={(e) => setEditingAppDetails({...editingAppDetails, company: e.target.value})}
                              className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                              placeholder="Company" autoFocus />
                            <input type="text" value={editingAppDetails.position}
                              onChange={(e) => setEditingAppDetails({...editingAppDetails, position: e.target.value})}
                              className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                              placeholder="Position" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEditApp} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 font-medium"
                              style={{ background: 'rgba(110,165,131,0.12)', color: '#9cc4a8', border: '1px solid rgba(110,165,131,0.2)' }}>
                              <Check className="w-3 h-3" />Save
                            </button>
                            <button onClick={cancelEditApp} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 font-medium"
                              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                              <X className="w-3 h-3" />Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{app.company}</div>
                                <button onClick={() => startEditingApp(app)} className="p-0.5" style={{ color: 'var(--text-3)' }}>
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-sm" style={{ color: 'var(--text-2)' }}>{app.position}</div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                                Applied: {app.date} at {app.timestamp}
                                {app.lastUpdated && <span className="ml-2">| Rejected: {new Date(app.lastUpdated).toLocaleDateString('en-US')}</span>}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(194,109,99,0.1)', color: '#d9a29a', border: '1px solid rgba(194,109,99,0.2)' }}>
                              Rejected
                            </span>
                          </div>
                          <button onClick={() => updateApplicationStatus(app.id, 'Applied')}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium"
                            style={{ background: 'rgba(109,146,196,0.12)', color: '#9db9dd', border: '1px solid rgba(109,146,196,0.2)' }}>
                            Reactivate
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
                  <p className="text-base mb-1">No rejections yet</p>
                  <p className="text-sm">Keep applying! Every rejection gets you closer.</p>
                </div>
              )}
            </>
          ) : currentPage === 'analytics' ? (
            <AnalyticsDashboard
              applications={applications}
              dailyEntries={entries}
              rejectionCount={rejectionCount}
            />
          ) : (
            /* History Page */
            <div>
              {entries.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-syne)' }}>
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      Daily Application History
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <div key={entry.id} className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{entry.date}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {Array.isArray(entry.timestamps) && entry.timestamps.length > 0
                              ? `Last at ${entry.timestamps[entry.timestamps.length - 1]}`
                              : 'No timestamp'}
                          </div>
                        </div>
                        <div className="text-xl font-bold stat-num" style={{ color: 'var(--accent)' }}>{entry.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
                  <p>No history yet.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={addOneToToday}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full font-semibold text-sm fab-pulse"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #a96b39 100%)',
          color: '#000',
          padding: '14px 24px',
          boxShadow: '0 8px 32px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.4)',
        }}
        title="Log Application"
      >
        <Plus className="w-4 h-4" />
        Log
      </button>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={fetchData} 
        />
      )}

      {/* Application Details Popup */}
      {showApplicationPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="hub-card p-6 w-96 shadow-2xl">
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>Application Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Company</label>
                <input type="text" value={applicationDetails.company}
                  onChange={(e) => setApplicationDetails({...applicationDetails, company: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                  placeholder="e.g. Google" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Position</label>
                <input type="text" value={applicationDetails.position}
                  onChange={(e) => setApplicationDetails({...applicationDetails, position: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                  placeholder="e.g. Software Engineer" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Job Description</label>
                <textarea value={applicationDetails.jobDescription}
                  onChange={(e) => setApplicationDetails({...applicationDetails, jobDescription: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none h-28"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                  placeholder="Paste job description here..." />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveApplicationDetails}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg"
                  style={{ background: 'linear-gradient(135deg, var(--accent), #a96b39)', color: '#000' }}>
                  Save
                </button>
                <button onClick={skipApplicationDetails}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Stage Popup */}
      {showNextStagePopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="hub-card p-6 w-96 shadow-2xl">
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>Next Stage Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Stage Type</label>
                <select value={nextStageDetails.type}
                  onChange={(e) => setNextStageDetails({...nextStageDetails, type: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}>
                  <option value="">Select Stage...</option>
                  <option value="Phone Screen">Phone Screen</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Behavioral Interview">Behavioral Interview</option>
                  <option value="Take-home Assignment">Take-home Assignment</option>
                  <option value="On-site Interview">On-site Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Deadline / Date</label>
                <input type="datetime-local" value={nextStageDetails.deadline}
                  onChange={(e) => setNextStageDetails({...nextStageDetails, deadline: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Notes</label>
                <textarea value={nextStageDetails.notes}
                  onChange={(e) => setNextStageDetails({...nextStageDetails, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none h-24"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
                  placeholder="Interview details, link, etc." />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveNextStage}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg"
                  style={{ background: 'linear-gradient(135deg, var(--accent), #a96b39)', color: '#000' }}>
                  Save
                </button>
                <button onClick={cancelNextStage}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobTracker;
