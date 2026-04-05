import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, UserPlus, UserCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApi } from '../../hooks/useApi';
import { CustomerSearchResult, LeaseBillingCycle } from '../../types';

interface LeaseBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefill?: {
    assetId: string;
    assetType: 'unit' | 'carpark';
    date: string;
    suggestedPrice: number;
  } | null;
}

export function LeaseBookingModal({ isOpen, onClose, onSuccess, prefill }: LeaseBookingModalProps) {
  const { apiFetch } = useApi();

  // Customer mode
  const [customerMode, setCustomerMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // New customer fields
  const [newIcPassport, setNewIcPassport] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Lease fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billingCycle, setBillingCycle] = useState<LeaseBillingCycle>('MONTHLY');
  const [unitPrice, setUnitPrice] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or prefill changes
  useEffect(() => {
    if (isOpen) {
      setCustomerMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedCustomer(null);
      setShowResults(false);
      setNewIcPassport('');
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setStartDate(prefill?.date || '');
      setEndDate('');
      setBillingCycle('MONTHLY');
      setUnitPrice(prefill?.suggestedPrice?.toString() || '');
      setDepositAmount('');
      setNotes('');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, prefill]);

  // Debounced customer search
  useEffect(() => {
    if (customerMode !== 'search' || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/inventory/customers/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch {
        // ignore search errors
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, customerMode, apiFetch]);

  // Calculate total
  const totalAmount = useMemo(() => {
    if (!startDate || !endDate || !unitPrice) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) return null;

    if (billingCycle === 'DAILY') {
      // Inclusive both ends: 05/04 → 07/04 = 3 days
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1 || 1;
      return diffDays * price;
    } else {
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) || 1;
      return months * price;
    }
  }, [startDate, endDate, billingCycle, unitPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const customer = customerMode === 'search' && selectedCustomer
        ? {
            icPassport: selectedCustomer.icPassport,
            name: selectedCustomer.name,
            phoneLocal: selectedCustomer.phoneLocal,
            email: selectedCustomer.email || undefined,
            currentAddress: selectedCustomer.currentAddress || undefined,
          }
        : {
            icPassport: newIcPassport,
            name: newName,
            phoneLocal: newPhone,
            email: newEmail || undefined,
            currentAddress: newAddress || undefined,
          };

      if (!customer.icPassport || !customer.name || !customer.phoneLocal) {
        setError('Please fill in all required customer fields');
        setSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {
        customer,
        unitId: prefill?.assetType === 'unit' ? prefill.assetId : null,
        carparkId: prefill?.assetType === 'carpark' ? prefill.assetId : null,
        startDate,
        endDate,
        billingCycle,
        unitPrice: parseFloat(unitPrice),
        depositAmount: parseFloat(depositAmount) || 0,
        notes: notes || undefined,
      };

      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onClose();
        onSuccess();
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setError('An active or upcoming lease already exists for this asset in the selected date range.');
        } else {
          setError(data.error || 'Failed to create lease');
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Lease Booking">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Asset info */}
        {prefill && (
          <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
            Booking for <span className="font-semibold">{prefill.assetType === 'unit' ? 'Unit' : 'Carpark'}</span> &middot; Suggested price: MYR {prefill.suggestedPrice.toFixed(2)}
          </div>
        )}

        {/* Customer section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">Customer</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { setCustomerMode('search'); setSelectedCustomer(null); }}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                  customerMode === 'search' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Search size={12} /> Search
              </button>
              <button
                type="button"
                onClick={() => { setCustomerMode('new'); setSelectedCustomer(null); }}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                  customerMode === 'new' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <UserPlus size={12} /> New
              </button>
            </div>
          </div>

          {customerMode === 'search' ? (
            <div className="relative">
              {selectedCustomer ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <UserCheck size={16} className="text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-slate-500">{selectedCustomer.icPassport} &middot; {selectedCustomer.phoneLocal}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setSearchQuery(''); }}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    placeholder="Search by name, IC/Passport, or phone..."
                    className={inputClass}
                  />
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedCustomer(c);
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.icPassport} &middot; {c.phoneLocal}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">IC / Passport *</label>
                  <input value={newIcPassport} onChange={(e) => setNewIcPassport(e.target.value)} required className={inputClass} placeholder="e.g. A12345678" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Full Name *</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} required className={inputClass} placeholder="e.g. John Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone *</label>
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required className={inputClass} placeholder="e.g. 012-3456789" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className={inputClass} placeholder="Optional" />
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className={inputClass} />
          </div>
        </div>

        {/* Billing Cycle */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Billing Cycle</label>
          <div className="flex gap-2">
            {(['DAILY', 'FIXED_TERM', 'MONTHLY'] as LeaseBillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  billingCycle === cycle
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cycle === 'FIXED_TERM' ? 'Fixed Term' : cycle.charAt(0) + cycle.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Price & Deposit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {billingCycle === 'DAILY' ? 'Daily Rate' : 'Monthly Rate'} (MYR)
            </label>
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deposit (MYR)</label>
            <input
              type="number"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Total display */}
        {totalAmount !== null && (
          <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-slate-600">Estimated Total</span>
            <span className="text-lg font-bold text-slate-900">MYR {totalAmount.toFixed(2)}</span>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Optional notes..."
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Lease'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
