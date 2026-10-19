import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

export class AuditController {
  static async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const action = req.query.action as string;
      const where: Prisma.AuditEventWhereInput = {
        organizationId: req.tenantId,
      };
      if (action) where.action = action;

      const events = await prisma.auditEvent.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json({ events });
    } catch (err) {
      next(err);
    }
  }
}
