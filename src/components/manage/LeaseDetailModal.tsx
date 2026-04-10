import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pencil, Plus, X, Check, Download, Paperclip, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApi } from '../../hooks/useApi';
import { LeaseDetail, LeaseStatusType, InvoiceStatusType, DepositStatusType, LeaseFile } from '../../types';

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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

// ─── Pay Invoice Prompt ───────────────────────────────────────────────────────

interface PayInvoicePromptProps {
  remaining: number;
  onConfirm: (amount: number, paymentMethod: string, referenceNo?: string) => void;
  onCancel: () => void;
}

function PayInvoicePrompt({ remaining, onConfirm, onCancel }: PayInvoicePromptProps) {
  const [value, setValue] = useState(String(remaining));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [referenceNo, setReferenceNo] = useState('');

  const parsedAmount = parseFloat(value);
  const valid =
    !isNaN(parsedAmount) && parsedAmount > 0 &&
    (paymentMethod !== 'BANK_TRANSFER' || referenceNo.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-5 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-slate-900">Record Payment</h3>

        {/* Amount */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">Amount received (RM)</label>
          <p className="text-xs text-slate-400 mb-2">
            Outstanding: RM {remaining.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="px-3 py-2 bg-slate-50 text-slate-500 text-sm border-r border-slate-300">RM</span>
            <input
              type="number" min="0.01" step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm text-slate-600 mb-2">Payment method</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                paymentMethod === 'CASH'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('BANK_TRANSFER')}
              className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                paymentMethod === 'BANK_TRANSFER'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Bank Transfer
            </button>
          </div>
        </div>

        {/* Reference No — only for Bank Transfer */}
        {paymentMethod === 'BANK_TRANSFER' && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Reference No. <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              placeholder="e.g. TXN123456789"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onConfirm(
              parsedAmount,
              paymentMethod,
              paymentMethod === 'BANK_TRANSFER' ? referenceNo : undefined,
            )}
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

  // ── Deposit amount edit state ──────────────────────────────────────────────
  const [editingDepositAmount, setEditingDepositAmount] = useState(false);
  const [depositAmountValue, setDepositAmountValue] = useState('');

  // ── Pay invoice prompt state ──────────────────────────────────────────────
  const [payInvoicePrompt, setPayInvoicePrompt] = useState<{ invoiceId: string; remaining: number } | null>(null);

  // ── Amount prompt state (deposit actions only) ────────────────────────────
  type PromptAction =
    | { kind: 'deposit-receive'; depositId: string; remaining: number }
    | { kind: 'deposit-refund'; depositId: string; remaining: number }
    | { kind: 'deposit-forfeit'; depositId: string; depositAmount: number };

  const [prompt, setPrompt] = useState<PromptAction | null>(null);

  // ── Terminate date prompt state ───────────────────────────────────────────
  const [terminatePromptOpen, setTerminatePromptOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState('');

  // ── Lease documents state ─────────────────────────────────────────────────
  const [leaseFiles, setLeaseFiles] = useState<LeaseFile[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchLeaseFiles = useCallback(async () => {
    if (!leaseId) return;
    try {
      const res = await apiFetch(`/api/leases/${leaseId}/files`);
      if (res.ok) setLeaseFiles(await res.json());
    } catch { /* non-critical */ }
  }, [leaseId, apiFetch]);

  useEffect(() => {
    if (isOpen && leaseId) { fetchLease(); fetchLeaseFiles(); }
    if (!isOpen) {
      setLease(null);
      setEditingLease(false);
      setEditingInvoiceId(null);
      setAddingInvoice(false);
      setPrompt(null);
      setEditingDepositAmount(false);
      setTerminatePromptOpen(false);
      setLeaseFiles([]);
    }
  }, [isOpen, leaseId, fetchLease, fetchLeaseFiles]);

  // ── Lease actions ─────────────────────────────────────────────────────────

  const startTerminate = () => {
    if (!lease) return;
    // Default to today, clamped within the lease period
    const today = new Date().toISOString().slice(0, 10);
    const leaseStart = toInputDate(lease.startDate);
    const leaseEnd = toInputDate(lease.endDate);
    const defaultDate = today < leaseStart ? leaseStart : today > leaseEnd ? leaseEnd : today;
    setTerminationDate(defaultDate);
    setTerminatePromptOpen(true);
  };

  const handleTerminate = async (date: string) => {
    if (!lease) return;
    setTerminatePromptOpen(false);
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/terminate`, {
        method: 'PATCH',
        body: JSON.stringify({ terminationDate: date }),
      });
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

  const downloadInvoicePdf = (invoiceId: string) => {
    // Use a temporary link to trigger authenticated download via the API
    apiFetch(`/api/invoices/${invoiceId}/pdf`).then(async (res) => {
      if (!res.ok) { alert('Failed to generate PDF'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handlePayInvoice = async (invoiceId: string, amount: number, paymentMethod?: string, referenceNo?: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount,
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(referenceNo   ? { referenceNo   } : {}),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        // Auto-download PDF if invoice is now fully paid
        if (updated.status === 'PAID') downloadInvoicePdf(invoiceId);
        await fetchLease();
        onAction();
      } else { const d = await res.json(); alert(d.error || 'Failed to record payment'); }
    } finally { setActionLoading(false); }
  };

  // ── Lease document actions ────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!lease || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('leaseId', lease.id);
    setFileUploading(true);
    try {
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) { await fetchLeaseFiles(); }
      else { const d = await res.json(); alert(d.error || 'Upload failed'); }
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!lease || !window.confirm('Delete this document?')) return;
    try {
      const res = await apiFetch(`/api/leases/${lease.id}/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) setLeaseFiles(prev => prev.filter(f => f.id !== fileId));
      else alert('Failed to delete file');
    } catch { alert('Failed to delete file'); }
  };

  const openWhatsApp = (number: string | null | undefined, message: string) => {
    if (!number) { alert('No WhatsApp number on record for this tenant.'); return; }
    const digits = number.replace(/\D/g, '');
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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

  // ── Deposit amount edit ────────────────────────────────────────────────

  const handleSaveDepositAmount = async () => {
    if (!lease?.deposit) return;
    const newAmount = parseFloat(depositAmountValue);
    if (isNaN(newAmount) || newAmount < 0) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/deposits/${lease.deposit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'editAmount', amount: newAmount }),
      });
      if (res.ok) { setEditingDepositAmount(false); await fetchLease(); onAction(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update deposit amount'); }
    } finally { setActionLoading(false); }
  };

  // ── Prompt confirm ────────────────────────────────────────────────────────

  const handlePromptConfirm = async (amount: number) => {
    if (!prompt) return;
    setPrompt(null);
    if (prompt.kind === 'deposit-receive') {
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
                        lang="en-GB"
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
                  {lease.company ? (
                    <>
                      <div>
                        <p className="text-slate-500">Company</p>
                        <p className="font-medium text-slate-900">{lease.company.name}</p>
                        {lease.company.phone && <p className="text-xs text-slate-400">{lease.company.phone}</p>}
                      </div>
                      <div>
                        <p className="text-slate-500">Manager</p>
                        <p className="font-medium text-slate-900">{lease.company.managerName || '—'}</p>
                        {lease.company.email && <p className="text-xs text-slate-400">{lease.company.email}</p>}
                      </div>
                      {lease.company.tinNumber && (
                        <div>
                          <p className="text-slate-500">TIN</p>
                          <p className="font-medium text-slate-900">{lease.company.tinNumber}</p>
                        </div>
                      )}
                      {lease.company.address && (
                        <div className={lease.company.tinNumber ? '' : 'col-span-2'}>
                          <p className="text-slate-500">Address</p>
                          <p className="font-medium text-slate-900">{lease.company.address}</p>
                        </div>
                      )}
                    </>
                  ) : lease.customer ? (
                    <>
                      <div>
                        <p className="text-slate-500">Customer</p>
                        <p className="font-medium text-slate-900">{lease.customer.name}</p>
                        <p className="text-xs text-slate-400">{lease.customer.phoneLocal}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">IC/Passport</p>
                        <p className="font-medium text-slate-900">{lease.customer.icPassport}</p>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <p className="text-slate-500">Period</p>
                    <p className="font-medium text-slate-900">{formatDate(lease.startDate)} – {formatDate(lease.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Billing</p>
                    <p className="font-medium text-slate-900 capitalize">{lease.billingCycle.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">
                      {lease.billingCycle === 'DAILY' ? 'Daily Rate' : 'Monthly Rate'}
                    </p>
                    <p className="font-medium text-slate-900">RM {lease.unitPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                    {lease.promotionAmount > 0 && (
                      <p className="text-xs text-amber-600">
                        − RM {lease.promotionAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })} promotion →{' '}
                        <span className="font-medium">RM {(lease.unitPrice - lease.promotionAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-500">Total Amount</p>
                    <p className="font-medium text-slate-900">RM {lease.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                    {lease.cleaningFee > 0 && (
                      <p className="text-xs text-slate-400">
                        + RM {lease.cleaningFee.toLocaleString('en-MY', { minimumFractionDigits: 2 })}/mo cleaning fee (in expenses)
                      </p>
                    )}
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
                      {editingDepositAmount ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-sm border-r border-slate-300">RM</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={depositAmountValue}
                              onChange={e => setDepositAmountValue(e.target.value)}
                              className="w-28 px-2 py-1 text-sm focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={handleSaveDepositAmount}
                            disabled={actionLoading || isNaN(parseFloat(depositAmountValue)) || parseFloat(depositAmountValue) < 0}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingDepositAmount(false)}
                            className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-900">
                            RM {lease.deposit.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                          </span>
                          {lease.deposit.status !== 'REFUNDED' && lease.deposit.status !== 'PARTIALLY_REFUNDED' && lease.deposit.status !== 'FORFEITED' && (
                            <button
                              onClick={() => { setDepositAmountValue(String(lease.deposit!.amount)); setEditingDepositAmount(true); }}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                              title="Edit deposit amount"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </>
                      )}
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
                        lang="en-GB"
                        value={newInvoiceForm.periodStart}
                        onChange={e => setNewInvoiceForm(f => ({ ...f, periodStart: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Period End</label>
                      <input
                        type="date"
                        lang="en-GB"
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
                        lang="en-GB"
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
                                  lang="en-GB"
                                  value={invoiceEditForm.periodStart}
                                  onChange={e => setInvoiceEditForm(f => ({ ...f, periodStart: e.target.value }))}
                                  className="border border-slate-300 rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <input
                                  type="date"
                                  lang="en-GB"
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
                                  lang="en-GB"
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
                              {inv.status === 'PAID' && inv.paymentMethod && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {inv.paymentMethod === 'CASH' ? 'Cash' : `Transfer${inv.referenceNo ? `: ${inv.referenceNo}` : ''}`}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const whatsappNumber = lease.customer?.whatsappNumber ?? lease.company?.whatsappNumber;
                                        const tenantName = lease.customer?.name ?? lease.company?.name ?? 'Tenant';
                                        const asset = getAssetLabel(lease);
                                        const due = formatDate(inv.dueDate);
                                        const amt = `RM ${inv.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
                                        openWhatsApp(whatsappNumber, `Dear ${tenantName}, this is a friendly reminder that your rental payment of ${amt} for ${asset} is due on ${due}. Please make your payment at your earliest convenience. Thank you.`);
                                      }}
                                      className="p-1 text-green-500 hover:text-green-600 rounded"
                                      title="Remind via WhatsApp"
                                    >
                                      <WhatsAppIcon size={14} />
                                    </button>
                                    <button
                                      onClick={() => setPayInvoicePrompt({
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
                                {inv.status === 'PAID' && (
                                  <button
                                    onClick={() => downloadInvoicePdf(inv.id)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                    title="Download invoice PDF"
                                  >
                                    <Download size={13} />
                                  </button>
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

            {/* Lease Documents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Lease Documents</h4>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileUploading}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Paperclip size={12} />
                  {fileUploading ? 'Uploading…' : 'Upload'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              {leaseFiles.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No documents attached.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {leaseFiles.map(f => (
                    <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50">
                      <a
                        href={`/api/upload/${f.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-indigo-600 hover:underline truncate max-w-[70%]"
                      >
                        <Paperclip size={12} className="shrink-0" />
                        <span className="truncate">{f.originalName}</span>
                      </a>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={() => handleDeleteFile(f.id)}
                          className="p-0.5 text-slate-300 hover:text-red-500 rounded"
                          title="Delete file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
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
                  onClick={startTerminate}
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

      {/* Pay Invoice Prompt */}
      {payInvoicePrompt && (
        <PayInvoicePrompt
          remaining={payInvoicePrompt.remaining}
          onConfirm={(amount, paymentMethod, referenceNo) => {
            const { invoiceId } = payInvoicePrompt;
            setPayInvoicePrompt(null);
            handlePayInvoice(invoiceId, amount, paymentMethod, referenceNo);
          }}
          onCancel={() => setPayInvoicePrompt(null)}
        />
      )}

      {/* Deposit Amount Prompt Overlay */}
      {prompt && (
        <AmountPrompt
          title={
            prompt.kind === 'deposit-receive' ? 'Receive Deposit' :
            prompt.kind === 'deposit-refund'  ? 'Refund Deposit' :
            'Forfeit Deposit'
          }
          label={
            prompt.kind === 'deposit-forfeit'
              ? 'Amount to return to tenant (RM)'
              : 'Amount received (RM)'
          }
          hint={
            prompt.kind === 'deposit-receive'
              ? `Outstanding: RM ${prompt.remaining.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : prompt.kind === 'deposit-refund'
              ? `Max refundable: RM ${prompt.remaining.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : `Deposit total: RM ${prompt.depositAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Enter 0 to forfeit the full amount.`
          }
          defaultValue={
            prompt.kind === 'deposit-receive' ? String(prompt.remaining) :
            prompt.kind === 'deposit-refund'  ? String(prompt.remaining) :
            '0'
          }
          onConfirm={handlePromptConfirm}
          onCancel={() => setPrompt(null)}
        />
      )}

      {/* ─── Terminate Date Prompt ──────────────────────────────────────────── */}
      {terminatePromptOpen && lease && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTerminatePromptOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-slate-900">Terminate Lease Early</h3>
            <p className="text-sm text-slate-600">
              Choose the date the lease ends. Uninvoiced periods after this date will be cancelled and the asset will be returned to the pool.
            </p>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Termination Date</label>
              <input
                type="date"
                lang="en-GB"
                value={terminationDate}
                min={toInputDate(lease.startDate)}
                max={toInputDate(lease.endDate)}
                onChange={e => setTerminationDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                Lease period: {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setTerminatePromptOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => terminationDate && handleTerminate(terminationDate)}
                disabled={!terminationDate}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
