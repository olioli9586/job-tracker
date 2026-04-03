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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Data
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Migration Script (Copy & Run in Browser Console)
          </label>
          <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto select-all cursor-pointer"
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
          className="flex-1 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 min-h-[200px]"
          placeholder="Paste the JSON output here..."
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        {error && (
          <div className="mb-4 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonInput || importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
