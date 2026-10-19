import { z } from 'zod';
import { TableStatus, OrderType, OrderStatus, KitchenItemStatus } from '../types/restaurant.js';

export const createTableSchema = z.object({
  branchId: z.string().uuid(),
  tableNumber: z.string().min(1),
  capacity: z.number().int().min(1).default(4),
  section: z.string().min(1).default('Main Dining'),
  status: z.nativeEnum(TableStatus).default(TableStatus.AVAILABLE),
});

export const createMenuCategorySchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  nameAmharic: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  nameAmharic: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAmharic: z.string().optional().nullable(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  imageUrl: z.string().url().optional().nullable(),
  isAvailable: z.boolean().default(true),
  preparationMinutes: z.number().int().min(0).default(15),
});

export const createOrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().optional().nullable(),
});

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  orderType: z.nativeEnum(OrderType).default(OrderType.DINE_IN),
  tableId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(createOrderItemSchema).min(1),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const updateKitchenItemStatusSchema = z.object({
  status: z.nativeEnum(KitchenItemStatus),
});
