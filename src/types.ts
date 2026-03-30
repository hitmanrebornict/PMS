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

export interface Customer {
  id: string;
  customerNo?: number;       // auto-increment display number
  name: string;              // English name
  phoneLocal: string;        // local H/P number
  phoneOther?: string;       // overseas/other country H/P (optional)
  icPassport: string;        // IC or passport number
  email?: string;            // optional
  currentAddress: string;    // current address
  wechatId?: string;         // optional
  whatsappNumber?: string;   // optional
  remark?: string;           // optional
  // legacy field kept for backward compat with bookings
  phone?: string;
  address?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  customerId: string; // Linked to Customer entity
  customerName: string; // Denormalized for quick access
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
