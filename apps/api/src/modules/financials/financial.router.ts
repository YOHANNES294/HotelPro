import { Router } from 'express';
import { FinancialController } from './financial.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const financialRouter = Router();

financialRouter.use(authenticate, enforceTenant);

// Shifts
financialRouter.get('/shifts/active', requirePermission(Permission.MANAGE_SHIFTS), FinancialController.getActiveShift);
financialRouter.get('/shifts/current', requirePermission(Permission.MANAGE_SHIFTS), FinancialController.getActiveShift);
financialRouter.post('/shifts/open', requirePermission(Permission.MANAGE_SHIFTS), FinancialController.openShift);
financialRouter.post('/shifts/:id/close', requirePermission(Permission.MANAGE_SHIFTS), FinancialController.closeShift);

// Payments
financialRouter.get('/payments', requirePermission(Permission.VIEW_PAYMENTS), FinancialController.listPayments);
financialRouter.post('/payments', requirePermission(Permission.PROCESS_PAYMENTS), FinancialController.recordPayment);

// Expenses
financialRouter.get('/expenses', requirePermission(Permission.VIEW_REPORTS), FinancialController.listExpenses);
financialRouter.post('/expenses', requirePermission(Permission.MANAGE_SHIFTS), FinancialController.recordExpense);
