// ─── Asset Management ────────────────────────────────────────────────────────

export enum UnitType {
  STUDIO = 'STUDIO',
  ONE_BEDROOM = 'ONE_BEDROOM',
  TWO_BEDROOM = 'TWO_BEDROOM',
  BUNGALOW = 'BUNGALOW',
  OTHER = 'OTHER',
}

export enum AssetStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
}

export interface MasterProperty {
  id: string;
  name: string;
  address?: string;
  unitCount?: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  propertyName?: string;
  unitNumber: string;
  type: UnitType;
  suggestedRentalPrice: number;
  status: AssetStatus;
}

export interface Carpark {
  id: string;
  carparkNumber: string;
  suggestedRentalPrice: number;
  status: AssetStatus;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  customerNo?: number;
  name: string;
  phoneLocal: string;
  phoneOther?: string;
  icPassport: string;
  email?: string;
  currentAddress: string;
  wechatId?: string;
  whatsappNumber?: string;
  remark?: string;
}

// ─── Timeline / Lease ────────────────────────────────────────────────────────

export type LeaseStatusType = 'UPCOMING' | 'ACTIVE' | 'TERMINATED' | 'COMPLETED';
export type LeaseBillingCycle = 'DAILY' | 'FIXED_TERM' | 'MONTHLY';

export interface TimelineLease {
  id: string;
  startDate: string;
  endDate: string;
  status: LeaseStatusType;
  customerName: string;
}

export interface TimelineUnit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  suggestedRentalPrice: number;
  leases: TimelineLease[];
}

export interface TimelineProperty {
  id: string;
  name: string;
  units: TimelineUnit[];
}

export interface TimelineCarpark {
  id: string;
  carparkNumber: string;
  status: string;
  suggestedRentalPrice: number;
  leases: TimelineLease[];
}

export interface TimelineData {
  properties: TimelineProperty[];
  carparks: TimelineCarpark[];
}

// ─── Lease Management ───────────────────────────────────────────────────────

export type InvoiceStatusType = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type DepositStatusType = 'PENDING' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED';

export interface LeaseDepositInfo {
  id: string;
  amount: number;
  status: DepositStatusType;
  paidAt?: string | null;
  refundedAt?: string | null;
}

export interface LeaseInvoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: InvoiceStatusType;
  dueDate: string;
  paidAt?: string | null;
}

export interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  billingCycle: LeaseBillingCycle;
  unitPrice: number;
  totalAmount: number;
  status: LeaseStatusType;
  notes?: string;
  customer: { id: string; name: string; phoneLocal: string; icPassport: string };
  unit?: { id: string; unitNumber: string; property: { name: string } } | null;
  carpark?: { id: string; carparkNumber: string } | null;
  deposit?: LeaseDepositInfo | null;
  _count: { invoices: number };
}

export interface LeaseDetail extends Lease {
  invoices: LeaseInvoice[];
  customer: { id: string; name: string; phoneLocal: string; icPassport: string; email?: string; currentAddress?: string };
}

// ─── Customer Search ────────────────────────────────────────────────────────

export interface CustomerSearchResult {
  id: string;
  name: string;
  phoneLocal: string;
  icPassport: string;
  email?: string;
  currentAddress?: string;
}
