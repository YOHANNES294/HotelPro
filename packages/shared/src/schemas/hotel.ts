import { z } from 'zod';
import { RoomStatus, ReservationStatus, HousekeepingPriority } from '../types/hotel.js';

export const createRoomTypeSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(2),
  code: z.string().min(2).max(10).toUpperCase(),
  description: z.string().optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price'),
  maxAdults: z.number().int().min(1).default(2),
  maxChildren: z.number().int().min(0).default(0),
  amenities: z.array(z.string()).default([]),
});

export const createRoomSchema = z.object({
  branchId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  roomNumber: z.string().min(1),
  floor: z.number().int().default(1),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
});

export const updateRoomStatusSchema = z.object({
  status: z.nativeEnum(RoomStatus),
});

export const createGuestSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  idNumber: z.string().optional().nullable(),
  idType: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createReservationSchema = z.object({
  branchId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  guestData: createGuestSchema.optional(),
  roomTypeId: z.string().uuid(),
  roomId: z.string().uuid().optional().nullable(),
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  adultsCount: z.number().int().min(1).default(1),
  childrenCount: z.number().int().min(0).default(0),
  nightlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  specialRequests: z.string().optional().nullable(),
});

export const updateReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
  roomId: z.string().uuid().optional().nullable(),
});

export const createHousekeepingTaskSchema = z.object({
  branchId: z.string().uuid(),
  roomId: z.string().uuid(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  priority: z.nativeEnum(HousekeepingPriority).default(HousekeepingPriority.NORMAL),
  notes: z.string().optional().nullable(),
});
