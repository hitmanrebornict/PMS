import { FileText, Trash2 } from 'lucide-react';
import { Booking, Room, PaymentStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface BookingsPageProps {
  bookings: Booking[];
  rooms: Room[];
  onDelete: (booking: Booking) => void;
  generateInvoice: (booking: Booking) => void;
}

export function BookingsPage({ bookings, rooms, onDelete, generateInvoice }: BookingsPageProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">All Bookings</h1>
        <p className="text-slate-500">History of all guest stays and payments.</p>
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
              {[...bookings]
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map(booking => {
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
                          booking.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                          booking.paymentStatus === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {booking.paymentStatus === PaymentStatus.PAID && (
                            <button
                              onClick={() => generateInvoice(booking)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Download Invoice"
                            >
                              <FileText size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(booking)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No bookings found.
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
