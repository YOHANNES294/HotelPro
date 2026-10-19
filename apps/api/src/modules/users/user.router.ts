import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const userRouter = Router();

userRouter.use(authenticate, enforceTenant);

userRouter.get('/', requirePermission(Permission.MANAGE_USERS), UserController.listUsers);
userRouter.post('/', requirePermission(Permission.MANAGE_USERS), UserController.createUser);
userRouter.patch('/:id', requirePermission(Permission.MANAGE_USERS), UserController.updateUser);
