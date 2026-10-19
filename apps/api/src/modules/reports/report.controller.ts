import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { RoomStatus, ReservationStatus, OrderStatus, ShiftStatus } from '@hotelpro/shared';
import { Prisma } from '@prisma/client';

export class ReportController {
  static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const tenantId = req.tenantId!;

      const branchFilter = branchId ? { branchId } : {};

      // 1. Rooms & Occupancy
      const totalRooms = await prisma.room.count({
        where: { organizationId: tenantId, isActive: true, ...branchFilter },
      });

      const occupiedRooms = await prisma.room.count({
        where: { organizationId: tenantId, status: RoomStatus.OCCUPIED, isActive: true, ...branchFilter },
      });

      const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0.0';

      // 2. Active checked-in reservations
      const checkedInGuests = await prisma.reservation.count({
        where: { organizationId: tenantId, status: ReservationStatus.CHECKED_IN, ...branchFilter },
      });

      // 3. Today's payments / revenue
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const payments = await prisma.payment.findMany({
        where: {
          organizationId: tenantId,
          createdAt: { gte: startOfDay },
          ...branchFilter,
        },
      });

      let todayTotalRevenue = new Prisma.Decimal(0);
      let todayRoomRevenue = new Prisma.Decimal(0);
      let todayRestaurantRevenue = new Prisma.Decimal(0);

      for (const p of payments) {
        todayTotalRevenue = todayTotalRevenue.add(p.amount);
        if (p.targetType === 'RESERVATION') {
          todayRoomRevenue = todayRoomRevenue.add(p.amount);
        } else if (p.targetType === 'ORDER') {
          todayRestaurantRevenue = todayRestaurantRevenue.add(p.amount);
        }
      }

      // 4. Restaurant active orders
      const activeOrdersCount = await prisma.order.count({
        where: {
          organizationId: tenantId,
          status: { in: [OrderStatus.PENDING, OrderStatus.IN_KITCHEN, OrderStatus.READY, OrderStatus.SERVED] },
          ...branchFilter,
        },
      });

      // 5. Low-stock ingredients
      const allIngredients = await prisma.ingredient.findMany({
        where: { organizationId: tenantId, isActive: true, ...branchFilter },
      });
      const lowStockCount = allIngredients.filter((i) => i.currentStock.lessThanOrEqualTo(i.minimumStock)).length;

      // 6. Active shifts
      const activeShiftsCount = await prisma.cashierShift.count({
        where: { organizationId: tenantId, status: ShiftStatus.OPEN, ...branchFilter },
      });

      return res.json({
        summary: {
          totalRooms,
          occupiedRooms,
          occupancyRate: `${occupancyRate}%`,
          checkedInGuests,
          todayTotalRevenue: todayTotalRevenue.toFixed(2),
          todayRoomRevenue: todayRoomRevenue.toFixed(2),
          todayRestaurantRevenue: todayRestaurantRevenue.toFixed(2),
          activeOrdersCount,
          lowStockCount,
          activeShiftsCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRestaurantSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const tenantId = req.tenantId!;

      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            organizationId: tenantId,
            status: OrderStatus.COMPLETED,
            ...(branchId ? { branchId } : {}),
          },
        },
        include: {
          menuItem: {
            include: { category: true },
          },
        },
      });

      const itemSalesMap = new Map<string, { name: string; category: string; quantity: number; revenue: Prisma.Decimal }>();

      for (const item of orderItems) {
        const key = item.menuItemId;
        const existing = itemSalesMap.get(key) || {
          name: item.itemName,
          category: item.menuItem?.category?.name || 'Uncategorized',
          quantity: 0,
          revenue: new Prisma.Decimal(0),
        };

        existing.quantity += item.quantity;
        existing.revenue = existing.revenue.add(item.totalPrice);
        itemSalesMap.set(key, existing);
      }

      const itemSales = Array.from(itemSalesMap.values()).map((s) => ({
        ...s,
        revenue: s.revenue.toFixed(2),
      }));

      return res.json({ salesByItem: itemSales });
    } catch (err) {
      next(err);
    }
  }

  static async getShiftReconciliationReport(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const tenantId = req.tenantId!;

      const shifts = await prisma.cashierShift.findMany({
        where: {
          organizationId: tenantId,
          status: ShiftStatus.CLOSED,
          ...(branchId ? { branchId } : {}),
        },
        include: {
          cashier: { select: { id: true, fullName: true, email: true } },
          payments: true,
        },
        orderBy: { closedAt: 'desc' },
        take: 30,
      });

      return res.json({ shifts });
    } catch (err) {
      next(err);
    }
  }
}
