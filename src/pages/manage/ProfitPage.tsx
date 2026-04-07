import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign,
  ChevronDown, ChevronRight, X, Car, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { useApi } from '../../hooks/useApi';
import {
  ProfitSummary, ProfitProperty, ProfitUnit,
  MonthlyProfitSummary, RoomTypeMonthlyData,
  MasterProperty, Unit, Carpark, UnitType,
} from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return toInputDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

function defaultTo() {
  const d = new Date();
  return toInputDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  [UnitType.STUDIO]:        'Studio',
  [UnitType.ONE_BEDROOM]:   '1 Bedroom',
  [UnitType.TWO_BEDROOM]:   '2 Bedroom',
  [UnitType.THREE_BEDROOM]: '3 Bedroom',
  [UnitType.BUNGALOW]:      'Bungalow',
  [UnitType.OTHER]:         'Other',
};

// One colour per room type
const ROOM_TYPE_COLORS: Record<string, string> = {
  STUDIO:        '#6366f1',
  ONE_BEDROOM:   '#10b981',
  TWO_BEDROOM:   '#f59e0b',
  THREE_BEDROOM: '#3b82f6',
  BUNGALOW:      '#ec4899',
  OTHER:         '#94a3b8',
};

function fmtAxis(v: number) {
  if (Math.abs(v) >= 1000) return `RM ${(v / 1000).toFixed(0)}k`;
  return `RM ${v}`;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="leading-5">
          {entry.name}: RM {fmt(Math.abs(entry.value))}{entry.value < 0 ? ' (loss)' : ''}
        </p>
      ))}
    </div>
  );
};

