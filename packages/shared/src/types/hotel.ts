export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
  INSPECTED = 'INSPECTED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum HousekeepingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  INSPECTED = 'INSPECTED',
}

export enum HousekeepingPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface RoomTypeDTO {
  id: string;
  branchId: string;
  name: string;
  code: string;
  description?: string | null;
  basePrice: string; // decimal string representation
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  isActive: boolean;
}

export interface RoomDTO {
  id: string;
  branchId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  isActive: boolean;
  roomType?: RoomTypeDTO;
}

export interface GuestDTO {
  id: string;
  organizationId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  idNumber?: string | null;
  idType?: string | null;
  nationality?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface ReservationDTO {
  id: string;
  organizationId: string;
  branchId: string;
  reservationNumber: string;
  guestId: string;
  roomId?: string | null;
  roomTypeId: string;
  checkInDate: string; // ISO string
  checkOutDate: string; // ISO string
  status: ReservationStatus;
  adultsCount: number;
  childrenCount: number;
  nightlyRate: string;
  totalNights: number;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  specialRequests?: string | null;
  guest?: GuestDTO;
  room?: RoomDTO | null;
  roomType?: RoomTypeDTO;
  createdAt: string;
}

export interface HousekeepingTaskDTO {
  id: string;
  branchId: string;
  roomId: string;
  assignedToUserId?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED';
  priority: HousekeepingPriority;
  notes?: string | null;
  completedAt?: string | null;
  room?: RoomDTO;
}
