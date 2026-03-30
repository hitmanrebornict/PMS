import { Plus, Trash2 } from 'lucide-react';
import { MaintenanceLog, Room } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface MaintenancePageProps {
  maintenanceLogs: MaintenanceLog[];
  rooms: Room[];
  onAdd: () => void;
  onDelete: (log: MaintenanceLog) => void;
}

export function MaintenancePage({ maintenanceLogs, rooms, onAdd, onDelete }: MaintenancePageProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance Log</h1>
          <p className="text-slate-500">Track repairs and maintenance costs.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Log Repair
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...maintenanceLogs]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(log => {
                  const room = rooms.find(r => r.id === log.roomId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{formatDate(log.date)}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">Room {room?.roomNumber || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-md truncate">{log.description}</td>
                      <td className="px-6 py-4 font-semibold text-rose-600">{formatCurrency(log.cost)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onDelete(log)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {maintenanceLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No maintenance logs found.
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
