import React from 'react';
import { MasterProperty } from '../../types';
import { Modal } from '../common/Modal';

interface MasterPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedProperty: MasterProperty | null;
}

export function MasterPropertyModal({ isOpen, onClose, onSubmit, selectedProperty }: MasterPropertyModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedProperty ? 'Edit Property' : 'Add New Property'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Property Name</label>
          <input
            name="name"
            defaultValue={selectedProperty?.name}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. Versa Home Residency"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea
            name="address"
            defaultValue={selectedProperty?.address}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="Full address (optional)"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedProperty ? 'Update Property' : 'Save Property'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
