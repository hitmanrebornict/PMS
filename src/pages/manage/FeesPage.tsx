import { CheckCircle2, FileText } from 'lucide-react';
import { Booking, Room, PaymentStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface FeesPageProps {
  bookings: Booking[];
  rooms: Room[];
  feeFilterStart: string;
  feeFilterEnd: string;
  setFeeFilterStart: (v: string) => void;
  setFeeFilterEnd: (v: string) => void;
  onMarkPaid: (bookingId: string) => void;
  generateInvoice: (booking: Booking) => void;
}

export function FeesPage({
  bookings, rooms,
  feeFilterStart, feeFilterEnd,
  setFeeFilterStart, setFeeFilterEnd,
  onMarkPaid, generateInvoice,
}: FeesPageProps) {
  const filtered = bookings.filter(b => {
    const matchesStatus = b.paymentStatus !== PaymentStatus.PAID;
    const date = new Date(b.startDate);
    const start = feeFilterStart ? new Date(feeFilterStart) : null;
    const end = feeFilterEnd ? new Date(feeFilterEnd) : null;
    return matchesStatus && (!start || date >= start) && (!end || date <= end);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fees Collection</h1>
          <p className="text-slate-500">Manage unpaid fees and generate invoices.</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs font-semibold text-slate-500 uppercase">From</label>
            <input
              type="date"
              value={feeFilterStart}
              onChange={e => setFeeFilterStart(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs font-semibold text-slate-500 uppercase">To</label>
            <input
              type="date"
              value={feeFilterEnd}
              onChange={e => setFeeFilterEnd(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full"
            />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(booking => {
                const room = rooms.find(r => r.id === booking.roomId);
                return (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{booking.customerName}</div>
                      <div className="text-xs text-slate-500">{booking.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">Room {room?.roomNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="text-sm">{formatDate(booking.startDate)}</div>
                      <div className="text-[10px] text-slate-400">to {formatDate(booking.endDate)}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(booking.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        booking.paymentStatus === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onMarkPaid(booking.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Mark Paid
                        </button>
                        <button
                          onClick={() => generateInvoice(booking)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Download Invoice"
                        >
                          <FileText size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No pending fees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
