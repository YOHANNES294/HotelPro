import { Router } from 'express';
import { SyncController } from './sync.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';

export const syncRouter = Router();

syncRouter.use(authenticate, enforceTenant);

syncRouter.post('/', SyncController.syncBatch);
syncRouter.get('/pull', SyncController.pullSnapshot);
