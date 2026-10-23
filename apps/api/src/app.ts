import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middleware/error.middleware.js';

import { authRouter } from './modules/auth/auth.router.js';
import { organizationRouter } from './modules/organizations/organization.router.js';
import { userRouter } from './modules/users/user.router.js';
import { hotelRouter } from './modules/hotels/hotel.router.js';
import { restaurantRouter } from './modules/restaurants/restaurant.router.js';
import { inventoryRouter } from './modules/inventory/inventory.router.js';
import { financialRouter } from './modules/financials/financial.router.js';
import { reportRouter } from './modules/reports/report.router.js';
import { syncRouter } from './modules/sync/sync.router.js';
import { auditRouter } from './modules/audit/audit.router.js';

export function createApp(): Express {
  const app = express();

  // Security & logging
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps, curl, or matching origins
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-permissive
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Health and Readiness
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'hotelpro-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'not_ready',
        database: 'disconnected',
        error: (err as Error).message,
      });
    }
  });

  // OpenAPI Specification
  app.get('/api/v1/openapi.json', (req: Request, res: Response) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'HotelPro Hospitality Management API',
        version: '1.0.0',
        description: 'Comprehensive REST API for HotelPro SaaS hotel & restaurant management system.',
      },
      paths: {
        '/api/v1/auth/register': { post: { summary: 'Register tenant organization & owner' } },
        '/api/v1/auth/login': { post: { summary: 'Login and acquire JWT tokens' } },
        '/api/v1/auth/refresh': { post: { summary: 'Refresh access token' } },
        '/api/v1/auth/me': { get: { summary: 'Get current authenticated user profile' } },
        '/api/v1/organizations': { get: { summary: 'Get organization details and branches' } },
        '/api/v1/hotels/rooms': { get: { summary: 'List hotel rooms and status' } },
        '/api/v1/hotels/reservations': {
          get: { summary: 'List hotel reservations' },
          post: { summary: 'Create new reservation' },
        },
        '/api/v1/hotels/reservations/availability': { get: { summary: 'Check room availability by date range' } },
        '/api/v1/restaurants/public/menu/{branchId}': { get: { summary: 'Public QR-code digital menu' } },
        '/api/v1/restaurants/tables': { get: { summary: 'List restaurant tables & current order' } },
        '/api/v1/restaurants/orders': {
          get: { summary: 'List restaurant orders' },
          post: { summary: 'Create order with kitchen ticket' },
        },
        '/api/v1/restaurants/kitchen/tickets': { get: { summary: 'Active kitchen display tickets' } },
        '/api/v1/inventory/ingredients': { get: { summary: 'List ingredients & stock levels' } },
        '/api/v1/financials/shifts/active': { get: { summary: 'Get active cashier shift' } },
        '/api/v1/financials/payments': { post: { summary: 'Record payment transaction' } },
        '/api/v1/reports/dashboard': { get: { summary: 'Aggregated hospitality KPIs and revenue' } },
        '/api/v1/sync': { post: { summary: 'Batch offline sync for mobile client' } },
      },
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organizations', organizationRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/hotels', hotelRouter);
  app.use('/api/v1/restaurants', restaurantRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/financials', financialRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/sync', syncRouter);
  app.use('/api/v1/audit', auditRouter);

  // Direct APK Download
  app.get(['/download/hotelpro.apk', '/hotelpro.apk'], (req: Request, res: Response) => {
    const candidates = [
      path.resolve(process.cwd(), 'apps/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk'),
      path.resolve(process.cwd(), '../mobile_flutter/build/app/outputs/flutter-apk/app-release.apk'),
      path.resolve(process.cwd(), '../../apps/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk'),
      'c:/Users/Yoni/HotelPro/apps/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk',
    ];
    const apkPath = candidates.find((p) => fs.existsSync(p));
    if (apkPath) {
      res.download(apkPath, 'hotelpro-flutter.apk');
    } else {
      res.status(404).send('APK not found on server');
    }
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
  });

  // Central error handler
  app.use(errorHandler);

  return app;
}
