import { useState } from 'react';
import { Edit2, Plus, Trash2, Search, Building2 } from 'lucide-react';
import { Company } from '../../types';

interface CompaniesPageProps {
  companies: Company[];
  onAdd: () => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompaniesPage({ companies, onAdd, onEdit, onDelete }: CompaniesPageProps) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.managerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone ?? '').includes(search) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : companies;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500">Manage companies that rent your properties.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Company
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-slate-900">{companies.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, manager, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TIN</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Source</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(company => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{company.name}</div>
                    {company.address && <div className="text-xs text-slate-400 mt-0.5">{company.address}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {company.managerName || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {company.phone && <div className="text-sm text-slate-700">{company.phone}</div>}
                    {company.email && <div className="text-xs text-slate-400">{company.email}</div>}
                    {!company.phone && !company.email && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {company.tinNumber || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {company.dataSource?.name || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(company)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(company)}
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    {search ? 'No companies match your search.' : 'No companies added yet.'}
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
