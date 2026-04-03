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

export interface CustomerSearchResult {
  id: string;
  name: string;
  phoneLocal: string;
  icPassport: string;
  email?: string;
  currentAddress?: string;
}
