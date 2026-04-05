import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronRight, X, Car } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ProfitSummary, ProfitProperty, ProfitUnit } from '../../types';

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function defaultTo() {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// ── Unit row ─────────────────────────────────────────────────────────────────

const UnitRow: React.FC<{ unit: ProfitUnit }> = ({ unit }) => {
  const [open, setOpen] = useState(false);
  const profitColor = unit.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className="text-sm font-medium text-slate-800">{unit.unitNumber}</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-emerald-600">+RM {fmt(unit.totalIncome)}</span>
          <span className="text-red-500">−RM {fmt(unit.totalExpenses)}</span>
          <span className={`font-semibold ${profitColor}`}>= RM {fmt(unit.netProfit)}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-2 bg-slate-50 space-y-3">
          {/* Invoices */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Paid Invoices</p>
            {unit.invoices.length === 0 ? (
              <p className="text-xs text-slate-400">No paid invoices in this period.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left pb-1">Period</th>
                    <th className="text-right pb-1">Amount</th>
                    <th className="text-left pb-1 pl-4">Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {unit.invoices.map(inv => (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="py-1 text-slate-600">{fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}</td>
                      <td className="py-1 text-right font-medium text-emerald-700">RM {fmt(inv.amount)}</td>
                      <td className="py-1 pl-4 text-slate-500">{fmtDate(inv.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Expenses */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Expenses</p>
            {unit.expenses.length === 0 ? (
              <p className="text-xs text-slate-400">No expenses in this period.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left pb-1">Type</th>
                    <th className="text-left pb-1">Description</th>
                    <th className="text-right pb-1">Amount</th>
                    <th className="text-left pb-1 pl-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {unit.expenses.map(exp => (
                    <tr key={exp.id} className="border-t border-slate-100">
                      <td className="py-1 text-slate-600">{exp.expenseType.name}</td>
                      <td className="py-1 text-slate-500">{exp.description || '—'}</td>
                      <td className="py-1 text-right font-medium text-red-600">RM {fmt(exp.amount)}</td>
                      <td className="py-1 pl-4 text-slate-500">{fmtDate(exp.expenseDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Property accordion ────────────────────────────────────────────────────────

const PropertySection: React.FC<{ prop: ProfitProperty }> = ({ prop }) => {
  const [open, setOpen] = useState(true);
  const profitColor = prop.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
          <span className="font-semibold text-slate-900">{prop.name}</span>
          <span className="text-xs text-slate-400">{prop.units.length} unit{prop.units.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-8 text-sm">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Income</p>
            <p className="font-semibold text-emerald-600">RM {fmt(prop.totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Expenses</p>
            <p className="font-semibold text-red-500">RM {fmt(prop.totalExpenses)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Net Profit</p>
            <p className={`font-bold text-base ${profitColor}`}>RM {fmt(prop.netProfit)}</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-2 bg-white">
          {prop.units.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No data for this period.</p>
          ) : (
            prop.units.map(u => <UnitRow key={u.id} unit={u} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProfitPage() {
  const { apiFetch } = useApi();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo]     = useState(defaultTo);
  const [data, setData] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [carparkOpen, setCarparkOpen] = useState(false);

  const fetchProfit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/profit?from=${from}&to=${to}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [apiFetch, from, to]);

  useEffect(() => { fetchProfit(); }, [fetchProfit]);

  const resetPeriod = () => {
    setFrom(defaultFrom());
    setTo(defaultTo());
  };

  const isDefaultPeriod = from === defaultFrom() && to === defaultTo();
  const profit = data?.summary.netProfit ?? 0;
  const profitPositive = profit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Income from paid invoices minus expenses</p>
        </div>
      </div>

      {/* Period Picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-slate-400 text-sm">to</span>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {!isDefaultPeriod && (
          <button
            onClick={resetPeriod}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5"
          >
            <X size={12} /> Reset to this month
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-emerald-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Income</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">RM {fmt(data.summary.totalIncome)}</p>
              <p className="text-xs text-slate-400 mt-1">Paid invoices only</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-red-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Expenses</p>
              </div>
              <p className="text-2xl font-bold text-red-500">RM {fmt(data.summary.totalExpenses)}</p>
              <p className="text-xs text-slate-400 mt-1">All recorded expenses</p>
            </div>

            <div className={`border rounded-xl p-5 ${profitPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className={profitPositive ? 'text-emerald-600' : 'text-red-600'} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${profitPositive ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</p>
              </div>
              <p className={`text-2xl font-bold ${profitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                {profitPositive ? '' : '−'}RM {fmt(Math.abs(profit))}
              </p>
              <p className={`text-xs mt-1 ${profitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {profitPositive ? 'Profitable period' : 'Loss for this period'}
              </p>
            </div>
          </div>

          {/* Properties */}
          <div className="space-y-3">
            {data.properties.length === 0 && data.carparkRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <DollarSign size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No paid invoices or expenses found for this period.</p>
              </div>
            ) : (
              <>
                {data.properties.map(p => <PropertySection key={p.id} prop={p} />)}

                {/* Carpark income section */}
                {data.carparkRows.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setCarparkOpen(o => !o)}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {carparkOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        <Car size={16} className="text-slate-500" />
                        <span className="font-semibold text-slate-900">Carpark Income</span>
                        <span className="text-xs text-slate-400">{data.carparkRows.length} invoice{data.carparkRows.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-8 text-sm">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Income</p>
                          <p className="font-bold text-base text-emerald-600">RM {fmt(data.carparkIncome)}</p>
                        </div>
                      </div>
                    </button>
                    {carparkOpen && (
                      <div className="p-4 bg-white">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 text-xs">
                              <th className="text-left pb-2">Carpark</th>
                              <th className="text-left pb-2">Period</th>
                              <th className="text-right pb-2">Amount</th>
                              <th className="text-left pb-2 pl-4">Paid On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.carparkRows.map(row => (
                              <tr key={row.id} className="border-t border-slate-100">
                                <td className="py-2 text-slate-700 font-medium">CP {row.carparkNumber}</td>
                                <td className="py-2 text-slate-600">{fmtDate(row.periodStart)} – {fmtDate(row.periodEnd)}</td>
                                <td className="py-2 text-right font-semibold text-emerald-600">RM {fmt(row.amount)}</td>
                                <td className="py-2 pl-4 text-slate-500">{fmtDate(row.paidAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