// ── Chart card wrapper ────────────────────────────────────────────────────────

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ── Unit accordion row ────────────────────────────────────────────────────────

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
          {unit.unitType && (
            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {UNIT_TYPE_LABELS[unit.unitType as UnitType] ?? unit.unitType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-emerald-600">+RM {fmt(unit.totalIncome)}</span>
          <span className="text-red-500">−RM {fmt(unit.totalExpenses)}</span>
          <span className={`font-semibold ${profitColor}`}>= RM {fmt(unit.netProfit)}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-2 bg-slate-50 space-y-3">
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
};

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
};

// ── Main page ─────────────────────────────────────────────────────────────────

interface ProfitPageProps {
  properties: MasterProperty[];
  units: Unit[];
  carparks: Carpark[];
}

export function ProfitPage({ properties, units, carparks }: ProfitPageProps) {
  const { apiFetch } = useApi();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo]     = useState(defaultTo);

  // Filter: '' = all; 'p:ID' = property; 'u:ID' = unit; 'c:ID' = carpark
  const [filterValue, setFilterValue] = useState('');

  // Data
  const [data, setData]                             = useState<ProfitSummary | null>(null);
  const [monthlyData, setMonthlyData]               = useState<MonthlyProfitSummary | null>(null);
  const [roomTypeMonthly, setRoomTypeMonthly]       = useState<RoomTypeMonthlyData | null>(null);
  const [loading, setLoading]                       = useState(false);
  const [monthlyLoading, setMonthlyLoading]         = useState(false);
  const [roomTypeLoading, setRoomTypeLoading]       = useState(false);
  const [carparkOpen, setCarparkOpen]               = useState(false);

  // Derive filter query params
  const filterParams = useMemo(() => {
    if (!filterValue) return '';
    const [type, id] = filterValue.split(':');
    if (type === 'p') return `&propertyId=${id}`;
    if (type === 'u') return `&unitId=${id}`;
    if (type === 'c') return `&carparkId=${id}`;
    return '';
  }, [filterValue]);

  // Unit filter params only (no carparkId — room types don't apply to carparks)
  const unitFilterParams = useMemo(() => {
    if (!filterValue || filterValue.startsWith('c:')) return '';
    const [type, id] = filterValue.split(':');
    if (type === 'p') return `&propertyId=${id}`;
    if (type === 'u') return `&unitId=${id}`;
    return '';
  }, [filterValue]);

  const fetchProfit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/profit?from=${from}&to=${to}${filterParams}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [apiFetch, from, to, filterParams]);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const year = from.slice(0, 4);
      const res = await apiFetch(`/api/profit/monthly?year=${year}${filterParams}`);
      if (res.ok) setMonthlyData(await res.json());
    } finally { setMonthlyLoading(false); }
  }, [apiFetch, from, filterParams]);

  const fetchRoomTypeMonthly = useCallback(async () => {
    setRoomTypeLoading(true);
    try {
      const year = from.slice(0, 4);
      const res = await apiFetch(`/api/profit/monthly/roomtype?year=${year}${unitFilterParams}`);
      if (res.ok) setRoomTypeMonthly(await res.json());
    } finally { setRoomTypeLoading(false); }
  }, [apiFetch, from, unitFilterParams]);

  useEffect(() => { fetchProfit(); }, [fetchProfit]);
  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);
  useEffect(() => { fetchRoomTypeMonthly(); }, [fetchRoomTypeMonthly]);

  const resetPeriod = () => { setFrom(defaultFrom()); setTo(defaultTo()); };
  const isDefaultPeriod = from === defaultFrom() && to === defaultTo();
  const profit = data?.summary.netProfit ?? 0;
  const profitPositive = profit >= 0;

  // Filter label for display
  const filterLabel = useMemo(() => {
    if (!filterValue) return '';
    const [type, id] = filterValue.split(':');
    if (type === 'p') return properties.find(p => p.id === id)?.name ?? '';
    if (type === 'u') {
      const u = units.find(u => u.id === id);
      return u ? `${u.unitNumber}${u.propertyName ? ` — ${u.propertyName}` : ''}` : '';
    }
    if (type === 'c') return `CP ${carparks.find(c => c.id === id)?.carparkNumber ?? ''}`;
    return '';
  }, [filterValue, properties, units, carparks]);

  const showCarparks = !filterValue || filterValue.startsWith('c:');
  const showUnits    = !filterValue || filterValue.startsWith('p:') || filterValue.startsWith('u:');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profit Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Income from paid invoices minus expenses</p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        <input type="date" lang="en-GB" value={from} onChange={e => setFrom(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" lang="en-GB" value={to} onChange={e => setTo(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {!isDefaultPeriod && (
          <button onClick={resetPeriod} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <X size={12} /> Reset
          </button>
        )}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <span className="text-sm font-medium text-slate-600">Filter:</span>
        <select
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All</option>
          {properties.length > 0 && (
            <optgroup label="── Properties ──">
              {properties.map(p => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}
            </optgroup>
          )}
          {units.length > 0 && (
            <optgroup label="── Units ──">
              {units.map(u => (
                <option key={u.id} value={`u:${u.id}`}>
                  {u.unitNumber}{u.propertyName ? ` — ${u.propertyName}` : ''}
                </option>
              ))}
            </optgroup>
          )}
          {carparks.length > 0 && (
            <optgroup label="── Carparks ──">
              {carparks.map(c => <option key={c.id} value={`c:${c.id}`}>CP {c.carparkNumber}</option>)}
            </optgroup>
          )}
        </select>
        {filterValue && (
          <button onClick={() => setFilterValue('')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 border border-slate-200 rounded-lg px-2 py-1.5">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-emerald-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Sales</p>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 break-all">RM {fmt(data.summary.totalIncome)}</p>
              <p className="text-xs text-slate-400 mt-1">{filterLabel || 'Paid invoices only'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-red-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Expenses</p>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-red-500 break-all">RM {fmt(data.summary.totalExpenses)}</p>
              <p className="text-xs text-slate-400 mt-1">All recorded expenses</p>
            </div>
            <div className={`border rounded-xl p-5 ${profitPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className={profitPositive ? 'text-emerald-600' : 'text-red-600'} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${profitPositive ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</p>
              </div>
              <p className={`text-lg sm:text-2xl font-bold break-all ${profitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                {profitPositive ? '' : '−'}RM {fmt(Math.abs(profit))}
              </p>
              <p className={`text-xs mt-1 ${profitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {profitPositive ? 'Profitable period' : 'Loss for this period'}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Monthly YTD bar chart */}
            <ChartCard
              title={`Monthly Profit — YTD ${from.slice(0, 4)}`}
              subtitle={filterLabel ? `Filtered: ${filterLabel}` : 'All assets'}
            >
              {monthlyLoading ? (
                <div className="h-56 flex items-center justify-center text-sm text-slate-400">Loading…</div>
              ) : monthlyData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData.months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="income"    name="Income"     fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expenses"  name="Expenses"   fill="#f87171" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="netProfit" name="Net Profit" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </ChartCard>

            {/* Room type YTD line chart */}
            <ChartCard
              title={`Room Type Net Profit — YTD ${from.slice(0, 4)}`}
              subtitle={filterLabel ? `Filtered: ${filterLabel}` : 'All unit types month by month'}
            >
              {roomTypeLoading ? (
                <div className="h-56 flex items-center justify-center text-sm text-slate-400">Loading…</div>
              ) : roomTypeMonthly && roomTypeMonthly.roomTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={roomTypeMonthly.months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {roomTypeMonthly.roomTypes.map(rt => (
                      <Line
                        key={rt}
                        type="monotone"
                        dataKey={rt}
                        name={UNIT_TYPE_LABELS[rt as UnitType] ?? rt}
                        stroke={ROOM_TYPE_COLORS[rt] ?? '#94a3b8'}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-slate-300">
                  <BarChart2 size={32} />
                  <p className="text-xs mt-2">No room type data for this period</p>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Accordion detail */}
          <div className="space-y-3">
            {data.properties.length === 0 && data.carparkRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <DollarSign size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No paid invoices or expenses found for this period{filterLabel ? ` (${filterLabel})` : ''}.</p>
              </div>
            ) : (
              <>
                {showUnits && data.properties.map(p => <PropertySection key={p.id} prop={p} />)}
                {showCarparks && data.carparkRows.length > 0 && (
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
                      <div className="text-right text-sm">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Income</p>
                        <p className="font-bold text-base text-emerald-600">RM {fmt(data.carparkIncome)}</p>
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
