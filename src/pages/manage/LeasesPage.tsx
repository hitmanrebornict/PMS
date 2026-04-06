import { useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { Lease, LeaseStatusType, DepositStatusType } from '../../types';

interface LeasesPageProps {
  leases: Lease[];
  onViewDetail: (lease: Lease) => void;
}

const STATUS_FILTERS: { label: string; value: LeaseStatusType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Terminated', value: 'TERMINATED' },
  { label: 'Completed', value: 'COMPLETED' },
];

const statusColors: Record<LeaseStatusType, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  UPCOMING: 'bg-blue-100 text-blue-700',
  TERMINATED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
};

const depositStatusColors: Record<DepositStatusType, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PARTIALLY_HELD: 'bg-orange-100 text-orange-700',
  HELD: 'bg-emerald-100 text-emerald-700',
  PARTIALLY_REFUNDED: 'bg-blue-100 text-blue-700',
  REFUNDED: 'bg-sky-100 text-sky-700',
  FORFEITED: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function LeaseTable({ rows, onViewDetail }: { rows: Lease[]; onViewDetail: (l: Lease) => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Renter</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Period</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Billing</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Deposit</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lease) => (
              <tr
                key={lease.id}
                onClick={() => onViewDetail(lease)}
                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {lease.unit
                    ? `${lease.unit.unitNumber} — ${lease.unit.property.name}`
                    : `Carpark ${lease.carpark?.carparkNumber}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lease.company ? (
                    <>
                      <div>{lease.company.name}</div>
                      <div className="text-xs text-slate-400">Company</div>
                    </>
                  ) : lease.customer ? (
                    <>
                      <div>{lease.customer.name}</div>
                      <div className="text-xs text-slate-400">{lease.customer.phoneLocal}</div>
                    </>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                  {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-600 hidden lg:table-cell capitalize">
                  {lease.billingCycle.toLowerCase().replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  RM {lease.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-center">
                  {lease.deposit ? (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${depositStatusColors[lease.deposit.status]}`}>
                      {lease.deposit.status.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[lease.status]}`}>
                    {lease.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LeasesPage({ leases, onViewDetail }: LeasesPageProps) {
  const [statusFilter, setStatusFilter] = useState<LeaseStatusType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = leases.filter((l) => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const asset = l.unit
        ? `${l.unit.unitNumber} ${l.unit.property.name}`.toLowerCase()
        : `carpark ${l.carpark?.carparkNumber}`.toLowerCase();
      const renterName = (l.company?.name ?? l.customer?.name ?? '').toLowerCase();
      const renterPhone = l.customer?.phoneLocal ?? '';
      if (!asset.includes(q) && !renterName.includes(q) && !renterPhone.includes(q)) return false;
    }
    if (dateFrom && new Date(l.startDate).getTime() < new Date(dateFrom).getTime()) return false;
    if (dateTo && new Date(l.endDate).getTime() > new Date(dateTo).getTime()) return false;
    return true;
  });

  const unitLeases = filtered.filter((l) => l.unit != null);
  const carparkLeases = filtered.filter((l) => l.carpark != null && l.unit == null);
  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Leases</h1>
        <p className="text-slate-500 mt-1">Manage lease agreements, invoices, and deposits</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search asset or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">Lease period:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {hasDateFilter && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={13} /> Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            {leases.length === 0
              ? 'No leases yet. Create one from the Timeline page.'
              : 'No leases match the current filter.'}
          </p>
        </div>
      )}

      {/* Unit / Property Leases */}
      {unitLeases.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
            Property Units ({unitLeases.length})
          </h2>
          <LeaseTable rows={unitLeases} onViewDetail={onViewDetail} />
        </div>
      )}

      {/* Carpark Leases */}
      {carparkLeases.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
            Carparks ({carparkLeases.length})
          </h2>
          <LeaseTable rows={carparkLeases} onViewDetail={onViewDetail} />
        </div>
      )}
    </div>
  );
}
