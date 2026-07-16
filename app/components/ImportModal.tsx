import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportComplete }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      setError('');
      setImporting(true);
      
      let data;
      try {
        data = JSON.parse(jsonInput);
      } catch (e) {
        setError('Invalid JSON format');
        setImporting(false);
        return;
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      onImportComplete();
      onClose();
    } catch (err) {
      setError('Failed to import data. Please check the format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="hub-card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-syne)' }}>
            <Upload className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Import Data
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 rounded-lg text-sm" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93bbfd' }}>
          <p className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            How to migrate your data:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your old tracker in the browser.</li>
            <li>Open Developer Tools (F12 or Cmd+Opt+I).</li>
            <li>Go to the <strong>Console</strong> tab.</li>
            <li>Paste the script provided below and press Enter.</li>
            <li>Copy the output JSON and paste it here.</li>
          </ol>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>
            Migration Script (Copy &amp; Run in Browser Console)
          </label>
          <div className="p-3 rounded-lg text-xs font-mono overflow-x-auto select-all cursor-pointer"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
               onClick={(e) => {
                 const range = document.createRange();
                 range.selectNode(e.currentTarget);
                 window.getSelection()?.removeAllRanges();
                 window.getSelection()?.addRange(range);
               }}>
            {`const data = {
  entries: JSON.parse(localStorage.getItem('jobTrackerEntries') || '[]'),
  applications: JSON.parse(localStorage.getItem('jobTrackerApplications') || '[]'),
  rejectionCount: parseInt(localStorage.getItem('jobTrackerRejectionCount') || '0')
};
console.log(JSON.stringify(data));`}
          </div>
        </div>

        <textarea
          className="flex-1 p-3 rounded-lg font-mono text-sm focus:outline-none mb-4 min-h-[200px]"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
          placeholder="Paste the JSON output here..."
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        {error && (
          <div className="mb-4 text-sm flex items-center gap-2" style={{ color: '#fb7185' }}>
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonInput || importing}
            className="px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', color: '#000' }}
          >
            {importing ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
