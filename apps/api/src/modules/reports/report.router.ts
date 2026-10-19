import { Router } from 'express';
import { ReportController } from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const reportRouter = Router();

reportRouter.use(authenticate, enforceTenant);

reportRouter.get('/dashboard', requirePermission(Permission.VIEW_REPORTS), ReportController.getDashboardSummary);
reportRouter.get('/restaurant-sales', requirePermission(Permission.VIEW_REPORTS), ReportController.getRestaurantSalesReport);
reportRouter.get('/shift-reconciliations', requirePermission(Permission.VIEW_REPORTS), ReportController.getShiftReconciliationReport);
