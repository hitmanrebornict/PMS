import React, { useState, useEffect } from 'react';
import { Expense, ExpenseType, MasterProperty, Unit } from '../../types';
import { Modal } from '../common/Modal';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedExpense: Expense | null;
  expenseTypes: ExpenseType[];
  properties: MasterProperty[];
  units: Unit[];
  prefillUnitId?: string | null;
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  selectedExpense,
  expenseTypes,
  properties,
  units,
  prefillUnitId,
}: ExpenseModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (selectedExpense) {
      const unit = units.find(u => u.id === selectedExpense.unit.id);
      setSelectedPropertyId(unit?.propertyId ?? '');
      setSelectedUnitId(selectedExpense.unit.id);
    } else if (prefillUnitId) {
      const unit = units.find(u => u.id === prefillUnitId);
      setSelectedPropertyId(unit?.propertyId ?? '');
      setSelectedUnitId(prefillUnitId);
    } else {
      setSelectedPropertyId('');
      setSelectedUnitId('');
    }
  }, [isOpen, selectedExpense, prefillUnitId, units]);

  const filteredUnits = units.filter(u => u.propertyId === selectedPropertyId);
  const activeTypes = expenseTypes.filter(t => t.isActive || t.id === selectedExpense?.expenseType.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedExpense ? 'Edit Expense' : 'Log Expense'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Property selector (UI only — drives unit list) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Property <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedPropertyId}
            onChange={e => { setSelectedPropertyId(e.target.value); setSelectedUnitId(''); }}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select a property...</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Unit <span className="text-rose-500">*</span>
          </label>
          <select
            name="unitId"
            value={selectedUnitId}
            onChange={e => setSelectedUnitId(e.target.value)}
            required
            disabled={!selectedPropertyId}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select a unit...</option>
            {filteredUnits.map(u => (
              <option key={u.id} value={u.id}>{u.unitNumber}</option>
            ))}
          </select>
        </div>

        {/* Expense Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Expense Type <span className="text-rose-500">*</span>
          </label>
          <select
            name="expenseTypeId"
            defaultValue={selectedExpense?.expenseType.id ?? ''}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select a type...</option>
            {activeTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Amount + Date row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount (RM) <span className="text-rose-500">*</span>
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={selectedExpense?.amount}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expense Date <span className="text-rose-500">*</span>
            </label>
            <input
              name="expenseDate"
              type="date"
              lang="en-GB"
              defaultValue={selectedExpense?.expenseDate ?? new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            defaultValue={selectedExpense?.description}
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            placeholder="e.g. Replaced air-con compressor..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedExpense ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
