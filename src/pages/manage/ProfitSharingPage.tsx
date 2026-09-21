import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronDown, ChevronRight, Search, Save, Calendar, TrendingUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import { UnitShareEditor } from '../../components/manage/UnitShareEditor';
import {
  ProfitSharingUnit,
  ProfitSharingCalculation,
  ProfitSharingRecord,
  ShareProjection,
  UnitType,
} from '../../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  STUDIO: 'Studio',
  ONE_BEDROOM: '1 Bedroom',
  TWO_BEDROOM: '2 Bedroom',
  THREE_BEDROOM: '3 Bedroom',
  BUNGALOW: 'Bungalow',
  OTHER: 'Other',
};

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ProfitSharingPage() {
  const { apiFetch } = useApi();
  const { user: currentUser } = useAuth();
  const now = new Date();

  const canManageShares = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role ?? '');
  const isProfitSharingRole = currentUser?.role === 'PROFIT_SHARING';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // ─── List view state ──────────────────────────────────────────
  const [units, setUnits] = useState<ProfitSharingUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [search, setSearch] = useState('');

  // ─── Detail view state ────────────────────────────────────────
  const [selectedUnit, setSelectedUnit] = useState<ProfitSharingUnit | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [calc, setCalc] = useState<ProfitSharingCalculation | null>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandSales, setExpandSales] = useState(true);
  const [expandExpenses, setExpandExpenses] = useState(true);
  const [savedRecords, setSavedRecords] = useState<ProfitSharingRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoadingUnits(true);
    try {
      const res = await apiFetch('/api/profit-sharing/units');
      if (res.ok) setUnits(await res.json());
    } finally {
      setLoadingUnits(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const loadCalc = useCallback(async (unitId: string, y: number, m: number) => {
    setLoadingCalc(true);
    setCalc(null);
    try {
      const res = await apiFetch(`/api/profit-sharing/${unitId}/calculate?year=${y}&month=${m}`);
      if (res.ok) {
        const data: ProfitSharingCalculation = await res.json();
        setCalc(data);
        setNotes(data.savedRecord?.notes ?? '');
      }
    } finally {
      setLoadingCalc(false);
    }
  }, [apiFetch]);

  const loadRecords = useCallback(async (unitId: string) => {
    setLoadingRecords(true);
    try {
      const res = await apiFetch(`/api/profit-sharing/${unitId}/records`);
      if (res.ok) setSavedRecords(await res.json());
    } finally {
      setLoadingRecords(false);
    }
  }, [apiFetch]);

  const handleSelectUnit = (unit: ProfitSharingUnit) => {
    setSelectedUnit(unit);
    setCalc(null);
    setNotes('');
    setSaveSuccess(false);
    loadCalc(unit.id, year, month);
    loadRecords(unit.id);
  };

  const handleBack = () => {
    setSelectedUnit(null);
    setCalc(null);
    setSavedRecords([]);
  };

  const handleLoad = () => {
    if (selectedUnit) loadCalc(selectedUnit.id, year, month);
  };

  const handleSave = async () => {
    if (!selectedUnit || !calc) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await apiFetch(`/api/profit-sharing/${selectedUnit.id}/records`, {
        method: 'POST',
        body: JSON.stringify({ month, year, notes }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        await loadCalc(selectedUnit.id, year, month);
        await loadRecords(selectedUnit.id);
        await loadUnits();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save cutoff');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredUnits = units.filter(u =>
    u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
    u.propertyName.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Unit list view ────────────────────────────────────────────
  if (!selectedUnit) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Profit Sharing</h1>
          <p className="text-slate-500 text-sm mt-1">Select a unit to view monthly profit sharing breakdown</p>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by unit or property..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {loadingUnits ? (
          <div className="text-center py-12 text-slate-400">Loading units...</div>
        ) : filteredUnits.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No units found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredUnits.map(u => (
              <button
                key={u.id}
                onClick={() => handleSelectUnit(u)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 px-4 py-3 hover:bg-indigo-50 hover:border-indigo-200 active:bg-indigo-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 leading-tight">{u.unitNumber}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{u.propertyName}</div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0 mt-0.5" />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {UNIT_TYPE_LABELS[u.type]}
                  </span>
                  {u.guaranteeFee != null && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                      Fee: MYR {fmt(u.guaranteeFee)}
                    </span>
                  )}
                  {(u.shareCount ?? 0) > 0 ? (
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                      {u.shareCount} owner{u.shareCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 px-2 py-0.5">No owners</span>
                  )}
                  {u.lastCutoffMonth && u.lastCutoffYear ? (
                    <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                      Last: {MONTH_NAMES[u.lastCutoffMonth - 1].slice(0, 3)} {u.lastCutoffYear}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 px-2 py-0.5">No cutoff</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Unit detail view ──────────────────────────────────────────
  const isGuaranteeApplied = calc && calc.totalSales < calc.guaranteeFee;
  const myShare: ShareProjection | undefined = calc?.shares.find(s => s.userId === currentUser?.id);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shrink-0 mt-0.5"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight break-words">
            {selectedUnit.unitNumber} — {selectedUnit.propertyName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{UNIT_TYPE_LABELS[selectedUnit.type]}</span>
            {selectedUnit.guaranteeFee != null && (
              <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                Fee: MYR {fmt(selectedUnit.guaranteeFee)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ownership editor (MANAGER/ADMIN/SUPER_ADMIN) */}
      {canManageShares && (
        <UnitShareEditor
          unitId={selectedUnit.id}
          onSaved={() => {
            if (selectedUnit) loadCalc(selectedUnit.id, year, month);
          }}
        />
      )}

      {/* Read-only share badge for PROFIT_SHARING users */}
      {isProfitSharingRole && myShare && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
          <TrendingUp size={15} className="shrink-0" />
          <span>Your share in this unit: <strong>{myShare.percentage}%</strong></span>
        </div>
      )}

      {/* Month/Year selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-slate-400 shrink-0" />
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={handleLoad}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      {loadingCalc && (
        <div className="text-center py-12 text-slate-400">Calculating...</div>
      )}

      {calc && !loadingCalc && (
        <>
          {/* Financial breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">

            {/* ── Sales section ── */}
            <button
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
              onClick={() => setExpandSales(v => !v)}
            >
              <span>SALES</span>
              {expandSales ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {expandSales && (
              <div className="px-4 sm:px-5 py-3">
                <p className="text-xs text-slate-400 mb-2">
                  Counted by billing period — an invoice whose period starts in this month is
                  included here even if it was paid in a later month.
                </p>
                {calc.invoices.length === 0 ? (
                  <p className="text-sm text-slate-400 py-1">No paid invoices billed for this month</p>
                ) : (
                  <div className="space-y-2">
                    {/* Mobile: stacked cards */}
                    <div className="sm:hidden space-y-2">
                      {calc.invoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-xs font-medium text-slate-700">{fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}</div>
                            <div className="text-xs text-slate-400 mt-0.5">Paid {fmtDate(inv.paidAt)}</div>
                          </div>
                          <div className="text-sm font-semibold text-slate-800 shrink-0 ml-2">MYR {fmt(inv.amount)}</div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop: table */}
                    <table className="hidden sm:table w-full text-xs mb-1">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-100">
                          <th className="text-left pb-1 font-medium">Period</th>
                          <th className="text-left pb-1 font-medium">Paid On</th>
                          <th className="text-right pb-1 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calc.invoices.map(inv => (
                          <tr key={inv.id} className="border-b border-slate-50">
                            <td className="py-1 text-slate-600">{fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}</td>
                            <td className="py-1 text-slate-600">{fmtDate(inv.paidAt)}</td>
                            <td className="py-1 text-right font-medium text-slate-800">MYR {fmt(inv.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Total Sales</span>
              <span className="text-sm font-bold text-slate-900">MYR {fmt(calc.totalSales)}</span>
            </div>

            <div className="border-t border-slate-200" />

            {/* ── Expenses section ── */}
            <button
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
              onClick={() => setExpandExpenses(v => !v)}
            >
              <span>EXPENSES</span>
              {expandExpenses ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {expandExpenses && (
              <div className="px-4 sm:px-5 py-3">
                {calc.expenses.length === 0 ? (
                  <p className="text-sm text-slate-400 py-1">No expenses for this period</p>
                ) : (
                  <div className="space-y-2">
                    {/* Mobile: stacked cards */}
                    <div className="sm:hidden space-y-2">
                      {calc.expenses.map(exp => (
                        <div key={exp.id} className="flex items-start justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div className="min-w-0 mr-2">
                            <div className="text-xs font-medium text-slate-700">{exp.expenseType.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {exp.description ? `${exp.description} · ` : ''}{fmtDate(exp.expenseDate)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-slate-800 shrink-0">MYR {fmt(exp.amount)}</div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop: table */}
                    <table className="hidden sm:table w-full text-xs mb-1">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-100">
                          <th className="text-left pb-1 font-medium">Type</th>
                          <th className="text-left pb-1 font-medium">Description</th>
                          <th className="text-left pb-1 font-medium">Date</th>
                          <th className="text-right pb-1 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calc.expenses.map(exp => (
                          <tr key={exp.id} className="border-b border-slate-50">
                            <td className="py-1 text-slate-600">{exp.expenseType.name}</td>
                            <td className="py-1 text-slate-500">{exp.description || '—'}</td>
                            <td className="py-1 text-slate-600">{fmtDate(exp.expenseDate)}</td>
                            <td className="py-1 text-right font-medium text-slate-800">MYR {fmt(exp.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Total Expenses</span>
              <span className="text-sm font-bold text-slate-900">MYR {fmt(calc.totalExpenses)}</span>
            </div>

            <div className="border-t border-slate-200" />

            {/* ── Summary ── */}
            <div className="px-4 sm:px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-700">
                <span>Net Profit</span>
                <span className={`font-semibold ${calc.netProfit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  MYR {fmt(calc.netProfit)}
                </span>
              </div>
              {calc.guaranteeFee > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-1 flex-wrap">
                    Guarantee Fee
                    {isGuaranteeApplied && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Applied</span>
                    )}
                  </span>
                  <span className={isGuaranteeApplied ? 'text-amber-700 font-semibold' : 'text-slate-400'}>
                    {isGuaranteeApplied ? '− ' : ''}MYR {fmt(calc.guaranteeFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800">Final Profit</span>
                <span className={`text-lg font-bold ${calc.finalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  MYR {fmt(calc.finalProfit)}
                </span>
              </div>
            </div>

            {/* ── Projected Payout ── */}
            {calc.shares.length > 0 && (
              <>
                <div className="border-t border-slate-200" />
                <div className="px-4 sm:px-5 py-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Projected Payout</h4>
                  <div className="space-y-2">
                    {(isProfitSharingRole
                      ? calc.shares.filter(s => s.userId === currentUser?.id)
                      : calc.shares
                    ).map(s => (
                      <div
                        key={s.userId}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${s.userId === currentUser?.id ? 'bg-indigo-50' : 'bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-slate-700 truncate">{s.userName}</span>
                          {s.userId === currentUser?.id && (
                            <span className="text-xs text-indigo-500 font-medium shrink-0">(you)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {s.percentage}%
                          </span>
                          <span className={`text-sm font-bold ${s.projectedAmount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            MYR {fmt(s.projectedAmount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {calc.shares.length === 0 && !isProfitSharingRole && (
              <>
                <div className="border-t border-slate-200" />
                <div className="px-4 sm:px-5 py-3">
                  <p className="text-xs text-slate-400 italic">No ownership configured for this unit</p>
                </div>
              </>
            )}
          </div>

          {/* Saved record indicator */}
          {calc.savedRecord && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-700 leading-snug">
              Cutoff saved on {fmtDate(calc.savedRecord.updatedAt)}
              <span className="text-emerald-600"> · Fee snapshot: MYR {fmt(calc.savedRecord.guaranteeFeeSnapshot)}</span>
            </div>
          )}

          {/* Notes + Save */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="Add notes for this cutoff..."
            />
            <div className="flex items-center justify-between mt-3 gap-3">
              {saveSuccess && (
                <span className="text-sm text-emerald-600 font-medium">Cutoff saved successfully!</span>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Save size={15} />
                  {saving ? 'Saving...' : calc.savedRecord ? 'Update Cutoff' : 'Save Cutoff'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Past cutoffs */}
      {selectedUnit && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Past Cutoffs</h3>
          </div>

          {loadingRecords ? (
            <div className="text-center py-6 text-slate-400 text-sm">Loading records...</div>
          ) : savedRecords.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No cutoffs saved yet</div>
          ) : (
            <>
              {/* ── Mobile: cards ── */}
              <div className="sm:hidden divide-y divide-slate-100">
                {savedRecords.map(r => (
                  <button
                    key={r.id}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors ${r.month === month && r.year === year ? 'bg-indigo-50' : ''}`}
                    onClick={() => { setMonth(r.month); setYear(r.year); loadCalc(selectedUnit.id, r.year, r.month); }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900 text-sm">{MONTH_NAMES[r.month - 1]} {r.year}</span>
                      <span className={`text-sm font-bold ${r.finalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        MYR {fmt(r.finalProfit)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-slate-500">
                      <div>
                        <div className="text-slate-400">Sales</div>
                        <div className="font-medium text-slate-700">{fmt(r.totalSales)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Expenses</div>
                        <div className="font-medium text-slate-700">{fmt(r.totalExpenses)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Net</div>
                        <div className={`font-medium ${r.netProfit >= 0 ? 'text-slate-700' : 'text-red-500'}`}>{fmt(r.netProfit)}</div>
                      </div>
                    </div>
                    {!isProfitSharingRole && (r.allocations ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(r.allocations ?? []).map(a => (
                          <span key={a.userId} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {a.userName} {a.percentage}%
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Desktop: table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="text-left px-5 py-2 font-medium">Period</th>
                      <th className="text-right px-5 py-2 font-medium">Sales</th>
                      <th className="text-right px-5 py-2 font-medium">Expenses</th>
                      <th className="text-right px-5 py-2 font-medium">Net Profit</th>
                      <th className="text-right px-5 py-2 font-medium">Final Profit</th>
                      {!isProfitSharingRole && (
                        <th className="text-center px-5 py-2 font-medium">Owners</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {savedRecords.map(r => (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${r.month === month && r.year === year ? 'bg-indigo-50' : ''}`}
                        onClick={() => { setMonth(r.month); setYear(r.year); loadCalc(selectedUnit.id, r.year, r.month); }}
                      >
                        <td className="px-5 py-2.5 font-medium text-slate-900">{MONTH_NAMES[r.month - 1]} {r.year}</td>
                        <td className="px-5 py-2.5 text-right text-slate-700">MYR {fmt(r.totalSales)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-700">MYR {fmt(r.totalExpenses)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-700">MYR {fmt(r.netProfit)}</td>
                        <td className={`px-5 py-2.5 text-right font-semibold ${r.finalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          MYR {fmt(r.finalProfit)}
                        </td>
                        {!isProfitSharingRole && (
                          <td className="px-5 py-2.5 text-center">
                            {(r.allocations ?? []).length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {(r.allocations ?? []).map(a => (
                                  <span key={a.userId} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    {a.userName} {a.percentage}%
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* My Earnings card */}
      {(isProfitSharingRole || isSuperAdmin) && calc && myShare && (
        <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 border border-indigo-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-indigo-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-800">
              {isProfitSharingRole ? 'My Earnings' : `${myShare.userName}'s Earnings (oversight)`}
            </h3>
          </div>
          <div className="text-xs text-slate-500 mb-4">
            {selectedUnit.unitNumber} · {MONTH_NAMES[month - 1]} {year}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/60 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-1">Your Share</div>
              <div className="text-2xl font-bold text-indigo-600">{myShare.percentage}%</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-1">Your Earning</div>
              {calc.finalProfit > 0 ? (
                <div className="text-2xl font-bold text-emerald-600">
                  MYR {fmt(myShare.projectedAmount)}
                </div>
              ) : (
                <div className="text-2xl font-bold text-slate-300">—</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
