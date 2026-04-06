import React from 'react';
import { Carpark, AssetStatus } from '../../types';
import { Modal } from '../common/Modal';

interface CarparkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedCarpark: Carpark | null;
}

export function CarparkModal({ isOpen, onClose, onSubmit, selectedCarpark }: CarparkModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedCarpark ? 'Edit Carpark' : 'Add New Carpark'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Carpark Number</label>
            <input
              name="carparkNumber"
              defaultValue={selectedCarpark?.carparkNumber}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. P1-105"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Suggested Rent (MYR)</label>
            <input
              name="suggestedRentalPrice"
              type="number"
              step="0.01"
              defaultValue={selectedCarpark?.suggestedRentalPrice}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 200.00"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Unit No <span className="text-slate-400 font-normal">(optional remark)</span></label>
          <input
            name="unitNo"
            defaultValue={selectedCarpark?.unitNo ?? ''}
            maxLength={50}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. A-12-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            name="status"
            defaultValue={selectedCarpark?.status || AssetStatus.VACANT}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value={AssetStatus.VACANT}>Vacant</option>
            <option value={AssetStatus.OCCUPIED}>Occupied</option>
            <option value={AssetStatus.MAINTENANCE}>Maintenance</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedCarpark ? 'Update Carpark' : 'Save Carpark'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
