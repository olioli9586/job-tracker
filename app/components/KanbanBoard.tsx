import React from 'react';
import { Application } from '../types';
import { Clock, Calendar, Pin } from 'lucide-react';

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: number, newStatus: string) => void;
}

const COLUMNS = [
  { id: 'Applied', title: 'Applied', color: '#3b82f6', text: '#60a5fa' },
  { id: 'Waiting for Response', title: 'Waiting', color: '#f5a623', text: '#fbbf24' },
  { id: 'Next Stage', title: 'Next Stage', color: '#8b5cf6', text: '#a78bfa' },
  { id: 'Offer', title: 'Offer', color: '#10b981', text: '#34d399' },
  { id: 'Rejected', title: 'Rejected', color: '#f43f5e', text: '#fb7185' },
  { id: 'Ghosted', title: 'Ghosted', color: '#8b95ad', text: '#8b95ad' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onStatusChange }) => {
  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status)
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.lastUpdated || b.fullDate).getTime() - new Date(a.lastUpdated || a.fullDate).getTime();
      });
  };

  return (
    <div className="h-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1000px] h-full items-start">
        {COLUMNS.map(column => {
          const columnApps = getApplicationsByStatus(column.id);

          return (
            <div key={column.id} className="flex-1 min-w-[280px] flex flex-col h-full max-h-[calc(100vh-250px)]">
              <div className="px-4 py-3 rounded-t-xl font-semibold flex justify-between items-center"
                style={{
                  background: 'var(--bg-elevated)',
                  borderBottom: `2px solid ${column.color}`,
                }}>
                <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-1)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: column.color, boxShadow: `0 0 6px ${column.color}66` }} />
                  {column.title}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: `${column.color}22`, color: column.text }}>
                  {columnApps.length}
                </span>
              </div>
              <div className="flex-1 p-3 rounded-b-xl overflow-y-auto"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: 'none' }}>
                {columnApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 mb-3 rounded-lg transition-all"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: app.pinned ? '1px solid rgba(245,166,35,0.35)' : '1px solid var(--border)',
                      boxShadow: app.pinned ? 'inset 3px 0 0 var(--accent)' : undefined,
                    }}
                  >
                    <div className="font-semibold mb-1 flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-1)' }}>
                      {app.pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />}
                      {app.company}
                    </div>
                    <div className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>{app.position}</div>

                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-3)' }}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(app.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {app.status === 'Next Stage' && app.deadline && (
                        <div className="flex items-center gap-1 font-medium px-2 py-0.5 rounded"
                          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {columnApps.length === 0 && (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>
                    No applications
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
