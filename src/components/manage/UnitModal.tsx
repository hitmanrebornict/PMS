import React from 'react';
import { MasterProperty, Unit, UnitType, AssetStatus } from '../../types';
import { Modal } from '../common/Modal';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedUnit: Unit | null;
  properties: MasterProperty[];
}

export function UnitModal({ isOpen, onClose, onSubmit, selectedUnit, properties }: UnitModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedUnit ? 'Edit Unit' : 'Add New Unit'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
          <select
            name="propertyId"
            defaultValue={selectedUnit?.propertyId}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select Property</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Number</label>
            <input
              name="unitNumber"
              defaultValue={selectedUnit?.unitNumber}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. A-12-04"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              name="type"
              defaultValue={selectedUnit?.type || UnitType.OTHER}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value={UnitType.STUDIO}>Studio</option>
              <option value={UnitType.ONE_BEDROOM}>1 Bedroom</option>
              <option value={UnitType.TWO_BEDROOM}>2 Bedroom</option>
              <option value={UnitType.THREE_BEDROOM}>3 Bedroom</option>
              <option value={UnitType.BUNGALOW}>Bungalow</option>
              <option value={UnitType.OTHER}>Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Suggested Rent (MYR)</label>
            <input
              name="suggestedRentalPrice"
              type="number"
              step="0.01"
              defaultValue={selectedUnit?.suggestedRentalPrice}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 1500.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              name="status"
              defaultValue={selectedUnit?.status || AssetStatus.VACANT}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value={AssetStatus.VACANT}>Vacant</option>
              <option value={AssetStatus.OCCUPIED}>Occupied</option>
              <option value={AssetStatus.MAINTENANCE}>Maintenance</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedUnit ? 'Update Unit' : 'Save Unit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
