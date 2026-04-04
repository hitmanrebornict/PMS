import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { useApi } from '../../hooks/useApi';
import { LeaseDetail, LeaseStatusType, InvoiceStatusType, DepositStatusType } from '../../types';

interface LeaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string | null;
  onAction: () => void;
}

const statusColors: Record<LeaseStatusType, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  UPCOMING: 'bg-blue-100 text-blue-700',
  TERMINATED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
};

const invoiceStatusColors: Record<InvoiceStatusType, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const depositStatusColors: Record<DepositStatusType, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  HELD: 'bg-emerald-100 text-emerald-700',
  PARTIALLY_REFUNDED: 'bg-blue-100 text-blue-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
  FORFEITED: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getAssetLabel(lease: LeaseDetail): string {
  if (lease.unit) return `${lease.unit.unitNumber} - ${lease.unit.property.name}`;
  if (lease.carpark) return `Carpark ${lease.carpark.carparkNumber}`;
  return 'Unknown';
}

export function LeaseDetailModal({ isOpen, onClose, leaseId, onAction }: LeaseDetailModalProps) {
  const { apiFetch } = useApi();
  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLease = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${leaseId}`);
      if (res.ok) setLease(await res.json());
    } finally {
      setLoading(false);
    }
  }, [leaseId, apiFetch]);

  useEffect(() => {
    if (isOpen && leaseId) fetchLease();
    if (!isOpen) setLease(null);
  }, [isOpen, leaseId, fetchLease]);

  const handleTerminate = async () => {
    if (!lease || !confirm('Are you sure you want to terminate this lease? All pending invoices will be cancelled.')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/terminate`, { method: 'PATCH' });
      if (res.ok) {
        await fetchLease();
        onAction();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to terminate lease');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!lease || !confirm('Mark this lease as completed?')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/complete`, { method: 'PATCH' });
      if (res.ok) {
        await fetchLease();
        onAction();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to complete lease');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}/pay`, { method: 'PATCH' });
      if (res.ok) {
        await fetchLease();
        onAction();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to mark invoice as paid');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepositAction = async (depositId: string, status: 'HELD' | 'REFUNDED' | 'FORFEITED') => {
    const labels: Record<string, string> = { HELD: 'mark as received', REFUNDED: 'refund', FORFEITED: 'forfeit' };
    if (!confirm(`Are you sure you want to ${labels[status]} this deposit?`)) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/deposits/${depositId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchLease();
        onAction();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update deposit');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lease Details" size="lg">
      {loading || !lease ? (
        <div className="py-12 text-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{getAssetLabel(lease)}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[lease.status]}`}>
                {lease.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Customer</p>
                <p className="font-medium text-slate-900">{lease.customer.name}</p>
                <p className="text-xs text-slate-400">{lease.customer.phoneLocal}</p>
              </div>
              <div>
                <p className="text-slate-500">IC/Passport</p>
                <p className="font-medium text-slate-900">{lease.customer.icPassport}</p>
              </div>
              <div>
                <p className="text-slate-500">Period</p>
                <p className="font-medium text-slate-900">{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</p>
              </div>
              <div>
                <p className="text-slate-500">Billing</p>
                <p className="font-medium text-slate-900 capitalize">{lease.billingCycle.toLowerCase().replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-slate-500">Unit Price</p>
                <p className="font-medium text-slate-900">RM {lease.unitPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Amount</p>
                <p className="font-medium text-slate-900">RM {lease.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            {lease.notes && (
              <div className="text-sm">
                <p className="text-slate-500">Notes</p>
                <p className="text-slate-700">{lease.notes}</p>
              </div>
            )}
          </div>

          {/* Deposit */}
          {lease.deposit && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Deposit</h3>
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">
                    RM {lease.deposit.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${depositStatusColors[lease.deposit.status]}`}>
                    {lease.deposit.status.replace('_', ' ')}
                  </span>
                  {lease.deposit.paidAt && (
                    <span className="text-xs text-slate-400">Received {formatDate(lease.deposit.paidAt)}</span>
                  )}
                  {lease.deposit.refundedAt && (
                    <span className="text-xs text-slate-400">Refunded {formatDate(lease.deposit.refundedAt)}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {lease.deposit.status === 'PENDING' && (
                    <button
                      onClick={() => handleDepositAction(lease.deposit!.id, 'HELD')}
                      disabled={actionLoading}
                      className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Mark Received
                    </button>
                  )}
                  {lease.deposit.status === 'HELD' && (
                    <>
                      <button
                        onClick={() => handleDepositAction(lease.deposit!.id, 'REFUNDED')}
                        disabled={actionLoading}
                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Refund
                      </button>
                      <button
                        onClick={() => handleDepositAction(lease.deposit!.id, 'FORFEITED')}
                        disabled={actionLoading}
                        className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Forfeit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Invoices */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Invoices ({lease.invoices?.length || 0})
            </h3>
            {lease.invoices && lease.invoices.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Period</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Amount</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Due</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lease.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-50">
                        <td className="px-3 py-2 text-slate-700">
                          {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                          RM {inv.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(inv.dueDate)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${invoiceStatusColors[inv.status]}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                            <button
                              onClick={() => handlePayInvoice(inv.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                          {inv.status === 'PAID' && inv.paidAt && (
                            <span className="text-xs text-slate-400">{formatDate(inv.paidAt)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-2">No invoices found.</p>
            )}
          </div>

          {/* Lease Actions */}
          {(lease.status === 'ACTIVE' || lease.status === 'UPCOMING') && (
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              {lease.status === 'ACTIVE' && (
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Complete Lease
                </button>
              )}
              <button
                onClick={handleTerminate}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Terminate Lease
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
