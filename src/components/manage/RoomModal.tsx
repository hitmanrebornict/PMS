import React from 'react';
import { Property, Room, BillingCycle } from '../../types';
import { Modal } from '../common/Modal';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedRoom: Room | null;
  properties: Property[];
}

export function RoomModal({ isOpen, onClose, onSubmit, selectedRoom, properties }: RoomModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedRoom ? 'Edit Room' : 'Add New Room'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
          <select
            name="propertyId"
            defaultValue={selectedRoom?.propertyId}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
            <input
              name="roomNumber"
              defaultValue={selectedRoom?.roomNumber}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 101"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              name="type"
              defaultValue={selectedRoom?.type}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Queen">Queen</option>
              <option value="King">King</option>
              <option value="Suite">Suite</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rate Type</label>
            <select
              name="baseRateType"
              defaultValue={selectedRoom?.baseRateType || BillingCycle.DAILY}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value={BillingCycle.DAILY}>Daily</option>
              <option value={BillingCycle.WEEKLY}>Weekly</option>
              <option value={BillingCycle.MONTHLY}>Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price (MYR)</label>
            <input
              name="baseRate"
              type="number"
              defaultValue={selectedRoom?.baseRate}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 150"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedRoom ? 'Update Room' : 'Save Room'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
