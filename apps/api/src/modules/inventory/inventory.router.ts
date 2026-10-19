import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const inventoryRouter = Router();

inventoryRouter.use(authenticate, enforceTenant);

// Ingredients
inventoryRouter.get('/ingredients', requirePermission(Permission.VIEW_INVENTORY), InventoryController.listIngredients);
inventoryRouter.post('/ingredients', requirePermission(Permission.MANAGE_INVENTORY), InventoryController.createIngredient);

// Recipes
inventoryRouter.get('/recipes/:menuItemId', requirePermission(Permission.VIEW_INVENTORY), InventoryController.getMenuItemRecipe);
inventoryRouter.post('/recipes', requirePermission(Permission.MANAGE_INVENTORY), InventoryController.createRecipeItem);

// Movements
inventoryRouter.get('/movements', requirePermission(Permission.VIEW_INVENTORY), InventoryController.listMovements);
inventoryRouter.post('/movements', requirePermission(Permission.ADJUST_STOCK), InventoryController.recordMovement);

// Suppliers
inventoryRouter.get('/suppliers', requirePermission(Permission.VIEW_INVENTORY), InventoryController.listSuppliers);
inventoryRouter.post('/suppliers', requirePermission(Permission.MANAGE_SUPPLIERS), InventoryController.createSupplier);
