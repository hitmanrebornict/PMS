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

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  customerCount?: number;
}

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
  dataSourceId?: string | null;
  dataSource?: { id: string; name: string } | null;
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
export type DepositStatusType = 'PENDING' | 'PARTIALLY_HELD' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED';

export interface LeaseDepositInfo {
  id: string;
  amount: number;
  status: DepositStatusType;
  receivedAmount?: number | null;
  refundedAmount?: number | null;
  paidAt?: string | null;
  refundedAt?: string | null;
}

export interface LeaseInvoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  paidAmount: number;
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

// ─── Expense Management ──────────────────────────────────────────────────────

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  expenseCount?: number;
}

export interface Expense {
  id: string;
  amount: number;
  description?: string;
  expenseDate: string;
  expenseType: { id: string; name: string };
  unit: {
    id: string;
    unitNumber: string;
    property: { id: string; name: string };
  };
  createdAt: string;
}

export interface ExpenseSummaryUnit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  totalExpenses: number;
  expenses: {
    id: string;
    amount: number;
    description?: string;
    expenseDate: string;
    expenseType: { id: string; name: string };
  }[];
}

export interface ExpenseSummaryProperty {
  id: string;
  name: string;
  address?: string;
  totalExpenses: number;
  units: ExpenseSummaryUnit[];
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

// ─── Profit ───────────────────────────────────────────────────────────────────

export interface ProfitInvoiceRow {
  id: string;
  amount: number;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface ProfitExpenseRow {
  id: string;
  amount: number;
  description?: string | null;
  expenseDate: string;
  expenseType: { id: string; name: string };
}

export interface ProfitUnit {
  id: string;
  unitNumber: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  invoices: ProfitInvoiceRow[];
  expenses: ProfitExpenseRow[];
}

export interface ProfitProperty {
  id: string;
  name: string;
  address: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  units: ProfitUnit[];
}

export interface ProfitCarparkRow {
  id: string;
  amount: number;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  carparkNumber: string;
}

export interface ProfitSummary {
  period: { from: string; to: string };
  summary: { totalIncome: number; totalExpenses: number; netProfit: number };
  properties: ProfitProperty[];
  carparkIncome: number;
  carparkRows: ProfitCarparkRow[];
}
