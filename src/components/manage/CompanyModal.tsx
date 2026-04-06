import React from 'react';
import { Company, DataSource } from '../../types';
import { Modal } from '../common/Modal';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedCompany: Company | null;
  dataSources: DataSource[];
}

export function CompanyModal({ isOpen, onClose, onSubmit, selectedCompany, dataSources }: CompanyModalProps) {
  const inputClass = 'w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedCompany ? 'Edit Company' : 'Add New Company'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
          <input
            name="name"
            defaultValue={selectedCompany?.name}
            required
            maxLength={200}
            className={inputClass}
            placeholder="e.g. Acme Sdn Bhd"
          />
        </div>

        {/* Manager Name & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Manager Name</label>
            <input
              name="managerName"
              defaultValue={selectedCompany?.managerName ?? ''}
              maxLength={200}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              name="phone"
              defaultValue={selectedCompany?.phone ?? ''}
              maxLength={50}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Email & TIN */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={selectedCompany?.email ?? ''}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TIN Number</label>
            <input
              name="tinNumber"
              defaultValue={selectedCompany?.tinNumber ?? ''}
              maxLength={100}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <input
            name="address"
            defaultValue={selectedCompany?.address ?? ''}
            maxLength={500}
            className={inputClass}
            placeholder="Optional"
          />
        </div>

        {/* WeChat & WhatsApp */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">WeChat ID</label>
            <input
              name="wechatId"
              defaultValue={selectedCompany?.wechatId ?? ''}
              maxLength={100}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label>
            <input
              name="whatsappNumber"
              defaultValue={selectedCompany?.whatsappNumber ?? ''}
              maxLength={50}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Data Source */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data Source</label>
          <select
            name="dataSourceId"
            defaultValue={selectedCompany?.dataSourceId ?? ''}
            className={`${inputClass} bg-white`}
          >
            <option value="">None</option>
            {dataSources.filter(d => d.isActive).map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
          <textarea
            name="remark"
            defaultValue={selectedCompany?.remark ?? ''}
            rows={2}
            className={inputClass}
            placeholder="Optional notes about this company"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {selectedCompany ? 'Update Company' : 'Save Company'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
