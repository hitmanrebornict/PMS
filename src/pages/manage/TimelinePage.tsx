import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, CalendarPlus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { TimelineData, TimelineLease } from '../../types';

interface TimelinePageProps {
  onBookAsset: (asset: { id: string; type: 'unit' | 'carpark'; name: string; date: string; suggestedPrice: number }) => void;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TimelinePage({ onBookAsset }: TimelinePageProps) {
  const { apiFetch } = useApi();
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(getToday());
  const [dayCount, setDayCount] = useState<14 | 30>(14);

  const endDate = addDays(startDate, dayCount);
  const dates = Array.from({ length: dayCount }, (_, i) => addDays(startDate, i));

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    const end = addDays(startDate, dayCount);
    try {
      const res = await apiFetch(
        `/api/inventory/timeline?startDate=${toDateStr(startDate)}&endDate=${toDateStr(end)}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [apiFetch, startDate, dayCount]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Build flat asset rows
  type AssetRow = {
    id: string;
    label: string;
    group: string;
    type: 'unit' | 'carpark';
    suggestedPrice: number;
    leases: TimelineLease[];
  };

  const rows: AssetRow[] = [];
  if (data) {
    for (const prop of data.properties) {
      for (const unit of prop.units) {
        rows.push({
          id: unit.id,
          label: unit.unitNumber,
          group: prop.name,
          type: 'unit',
          suggestedPrice: unit.suggestedRentalPrice,
          leases: unit.leases,
        });
      }
    }
    for (const cp of data.carparks) {
      rows.push({
        id: cp.id,
        label: cp.carparkNumber,
        group: 'Carparks',
        type: 'carpark',
        suggestedPrice: cp.suggestedRentalPrice,
        leases: cp.leases,
      });
    }
  }

  // Group rows for section headers
  const groups: { name: string; rows: AssetRow[] }[] = [];
  let currentGroup = '';
  for (const row of rows) {
    if (row.group !== currentGroup) {
      currentGroup = row.group;
      groups.push({ name: currentGroup, rows: [] });
    }
    groups[groups.length - 1].rows.push(row);
  }

  // Check if a date cell has a lease
  function getLeaseForDate(leases: TimelineLease[], date: Date): TimelineLease | null {
    const dateStart = date.getTime();
    const dateEnd = addDays(date, 1).getTime();
    for (const lease of leases) {
      const ls = new Date(lease.startDate).getTime();
      const le = new Date(lease.endDate).getTime();
      if (ls < dateEnd && le > dateStart) return lease;
    }
    return null;
  }

  // Calculate lease pill position within the visible range
  function getLeaseSpan(lease: TimelineLease, dates: Date[]): { startCol: number; span: number } | null {
    const ls = new Date(lease.startDate).getTime();
    const le = new Date(lease.endDate).getTime();
    const rangeStart = dates[0].getTime();
    const rangeEnd = addDays(dates[dates.length - 1], 1).getTime();

    if (ls >= rangeEnd || le <= rangeStart) return null;

    const clampedStart = Math.max(ls, rangeStart);
    const clampedEnd = Math.min(le, rangeEnd);

    const startCol = Math.floor((clampedStart - rangeStart) / (1000 * 60 * 60 * 24));
    const endCol = Math.ceil((clampedEnd - rangeStart) / (1000 * 60 * 60 * 24));

    return { startCol, span: endCol - startCol };
  }

  const today = getToday();

  // Book modal state (standalone — no grid click needed)
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookAssetType, setBookAssetType] = useState<'unit' | 'carpark'>('unit');
  const [bookAssetId, setBookAssetId] = useState('');

  const unitRows = rows.filter(r => r.type === 'unit');
  const carparkRows = rows.filter(r => r.type === 'carpark');
  const bookableRows = bookAssetType === 'unit' ? unitRows : carparkRows;

  const handleBookSubmit = () => {
    if (!bookAssetId) return;
    const asset = rows.find(r => r.id === bookAssetId);
    if (!asset) return;
    setBookModalOpen(false);
    onBookAsset({ id: asset.id, type: asset.type, name: asset.label, date: toDateStr(today), suggestedPrice: asset.suggestedPrice });
    setBookAssetId('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timeline</h1>
          <p className="text-slate-500">View asset occupancy and create bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBookAssetId(''); setBookModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <CalendarPlus size={16} />
            Book Asset
          </button>
          <button onClick={fetchTimeline} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setDayCount(14)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${dayCount === 14 ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              14 Days
            </button>
            <button
              onClick={() => setDayCount(30)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${dayCount === 30 ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              30 Days
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStartDate(addDays(startDate, -dayCount))}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setStartDate(getToday())}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setStartDate(addDays(startDate, dayCount))}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Timeline Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <div
            className="min-w-max"
            style={{
              display: 'grid',
              gridTemplateColumns: `160px repeat(${dayCount}, minmax(${dayCount <= 14 ? '60px' : '36px'}, 1fr))`,
            }}
          >
            {/* Date header row — sticky on vertical scroll */}
            <div className="sticky left-0 top-0 z-30 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
              Asset
            </div>
            {dates.map((date, i) => {
              const isToday = toDateStr(date) === toDateStr(today);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`sticky top-0 z-20 border-b border-r border-slate-200 px-1 py-2 text-center text-xs ${
                    isToday ? 'bg-indigo-50 font-bold text-indigo-700' : isWeekend ? 'bg-slate-50 text-slate-400' : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  <div>{formatDateShort(date)}</div>
                  <div className="text-[10px]">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                </div>
              );
            })}

