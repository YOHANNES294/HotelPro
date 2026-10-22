import { prisma } from '../../lib/prisma.js';
import { hashPassword, comparePassword } from '../../lib/password.js';
import { generateAccessToken, generateRefreshToken, hashRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../middleware/error.middleware.js';
import { logAuditEvent } from '../../lib/audit.js';
import { Role, ROLE_PERMISSIONS, LoginInput, RegisterInput } from '@hotelpro/shared';

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export class AuthService {
  static async register(data: RegisterInput, ip?: string, userAgent?: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('A user with this email already exists', 409);
    }

    const passwordHash = await hashPassword(data.password);
    const orgSlug = generateSlug(data.organizationName);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug: orgSlug,
          currency: data.currency || 'ETB',
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: data.branchName || 'Main Branch',
          code: 'MAIN',
          hasHotel: true,
          hasRestaurant: true,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: data.email.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: Role.BUSINESS_OWNER,
        },
      });

      await tx.userBranchAccess.create({
        data: {
          userId: user.id,
          branchId: branch.id,
        },
      });

      return { organization, branch, user };
    });

    const userSession = {
      userId: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: Role.BUSINESS_OWNER,
      organizationId: result.organization.id,
      branchId: result.branch.id,
      permissions: ROLE_PERMISSIONS[Role.BUSINESS_OWNER],
    };

    const accessToken = generateAccessToken(userSession);
    const { token: refreshToken, hash: refreshHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        tokenHash: refreshHash,
        expiresAt,
      },
    });

    await logAuditEvent({
      organizationId: result.organization.id,
      branchId: result.branch.id,
      userId: result.user.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: result.user.id,
      metadata: { email: result.user.email, orgName: result.organization.name },
      ipAddress: ip,
      userAgent,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          currency: result.organization.currency,
        },
        branch: {
          id: result.branch.id,
          name: result.branch.name,
          code: result.branch.code,
        },
        permissions: userSession.permissions,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 mins
      },
    };
  }

  static async login(data: LoginInput, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        organization: true,
        branchAccess: {
          include: { branch: true },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated. Please contact your manager.', 403);
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Determine primary branch
    const primaryBranch = user.branchAccess[0]?.branch || null;

    const userSession = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      organizationId: user.organizationId,
      branchId: primaryBranch?.id || null,
      permissions: ROLE_PERMISSIONS[user.role as Role] || [],
    };

    const accessToken = generateAccessToken(userSession);
    const { token: refreshToken, hash: refreshHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt,
      },
    });

    await logAuditEvent({
      organizationId: user.organizationId,
      branchId: primaryBranch?.id,
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      token: accessToken,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
      user: {
        id: user.id,
        name: user.fullName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        branchId: primaryBranch?.id || null,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          currency: user.organization.currency,
        },
        branch: primaryBranch
          ? {
              id: primaryBranch.id,
              name: primaryBranch.name,
              code: primaryBranch.code,
            }
          : null,
        permissions: userSession.permissions,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
    };
  }

  static async refreshToken(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            organization: true,
            branchAccess: { include: { branch: true } },
          },
        },
      },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = record.user;
    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }

    const primaryBranch = user.branchAccess[0]?.branch || null;

    const userSession = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      organizationId: user.organizationId,
      branchId: primaryBranch?.id || null,
      permissions: ROLE_PERMISSIONS[user.role as Role] || [],
    };

    const accessToken = generateAccessToken(userSession);

    return {
      accessToken,
      expiresIn: 900,
    };
  }

  static async logout(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
