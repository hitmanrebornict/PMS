import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, X, Check } from 'lucide-react';
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
  PARTIALLY_HELD: 'bg-orange-100 text-orange-700',
  HELD: 'bg-emerald-100 text-emerald-700',
  PARTIALLY_REFUNDED: 'bg-blue-100 text-blue-700',
  REFUNDED: 'bg-sky-100 text-sky-700',
  FORFEITED: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function getAssetLabel(lease: LeaseDetail): string {
  if (lease.unit) return `${lease.unit.unitNumber} - ${lease.unit.property.name}`;
  if (lease.carpark) return `Carpark ${lease.carpark.carparkNumber}`;
  return 'Unknown';
}

// ─── Amount Prompt Modal ──────────────────────────────────────────────────────

interface AmountPromptProps {
  title: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

function AmountPrompt({ title, label, hint, defaultValue = '', onConfirm, onCancel }: AmountPromptProps) {
  const [value, setValue] = useState(defaultValue);
  const parsed = parseFloat(value);
  const valid = !isNaN(parsed) && parsed >= 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-5 w-full max-w-xs space-y-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div>
          <label className="block text-sm text-slate-600 mb-1">{label}</label>
          {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="px-3 py-2 bg-slate-50 text-slate-500 text-sm border-r border-slate-300">RM</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onConfirm(parsed)}
            disabled={!valid}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function LeaseDetailModal({ isOpen, onClose, leaseId, onAction }: LeaseDetailModalProps) {
  const { apiFetch } = useApi();
  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Lease edit state ──────────────────────────────────────────────────────
  const [editingLease, setEditingLease] = useState(false);
  const [leaseEditForm, setLeaseEditForm] = useState({ unitPrice: '', endDate: '', notes: '' });

  // ── Invoice edit state ────────────────────────────────────────────────────
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceEditForm, setInvoiceEditForm] = useState({ amount: '', dueDate: '', periodStart: '', periodEnd: '' });

  // ── Add invoice state ─────────────────────────────────────────────────────
  const [addingInvoice, setAddingInvoice] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({ periodStart: '', periodEnd: '', amount: '', dueDate: '' });

  // ── Amount prompt state ───────────────────────────────────────────────────
  type PromptAction =
    | { kind: 'invoice-pay'; invoiceId: string; remaining: number }
    | { kind: 'deposit-receive'; depositId: string; remaining: number }
    | { kind: 'deposit-refund'; depositId: string; remaining: number }
    | { kind: 'deposit-forfeit'; depositId: string; depositAmount: number };

  const [prompt, setPrompt] = useState<PromptAction | null>(null);

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
    if (!isOpen) {
      setLease(null);
      setEditingLease(false);
      setEditingInvoiceId(null);
      setAddingInvoice(false);
      setPrompt(null);
    }
  }, [isOpen, leaseId, fetchLease]);

  // ── Lease actions ─────────────────────────────────────────────────────────

  const handleTerminate = async () => {
    if (!lease || !confirm('Are you sure you want to terminate this lease? All pending invoices will be cancelled.')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/terminate`, { method: 'PATCH' });
      if (res.ok) { await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to terminate lease'); }
    } finally { setActionLoading(false); }
  };

  const handleComplete = async () => {
    if (!lease || !confirm('Mark this lease as completed?')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/complete`, { method: 'PATCH' });
      if (res.ok) { await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to complete lease'); }
    } finally { setActionLoading(false); }
  };

  const startEditLease = () => {
    if (!lease) return;
    setLeaseEditForm({
      unitPrice: String(lease.unitPrice),
      endDate: toInputDate(lease.endDate),
      notes: lease.notes || '',
    });
    setEditingLease(true);
  };

  const handleSaveLease = async () => {
    if (!lease) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          unitPrice: Number(leaseEditForm.unitPrice),
          endDate: leaseEditForm.endDate,
          notes: leaseEditForm.notes,
        }),
      });
      if (res.ok) { setEditingLease(false); await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update lease'); }
    } finally { setActionLoading(false); }
  };

  // ── Invoice actions ───────────────────────────────────────────────────────

  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({ amount }),
      });
      if (res.ok) { await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to record payment'); }
    } finally { setActionLoading(false); }
  };

  const startEditInvoice = (inv: LeaseDetail['invoices'][0]) => {
    setInvoiceEditForm({
      amount: String(inv.amount),
      dueDate: toInputDate(inv.dueDate),
      periodStart: toInputDate(inv.periodStart),
      periodEnd: toInputDate(inv.periodEnd),
    });
    setEditingInvoiceId(inv.id);
  };

  const handleSaveInvoice = async () => {
    if (!editingInvoiceId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/invoices/${editingInvoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: Number(invoiceEditForm.amount),
          dueDate: invoiceEditForm.dueDate,
          periodStart: invoiceEditForm.periodStart,
          periodEnd: invoiceEditForm.periodEnd,
        }),
      });
      if (res.ok) { setEditingInvoiceId(null); await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update invoice'); }
    } finally { setActionLoading(false); }
  };

  const handleAddInvoice = async () => {
    if (!lease) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/invoices`, {
        method: 'POST',
        body: JSON.stringify({
          periodStart: newInvoiceForm.periodStart,
          periodEnd: newInvoiceForm.periodEnd,
          amount: Number(newInvoiceForm.amount),
          dueDate: newInvoiceForm.dueDate,
        }),
      });
      if (res.ok) {
        setAddingInvoice(false);
        setNewInvoiceForm({ periodStart: '', periodEnd: '', amount: String(lease.unitPrice), dueDate: '' });
        await fetchLease();
        onAction();
      } else { const d = await res.json(); alert(d.error || 'Failed to add invoice'); }
    } finally { setActionLoading(false); }
  };

  // ── Deposit actions ───────────────────────────────────────────────────────

  const handleDepositAction = async (depositId: string, action: 'receive' | 'refund' | 'forfeit', amount: number) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/deposits/${depositId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, amount }),
      });
      if (res.ok) { await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update deposit'); }
    } finally { setActionLoading(false); }
  };

  // ── Prompt confirm ────────────────────────────────────────────────────────

  const handlePromptConfirm = async (amount: number) => {
    if (!prompt) return;
    setPrompt(null);
    if (prompt.kind === 'invoice-pay') {
      await handlePayInvoice(prompt.invoiceId, amount);
    } else if (prompt.kind === 'deposit-receive') {
      await handleDepositAction(prompt.depositId, 'receive', amount);
    } else if (prompt.kind === 'deposit-refund') {
      await handleDepositAction(prompt.depositId, 'refund', amount);
    } else if (prompt.kind === 'deposit-forfeit') {
      await handleDepositAction(prompt.depositId, 'forfeit', amount);
    }
  };

  const canEdit = lease?.status === 'ACTIVE' || lease?.status === 'UPCOMING';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Lease Details" size="lg">
        {loading || !lease ? (
          <div className="py-12 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Overview */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{getAssetLabel(lease)}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[lease.status]}`}>
                    {lease.status}
                  </span>
                  {canEdit && !editingLease && (
                    <button
                      onClick={startEditLease}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Edit lease"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>

              {editingLease ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Unit Price (RM)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={leaseEditForm.unitPrice}
                        onChange={e => setLeaseEditForm(f => ({ ...f, unitPrice: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={leaseEditForm.endDate}
                        onChange={e => setLeaseEditForm(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Notes</label>
                    <textarea
                      value={leaseEditForm.notes}
                      onChange={e => setLeaseEditForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLease}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      onClick={() => setEditingLease(false)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
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
                    <p className="font-medium text-slate-900">{formatDate(lease.startDate)} – {formatDate(lease.endDate)}</p>
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
                  {lease.notes && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Notes</p>
                      <p className="text-slate-700">{lease.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deposit */}
            {lease.deposit && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Deposit</h3>
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-slate-900">
                        RM {lease.deposit.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${depositStatusColors[lease.deposit.status]}`}>
                        {lease.deposit.status.replace(/_/g, ' ')}
                      </span>
                      {lease.deposit.receivedAmount != null && (
                        <span className="text-xs text-slate-500">
                          Received: RM {lease.deposit.receivedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {lease.deposit.paidAt && (
                        <span className="text-xs text-slate-400">on {formatDate(lease.deposit.paidAt)}</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(lease.deposit.status === 'PENDING' || lease.deposit.status === 'PARTIALLY_HELD') && (
                        <button
                          onClick={() => setPrompt({
                            kind: 'deposit-receive',
                            depositId: lease.deposit!.id,
                            remaining: lease.deposit!.amount - (lease.deposit!.receivedAmount ?? 0),
                          })}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {lease.deposit.status === 'PARTIALLY_HELD' ? 'Receive More' : 'Mark Received'}
                        </button>
                      )}
                      {(lease.deposit.status === 'HELD' || lease.deposit.status === 'PARTIALLY_HELD' || lease.deposit.status === 'PARTIALLY_REFUNDED') && (
                        <button
                          onClick={() => setPrompt({
                            kind: 'deposit-refund',
                            depositId: lease.deposit!.id,
                            remaining: lease.deposit!.amount - (lease.deposit!.refundedAmount ?? 0),
                          })}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Refund
                        </button>
                      )}
                      {(lease.deposit.status === 'HELD' || lease.deposit.status === 'PARTIALLY_HELD') && (
                        <button
                          onClick={() => setPrompt({
                            kind: 'deposit-forfeit',
                            depositId: lease.deposit!.id,
                            depositAmount: lease.deposit!.amount,
                          })}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Forfeit
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Refund info */}
                  {lease.deposit.refundedAmount != null && (
                    <p className="text-xs text-slate-500">
                      {lease.deposit.status === 'FORFEITED'
                        ? `Returned: RM ${lease.deposit.refundedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (forfeited RM ${(lease.deposit.amount - lease.deposit.refundedAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })})`
                        : `Refunded: RM ${lease.deposit.refundedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
                      {lease.deposit.refundedAt && ` on ${formatDate(lease.deposit.refundedAt)}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Invoices */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  Invoices ({lease.invoices?.length || 0})
                </h3>
                {canEdit && !addingInvoice && (
                  <button
                    onClick={() => {
                      setNewInvoiceForm({ periodStart: '', periodEnd: '', amount: String(lease.unitPrice), dueDate: '' });
                      setAddingInvoice(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50"
                  >
                    <Plus size={12} /> Add Invoice
                  </button>
                )}
              </div>

              {/* Add Invoice Form */}
              {addingInvoice && (
                <div className="mb-3 p-3 border border-indigo-200 bg-indigo-50 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-indigo-700">New Invoice</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Period Start</label>
                      <input
                        type="date"
                        value={newInvoiceForm.periodStart}
                        onChange={e => setNewInvoiceForm(f => ({ ...f, periodStart: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Period End</label>
                      <input
                        type="date"
                        value={newInvoiceForm.periodEnd}
                        onChange={e => setNewInvoiceForm(f => ({ ...f, periodEnd: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Amount (RM)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newInvoiceForm.amount}
                        onChange={e => setNewInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={newInvoiceForm.dueDate}
                        onChange={e => setNewInvoiceForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleAddInvoice}
                      disabled={actionLoading || !newInvoiceForm.periodStart || !newInvoiceForm.periodEnd || !newInvoiceForm.amount || !newInvoiceForm.dueDate}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Check size={12} /> Add
                    </button>
                    <button
                      onClick={() => setAddingInvoice(false)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              )}

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
                        editingInvoiceId === inv.id ? (
                          <tr key={inv.id} className="border-b border-slate-100 bg-amber-50">
                            <td className="px-2 py-1.5" colSpan={2}>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="date"
                                  value={invoiceEditForm.periodStart}
                                  onChange={e => setInvoiceEditForm(f => ({ ...f, periodStart: e.target.value }))}
                                  className="border border-slate-300 rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <input
                                  type="date"
                                  value={invoiceEditForm.periodEnd}
                                  onChange={e => setInvoiceEditForm(f => ({ ...f, periodEnd: e.target.value }))}
                                  className="border border-slate-300 rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={invoiceEditForm.amount}
                                  onChange={e => setInvoiceEditForm(f => ({ ...f, amount: e.target.value }))}
                                  className="border border-slate-300 rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Amount"
                                />
                                <input
                                  type="date"
                                  value={invoiceEditForm.dueDate}
                                  onChange={e => setInvoiceEditForm(f => ({ ...f, dueDate: e.target.value }))}
                                  className="border border-slate-300 rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1.5" colSpan={3}>
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={handleSaveInvoice}
                                  disabled={actionLoading}
                                  className="flex items-center gap-0.5 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  <Check size={11} /> Save
                                </button>
                                <button
                                  onClick={() => setEditingInvoiceId(null)}
                                  className="flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={inv.id} className="border-b border-slate-50">
                            <td className="px-3 py-2 text-slate-700">
                              {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="font-medium text-slate-900">
                                RM {inv.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                              </div>
                              {inv.paidAmount > 0 && inv.status !== 'PAID' && (
                                <div className="text-xs text-amber-600">
                                  Paid: RM {inv.paidAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(inv.dueDate)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${invoiceStatusColors[inv.status]}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                                  <>
                                    <button
                                      onClick={() => setPrompt({
                                        kind: 'invoice-pay',
                                        invoiceId: inv.id,
                                        remaining: inv.amount - inv.paidAmount,
                                      })}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      {inv.paidAmount > 0 ? 'Pay More' : 'Mark Received'}
                                    </button>
                                    {canEdit && (
                                      <button
                                        onClick={() => startEditInvoice(inv)}
                                        disabled={actionLoading}
                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                        title="Edit invoice"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                    )}
                                  </>
                                )}
                                {inv.status === 'PAID' && inv.paidAt && (
                                  <span className="text-xs text-slate-400">{formatDate(inv.paidAt)}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
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

      {/* Amount Prompt Overlay */}
      {prompt && (
        <AmountPrompt
          title={
            prompt.kind === 'invoice-pay' ? 'Record Payment' :
            prompt.kind === 'deposit-receive' ? 'Receive Deposit' :
            prompt.kind === 'deposit-refund' ? 'Refund Deposit' :
            'Forfeit Deposit'
          }
          label={
            prompt.kind === 'deposit-forfeit'
              ? 'Amount to return to tenant (RM)'
              : 'Amount received (RM)'
          }
          hint={
            prompt.kind === 'invoice-pay'
              ? `Outstanding: RM ${prompt.remaining.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : prompt.kind === 'deposit-receive'
              ? `Outstanding: RM ${prompt.remaining.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : prompt.kind === 'deposit-refund'
              ? `Max refundable: RM ${prompt.remaining.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : `Deposit total: RM ${prompt.depositAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Enter 0 to forfeit the full amount.`
          }
          defaultValue={
            prompt.kind === 'invoice-pay' ? String(prompt.remaining) :
            prompt.kind === 'deposit-receive' ? String(prompt.remaining) :
            prompt.kind === 'deposit-refund' ? String(prompt.remaining) :
            '0'
          }
          onConfirm={handlePromptConfirm}
          onCancel={() => setPrompt(null)}
        />
      )}
    </>
  );
}
