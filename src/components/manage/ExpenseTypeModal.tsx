import React from 'react';
import { ExpenseType } from '../../types';
import { Modal } from '../common/Modal';

interface ExpenseTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedType: ExpenseType | null;
}

export function ExpenseTypeModal({ isOpen, onClose, onSubmit, selectedType }: ExpenseTypeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedType ? 'Edit Expense Type' : 'Add Expense Type'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            defaultValue={selectedType?.name}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. Maintenance, Utilities, Repair"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            defaultValue={selectedType?.description}
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            placeholder="Brief description of this expense category..."
          />
        </div>

        {selectedType && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              defaultChecked={selectedType.isActive}
              className="w-4 h-4 accent-indigo-600"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active (available when logging expenses)
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedType ? 'Update Type' : 'Save Type'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
