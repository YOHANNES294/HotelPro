import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export function enforceTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.userSession || !req.userSession.organizationId) {
    return res.status(403).json({ error: 'Access denied. Missing organization tenant context.' });
  }

  req.tenantId = req.userSession.organizationId;
  next();
}

export async function validateBranchAccess(req: Request, res: Response, next: NextFunction) {
  const branchId = (req.params.branchId || req.query.branchId || req.body?.branchId) as string | undefined;

  if (!branchId) {
    return next();
  }

  if (!req.tenantId) {
    return res.status(403).json({ error: 'Tenant context required.' });
  }

  try {
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId: req.tenantId,
      },
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found or belongs to another organization.' });
    }

    req.branchId = branch.id;
    next();
  } catch (err) {
    next(err);
  }
}
