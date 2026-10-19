import { Router } from 'express';
import { OrganizationController } from './organization.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const organizationRouter = Router();

organizationRouter.use(authenticate, enforceTenant);

organizationRouter.get('/', OrganizationController.getOrganization);
organizationRouter.patch('/', requirePermission(Permission.MANAGE_ORGANIZATION), OrganizationController.updateOrganization);
organizationRouter.get('/branches', OrganizationController.listBranches);
organizationRouter.post('/branches', requirePermission(Permission.MANAGE_BRANCHES), OrganizationController.createBranch);
