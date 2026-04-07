import React from 'react';
import { Investment, Unit, Customer } from '../../types';
import { Modal } from '../common/Modal';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedInvestment: Investment | null;
  units: Unit[];
  customers: Customer[];
}

export function InvestmentModal({
  isOpen,
  onClose,
  onSubmit,
  selectedInvestment,
  units,
  customers,
}: InvestmentModalProps) {
  const inputClass = 'w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedInvestment ? 'Edit Investment' : 'Record Investment'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Investor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Investor (Customer) *</label>
          <select
            name="customerId"
            defaultValue={selectedInvestment?.customerId ?? ''}
            required
            className={inputClass}
          >
            <option value="">Select investor…</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.icPassport}
              </option>
            ))}
          </select>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
          <select
            name="unitId"
            defaultValue={selectedInvestment?.unitId ?? ''}
            required
            className={inputClass}
          >
            <option value="">Select unit…</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.propertyName ? `${u.propertyName} — ` : ''}{u.unitNumber}
              </option>
            ))}
          </select>
        </div>

        {/* Capital Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Capital Amount (RM) *</label>
          <input
            name="capitalAmount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={selectedInvestment?.capitalAmount ?? ''}
            required
            className={inputClass}
            placeholder="e.g. 50000.00"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
            <input
              name="startDate"
              type="date"
              defaultValue={selectedInvestment?.startDate?.slice(0, 10) ?? ''}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End / Maturity Date *</label>
            <input
              name="endDate"
              type="date"
              defaultValue={selectedInvestment?.endDate?.slice(0, 10) ?? ''}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            name="status"
            defaultValue={selectedInvestment?.status ?? 'ACTIVE'}
            className={inputClass}
          >
            <option value="ACTIVE">Active</option>
            <option value="MATURED">Matured</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            name="notes"
            defaultValue={selectedInvestment?.notes ?? ''}
            rows={2}
            maxLength={1000}
            className={inputClass}
            placeholder="Optional notes about this investment"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {selectedInvestment ? 'Update Investment' : 'Save Investment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
