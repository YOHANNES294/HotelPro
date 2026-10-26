import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import {
  syncBatchSchema,
  SyncOperationType,
  SyncStatus,
  SyncOperationResult,
  OrderStatus,
  TableStatus,
  RoomStatus,
  PaymentTargetType,
  PaymentMethod,
} from '@hotelpro/shared';
import { Prisma } from '@prisma/client';

export class SyncController {
  static async syncBatch(req: Request, res: Response, next: NextFunction) {
    try {
      if (Array.isArray(req.body?.operations)) {
        req.body.operations = req.body.operations.map((op: any) => {
          let ts = op?.clientTimestamp;
          if (typeof ts === 'string' && !ts.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(ts)) {
            ts = `${ts}Z`;
          }
          return { ...op, clientTimestamp: ts };
        });
      }
      const validated = syncBatchSchema.parse(req.body);
      const results: SyncOperationResult[] = [];
      const tenantId = req.tenantId!;

      for (const op of validated.operations) {
        // 1. Check idempotency log
        const existing = await prisma.syncLog.findUnique({
          where: { idempotencyKey: op.idempotencyKey },
        });

        if (existing) {
          results.push({
            idempotencyKey: op.idempotencyKey,
            status: existing.status as SyncStatus,
            entityId: existing.entityId || undefined,
          });
          continue;
        }

        try {
          let entityId: string | undefined;

          // 2. Dispatch by operation type
          if (op.type === SyncOperationType.CREATE_ORDER) {
            const payload = op.payload as any;
            const branchId = payload.branchId;
            const orderNumber = payload.orderNumber || `ORD-SYNC-${Date.now().toString().slice(-6)}`;

            const order = await prisma.$transaction(async (tx) => {
              const ord = await tx.order.create({
                data: {
                  organizationId: tenantId,
                  branchId,
                  orderNumber,
                  orderType: payload.orderType || 'DINE_IN',
                  status: OrderStatus.IN_KITCHEN,
                  tableId: payload.tableId,
                  waiterId: req.userSession?.userId,
                  customerName: payload.customerName,
                  customerPhone: payload.customerPhone,
                  subtotal: new Prisma.Decimal(payload.subtotal || '0.00'),
                  taxAmount: new Prisma.Decimal(payload.taxAmount || '0.00'),
                  discountAmount: new Prisma.Decimal(payload.discountAmount || '0.00'),
                  totalAmount: new Prisma.Decimal(payload.totalAmount || '0.00'),
                  notes: payload.notes,
                },
              });

              if (payload.tableId) {
                await tx.diningTable.update({
                  where: { id: payload.tableId },
                  data: { status: TableStatus.OCCUPIED },
                });
              }

              return ord;
            });

            entityId = order.id;
          } else if (op.type === SyncOperationType.UPDATE_ORDER_STATUS) {
            const payload = op.payload as any;
            const order = await prisma.order.update({
              where: { id: payload.orderId },
              data: { status: payload.status as OrderStatus },
            });
            entityId = order.id;
          } else if (op.type === SyncOperationType.RECORD_PAYMENT) {
            const payload = op.payload as any;
            const payment = await prisma.payment.create({
              data: {
                organizationId: tenantId,
                branchId: payload.branchId,
                targetType: payload.targetType as PaymentTargetType,
                reservationId: payload.reservationId,
                orderId: payload.orderId,
                amount: new Prisma.Decimal(payload.amount),
                currency: payload.currency || 'ETB',
                method: (payload.method || 'CASH') as PaymentMethod,
                referenceNumber: payload.referenceNumber,
                processedByUserId: req.userSession?.userId || 'system',
              },
            });
            entityId = payment.id;
          } else if (op.type === SyncOperationType.UPDATE_ROOM_STATUS) {
            const payload = op.payload as any;
            const room = await prisma.room.update({
              where: { id: payload.roomId },
              data: { status: payload.status as RoomStatus },
            });
            entityId = room.id;
          } else if (op.type === SyncOperationType.UPDATE_TABLE_STATUS) {
            const payload = op.payload as any;
            const table = await prisma.diningTable.update({
              where: { id: payload.tableId },
              data: { status: payload.status as TableStatus },
            });
            entityId = table.id;
          }

          // Record sync log
          await prisma.syncLog.create({
            data: {
              organizationId: tenantId,
              idempotencyKey: op.idempotencyKey,
              operationType: op.type,
              status: SyncStatus.PROCESSED,
              entityId,
              payload: op.payload as any,
              clientTimestamp: new Date(op.clientTimestamp),
            },
          });

          results.push({
            idempotencyKey: op.idempotencyKey,
            status: SyncStatus.PROCESSED,
            entityId,
          });
        } catch (opErr: any) {
          console.error(`[Sync Operation Error] Key: ${op.idempotencyKey}:`, opErr);

          await prisma.syncLog.create({
            data: {
              organizationId: tenantId,
              idempotencyKey: op.idempotencyKey,
              operationType: op.type,
              status: SyncStatus.FAILED,
              payload: op.payload as any,
              clientTimestamp: new Date(op.clientTimestamp),
            },
          });

          results.push({
            idempotencyKey: op.idempotencyKey,
            status: SyncStatus.FAILED,
            error: opErr.message || 'Operation failed during sync',
          });
        }
      }

      return res.json({
        results,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Sync Controller Error]:', err?.errors || err?.message || err);
      next(err);
    }
  }

  static async pullSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const branchId = (req.query.branchId as string) || req.userSession?.branchId;

      const roomWhere: Prisma.RoomWhereInput = { organizationId: tenantId, isActive: true };
      const orderWhere: Prisma.OrderWhereInput = {
        organizationId: tenantId,
        status: { in: [OrderStatus.PENDING, OrderStatus.IN_KITCHEN, OrderStatus.READY, OrderStatus.SERVED] },
      };
      const tableWhere: Prisma.DiningTableWhereInput = { organizationId: tenantId, isActive: true };
      const menuWhere: Prisma.MenuItemWhereInput = { organizationId: tenantId, isAvailable: true };

      if (branchId) {
        roomWhere.branchId = branchId;
        orderWhere.branchId = branchId;
        tableWhere.branchId = branchId;
      }

      const [rooms, orders, tables, menuItems] = await Promise.all([
        prisma.room.findMany({
          where: roomWhere,
          include: { roomType: true },
          orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        }),
        prisma.order.findMany({
          where: orderWhere,
          include: { items: { include: { menuItem: true } }, table: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.diningTable.findMany({
          where: tableWhere,
          orderBy: { tableNumber: 'asc' },
        }),
        prisma.menuItem.findMany({
          where: menuWhere,
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      return res.json({
        rooms,
        orders,
        tables,
        menuItems,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Sync Controller Error]:', err?.errors || err?.message || err);
      next(err);
    }
  }
}

