import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import {
  openShiftSchema,
  closeShiftSchema,
  createPaymentSchema,
  createExpenseSchema,
  PaymentTargetType,
  PaymentMethod,
  PaymentStatus,
  ShiftStatus,
} from '@hotelpro/shared';
import { Prisma } from '@prisma/client';

export class FinancialController {
  // -----------------------------------------------------------
  // Cashier Shifts
  // -----------------------------------------------------------
  static async getActiveShift(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.CashierShiftWhereInput = {
        organizationId: req.tenantId,
        cashierUserId: req.userSession?.userId,
        status: ShiftStatus.OPEN,
      };
      if (branchId) where.branchId = branchId;

      const shift = await prisma.cashierShift.findFirst({
        where,
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return res.json({ shift });
    } catch (err) {
      next(err);
    }
  }

  static async openShift(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = openShiftSchema.parse(req.body);

      // Check if user already has open shift
      const existing = await prisma.cashierShift.findFirst({
        where: {
          organizationId: req.tenantId,
          cashierUserId: req.userSession!.userId,
          status: ShiftStatus.OPEN,
        },
      });

      if (existing) {
        throw new AppError('You already have an active open shift', 400);
      }

      const shift = await prisma.cashierShift.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          cashierUserId: req.userSession!.userId,
          openingCash: new Prisma.Decimal(validated.openingCash),
          status: ShiftStatus.OPEN,
          notes: validated.notes,
        },
      });

      return res.status(201).json({ shift });
    } catch (err) {
      next(err);
    }
  }

  static async closeShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = closeShiftSchema.parse(req.body);

      const shift = await prisma.cashierShift.findFirst({
        where: { id, organizationId: req.tenantId },
      });

      if (!shift) throw new AppError('Shift not found', 404);
      if (shift.status === ShiftStatus.CLOSED) throw new AppError('Shift is already closed', 400);

      // Calculate total cash payments received in this shift
      const cashPayments = await prisma.payment.findMany({
        where: {
          shiftId: shift.id,
          method: PaymentMethod.CASH,
          status: PaymentStatus.COMPLETED,
        },
      });

      let totalCashReceived = new Prisma.Decimal(0);
      for (const p of cashPayments) {
        totalCashReceived = totalCashReceived.add(p.amount);
      }

      const expectedCash = shift.openingCash.add(totalCashReceived);
      const countedCash = new Prisma.Decimal(validated.countedCash);
      const variance = countedCash.sub(expectedCash);

      const closedShift = await prisma.cashierShift.update({
        where: { id },
        data: {
          closedAt: new Date(),
          expectedCash,
          countedCash,
          variance,
          status: ShiftStatus.CLOSED,
          notes: validated.notes || shift.notes,
        },
      });

      return res.json({ shift: closedShift });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Payments
  // -----------------------------------------------------------
  static async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const targetType = req.query.targetType as PaymentTargetType;

      const where: Prisma.PaymentWhereInput = {
        organizationId: req.tenantId,
      };
      if (branchId) where.branchId = branchId;
      if (targetType) where.targetType = targetType;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          reservation: { include: { guest: true } },
          order: true,
          processedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ payments });
    } catch (err) {
      next(err);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createPaymentSchema.parse(req.body);
      const paymentAmount = new Prisma.Decimal(validated.amount);

      // Check if user has an active shift
      let shiftId = validated.shiftId;
      if (!shiftId) {
        const activeShift = await prisma.cashierShift.findFirst({
          where: {
            organizationId: req.tenantId,
            cashierUserId: req.userSession?.userId,
            status: ShiftStatus.OPEN,
          },
        });
        if (activeShift) shiftId = activeShift.id;
      }

      const payment = await prisma.$transaction(async (tx) => {
        // Handle Reservation payment balance update
        if (validated.targetType === PaymentTargetType.RESERVATION && validated.reservationId) {
          const resv = await tx.reservation.findFirst({
            where: { id: validated.reservationId, organizationId: req.tenantId },
          });
          if (!resv) throw new AppError('Reservation not found', 404);

          const newPaid = resv.paidAmount.add(paymentAmount);
          const newBalance = resv.totalAmount.sub(newPaid);

          await tx.reservation.update({
            where: { id: resv.id },
            data: {
              paidAmount: newPaid,
              balanceDue: newBalance,
            },
          });
        }

        // Handle Order payment balance update
        if (validated.targetType === PaymentTargetType.ORDER && validated.orderId) {
          const ord = await tx.order.findFirst({
            where: { id: validated.orderId, organizationId: req.tenantId },
          });
          if (!ord) throw new AppError('Order not found', 404);

          const newPaid = ord.paidAmount.add(paymentAmount);
          await tx.order.update({
            where: { id: ord.id },
            data: { paidAmount: newPaid },
          });
        }

        const p = await tx.payment.create({
          data: {
            organizationId: req.tenantId!,
            branchId: validated.branchId,
            targetType: validated.targetType,
            reservationId: validated.reservationId,
            orderId: validated.orderId,
            shiftId,
            amount: paymentAmount,
            currency: validated.currency || 'ETB',
            method: validated.method,
            referenceNumber: validated.referenceNumber,
            notes: validated.notes,
            processedByUserId: req.userSession?.userId || 'system',
          },
          include: {
            reservation: true,
            order: true,
            processedBy: { select: { id: true, fullName: true } },
          },
        });

        return p;
      });

      return res.status(201).json({ payment });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Expenses
  // -----------------------------------------------------------
  static async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.ExpenseWhereInput = {
        organizationId: req.tenantId,
      };
      if (branchId) where.branchId = branchId;

      const expenses = await prisma.expense.findMany({
        where,
        include: {
          recordedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ expenses });
    } catch (err) {
      next(err);
    }
  }

  static async recordExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createExpenseSchema.parse(req.body);

      const expense = await prisma.expense.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          category: validated.category,
          amount: new Prisma.Decimal(validated.amount),
          currency: validated.currency,
          description: validated.description,
          paymentMethod: validated.paymentMethod,
          referenceNumber: validated.referenceNumber,
          recordedByUserId: req.userSession?.userId || 'system',
        },
        include: {
          recordedBy: { select: { id: true, fullName: true } },
        },
      });

      return res.status(201).json({ expense });
    } catch (err) {
      next(err);
    }
  }
}