            {/* Asset rows grouped by property */}
            {groups.map((group) => (
              <div key={group.name} className="contents">
                {/* Group header */}
                <div
                  className="sticky left-0 z-20 bg-slate-100 border-b border-r border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider"
                  style={{ gridColumn: `1 / -1` }}
                >
                  {group.name}
                </div>

                {/* Asset rows */}
                {group.rows.map((row) => (
                  <div key={row.id} className="contents">
                    {/* Asset label */}
                    <div className="sticky left-0 z-20 bg-white border-b border-r border-slate-200 px-3 py-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 truncate">{row.label}</span>
                    </div>

                    {/* Date cells */}
                    {dates.map((date, colIdx) => {
                      const lease = getLeaseForDate(row.leases, date);
                      const isToday = toDateStr(date) === toDateStr(today);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      if (lease) {
                        // Check if this is the first visible cell for this lease
                        const span = getLeaseSpan(lease, dates);
                        const isFirstCell = span && colIdx === span.startCol;

                        if (isFirstCell && span) {
                          return (
                            <div
                              key={colIdx}
                              className="relative border-b border-r border-slate-100 p-0.5"
                              style={{ gridColumn: `span ${span.span}` }}
                            >
                              <div
                                className={`h-full rounded-md px-2 py-1 text-xs font-medium truncate flex items-center ${
                                  lease.status === 'ACTIVE'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                                title={`${lease.customerName} (${lease.status})\n${lease.startDate.split('T')[0]} to ${lease.endDate.split('T')[0]}`}
                              >
                                {lease.customerName}
                              </div>
                            </div>
                          );
                        }
                        // Skip cells covered by the span
                        return null;
                      }

                      return (
                        <div
                          key={colIdx}
                          onClick={() => onBookAsset({ id: row.id, type: row.type, name: row.label, date: toDateStr(date), suggestedPrice: row.suggestedPrice })}
                          className={`border-b border-r border-slate-100 cursor-pointer group transition-colors ${
                            isToday ? 'bg-indigo-50/30' : isWeekend ? 'bg-slate-50/50' : ''
                          } hover:bg-indigo-50`}
                        >
                          <div className="h-full min-h-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={14} className="text-indigo-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {!loading && rows.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm mt-1">Add properties with units or carparks to see the timeline.</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading timeline...</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200" />
          Active
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          Upcoming
        </div>
        <div className="flex items-center gap-1.5">
          <Plus size={12} className="text-indigo-400" />
          Click empty cell to book
        </div>
      </div>

      {/* ── Standalone Book Modal ─────────────────────────────────── */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setBookModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarPlus size={20} className="text-indigo-600" />
              Book Asset
            </h2>

            {/* Asset type toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Asset Type</label>
              <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => { setBookAssetType('unit'); setBookAssetId(''); }}
                  className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${bookAssetType === 'unit' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                >
                  Unit
                </button>
                <button
                  onClick={() => { setBookAssetType('carpark'); setBookAssetId(''); }}
                  className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${bookAssetType === 'carpark' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                >
                  Carpark
                </button>
              </div>
            </div>

            {/* Asset selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select {bookAssetType === 'unit' ? 'Unit' : 'Carpark'} <span className="text-rose-500">*</span>
              </label>
              <select
                value={bookAssetId}
                onChange={e => setBookAssetId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-sm"
              >
                <option value="">Select an asset...</option>
                {bookableRows.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.type === 'unit' ? `${r.label} (${r.group})` : r.label}
                  </option>
                ))}
              </select>
              {bookableRows.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No {bookAssetType === 'unit' ? 'units' : 'carparks'} available in the current timeline range.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setBookModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBookSubmit}
                disabled={!bookAssetId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
              >
                Continue to Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
