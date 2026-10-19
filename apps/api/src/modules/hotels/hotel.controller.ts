import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import {
  createRoomTypeSchema,
  createRoomSchema,
  updateRoomStatusSchema,
  createGuestSchema,
  createReservationSchema,
  createHousekeepingTaskSchema,
  RoomStatus,
  ReservationStatus,
  HousekeepingStatus,
} from '@hotelpro/shared';
import { Prisma } from '@prisma/client';

export class HotelController {
  // -----------------------------------------------------------
  // Room Types
  // -----------------------------------------------------------
  static async listRoomTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.RoomTypeWhereInput = {
        organizationId: req.tenantId,
        isActive: true,
      };
      if (branchId) where.branchId = branchId;

      const roomTypes = await prisma.roomType.findMany({
        where,
        include: { _count: { select: { rooms: true } } },
        orderBy: { name: 'asc' },
      });

      return res.json({ roomTypes });
    } catch (err) {
      next(err);
    }
  }

  static async createRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createRoomTypeSchema.parse(req.body);

      // Verify branch belongs to organization
      const branch = await prisma.branch.findFirst({
        where: { id: validated.branchId, organizationId: req.tenantId },
      });
      if (!branch) {
        throw new AppError('Branch not found', 404);
      }

      const roomType = await prisma.roomType.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          name: validated.name,
          code: validated.code,
          description: validated.description,
          basePrice: new Prisma.Decimal(validated.basePrice),
          maxAdults: validated.maxAdults,
          maxChildren: validated.maxChildren,
          amenities: validated.amenities,
        },
      });

      return res.status(201).json({ roomType });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Rooms
  // -----------------------------------------------------------
  static async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const status = req.query.status as RoomStatus;

      const where: Prisma.RoomWhereInput = {
        organizationId: req.tenantId,
        isActive: true,
      };
      if (branchId) where.branchId = branchId;
      if (status) where.status = status;

      const rooms = await prisma.room.findMany({
        where,
        include: {
          roomType: true,
          housekeepingTasks: {
            where: { status: { in: [HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS] } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      });

      return res.json({ rooms });
    } catch (err) {
      next(err);
    }
  }

  static async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createRoomSchema.parse(req.body);

      const branch = await prisma.branch.findFirst({
        where: { id: validated.branchId, organizationId: req.tenantId },
      });
      if (!branch) throw new AppError('Branch not found', 404);

      const room = await prisma.room.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          roomTypeId: validated.roomTypeId,
          roomNumber: validated.roomNumber,
          floor: validated.floor,
          status: validated.status,
        },
        include: { roomType: true },
      });

      return res.status(201).json({ room });
    } catch (err) {
      next(err);
    }
  }

  static async updateRoomStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateRoomStatusSchema.parse(req.body);

      const room = await prisma.room.findFirst({
        where: { id, organizationId: req.tenantId },
      });
      if (!room) throw new AppError('Room not found', 404);

      const updated = await prisma.room.update({
        where: { id },
        data: { status: validated.status },
        include: { roomType: true },
      });

      return res.json({ room: updated });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Guests
  // -----------------------------------------------------------
  static async listGuests(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const where: Prisma.GuestWhereInput = {
        organizationId: req.tenantId,
      };

      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
          { idNumber: { contains: search } },
        ];
      }

      const guests = await prisma.guest.findMany({
        where,
        take: 50,
        orderBy: { fullName: 'asc' },
      });

      return res.json({ guests });
    } catch (err) {
      next(err);
    }
  }

  static async createGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createGuestSchema.parse(req.body);
      const guest = await prisma.guest.create({
        data: {
          organizationId: req.tenantId!,
          ...validated,
        },
      });

      return res.status(201).json({ guest });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Availability & Reservations
  // -----------------------------------------------------------
  static async checkAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const checkInDate = new Date(req.query.checkInDate as string);
      const checkOutDate = new Date(req.query.checkOutDate as string);
      const roomTypeId = req.query.roomTypeId as string | undefined;

      if (!branchId || isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new AppError('Valid branchId, checkInDate, and checkOutDate are required', 400);
      }

      if (checkInDate >= checkOutDate) {
        throw new AppError('checkOutDate must be after checkInDate', 400);
      }

      // Find all rooms in branch
      const roomWhere: Prisma.RoomWhereInput = {
        organizationId: req.tenantId,
        branchId,
        isActive: true,
      };
      if (roomTypeId) roomWhere.roomTypeId = roomTypeId;

      const allRooms = await prisma.room.findMany({
        where: roomWhere,
        include: { roomType: true },
      });

      // Find overlapping reservations
      const overlappingReservations = await prisma.reservation.findMany({
        where: {
          branchId,
          organizationId: req.tenantId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
          roomId: { not: null },
          AND: [
            { checkInDate: { lt: checkOutDate } },
            { checkOutDate: { gt: checkInDate } },
          ],
        },
        select: { roomId: true },
      });

      const bookedRoomIds = new Set(overlappingReservations.map((r) => r.roomId));
      const availableRooms = allRooms.filter((r) => !bookedRoomIds.has(r.id));

      return res.json({
        totalRooms: allRooms.length,
        availableRoomsCount: availableRooms.length,
        availableRooms,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const status = req.query.status as ReservationStatus;
      const search = req.query.search as string;

      const where: Prisma.ReservationWhereInput = {
        organizationId: req.tenantId,
      };
      if (branchId) where.branchId = branchId;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { reservationNumber: { contains: search, mode: 'insensitive' } },
          { guest: { fullName: { contains: search, mode: 'insensitive' } } },
          { guest: { phone: { contains: search } } },
        ];
      }

      const reservations = await prisma.reservation.findMany({
        where,
        include: {
          guest: true,
          room: true,
          roomType: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { checkInDate: 'asc' },
      });

      return res.json({ reservations });
    } catch (err) {
      next(err);
    }
  }

  static async createReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createReservationSchema.parse(req.body);
      const checkIn = new Date(validated.checkInDate);
      const checkOut = new Date(validated.checkOutDate);

      if (checkIn >= checkOut) {
        throw new AppError('Check-out date must be after check-in date', 400);
      }

      // Calculate nights
      const diffTime = checkOut.getTime() - checkIn.getTime();
      const totalNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const nightlyRate = new Prisma.Decimal(validated.nightlyRate);
      const discountAmount = new Prisma.Decimal(validated.discountAmount || '0.00');
      const taxAmount = new Prisma.Decimal(validated.taxAmount || '0.00');

      // Subtotal = nights * nightlyRate
      const subtotal = nightlyRate.mul(totalNights);
      const totalAmount = subtotal.sub(discountAmount).add(taxAmount);
      const paidAmount = new Prisma.Decimal('0.00');
      const balanceDue = totalAmount;

      const reservationNumber = `RES-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const reservation = await prisma.$transaction(async (tx) => {
        // Resolve or create guest
        let guestId = validated.guestId;
        if (!guestId && validated.guestData) {
          const newGuest = await tx.guest.create({
            data: {
              organizationId: req.tenantId!,
              ...validated.guestData,
            },
          });
          guestId = newGuest.id;
        }

        if (!guestId) {
          throw new AppError('A valid guestId or guestData is required', 400);
        }

        // If specific roomId requested, verify availability
        if (validated.roomId) {
          const room = await tx.room.findFirst({
            where: { id: validated.roomId, branchId: validated.branchId, organizationId: req.tenantId },
          });
          if (!room) throw new AppError('Room not found in branch', 404);

          const conflict = await tx.reservation.findFirst({
            where: {
              branchId: validated.branchId,
              roomId: validated.roomId,
              status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
              AND: [
                { checkInDate: { lt: checkOut } },
                { checkOutDate: { gt: checkIn } },
              ],
            },
          });

          if (conflict) {
            throw new AppError(`Room ${room.roomNumber} is already booked for these dates`, 409);
          }
        }

        const resv = await tx.reservation.create({
          data: {
            organizationId: req.tenantId!,
            branchId: validated.branchId,
            reservationNumber,
            guestId,
            roomId: validated.roomId,
            roomTypeId: validated.roomTypeId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            status: ReservationStatus.CONFIRMED,
            adultsCount: validated.adultsCount,
            childrenCount: validated.childrenCount,
            nightlyRate,
            totalNights,
            subtotal,
            discountAmount,
            taxAmount,
            totalAmount,
            paidAmount,
            balanceDue,
            specialRequests: validated.specialRequests,
          },
          include: {
            guest: true,
            room: true,
            roomType: true,
          },
        });

        return resv;
      });

      return res.status(201).json({ reservation });
    } catch (err) {
      next(err);
    }
  }

  static async checkInGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { roomId } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const resv = await tx.reservation.findFirst({
          where: { id, organizationId: req.tenantId },
          include: { room: true },
        });

        if (!resv) throw new AppError('Reservation not found', 404);
        if (resv.status === ReservationStatus.CHECKED_IN) {
          throw new AppError('Guest is already checked in', 400);
        }
        if (resv.status === ReservationStatus.CANCELLED || resv.status === ReservationStatus.CHECKED_OUT) {
          throw new AppError(`Cannot check in a reservation with status ${resv.status}`, 400);
        }

        const targetRoomId = roomId || resv.roomId;
        if (!targetRoomId) {
          throw new AppError('A room must be assigned before check-in', 400);
        }

        // Verify room is available
        const room = await tx.room.findFirst({
          where: { id: targetRoomId, organizationId: req.tenantId },
        });
        if (!room) throw new AppError('Room not found', 404);

        if (room.status === RoomStatus.OUT_OF_SERVICE) {
          throw new AppError('Room is out of service and cannot be checked into', 400);
        }

        // Update room status to OCCUPIED
        await tx.room.update({
          where: { id: targetRoomId },
          data: { status: RoomStatus.OCCUPIED },
        });

        // Update reservation
        const updated = await tx.reservation.update({
          where: { id },
          data: {
            status: ReservationStatus.CHECKED_IN,
            roomId: targetRoomId,
          },
          include: { guest: true, room: true, roomType: true },
        });

        return updated;
      });

      return res.json({ reservation: result });
    } catch (err) {
      next(err);
    }
  }

  static async checkOutGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await prisma.$transaction(async (tx) => {
        const resv = await tx.reservation.findFirst({
          where: { id, organizationId: req.tenantId },
          include: { room: true },
        });

        if (!resv) throw new AppError('Reservation not found', 404);
        if (resv.status !== ReservationStatus.CHECKED_IN) {
          throw new AppError('Reservation is not in CHECKED_IN status', 400);
        }

        // Set reservation to CHECKED_OUT
        const updated = await tx.reservation.update({
          where: { id },
          data: { status: ReservationStatus.CHECKED_OUT },
          include: { guest: true, room: true },
        });

        // If room was assigned, set to DIRTY and generate housekeeping task
        if (resv.roomId) {
          await tx.room.update({
            where: { id: resv.roomId },
            data: { status: RoomStatus.DIRTY },
          });

          await tx.housekeepingTask.create({
            data: {
              organizationId: req.tenantId!,
              branchId: resv.branchId,
              roomId: resv.roomId,
              status: HousekeepingStatus.PENDING,
              notes: `Checkout cleaning for room ${resv.room?.roomNumber || ''}`,
            },
          });
        }

        return updated;
      });

      return res.json({ reservation: result });
    } catch (err) {
      next(err);
    }
  }

  static async cancelReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const updated = await prisma.$transaction(async (tx) => {
        const resv = await tx.reservation.findFirst({
          where: { id, organizationId: req.tenantId },
        });

        if (!resv) throw new AppError('Reservation not found', 404);
        if (resv.status === ReservationStatus.CHECKED_OUT) {
          throw new AppError('Cannot cancel an already checked-out reservation', 400);
        }

        return tx.reservation.update({
          where: { id },
          data: { status: ReservationStatus.CANCELLED },
          include: { guest: true, room: true },
        });
      });

      return res.json({ reservation: updated });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Housekeeping
  // -----------------------------------------------------------
  static async listHousekeeping(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.HousekeepingTaskWhereInput = {
        organizationId: req.tenantId,
      };
      if (branchId) where.branchId = branchId;

      const tasks = await prisma.housekeepingTask.findMany({
        where,
        include: {
          room: { include: { roomType: true } },
          assignedTo: { select: { id: true, fullName: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      return res.json({ tasks });
    } catch (err) {
      next(err);
    }
  }

  static async createHousekeepingTask(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createHousekeepingTaskSchema.parse(req.body);
      const task = await prisma.housekeepingTask.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          roomId: validated.roomId,
          assignedToUserId: validated.assignedToUserId,
          priority: validated.priority,
          notes: validated.notes,
        },
        include: {
          room: true,
          assignedTo: { select: { id: true, fullName: true } },
        },
      });

      return res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  }

  static async updateHousekeepingTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, assignedToUserId, notes } = req.body;

      const task = await prisma.housekeepingTask.findFirst({
        where: { id, organizationId: req.tenantId },
        include: { room: true },
      });
      if (!task) throw new AppError('Task not found', 404);

      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.housekeepingTask.update({
          where: { id },
          data: {
            status,
            assignedToUserId,
            notes,
            completedAt: status === HousekeepingStatus.COMPLETED || status === HousekeepingStatus.INSPECTED ? new Date() : undefined,
          },
          include: { room: true, assignedTo: true },
        });

        // If inspected or completed, update room status accordingly
        if (status === HousekeepingStatus.INSPECTED) {
          await tx.room.update({
            where: { id: task.roomId },
            data: { status: RoomStatus.AVAILABLE },
          });
        } else if (status === HousekeepingStatus.IN_PROGRESS) {
          await tx.room.update({
            where: { id: task.roomId },
            data: { status: RoomStatus.CLEANING },
          });
        }

        return t;
      });

      return res.json({ task: updated });
    } catch (err) {
      next(err);
    }
  }
}
