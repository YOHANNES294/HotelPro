import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/password.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createUserSchema, Role } from '@hotelpro/shared';
import { z } from 'zod';

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().uuid().optional().nullable(),
});

export class UserController {
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        where: { organizationId: req.tenantId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          branchAccess: {
            include: {
              branch: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ users });
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);

      const existing = await prisma.user.findUnique({
        where: { email: validated.email.toLowerCase() },
      });

      if (existing) {
        throw new AppError('A user with this email already exists', 409);
      }

      const passwordHash = await hashPassword(validated.password);

      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            organizationId: req.tenantId!,
            email: validated.email.toLowerCase(),
            passwordHash,
            fullName: validated.fullName,
            phone: validated.phone,
            role: validated.role,
          },
        });

        if (validated.branchId) {
          // verify branch belongs to organization
          const branch = await tx.branch.findFirst({
            where: { id: validated.branchId, organizationId: req.tenantId },
          });
          if (branch) {
            await tx.userBranchAccess.create({
              data: {
                userId: newUser.id,
                branchId: branch.id,
              },
            });
          }
        }

        return newUser;
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateUserSchema.parse(req.body);

      const user = await prisma.user.findFirst({
        where: { id, organizationId: req.tenantId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id },
          data: {
            fullName: validated.fullName,
            phone: validated.phone,
            role: validated.role,
            isActive: validated.isActive,
          },
        });

        if (validated.branchId !== undefined) {
          await tx.userBranchAccess.deleteMany({ where: { userId: id } });
          if (validated.branchId) {
            await tx.userBranchAccess.create({
              data: { userId: id, branchId: validated.branchId },
            });
          }
        }

        return u;
      });

      return res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  }
}
