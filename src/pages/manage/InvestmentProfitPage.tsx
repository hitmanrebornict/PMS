import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { ArrowLeft, TrendingUp, DollarSign, Target, CheckCircle2, Clock, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import {
  InvestmentAnalysisSummaryItem,
  InvestmentAnalysisDetail,
  InvestmentProfitSeriesEntry,
} from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-emerald-100 text-emerald-700',
  MATURED:   'bg-blue-100 text-blue-700',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium text-slate-800">RM {fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex gap-4 items-start">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Unit Summary Card (list item) ────────────────────────────────────────────

const UnitCard: React.FC<{ item: InvestmentAnalysisSummaryItem; onClick: () => void }> = ({ item, onClick }) => {
  const roiPct = item.totalCapital > 0 ? (item.totalProfit / item.totalCapital) * 100 : 0;
  const profitColor = item.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-5 flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-slate-900">{item.unitNumber}</span>
          {item.propertyName && (
            <span className="text-xs text-slate-500 truncate">{item.propertyName}</span>
          )}
          {item.breakEvenAchieved ? (
            <span className="ml-auto flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 flex-shrink-0">
              <CheckCircle2 size={11} /> Break-even reached
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 flex-shrink-0">
              <Clock size={11} /> In progress
            </span>
          )}
        </div>
        <div className="flex gap-6 text-sm mt-2">
          <div>
            <p className="text-xs text-slate-400">Total Capital</p>
            <p className="font-semibold text-slate-700">RM {fmt(item.totalCapital)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Profit</p>
            <p className={`font-semibold ${profitColor}`}>RM {fmt(item.totalProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">ROI</p>
            <p className={`font-semibold ${profitColor}`}>{roiPct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Investors</p>
            <p className="font-semibold text-slate-700">{item.investmentCount}</p>
          </div>
        </div>
      </div>
      <div className="text-slate-300 flex-shrink-0">›</div>
    </button>
  );
};

// ─── Detail View ──────────────────────────────────────────────────────────────

const DetailView = ({ unitId, onBack }: { unitId: string; onBack: () => void }) => {
  const { apiFetch } = useApi();
  const [detail, setDetail] = useState<InvestmentAnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/investment-analysis/${unitId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unitId, apiFetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>No data available for this unit.</p>
        <button onClick={onBack} className="mt-4 text-indigo-600 hover:underline text-sm">← Back to list</button>
      </div>
    );
  }

  const netPosition = detail.totalProfit - detail.totalCapital;
  const roiPct = detail.totalCapital > 0 ? (detail.totalProfit / detail.totalCapital) * 100 : 0;

  // Build chart data: add capital reference as a flat field for reference line label
  const chartData: (InvestmentProfitSeriesEntry & { capital: number })[] = detail.series.map(s => ({
    ...s,
    capital: detail.totalCapital,
  }));

  const maxY = Math.max(detail.totalCapital * 1.1, ...detail.series.map(s => s.cumulativeProfit));
  const minY = Math.min(0, ...detail.series.map(s => s.cumulativeProfit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Unit {detail.unit.unitNumber}
            {detail.unit.propertyName && <span className="font-normal text-slate-500 ml-2 text-base">— {detail.unit.propertyName}</span>}
          </h2>
          <p className="text-sm text-slate-500">Investment ROI Analysis</p>
        </div>
        {detail.breakEvenMonth ? (
          <span className="ml-auto flex items-center gap-1.5 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
            <CheckCircle2 size={14} /> Break-even: {detail.breakEvenMonth.label}
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
            <Clock size={14} /> Break-even not yet reached
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<DollarSign size={18} className="text-indigo-600" />}
          label="Total Capital"
          value={`RM ${fmt(detail.totalCapital)}`}
          sub={`${detail.investments.length} investor${detail.investments.length !== 1 ? 's' : ''}`}
          color="bg-indigo-50"
        />
        <SummaryCard
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          label="Total Profit"
          value={`RM ${fmt(detail.totalProfit)}`}
          sub={`${roiPct.toFixed(1)}% ROI`}
          color="bg-emerald-50"
        />
        <SummaryCard
          icon={<Target size={18} className={netPosition >= 0 ? 'text-blue-600' : 'text-amber-600'} />}
          label="Net Position"
          value={`${netPosition >= 0 ? '+' : ''}RM ${fmt(netPosition)}`}
          sub={netPosition >= 0 ? 'Capital recovered' : `RM ${fmt(Math.abs(netPosition))} remaining`}
          color={netPosition >= 0 ? 'bg-blue-50' : 'bg-amber-50'}
        />
        <SummaryCard
          icon={<Users size={18} className="text-purple-600" />}
          label="Investment Period"
          value={`${detail.series.length} months`}
          sub={detail.series.length > 0 ? `Since ${detail.series[0].label}` : '—'}
          color="bg-purple-50"
        />
      </div>

      {/* Cumulative Profit Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Cumulative Net Profit vs. Capital</h3>
        <p className="text-xs text-slate-400 mb-5">Month-by-month accumulated profit — break-even when the line crosses the capital reference</p>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                domain={[minY < 0 ? minY * 1.1 : 0, maxY]}
                tickFormatter={v => `RM ${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine
                y={detail.totalCapital}
                stroke="#f59e0b"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{ value: `Capital RM ${fmt(detail.totalCapital)}`, position: 'insideTopRight', fontSize: 11, fill: '#f59e0b' }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeProfit"
                name="Cumulative Profit"
                stroke="#6366f1"
                fill="#ede9fe"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#6366f1' }}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Monthly Net Profit"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly Income/Expense Bar breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-5">Monthly Income & Expenses</h3>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={v => `RM ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="#d1fae5" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="#ffe4e6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Investors Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Investors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-6 py-3 font-medium">Investor</th>
                <th className="text-left px-6 py-3 font-medium">IC / Passport</th>
                <th className="text-right px-6 py-3 font-medium">Capital</th>
                <th className="text-left px-6 py-3 font-medium">Start</th>
                <th className="text-left px-6 py-3 font-medium">End</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.investments.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{inv.investorName}</td>
                  <td className="px-6 py-3 text-slate-500">{inv.investorIc || '—'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-800">RM {fmt(inv.capitalAmount)}</td>
                  <td className="px-6 py-3 text-slate-500">{fmtDate(inv.startDate)}</td>
                  <td className="px-6 py-3 text-slate-500">{fmtDate(inv.endDate)}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 max-w-[200px] truncate">{inv.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function InvestmentProfitPage() {
  const { apiFetch } = useApi();
  const [summaryList, setSummaryList] = useState<InvestmentAnalysisSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch('/api/investment-analysis');
    if (r.ok) setSummaryList(await r.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { fetchList(); }, [fetchList]);

  if (selectedUnitId) {
    return <DetailView unitId={selectedUnitId} onBack={() => setSelectedUnitId(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Investment ROI</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track cumulative net profit vs. capital for each invested unit</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : summaryList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <TrendingUp size={40} className="mb-3 opacity-30" />
          <p className="font-medium">No active investments found</p>
          <p className="text-sm mt-1">Add investments via the Investments page to see ROI analysis here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaryList.map(item => (
            <UnitCard key={item.unitId} item={item} onClick={() => setSelectedUnitId(item.unitId)} />
          ))}
        </div>
      )}
    </div>
  );
}
