import { z } from 'zod';
import { UnitOfMeasure, MovementType } from '../types/inventory.js';

export const createIngredientSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  unit: z.nativeEnum(UnitOfMeasure),
  currentStock: z.string().regex(/^\d+(\.\d{1,3})?$/).default('0'),
  minimumStock: z.string().regex(/^\d+(\.\d{1,3})?$/).default('10'),
  unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  supplierId: z.string().uuid().optional().nullable(),
});

export const createRecipeItemSchema = z.object({
  menuItemId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  quantityRequired: z.string().regex(/^\d+(\.\d{1,3})?$/),
});

export const createInventoryMovementSchema = z.object({
  branchId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  type: z.nativeEnum(MovementType),
  quantityDelta: z.string().regex(/^-?\d+(\.\d{1,3})?$/),
  reason: z.string().optional().nullable(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
});
