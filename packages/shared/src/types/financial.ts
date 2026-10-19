export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  TELEBIRR = 'TELEBIRR',
  CBE_BIRR = 'CBE_BIRR',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  VOID = 'VOID',
}

export enum PaymentTargetType {
  RESERVATION = 'RESERVATION',
  ORDER = 'ORDER',
  GENERAL = 'GENERAL',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface PaymentDTO {
  id: string;
  organizationId: string;
  branchId: string;
  targetType: PaymentTargetType;
  reservationId?: string | null;
  orderId?: string | null;
  shiftId?: string | null;
  amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNumber?: string | null;
  notes?: string | null;
  processedByUserId: string;
  createdAt: string;
}

export interface CashierShiftDTO {
  id: string;
  branchId: string;
  cashierUserId: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash: string;
  expectedCash?: string | null;
  countedCash?: string | null;
  variance?: string | null;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
}

export interface ExpenseDTO {
  id: string;
  branchId: string;
  category: string;
  amount: string;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  recordedByUserId: string;
  createdAt: string;
}
