import { UserSession } from '@hotelpro/shared';

declare global {
  namespace Express {
    interface Request {
      userSession?: UserSession;
      tenantId?: string;
      branchId?: string;
    }
  }
}

export {};
