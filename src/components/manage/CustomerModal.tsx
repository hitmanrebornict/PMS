import React from 'react';
import { Customer } from '../../types';
import { Modal } from '../common/Modal';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedCustomer: Customer | null;
}

export function CustomerModal({ isOpen, onClose, onSubmit, selectedCustomer }: CustomerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            defaultValue={selectedCustomer?.name}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. Tan Wei Ming"
          />
        </div>

        {/* Phone numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Local H/P <span className="text-rose-500">*</span>
            </label>
            <input
              name="phoneLocal"
              defaultValue={selectedCustomer?.phoneLocal ?? selectedCustomer?.phone}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 0123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Overseas H/P <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              name="phoneOther"
              defaultValue={selectedCustomer?.phoneOther}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. +86 138 0013 8000"
            />
          </div>
        </div>

        {/* IC / Passport */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            IC / Passport No. <span className="text-rose-500">*</span>
          </label>
          <input
            name="icPassport"
            defaultValue={selectedCustomer?.icPassport}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono"
            placeholder="e.g. 901231-14-5678 or A12345678"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            name="email"
            type="email"
            defaultValue={selectedCustomer?.email}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. tanweiming@gmail.com"
          />
        </div>

        {/* Current Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Current Address <span className="text-rose-500">*</span>
          </label>
          <textarea
            name="currentAddress"
            defaultValue={selectedCustomer?.currentAddress ?? selectedCustomer?.address}
            required
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            placeholder="Full current address..."
          />
        </div>

        {/* WeChat & WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              WeChat ID <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              name="wechatId"
              defaultValue={selectedCustomer?.wechatId}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. tanweiming88"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              WhatsApp No. <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              name="whatsappNumber"
              defaultValue={selectedCustomer?.whatsappNumber}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 60123456789"
            />
          </div>
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Remark <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="remark"
            defaultValue={selectedCustomer?.remark}
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
            {selectedCustomer ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
