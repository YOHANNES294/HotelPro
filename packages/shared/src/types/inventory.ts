export enum UnitOfMeasure {
  KG = 'KG',
  GRAM = 'GRAM',
  LITER = 'LITER',
  ML = 'ML',
  PIECE = 'PIECE',
  PORTION = 'PORTION',
  BOTTLE = 'BOTTLE',
  CAN = 'CAN',
}

export enum MovementType {
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  RECIPE_CONSUMPTION = 'RECIPE_CONSUMPTION',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  WASTE = 'WASTE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

export interface IngredientDTO {
  id: string;
  branchId: string;
  name: string;
  unit: UnitOfMeasure;
  currentStock: string;
  minimumStock: string;
  unitCost: string;
  supplierId?: string | null;
  isActive: boolean;
}

export interface RecipeItemDTO {
  id: string;
  menuItemId: string;
  ingredientId: string;
  quantityRequired: string;
  ingredient?: IngredientDTO;
}

export interface InventoryMovementDTO {
  id: string;
  branchId: string;
  ingredientId: string;
  type: MovementType;
  quantityDelta: string;
  previousStock: string;
  newStock: string;
  reason?: string | null;
  performedByUserId: string;
  createdAt: string;
  ingredient?: IngredientDTO;
}

export interface SupplierDTO {
  id: string;
  organizationId: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
}
