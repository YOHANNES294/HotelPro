import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { z } from 'zod';

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const createBranchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10).toUpperCase(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  hasHotel: z.boolean().default(true),
  hasRestaurant: z.boolean().default(true),
});

export class OrganizationController {
  static async getOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.tenantId },
        include: {
          branches: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!org) {
        throw new AppError('Organization not found', 404);
      }

      return res.json({ organization: org });
    } catch (err) {
      next(err);
    }
  }

  static async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateOrgSchema.parse(req.body);
      const updated = await prisma.organization.update({
        where: { id: req.tenantId },
        data: validated,
      });

      return res.json({ organization: updated });
    } catch (err) {
      next(err);
    }
  }

  static async listBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const branches = await prisma.branch.findMany({
        where: {
          organizationId: req.tenantId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return res.json({ branches });
    } catch (err) {
      next(err);
    }
  }

  static async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createBranchSchema.parse(req.body);
      const branch = await prisma.branch.create({
        data: {
          organizationId: req.tenantId!,
          ...validated,
        },
      });

      // grant the creating user access to the new branch
      if (req.userSession?.userId) {
        await prisma.userBranchAccess.create({
          data: {
            userId: req.userSession.userId,
            branchId: branch.id,
          },
        }).catch(() => null);
      }

      return res.status(201).json({ branch });
    } catch (err) {
      next(err);
    }
  }
}
