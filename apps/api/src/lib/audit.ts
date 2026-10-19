import { prisma } from './prisma.js';

interface AuditLogParams {
  organizationId: string;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata || {}) as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error('[AuditEvent Error] Failed to record audit log:', err);
  }
}
