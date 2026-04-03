import React from 'react';
import { Application } from '../types';
import { Clock, Calendar } from 'lucide-react';

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: number, newStatus: string) => void;
}

const COLUMNS = [
  { id: 'Applied', title: 'Applied', color: 'bg-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'Waiting for Response', title: 'Waiting', color: 'bg-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { id: 'Next Stage', title: 'Next Stage', color: 'bg-purple-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'Offer', title: 'Offer', color: 'bg-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { id: 'Rejected', title: 'Rejected', color: 'bg-slate-500', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  { id: 'Ghosted', title: 'Ghosted', color: 'bg-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onStatusChange }) => {
  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status)
      .sort((a, b) => new Date(b.lastUpdated || b.fullDate).getTime() - new Date(a.lastUpdated || a.fullDate).getTime());
  };

  return (
    <div className="h-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1000px] h-full items-start">
        {COLUMNS.map(column => {
          const columnApps = getApplicationsByStatus(column.id);
          
          return (
            <div key={column.id} className="flex-1 min-w-[280px] flex flex-col h-full max-h-[calc(100vh-250px)]">
              <div className={`px-4 py-3 rounded-t-xl font-semibold flex justify-between items-center ${column.bgColor} border-b-2 ${column.borderColor}`}>
                <span className="text-slate-700">{column.title}</span>
                <span className={`${column.color} text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm`}>
                  {columnApps.length}
                </span>
              </div>
              <div className="flex-1 p-3 bg-slate-50/50 rounded-b-xl border border-t-0 border-slate-200 overflow-y-auto">
                {columnApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-violet-200 transition-all"
                  >
                    <div className="font-semibold text-slate-800 mb-1">{app.company}</div>
                    <div className="text-sm text-slate-600 mb-3">{app.position}</div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(app.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      {app.status === 'Next Stage' && app.deadline && (
                        <div className="flex items-center gap-1 text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(app.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {columnApps.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
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
