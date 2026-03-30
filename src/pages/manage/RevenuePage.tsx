import { Booking, MaintenanceLog } from '../../types';
import { formatCurrency } from '../../utils';

interface RevenuePageProps {
  bookings: Booking[];
  maintenanceLogs: MaintenanceLog[];
}

export function RevenuePage({ bookings, maintenanceLogs }: RevenuePageProps) {
  const monthlyData: Record<string, { count: number; total: number }> = {};
  bookings.forEach(b => {
    const date = new Date(b.startDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { count: 0, total: 0 };
    monthlyData[key].count += 1;
    monthlyData[key].total += b.totalAmount;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Revenue Report</h1>
        <p className="text-slate-500">Monthly earnings summary in MYR.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Total Revenue</h3>
          <p className="text-3xl font-bold text-emerald-600">
            {formatCurrency(bookings.reduce((sum, b) => sum + b.totalAmount, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Total Maintenance</h3>
          <p className="text-3xl font-bold text-rose-600">
            {formatCurrency(maintenanceLogs.reduce((sum, l) => sum + l.cost, 0))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Monthly Breakdown</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bookings</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(monthlyData)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([month, data]) => (
                <tr key={month} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {new Date(month + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{data.count} bookings</td>
                  <td className="px-6 py-4 font-bold text-emerald-600 text-right">{formatCurrency(data.total)}</td>
                </tr>
              ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                  No revenue data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
