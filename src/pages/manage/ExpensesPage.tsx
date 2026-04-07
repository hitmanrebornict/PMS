import { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, Pencil, Trash2, ChevronDown, ChevronRight,
  Tag, Receipt, Building2, Search, X,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ExpenseType, ExpenseSummaryProperty, ExpenseSummaryUnit } from '../../types';

type PageTab = 'overview' | 'types';

interface ExpensesPageProps {
  expenseTypes: ExpenseType[];
  onAddExpense: (unitId?: string) => void;
  onEditExpense: (expenseId: string, unitId: string) => void;
  onDeleteExpense: (id: string, unitId: string) => void;
  onAddType: () => void;
  onEditType: (type: ExpenseType) => void;
  onDeleteType: (type: ExpenseType) => void;
  refreshSignal: number;
}

function fmt(amount: number) {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ExpensesPage({
  expenseTypes,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddType,
  onEditType,
  onDeleteType,
  refreshSignal,
}: ExpensesPageProps) {
  const { apiFetch } = useApi();
  const [tab, setTab] = useState<PageTab>('overview');
  const [summary, setSummary] = useState<ExpenseSummaryProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/expenses/summary');
      if (res.ok) setSummary(await res.json());
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchSummary(); }, [fetchSummary, refreshSignal]);

  const toggleProperty = (id: string) => {
    setExpandedProperties(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filter summary data
  const filteredSummary = summary.map(prop => {
    const propMatchesSearch = !search || prop.name.toLowerCase().includes(search.toLowerCase());
    const filteredUnits: ExpenseSummaryUnit[] = prop.units
      .filter(unit => {
        const unitMatchesSearch = !search ||
          propMatchesSearch ||
          unit.unitNumber.toLowerCase().includes(search.toLowerCase());
        if (!unitMatchesSearch) return false;
        return true;
      })
      .map(unit => ({
        ...unit,
        expenses: unit.expenses.filter(exp => {
          if (search) {
            const q = search.toLowerCase();
            const matchesType = exp.expenseType.name.toLowerCase().includes(q);
            const matchesUnit = unit.unitNumber.toLowerCase().includes(q);
            const matchesProp = prop.name.toLowerCase().includes(q);
            const matchesDesc = (exp.description ?? '').toLowerCase().includes(q);
            if (!matchesType && !matchesUnit && !matchesProp && !matchesDesc) return false;
          }
          if (dateFrom && exp.expenseDate < dateFrom) return false;
          if (dateTo && exp.expenseDate > dateTo) return false;
          return true;
        }),
      }))
      .filter(unit => !search || unit.expenses.length > 0 || unit.unitNumber.toLowerCase().includes(search.toLowerCase()));

    return {
      ...prop,
      units: filteredUnits,
      totalExpenses: filteredUnits.reduce((s, u) => s + u.expenses.reduce((es, e) => es + e.amount, 0), 0),
    };
  }).filter(prop => prop.units.length > 0);

  const grandTotal = filteredSummary.reduce((s, p) => s + p.totalExpenses, 0);
  const hasDateFilter = dateFrom || dateTo;

  const filteredTypes = typeSearch
    ? expenseTypes.filter(t =>
        t.name.toLowerCase().includes(typeSearch.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(typeSearch.toLowerCase())
      )
    : expenseTypes;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Track costs per unit across all properties.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSummary}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => onAddExpense()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} />
            Log Expense
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === 'overview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 size={15} />
          Property Overview
        </button>
        <button
          onClick={() => setTab('types')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === 'types' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Tag size={15} />
          Expense Types
        </button>
      </div>

      {/* ── Overview Tab ────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search property, unit, type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 font-medium">Date:</span>
              <input
                type="date"
                lang="en-GB"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                lang="en-GB"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {hasDateFilter && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Grand total */}
          {!loading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-indigo-700">
                Total Expenses {search || hasDateFilter ? '(filtered)' : '(All Properties)'}
              </span>
              <span className="text-xl font-bold text-indigo-700">{fmt(grandTotal)}</span>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading...</p>
            </div>
          )}

          {!loading && filteredSummary.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Receipt size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">{search || hasDateFilter ? 'No expenses match your filters.' : 'No expenses yet'}</p>
              {!search && !hasDateFilter && <p className="text-sm mt-1">Click "Log Expense" to record the first one.</p>}
            </div>
          )}

          {!loading && filteredSummary.map(property => (
            <div key={property.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Property row */}
              <button
                onClick={() => toggleProperty(property.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {expandedProperties.has(property.id) ? (
                    <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{property.name}</p>
                    {property.address && <p className="text-xs text-slate-400">{property.address}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{fmt(property.totalExpenses)}</p>
                  <p className="text-xs text-slate-400">{property.units.length} unit{property.units.length !== 1 ? 's' : ''}</p>
                </div>
              </button>

              {/* Units */}
              {expandedProperties.has(property.id) && (
                <div className="border-t border-slate-100">
                  {property.units.length === 0 && (
                    <p className="px-8 py-4 text-sm text-slate-400">No units in this property.</p>
                  )}
                  {property.units.map(unit => (
                    <div key={unit.id} className="border-b border-slate-50 last:border-b-0">
                      {/* Unit row */}
                      <div className="flex items-center justify-between px-8 py-3 hover:bg-slate-50 transition-colors">
                        <button
                          onClick={() => toggleUnit(unit.id)}
                          className="flex items-center gap-2 text-left flex-1"
                        >
                          {expandedUnits.has(unit.id) ? (
                            <ChevronDown size={15} className="text-slate-300 flex-shrink-0" />
                          ) : (
                            <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-slate-700">Unit {unit.unitNumber}</span>
                          {unit.expenses.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              {unit.expenses.length} record{unit.expenses.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-700">
                            {fmt(unit.expenses.reduce((s, e) => s + e.amount, 0))}
                          </span>
                          <button
                            onClick={() => onAddExpense(unit.id)}
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Log expense for this unit"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expense rows */}
                      {expandedUnits.has(unit.id) && (
                        <div className="bg-slate-50/50 border-t border-slate-100">
                          {unit.expenses.length === 0 ? (
                            <p className="px-12 py-3 text-xs text-slate-400">No expenses logged for this unit.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-slate-400 uppercase tracking-wide">
                                  <th className="px-12 py-2 text-left font-semibold">Date</th>
                                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {unit.expenses.map(exp => (
                                  <tr key={exp.id} className="border-t border-slate-100 hover:bg-white/60 transition-colors">
                                    <td className="px-12 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                                    <td className="px-3 py-2.5">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {exp.expenseType.name}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-500 truncate max-w-[200px]">{exp.description ?? '—'}</td>
                                    <td className="px-3 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmt(exp.amount)}</td>
                                    <td className="px-3 py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => onEditExpense(exp.id, unit.id)}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                          title="Edit"
                                        >
                                          <Pencil size={13} />
                                        </button>
                                        <button
                                          onClick={() => onDeleteExpense(exp.id, unit.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Expense Types Tab ───────────────────────────────────────── */}
      {tab === 'types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search types..."
                value={typeSearch}
                onChange={e => setTypeSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
              />
            </div>
            <button
              onClick={onAddType}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <Plus size={16} />
              Add Type
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredTypes.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Tag size={32} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">{typeSearch ? 'No types match your search.' : 'No expense types defined'}</p>
                {!typeSearch && <p className="text-sm mt-1">Add types like "Maintenance", "Utilities", "Repair", etc.</p>}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-semibold">Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Description</th>
                    <th className="px-5 py-3 text-center font-semibold">Status</th>
                    <th className="px-5 py-3 text-center font-semibold">Expenses</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTypes.map(type => (
                    <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{type.name}</td>
                      <td className="px-5 py-3 text-slate-500">{type.description ?? '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          type.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-slate-500">{type.expenseCount ?? 0}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditType(type)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteType(type)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
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
