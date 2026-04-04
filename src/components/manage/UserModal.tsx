import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
  isActive: boolean;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  selectedUser: SystemUser | null;
}

const ROLES: Array<{ value: SystemUser['role']; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function UserModal({ isOpen, onClose, onSubmit, selectedUser }: UserModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get('password') as string;

    if (!selectedUser && !password) {
      setFormError('Password is required when creating a new user.');
      return;
    }

    const data: UserFormData = {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      role: fd.get('role') as SystemUser['role'],
      isActive: fd.get('isActive') === 'true',
    };
    if (password) data.password = password;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedUser ? 'Edit User' : 'Add New User'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {formError}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            defaultValue={selectedUser?.name}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            name="email"
            type="email"
            defaultValue={selectedUser?.email}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="e.g. john@versahome.com"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password{' '}
            {selectedUser ? (
              <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
            ) : (
              <span className="text-rose-500">*</span>
            )}
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="w-full px-4 py-2 pr-10 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role <span className="text-rose-500">*</span>
          </label>
          <select
            name="role"
            defaultValue={selectedUser?.role ?? 'VIEWER'}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status <span className="text-rose-500">*</span>
          </label>
          <select
            name="isActive"
            defaultValue={selectedUser ? String(selectedUser.isActive) : 'true'}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {selectedUser && (
            <p className="mt-1 text-xs text-slate-400">
              Setting to Inactive will immediately revoke the user's login sessions.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Saving…' : selectedUser ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
