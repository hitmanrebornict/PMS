import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, TrendingUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Investment, InvestmentStatus, Unit, Customer } from '../../types';
import { useApi } from '../../hooks/useApi';

interface InvestmentsPageProps {
  units: Unit[];
  customers: Customer[];
  onAdd: () => void;
  onEdit: (inv: Investment) => void;
  onDelete: (inv: Investment) => void;
  refreshSignal: number;
}

const STATUS_LABELS: Record<InvestmentStatus, string> = {
  ACTIVE:    'Active',
  MATURED:   'Matured',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_STYLES: Record<InvestmentStatus, string> = {
  ACTIVE:    'bg-emerald-100 text-emerald-700',
  MATURED:   'bg-blue-100 text-blue-700',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
};

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function InvestmentsPage({ units, customers, onAdd, onEdit, onDelete, refreshSignal }: InvestmentsPageProps) {
  const { apiFetch } = useApi();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState<InvestmentStatus | ''>('');

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/investments');
      if (res.ok) setInvestments(await res.json());
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments, refreshSignal]);

  const filtered = investments.filter(inv => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (inv.customer?.name ?? '').toLowerCase().includes(q) ||
      (inv.customer?.icPassport ?? '').toLowerCase().includes(q) ||
      (inv.unit?.unitNumber ?? '').toLowerCase().includes(q) ||
      (inv.unit?.property?.name ?? '').toLowerCase().includes(q)
    );
  });

  const totalCapital  = investments.reduce((s, i) => s + i.capitalAmount, 0);
  const activeCount   = investments.filter(i => i.status === 'ACTIVE').length;
  const maturedCount  = investments.filter(i => i.status === 'MATURED').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Investments</h1>
          <p className="text-slate-500">Track capital invested by investors into units.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Record Investment
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <DollarSign className="text-indigo-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Capital</p>
            <p className="text-xl font-bold text-slate-900">RM {fmt(totalCapital)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <CheckCircle className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Matured</p>
            <p className="text-2xl font-bold text-slate-900">{maturedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search investor, unit, property…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as InvestmentStatus | '')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="MATURED">Matured</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Investor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Capital (RM)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{inv.customer?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{inv.customer?.icPassport}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-800">{inv.unit?.unitNumber ?? '—'}</div>
                      {inv.unit?.property && (
                        <div className="text-xs text-slate-400">{inv.unit.property.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {fmt(inv.capitalAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>{fmtDate(inv.startDate)}</div>
                      <div className="text-slate-400">to {fmtDate(inv.endDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(inv)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(inv)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      {search || filterStatus ? 'No investments match your filters.' : 'No investments recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
