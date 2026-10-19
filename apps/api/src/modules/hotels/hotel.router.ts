import { Router } from 'express';
import { HotelController } from './hotel.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceTenant } from '../../middleware/tenant.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { Permission } from '@hotelpro/shared';

export const hotelRouter = Router();

hotelRouter.use(authenticate, enforceTenant);

// Room Types
hotelRouter.get('/room-types', requirePermission(Permission.VIEW_ROOMS), HotelController.listRoomTypes);
hotelRouter.post('/room-types', requirePermission(Permission.MANAGE_ROOMS), HotelController.createRoomType);

// Rooms
hotelRouter.get('/rooms', requirePermission(Permission.VIEW_ROOMS), HotelController.listRooms);
hotelRouter.post('/rooms', requirePermission(Permission.MANAGE_ROOMS), HotelController.createRoom);
hotelRouter.patch('/rooms/:id/status', requirePermission(Permission.MANAGE_ROOMS), HotelController.updateRoomStatus);

// Guests
hotelRouter.get('/guests', requirePermission(Permission.VIEW_RESERVATIONS), HotelController.listGuests);
hotelRouter.post('/guests', requirePermission(Permission.CREATE_RESERVATIONS), HotelController.createGuest);

// Reservations
hotelRouter.get('/reservations', requirePermission(Permission.VIEW_RESERVATIONS), HotelController.listReservations);
hotelRouter.get('/reservations/availability', requirePermission(Permission.VIEW_RESERVATIONS), HotelController.checkAvailability);
hotelRouter.post('/reservations', requirePermission(Permission.CREATE_RESERVATIONS), HotelController.createReservation);
hotelRouter.post('/reservations/:id/check-in', requirePermission(Permission.CHECK_IN_OUT), HotelController.checkInGuest);
hotelRouter.post('/reservations/:id/check-out', requirePermission(Permission.CHECK_IN_OUT), HotelController.checkOutGuest);
hotelRouter.post('/reservations/:id/cancel', requirePermission(Permission.UPDATE_RESERVATIONS), HotelController.cancelReservation);

// Housekeeping
hotelRouter.get('/housekeeping', requirePermission(Permission.MANAGE_HOUSEKEEPING), HotelController.listHousekeeping);
hotelRouter.post('/housekeeping', requirePermission(Permission.MANAGE_HOUSEKEEPING), HotelController.createHousekeepingTask);
hotelRouter.patch('/housekeeping/:id', requirePermission(Permission.MANAGE_HOUSEKEEPING), HotelController.updateHousekeepingTask);
