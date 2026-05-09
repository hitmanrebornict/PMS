import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { UnitShare, ShareableUser } from '../../types';

interface UnitShareEditorProps {
  unitId: string;
  onSaved: () => void;
}

interface DraftRow {
  userId: string;
  percentage: string; // string for input control
}

export const UnitShareEditor: React.FC<UnitShareEditorProps> = ({ unitId, onSaved }) => {
  const { apiFetch } = useApi();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [shareableUsers, setShareableUsers] = useState<ShareableUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, sharesRes] = await Promise.all([
        apiFetch('/api/profit-sharing/shareable-users'),
        apiFetch(`/api/profit-sharing/${unitId}/shares`),
      ]);
      if (usersRes.ok) {
        const users: ShareableUser[] = await usersRes.json();
        setShareableUsers(users);
      }
      if (sharesRes.ok) {
        const shares: UnitShare[] = await sharesRes.json();
        setRows(shares.map(s => ({ userId: s.userId, percentage: String(s.percentage) })));
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, unitId]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
  const isValid = rows.length === 0 || Math.abs(total - 100) <= 0.01;
  const assignedIds = new Set(rows.map(r => r.userId));

  const addRow = () => {
    const available = shareableUsers.find(u => !assignedIds.has(u.id));
    if (!available) return;
    setRows(prev => [...prev, { userId: available.id, percentage: '' }]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateUserId = (idx: number, userId: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, userId } : r));
  };

  const updatePercentage = (idx: number, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, percentage: value } : r));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    // Validate
    if (rows.length > 0) {
      for (const r of rows) {
        if (!r.userId) { setError('Please select a user for each row.'); return; }
        const pct = parseFloat(r.percentage);
        if (isNaN(pct) || pct <= 0 || pct > 100) {
          setError('Each percentage must be between 0.01 and 100.');
          return;
        }
      }
      const t = rows.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
      if (Math.abs(t - 100) > 0.01) {
        setError(`Percentages must total 100% (currently ${t.toFixed(2)}%).`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/profit-sharing/${unitId}/shares`, {
        method: 'PUT',
        body: JSON.stringify({
          shares: rows.map(r => ({
            userId: r.userId,
            percentage: parseFloat(r.percentage),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save ownership');
        return;
      }
      setSuccess(true);
      onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">
        Loading ownership...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Ownership</h3>
        </div>
        <button
          onClick={addRow}
          disabled={shareableUsers.filter(u => !assignedIds.has(u.id)).length === 0}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={13} />
          Add Owner
        </button>
      </div>

      <div className="px-5 py-4 space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-slate-400 italic">No owners assigned</p>
        )}

        {rows.map((row, idx) => {
          const otherIds = new Set(rows.filter((_, i) => i !== idx).map(r => r.userId));
          const available = shareableUsers.filter(u => !otherIds.has(u.id));
          return (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={row.userId}
                onChange={e => updateUserId(idx, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                {available.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={row.percentage}
                  onChange={e => updatePercentage(idx, e.target.value)}
                  className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                  placeholder="0.00"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
              <button
                onClick={() => removeRow(idx)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}

        {rows.length > 0 && (
          <div className={`flex items-center justify-end gap-1 text-xs font-medium pt-1 ${isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
            Total: {total.toFixed(2)}%
            {isValid ? ' ✓' : ' (must equal 100%)'}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-5 mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
          Ownership saved successfully!
        </div>
      )}

      <div className="px-5 pb-4">
        <button
          onClick={handleSave}
          disabled={saving || (rows.length > 0 && !isValid)}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Ownership'}
        </button>
      </div>
    </div>
  );
};
