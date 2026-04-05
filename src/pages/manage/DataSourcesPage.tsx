import { useState } from 'react';
import { Edit2, Plus, Trash2, Search } from 'lucide-react';
import { DataSource } from '../../types';

interface DataSourcesPageProps {
  dataSources: DataSource[];
  onAdd: () => void;
  onEdit: (source: DataSource) => void;
  onDelete: (source: DataSource) => void;
}

export function DataSourcesPage({ dataSources, onAdd, onEdit, onDelete }: DataSourcesPageProps) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? dataSources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : dataSources;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Sources</h1>
          <p className="text-slate-500">Manage where your customers come from (e.g. XHS, WeChat, Walk-in).</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Source
        </button>
      </header>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search sources..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customers</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(source => (
                <tr key={source.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-900">{source.name}</td>
                  <td className="px-4 py-4 text-slate-500 text-sm">{source.description ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-600 text-sm">{source.customerCount ?? 0}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      source.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {source.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(source)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(source)}
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
                    {search ? 'No sources match your search.' : 'No data sources yet. Add your first one above.'}
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
