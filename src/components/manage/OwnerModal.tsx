import React from 'react';
import { Owner } from '../../types';
import { Modal } from '../common/Modal';

interface OwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedOwner: Owner | null;
}

export function OwnerModal({ isOpen, onClose, onSubmit, selectedOwner }: OwnerModalProps) {
  const inp = 'w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={selectedOwner ? 'Edit Owner' : 'Add Owner'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input name="name" defaultValue={selectedOwner?.name} required maxLength={200} className={inp} placeholder="Full name" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input name="phone" defaultValue={selectedOwner?.phone ?? ''} maxLength={50} className={inp} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input name="email" type="email" defaultValue={selectedOwner?.email ?? ''} className={inp} placeholder="Optional" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">IC / Passport</label>
          <input name="icPassport" defaultValue={selectedOwner?.icPassport ?? ''} maxLength={100} className={inp} placeholder="Optional" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
            <input name="bankName" defaultValue={selectedOwner?.bankName ?? ''} maxLength={200} className={inp} placeholder="e.g. Maybank" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account No.</label>
            <input name="bankAccount" defaultValue={selectedOwner?.bankAccount ?? ''} maxLength={100} className={inp} placeholder="Optional" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <input name="address" defaultValue={selectedOwner?.address ?? ''} maxLength={500} className={inp} placeholder="Optional" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea name="notes" defaultValue={selectedOwner?.notes ?? ''} rows={2} maxLength={1000} className={inp} placeholder="Optional" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedOwner ? 'Update Owner' : 'Save Owner'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
