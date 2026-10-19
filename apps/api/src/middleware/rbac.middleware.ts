import { Request, Response, NextFunction } from 'express';
import { Role, Permission, ROLE_PERMISSIONS } from '@hotelpro/shared';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userSession) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    if (req.userSession.role === Role.PLATFORM_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.userSession.role)) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.userSession.role}' does not have sufficient privileges.`,
      });
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userSession) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    if (req.userSession.role === Role.PLATFORM_ADMIN) {
      return next();
    }

    const userPermissions = req.userSession.permissions || ROLE_PERMISSIONS[req.userSession.role] || [];
    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAll) {
      return res.status(403).json({
        error: `Forbidden. Required permission(s): ${requiredPermissions.join(', ')}`,
      });
    }

    next();
  };
}
