import { useState } from 'react';
import { Edit2, Plus, Trash2, Search, Car, CheckCircle2, AlertCircle } from 'lucide-react';
import { Carpark, AssetStatus } from '../../types';
import { formatCurrency } from '../../utils';
import { StatCard } from '../../components/common/StatCard';

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
  const [search, setSearch] = useState('');

  const filtered = search
    ? carparks.filter(c =>
        c.carparkNumber.toLowerCase().includes(search.toLowerCase()) ||
        (c.unitNo ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : carparks;

  const occupied = carparks.filter(c => c.status === AssetStatus.OCCUPIED).length;
  const vacant = carparks.filter(c => c.status === AssetStatus.VACANT).length;
  const maintenance = carparks.filter(c => c.status === AssetStatus.MAINTENANCE).length;

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

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total"
          value={carparks.length}
          icon={<Car className="text-blue-600" />}
          bgColor="bg-blue-50"
          subValue={`${carparks.length} lots`}
        />
        <StatCard
          title="Occupied"
          value={occupied}
          icon={<CheckCircle2 className="text-rose-600" />}
          bgColor="bg-rose-50"
          subValue={`${carparks.length > 0 ? Math.round((occupied / carparks.length) * 100) : 0}%`}
        />
        <StatCard
          title="Vacant"
          value={vacant}
          icon={<AlertCircle className="text-emerald-600" />}
          bgColor="bg-emerald-50"
          subValue={`${vacant} ready`}
        />
        <StatCard
          title="Maintenance"
          value={maintenance}
          icon={<AlertCircle className="text-amber-600" />}
          bgColor="bg-amber-50"
          subValue={`${maintenance} lots`}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by carpark number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Carpark #</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit No</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Rent</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(carpark => (
                <tr key={carpark.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{carpark.carparkNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 text-sm">{carpark.unitNo || <span className="text-slate-300">—</span>}</span>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    {search ? 'No carparks match your search.' : 'No carparks found.'}
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
