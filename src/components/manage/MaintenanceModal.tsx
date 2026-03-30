import React from 'react';
import { Room } from '../../types';
import { Modal } from '../common/Modal';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  rooms: Room[];
}

export function MaintenanceModal({ isOpen, onClose, onSubmit, rooms }: MaintenanceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Maintenance Repair">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
          <select
            name="roomId"
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select Room</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.type})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            name="date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="What was repaired?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cost (MYR)</label>
          <input
            name="cost"
            type="number"
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. 50"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            Save Log
          </button>
        </div>
      </form>
    </Modal>
  );
}
