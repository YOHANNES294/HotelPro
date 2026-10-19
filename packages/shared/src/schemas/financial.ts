import { z } from 'zod';
import { PaymentMethod, PaymentTargetType } from '../types/financial.js';

export const createPaymentSchema = z.object({
  branchId: z.string().uuid(),
  targetType: z.nativeEnum(PaymentTargetType),
  reservationId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid positive amount'),
  currency: z.string().default('ETB'),
  method: z.nativeEnum(PaymentMethod),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const openShiftSchema = z.object({
  branchId: z.string().uuid(),
  openingCash: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  notes: z.string().optional().nullable(),
});

export const closeShiftSchema = z.object({
  countedCash: z.string().regex(/^\d+(\.\d{1,2})?$/),
  notes: z.string().optional().nullable(),
});

export const createExpenseSchema = z.object({
  branchId: z.string().uuid(),
  category: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().default('ETB'),
  description: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNumber: z.string().optional().nullable(),
});
