import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Carpark, AssetStatus } from '../../types';
import { formatCurrency } from '../../utils';

interface CarparksPageProps {
  carparks: Carpark[];
  onAdd: () => void;
  onEdit: (carpark: Carpark) => void;
  onDelete: (carpark: Carpark) => void;
}

const statusColors: Record<AssetStatus, string> = {
  [AssetStatus.VACANT]: 'bg-green-100 text-green-700',
  [AssetStatus.OCCUPIED]: 'bg-blue-100 text-blue-700',
  [AssetStatus.MAINTENANCE]: 'bg-amber-100 text-amber-700',
};

export function CarparksPage({ carparks, onAdd, onEdit, onDelete }: CarparksPageProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carparks</h1>
          <p className="text-slate-500">Manage your carpark lots.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Carpark
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Carpark #</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Rent</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carparks.map(carpark => (
                <tr key={carpark.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{carpark.carparkNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900">{formatCurrency(carpark.suggestedRentalPrice)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[carpark.status]}`}>
                      {carpark.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(carpark)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(carpark)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {carparks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No carparks found.
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
