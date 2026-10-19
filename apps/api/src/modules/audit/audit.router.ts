import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const auditRouter = Router();

auditRouter.use(authenticate, enforceTenant);

auditRouter.get('/', requirePermission(Permission.VIEW_AUDIT_LOGS), AuditController.listEvents);
