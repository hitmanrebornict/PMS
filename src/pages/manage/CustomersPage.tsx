import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Customer } from '../../types';

interface CustomersPageProps {
  customers: Customer[];
  onAdd: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomersPage({ customers, onAdd, onEdit, onDelete }: CustomersPageProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500">Manage your guest database.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Customer
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">No.</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Local H/P</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IC / Passport</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">WeChat / WhatsApp</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer, idx) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-slate-400 text-sm">{customer.customerNo ?? idx + 1}</td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{customer.name}</div>
                    {customer.phoneOther && (
                      <div className="text-xs text-slate-400 mt-0.5">Overseas: {customer.phoneOther}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-sm">{customer.phoneLocal}</td>
                  <td className="px-4 py-4 text-slate-600 text-sm font-mono">{customer.icPassport ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-600 text-sm">{customer.email ?? '—'}</td>
                  <td className="px-4 py-4 text-sm">
                    {customer.wechatId && (
                      <div className="text-slate-600">
                        <span className="text-xs text-slate-400">WeChat: </span>{customer.wechatId}
                      </div>
                    )}
                    {customer.whatsappNumber && (
                      <div className="text-slate-600">
                        <span className="text-xs text-slate-400">WA: </span>{customer.whatsappNumber}
                      </div>
                    )}
                    {!customer.wechatId && !customer.whatsappNumber && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(customer)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(customer)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No customers found. Add your first customer above.
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
