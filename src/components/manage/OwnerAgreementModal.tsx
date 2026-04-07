import React, { useMemo } from 'react';
import { OwnerAgreement, Owner, Unit } from '../../types';
import { Modal } from '../common/Modal';

interface OwnerAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedAgreement: OwnerAgreement | null;
  owners: Owner[];
  units: Unit[];
}

export function OwnerAgreementModal({
  isOpen, onClose, onSubmit, selectedAgreement, owners, units,
}: OwnerAgreementModalProps) {
  const inp = 'w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white';

  // Preview: number of months to be generated
  const monthCount = useMemo(() => {
    if (!selectedAgreement) return null; // new — computed on server
    const s = new Date(selectedAgreement.startDate);
    const e = new Date(selectedAgreement.endDate);
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  }, [selectedAgreement]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={selectedAgreement ? 'Edit Agreement' : 'New Owner Agreement'}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Owner */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Owner *</label>
          <select name="ownerId" defaultValue={selectedAgreement?.ownerId ?? ''} required className={inp}>
            <option value="">Select owner…</option>
            {owners.map(o => (
              <option key={o.id} value={o.id}>{o.name}{o.icPassport ? ` — ${o.icPassport}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
          <select name="unitId" defaultValue={selectedAgreement?.unitId ?? ''} required className={inp}>
            <option value="">Select unit…</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.propertyName ? `${u.propertyName} — ` : ''}{u.unitNumber}</option>
            ))}
          </select>
        </div>

        {/* Amount & Payment Day */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Amount (RM) *</label>
            <input
              name="amount" type="number" step="0.01" min="0.01"
              defaultValue={selectedAgreement?.amount ?? ''}
              required className={inp} placeholder="e.g. 1500.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Day *</label>
            <input
              name="paymentDay" type="number" min="1" max="31"
              defaultValue={selectedAgreement?.paymentDay ?? 7}
              required className={inp}
            />
            <p className="text-xs text-slate-400 mt-1">Day of month (1–31). Clamped to month end.</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
            <input
              name="startDate" type="date" lang="en-GB"
              defaultValue={selectedAgreement?.startDate?.slice(0, 10) ?? ''}
              required className={inp}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
            <input
              name="endDate" type="date" lang="en-GB"
              defaultValue={selectedAgreement?.endDate?.slice(0, 10) ?? ''}
              required className={inp}
            />
          </div>
        </div>

        {/* Info banner */}
        {!selectedAgreement && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-xs text-indigo-700">
            Monthly PENDING expenses will be auto-generated for every month in the selected period when you save.
          </div>
        )}
        {selectedAgreement && monthCount !== null && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600">
            This agreement spans <strong>{monthCount}</strong> month{monthCount !== 1 ? 's' : ''}. Note: editing dates or amount does <em>not</em> regenerate existing expenses.
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea name="notes" defaultValue={selectedAgreement?.notes ?? ''} rows={2} maxLength={1000} className={inp} placeholder="Optional" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedAgreement ? 'Update Agreement' : 'Save & Generate Expenses'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
