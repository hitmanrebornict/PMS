import { Edit2, Plus, Trash2 } from 'lucide-react';
import { MasterProperty, Unit, UnitType, AssetStatus } from '../../types';
import { formatCurrency } from '../../utils';

interface UnitsPageProps {
  units: Unit[];
  properties: MasterProperty[];
  onAdd: () => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
}

const unitTypeLabels: Record<UnitType, string> = {
  [UnitType.STUDIO]: 'Studio',
  [UnitType.ONE_BEDROOM]: '1 Bedroom',
  [UnitType.TWO_BEDROOM]: '2 Bedroom',
  [UnitType.BUNGALOW]: 'Bungalow',
  [UnitType.OTHER]: 'Other',
};

const statusColors: Record<AssetStatus, string> = {
  [AssetStatus.VACANT]: 'bg-green-100 text-green-700',
  [AssetStatus.OCCUPIED]: 'bg-blue-100 text-blue-700',
  [AssetStatus.MAINTENANCE]: 'bg-amber-100 text-amber-700',
};

export function UnitsPage({ units, properties, onAdd, onEdit, onDelete }: UnitsPageProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Units</h1>
          <p className="text-slate-500">Manage rental units across your properties.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Unit
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit #</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Rent</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map(unit => {
                const property = properties.find(p => p.id === unit.propertyId);
                return (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{unit.unitNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{property?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                        {unitTypeLabels[unit.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{formatCurrency(unit.suggestedRentalPrice)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[unit.status]}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(unit)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(unit)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {units.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No units found.
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
