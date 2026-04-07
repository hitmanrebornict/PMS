import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight,
  Home, User, CheckCircle, XCircle, AlertCircle, Calendar,
} from 'lucide-react';
import { Owner, OwnerAgreement, OwnerAgreementExpense, Unit } from '../../types';
import { useApi } from '../../hooks/useApi';

type PageTab = 'agreements' | 'owners';

interface OwnerAgreementsPageProps {
  units: Unit[];
  onAddOwner: () => void;
  onEditOwner: (owner: Owner) => void;
  onDeleteOwner: (owner: Owner) => void;
  onAddAgreement: () => void;
  onEditAgreement: (ag: OwnerAgreement) => void;
  onDeleteAgreement: (ag: OwnerAgreement) => void;
  refreshSignal: number;
}

const AG_STATUS_STYLE: Record<string, string> = {
  ACTIVE:     'bg-emerald-100 text-emerald-700',
  TERMINATED: 'bg-red-100 text-red-700',
  COMPLETED:  'bg-slate-100 text-slate-600',
};

function fmt(n: number) { return n.toLocaleString('en-MY', { minimumFractionDigits: 2 }); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Expense row ───────────────────────────────────────────────────────────────

const ExpenseRow: React.FC<{
  exp: OwnerAgreementExpense;
  onPay: (id: string) => void;
}> = ({ exp, onPay }) => {
  const isPaid = exp.status === 'PAID';
  return (
    <tr className="border-t border-slate-100 hover:bg-white/60 transition-colors">
      <td className="px-4 py-2 text-xs text-slate-600">{exp.dueDate ? fmtDate(exp.dueDate) : '—'}</td>
      <td className="px-4 py-2 text-xs text-slate-500">{exp.description ?? '—'}</td>
      <td className="px-4 py-2 text-xs text-right font-medium text-slate-800">RM {fmt(exp.amount)}</td>
      <td className="px-4 py-2 text-xs text-center">
        {isPaid ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle size={11} /> Paid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <AlertCircle size={11} /> Pending
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-xs text-slate-500">{exp.paidAt ? fmtDate(exp.paidAt) : '—'}</td>
      <td className="px-4 py-2 text-right">
        {!isPaid && (
          <button
            onClick={() => onPay(exp.id)}
            className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
          >
            Mark Paid
          </button>
        )}
      </td>
    </tr>
  );
};

// ── Agreement row ─────────────────────────────────────────────────────────────

const AgreementRow: React.FC<{
  ag: OwnerAgreement;
  onEdit: () => void;
  onDelete: () => void;
  onTerminate: (ag: OwnerAgreement) => void;
  onPayExpense: (expenseId: string, agreementId: string) => void;
}> = ({ ag, onEdit, onDelete, onTerminate, onPayExpense }) => {
  const [open, setOpen] = useState(false);
  const expenses = ag.expenses ?? [];
  const paidCount    = expenses.filter(e => e.status === 'PAID').length;
  const pendingCount = expenses.filter(e => e.status === 'PENDING').length;

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left">
          {open ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
          <div>
            <span className="text-sm font-semibold text-slate-900">{ag.owner?.name ?? '—'}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-sm text-slate-600">{ag.unit?.property?.name} — {ag.unit?.unitNumber}</span>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-800">RM {fmt(ag.amount)}/mo</span>
          <span className="text-xs text-slate-400">{fmtDate(ag.startDate)} – {fmtDate(ag.endDate)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AG_STATUS_STYLE[ag.status]}`}>{ag.status}</span>
          <span className="text-xs text-slate-400">Day {ag.paymentDay}</span>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
            {ag.status === 'ACTIVE' && (
              <button
                onClick={() => onTerminate(ag)}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Terminate early"
              >
                <XCircle size={14} />
              </button>
            )}
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-3 pt-2">
          <div className="flex items-center gap-4 mb-2 text-xs text-slate-500">
            <span className="font-medium">Payment schedule</span>
            <span className="text-emerald-600">{paidCount} paid</span>
            <span className="text-amber-600">{pendingCount} pending</span>
          </div>
          {expenses.length === 0 ? (
            <p className="text-xs text-slate-400">No expenses generated.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wide">
                  <th className="px-4 pb-1 text-left">Due Date</th>
                  <th className="px-4 pb-1 text-left">Description</th>
                  <th className="px-4 pb-1 text-right">Amount</th>
                  <th className="px-4 pb-1 text-center">Status</th>
                  <th className="px-4 pb-1 text-left">Paid On</th>
                  <th className="px-4 pb-1" />
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <ExpenseRow key={exp.id} exp={exp} onPay={id => onPayExpense(id, ag.id)} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export function OwnerAgreementsPage({
  units,
  onAddOwner, onEditOwner, onDeleteOwner,
  onAddAgreement, onEditAgreement, onDeleteAgreement,
  refreshSignal,
}: OwnerAgreementsPageProps) {
  const { apiFetch } = useApi();
  const [tab, setTab]                 = useState<PageTab>('agreements');
  const [owners, setOwners]           = useState<Owner[]>([]);
  const [agreements, setAgreements]   = useState<OwnerAgreement[]>([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');

  // Terminate overlay state
  const [terminateTarget, setTerminateTarget]   = useState<OwnerAgreement | null>(null);
  const [terminationDate, setTerminationDate]   = useState('');
  const [terminating, setTerminating]           = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersRes, agRes] = await Promise.all([
        apiFetch('/api/owners'),
        apiFetch('/api/owner-agreements'),
      ]);
      if (ownersRes.ok) setOwners(await ownersRes.json());
      if (agRes.ok)     setAgreements(await agRes.json());
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshSignal]);

  const handlePayExpense = async (expenseId: string, agreementId: string) => {
    const res = await apiFetch(`/api/expenses/${expenseId}/pay`, { method: 'PATCH' });
    if (res.ok) {
      const updated = await res.json();
      setAgreements(prev => prev.map(ag => {
        if (ag.id !== agreementId) return ag;
        return {
          ...ag,
          expenses: (ag.expenses ?? []).map(e =>
            e.id === expenseId ? { ...e, status: updated.status, paidAt: updated.paidAt } : e,
          ),
        };
      }));
    }
  };

  const handleTerminate = async () => {
    if (!terminateTarget || !terminationDate) return;
    setTerminating(true);
    try {
      const res = await apiFetch(`/api/owner-agreements/${terminateTarget.id}/terminate`, {
        method: 'PATCH',
        body: JSON.stringify({ terminationDate }),
      });
      if (res.ok) {
        const updated: OwnerAgreement = await res.json();
        setAgreements(prev => prev.map(ag => ag.id === updated.id ? updated : ag));
        setTerminateTarget(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to terminate agreement');
      }
    } finally {
      setTerminating(false);
    }
  };

  const openTerminate = (ag: OwnerAgreement) => {
    const today = new Date().toISOString().slice(0, 10);
    setTerminationDate(today);
    setTerminateTarget(ag);
  };

  // Filtered agreements
  const filteredAg = agreements.filter(ag => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (ag.owner?.name ?? '').toLowerCase().includes(q) ||
      (ag.unit?.unitNumber ?? '').toLowerCase().includes(q) ||
      (ag.unit?.property?.name ?? '').toLowerCase().includes(q)
    );
  });

  const filteredOwners = owners.filter(o => {
    if (!ownerSearch) return true;
    const q = ownerSearch.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.phone ?? '').includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.icPassport ?? '').toLowerCase().includes(q)
    );
  });

  const activeCount = agreements.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Agreements</h1>
          <p className="text-slate-500">Manage house owners and their rental agreements.</p>
        </div>
        <button
          onClick={tab === 'owners' ? onAddOwner : onAddAgreement}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          {tab === 'owners' ? 'Add Owner' : 'New Agreement'}
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><Home className="text-indigo-600" size={18} /></div>
          <div><p className="text-xs text-slate-500 uppercase tracking-wide">Active Agreements</p><p className="text-2xl font-bold text-slate-900">{activeCount}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Calendar className="text-blue-600" size={18} /></div>
          <div><p className="text-xs text-slate-500 uppercase tracking-wide">Total Agreements</p><p className="text-2xl font-bold text-slate-900">{agreements.length}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><User className="text-slate-500" size={18} /></div>
          <div><p className="text-xs text-slate-500 uppercase tracking-wide">Owners</p><p className="text-2xl font-bold text-slate-900">{owners.length}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
        {(['agreements', 'owners'] as PageTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'agreements' ? <Home size={15} /> : <User size={15} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Agreements Tab ─────────────────────────────────────────── */}
      {tab === 'agreements' && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="Search owner, unit, property…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : filteredAg.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {search ? 'No agreements match your search.' : 'No agreements yet. Click "New Agreement" to create one.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAg.map(ag => (
                <AgreementRow
                  key={ag.id}
                  ag={ag}
                  onEdit={() => onEditAgreement(ag)}
                  onDelete={() => onDeleteAgreement(ag)}
                  onTerminate={openTerminate}
                  onPayExpense={handlePayExpense}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Owners Tab ────────────────────────────────────────────── */}
      {tab === 'owners' && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="Search by name, phone, IC…"
              value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Name', 'Contact', 'IC / Passport', 'Bank', 'Actions'].map(h => (
                      <th key={h} className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider${h === 'Actions' ? ' text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOwners.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{o.name}</td>
                      <td className="px-6 py-4">
                        {o.phone && <div className="text-sm text-slate-700">{o.phone}</div>}
                        {o.email && <div className="text-xs text-slate-400">{o.email}</div>}
                        {!o.phone && !o.email && <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{o.icPassport || <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-4">
                        {o.bankName && <div className="text-sm text-slate-700">{o.bankName}</div>}
                        {o.bankAccount && <div className="text-xs text-slate-400">{o.bankAccount}</div>}
                        {!o.bankName && !o.bankAccount && <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => onEditOwner(o)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => onDeleteOwner(o)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOwners.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      {ownerSearch ? 'No owners match your search.' : 'No owners added yet.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Terminate overlay ──────────────────────────────────────── */}
      {terminateTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTerminateTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Terminate Agreement Early</h3>
            <p className="text-sm text-slate-500">
              Agreement: <strong>{terminateTarget.owner?.name}</strong> — {terminateTarget.unit?.unitNumber}
            </p>
            <p className="text-xs text-slate-400">All PENDING expenses after the termination date will be voided.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Termination Date</label>
              <input
                type="date"
                lang="en-GB"
                value={terminationDate}
                min={terminateTarget.startDate.slice(0, 10)}
                max={terminateTarget.endDate.slice(0, 10)}
                onChange={e => setTerminationDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setTerminateTarget(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm">Cancel</button>
              <button
                onClick={handleTerminate}
                disabled={terminating || !terminationDate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
              >
                {terminating ? 'Terminating…' : 'Confirm Termination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
