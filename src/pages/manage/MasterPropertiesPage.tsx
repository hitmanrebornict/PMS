import { useState } from 'react';
import { Building2, Edit2, Plus, Trash2, Home, Search } from 'lucide-react';
import { MasterProperty, Unit } from '../../types';

interface MasterPropertiesPageProps {
  properties: MasterProperty[];
  units: Unit[];
  onAdd: () => void;
  onEdit: (property: MasterProperty) => void;
  onDelete: (property: MasterProperty) => void;
  onViewUnits: (property: MasterProperty) => void;
}

export function MasterPropertiesPage({
  properties, units,
  onAdd, onEdit, onDelete, onViewUnits,
}: MasterPropertiesPageProps) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? properties.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.address ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : properties;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Properties</h1>
          <p className="text-slate-500">Manage your property portfolio.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Property
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(property => {
          const unitCount = units.filter(u => u.propertyId === property.id).length;
          return (
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
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{property.address || 'No address'}</p>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onViewUnits(property)}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                >
                  <Home size={14} />
                  {unitCount} Units
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
            <Building2 size={48} className="mb-4 opacity-20" />
            <p>{search ? 'No properties match your search.' : 'No properties found. Start by adding one.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
