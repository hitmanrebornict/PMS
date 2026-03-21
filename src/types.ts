export enum BillingCycle {
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly'
}

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  PARTIAL = 'Partial'
}

export interface Property {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
}

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  type: string;
  baseRate: number;
  baseRateType: BillingCycle;
}

export interface Booking {
  id: string;
  roomId: string;
  customerName: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  billingCycle: BillingCycle;
}

export interface MaintenanceLog {
  id: string;
  roomId: string;
  description: string;
  date: string;
  cost: number;
}
