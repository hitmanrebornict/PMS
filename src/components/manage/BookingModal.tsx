import React from 'react';
import { Customer, Room, BillingCycle, PaymentStatus } from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onAddCustomer: () => void;
  selectedRoom: Room | null;
  customers: Customer[];
}

export function BookingModal({ isOpen, onClose, onSubmit, onAddCustomer, selectedRoom, customers }: BookingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`New Booking — Room ${selectedRoom?.roomNumber}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer</label>
          <select
            name="customerId"
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select a customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Can't find customer?{' '}
            <button type="button" onClick={onAddCustomer} className="text-indigo-600 hover:underline">
              Add new customer
            </button>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Check-in Date</label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Check-out Date</label>
            <input
              name="endDate"
              type="date"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Billing Cycle</label>
            <select
              name="billingCycle"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value={BillingCycle.DAILY}>Daily</option>
              <option value={BillingCycle.WEEKLY}>Weekly</option>
              <option value={BillingCycle.MONTHLY}>Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
            <select
              name="paymentStatus"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value={PaymentStatus.UNPAID}>Unpaid</option>
              <option value={PaymentStatus.PARTIAL}>Partial</option>
              <option value={PaymentStatus.PAID}>Paid</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Rate Information</p>
          <p className="text-sm text-slate-700">
            Room Rate: <span className="font-bold">{formatCurrency(selectedRoom?.baseRate || 0)}</span> per {selectedRoom?.baseRateType.toLowerCase()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total will be auto-calculated based on the room's rate type.</p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            Confirm Booking
          </button>
        </div>
      </form>
    </Modal>
  );
}
