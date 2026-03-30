import { Building2, BedDouble, ChevronRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { Property } from '../../types';

interface PropertiesPageProps {
  properties: Property[];
  onAdd: () => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onViewRooms: () => void;
}

export function PropertiesPage({ properties, onAdd, onEdit, onDelete, onViewRooms }: PropertiesPageProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-500">Manage your homestay locations.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Property
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map(property => (
          <div key={property.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(property)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDelete(property)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
              <Building2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{property.name}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{property.address}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <BedDouble size={16} />
                <span className="text-sm font-medium">{property.totalRooms} Rooms</span>
              </div>
              <button
                onClick={onViewRooms}
                className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline"
              >
                View Rooms <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {properties.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
            <Building2 size={48} className="mb-4 opacity-20" />
            <p>No properties found. Start by adding one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
