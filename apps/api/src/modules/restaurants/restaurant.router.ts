import { Router } from 'express';
import { RestaurantController } from './restaurant.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const restaurantRouter = Router();

// Public endpoint for QR menu (NO AUTH REQUIRED)
restaurantRouter.get('/public/menu/:branchId', RestaurantController.getPublicMenu);

// Protected endpoints
restaurantRouter.use(authenticate, enforceTenant);

// Dining Tables
restaurantRouter.get('/tables', requirePermission(Permission.VIEW_TABLES), RestaurantController.listTables);
restaurantRouter.post('/tables', requirePermission(Permission.MANAGE_TABLES), RestaurantController.createTable);
restaurantRouter.patch('/tables/:id/status', requirePermission(Permission.MANAGE_TABLES), RestaurantController.updateTableStatus);

// Menu
restaurantRouter.get('/menu', requirePermission(Permission.VIEW_MENUS), RestaurantController.listMenu);
restaurantRouter.post('/menu/categories', requirePermission(Permission.MANAGE_MENUS), RestaurantController.createCategory);
restaurantRouter.post('/menu/items', requirePermission(Permission.MANAGE_MENUS), RestaurantController.createMenuItem);
restaurantRouter.patch('/menu/items/:id/availability', requirePermission(Permission.MANAGE_MENUS), RestaurantController.toggleItemAvailability);

// Orders
restaurantRouter.get('/orders', requirePermission(Permission.CREATE_ORDERS), RestaurantController.listOrders);
restaurantRouter.post('/orders', requirePermission(Permission.CREATE_ORDERS), RestaurantController.createOrder);
restaurantRouter.patch('/orders/:id/status', requirePermission(Permission.UPDATE_ORDERS), RestaurantController.updateOrderStatus);

// Kitchen Display
restaurantRouter.get('/kitchen/tickets', requirePermission(Permission.VIEW_KITCHEN_DISPLAY), RestaurantController.listKitchenTickets);
