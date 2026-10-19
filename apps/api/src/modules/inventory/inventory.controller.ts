import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import {
  createIngredientSchema,
  createRecipeItemSchema,
  createInventoryMovementSchema,
  createSupplierSchema,
} from '@hotelpro/shared';
import { Prisma } from '@prisma/client';

export class InventoryController {
  // -----------------------------------------------------------
  // Ingredients
  // -----------------------------------------------------------
  static async listIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const lowStockOnly = req.query.lowStock === 'true';

      const where: Prisma.IngredientWhereInput = {
        organizationId: req.tenantId,
        isActive: true,
      };
      if (branchId) where.branchId = branchId;

      const ingredients = await prisma.ingredient.findMany({
        where,
        include: { supplier: true },
        orderBy: { name: 'asc' },
      });

      const result = ingredients.map((ing) => ({
        ...ing,
        isLowStock: ing.currentStock.lessThanOrEqualTo(ing.minimumStock),
      }));

      const filtered = lowStockOnly ? result.filter((i) => i.isLowStock) : result;

      return res.json({ ingredients: filtered });
    } catch (err) {
      next(err);
    }
  }

  static async createIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createIngredientSchema.parse(req.body);

      const branch = await prisma.branch.findFirst({
        where: { id: validated.branchId, organizationId: req.tenantId },
      });
      if (!branch) throw new AppError('Branch not found', 404);

      const ingredient = await prisma.ingredient.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          name: validated.name,
          unit: validated.unit,
          currentStock: new Prisma.Decimal(validated.currentStock),
          minimumStock: new Prisma.Decimal(validated.minimumStock),
          unitCost: new Prisma.Decimal(validated.unitCost),
          supplierId: validated.supplierId,
        },
        include: { supplier: true },
      });

      return res.status(201).json({ ingredient });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Recipe Items
  // -----------------------------------------------------------
  static async createRecipeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createRecipeItemSchema.parse(req.body);

      const recipeItem = await prisma.recipeItem.create({
        data: {
          menuItemId: validated.menuItemId,
          ingredientId: validated.ingredientId,
          quantityRequired: new Prisma.Decimal(validated.quantityRequired),
        },
        include: { ingredient: true, menuItem: true },
      });

      return res.status(201).json({ recipeItem });
    } catch (err) {
      next(err);
    }
  }

  static async getMenuItemRecipe(req: Request, res: Response, next: NextFunction) {
    try {
      const { menuItemId } = req.params;

      const items = await prisma.recipeItem.findMany({
        where: { menuItemId },
        include: { ingredient: true },
      });

      return res.json({ recipeItems: items });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Movements
  // -----------------------------------------------------------
  static async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const ingredientId = req.query.ingredientId as string;

      const where: Prisma.InventoryMovementWhereInput = {
        organizationId: req.tenantId,
      };
      if (branchId) where.branchId = branchId;
      if (ingredientId) where.ingredientId = ingredientId;

      const movements = await prisma.inventoryMovement.findMany({
        where,
        include: {
          ingredient: true,
          performedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json({ movements });
    } catch (err) {
      next(err);
    }
  }

  static async recordMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createInventoryMovementSchema.parse(req.body);

      const ingredient = await prisma.ingredient.findFirst({
        where: { id: validated.ingredientId, organizationId: req.tenantId },
      });
      if (!ingredient) throw new AppError('Ingredient not found', 404);

      const delta = new Prisma.Decimal(validated.quantityDelta);
      const newStock = ingredient.currentStock.add(delta);

      if (newStock.lessThan(0)) {
        throw new AppError('Inventory cannot be negative. Adjustment exceeds available stock.', 400);
      }

      const movement = await prisma.$transaction(async (tx) => {
        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: { currentStock: newStock },
        });

        const mov = await tx.inventoryMovement.create({
          data: {
            organizationId: req.tenantId!,
            branchId: validated.branchId,
            ingredientId: ingredient.id,
            type: validated.type,
            quantityDelta: delta,
            previousStock: ingredient.currentStock,
            newStock,
            reason: validated.reason,
            performedByUserId: req.userSession?.userId || 'system',
          },
          include: { ingredient: true },
        });

        return mov;
      });

      return res.status(201).json({ movement });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Suppliers
  // -----------------------------------------------------------
  static async listSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { organizationId: req.tenantId },
        orderBy: { name: 'asc' },
      });

      return res.json({ suppliers });
    } catch (err) {
      next(err);
    }
  }

  static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createSupplierSchema.parse(req.body);

      const supplier = await prisma.supplier.create({
        data: {
          organizationId: req.tenantId!,
          ...validated,
        },
      });

      return res.status(201).json({ supplier });
    } catch (err) {
      next(err);
    }
  }
}
