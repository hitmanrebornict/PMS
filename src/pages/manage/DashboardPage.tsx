import { BedDouble, CheckCircle2, AlertCircle, FileText, MessageCircle } from 'lucide-react';
import { Booking, Room, PaymentStatus } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { formatCurrency, formatDate, generateWhatsAppLink } from '../../utils';

interface DashboardStats {
  totalRooms: number;
  occupied: number;
  vacant: number;
  arrears: Booking[];
}

interface DashboardPageProps {
  rooms: Room[];
  bookings: Booking[];
  stats: DashboardStats;
  onBookRoom: (room: Room) => void;
  generateInvoice: (booking: Booking) => void;
}

export function DashboardPage({ rooms, bookings, stats, onBookRoom, generateInvoice }: DashboardPageProps) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 w-full sm:w-auto text-center">
          {formatDate(new Date().toISOString())}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          title="Total Rooms"
          value={stats.totalRooms}
          icon={<BedDouble className="text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Occupied"
          value={stats.occupied}
          icon={<CheckCircle2 className="text-rose-600" />}
          bgColor="bg-rose-50"
          subValue={`${Math.round((stats.occupied / stats.totalRooms || 0) * 100)}% Occupancy`}
        />
        <StatCard
          title="Vacant"
          value={stats.vacant}
          icon={<AlertCircle className="text-emerald-600" />}
          bgColor="bg-emerald-50"
          subValue={`${stats.vacant} rooms ready`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Room Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Room Status Grid</h2>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Vacant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span>Occupied</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {rooms.map(room => {
                const today = new Date().toISOString().split('T')[0];
                const isOccupied = bookings.some(b => {
                  const start = new Date(b.startDate);
                  const end = new Date(b.endDate);
                  const now = new Date(today);
                  return b.roomId === room.id && now >= start && now <= end;
                });

                return (
                  <button
                    key={room.id}
                    onClick={() => { if (!isOccupied) onBookRoom(room); }}
                    className={`p-4 rounded-xl border transition-all text-left group ${
                      isOccupied
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Room {room.roomNumber}</div>
                    <div className="font-semibold truncate">{room.type}</div>
                    <div className="mt-2 text-xs font-medium">{isOccupied ? 'Occupied' : 'Vacant'}</div>
                  </button>
                );
              })}
              {rooms.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic">
                  No rooms added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Arrears + Recent Paid */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Arrears (Unpaid)</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {stats.arrears.map(booking => {
              const room = rooms.find(r => r.id === booking.roomId);
              return (
                <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{booking.customerName}</p>
                      <p className="text-xs text-slate-500">Room {room?.roomNumber || 'N/A'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      booking.paymentStatus === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</p>
                    {booking.customerPhone && (
                      <a
                        href={generateWhatsAppLink(booking.customerPhone, `Hi ${booking.customerName}, this is a reminder regarding your stay at VersaHome. Your payment of ${formatCurrency(booking.totalAmount)} is currently ${booking.paymentStatus.toLowerCase()}. Please settle it at your earliest convenience. Thank you!`)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <MessageCircle size={14} />
                        Remind
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {stats.arrears.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">No outstanding payments.</div>
            )}
          </div>

          <div className="p-6 border-t border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900">Recent Paid Bookings</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {bookings
              .filter(b => b.paymentStatus === PaymentStatus.PAID)
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .slice(0, 5)
              .map(booking => {
                const room = rooms.find(r => r.id === booking.roomId);
                return (
                  <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{booking.customerName}</p>
                        <p className="text-xs text-slate-500">Room {room?.roomNumber || 'N/A'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                        Paid
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</p>
                      <button
                        onClick={() => generateInvoice(booking)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <FileText size={14} />
                        Invoice
                      </button>
                    </div>
                  </div>
                );
              })}
            {bookings.filter(b => b.paymentStatus === PaymentStatus.PAID).length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">No paid bookings yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
