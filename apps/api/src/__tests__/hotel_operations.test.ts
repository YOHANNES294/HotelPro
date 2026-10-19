import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();

describe('Hotel Reservation & Housekeeping Lifecycle', () => {
  let token: string;
  let branchId: string;
  let roomTypeId: string;
  let roomId: string;
  let guestId: string;
  let reservationId: string;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `hotel-ops-${Date.now()}@palace.com`,
        password: 'Password123!',
        fullName: 'Palace GM',
        organizationName: 'Grand Palace Hotel',
        branchName: 'Main Resort',
      });
    token = regRes.body.tokens.accessToken;
    branchId = regRes.body.user.branch.id;

    // Create room type
    const rtRes = await request(app)
      .post('/api/v1/hotels/room-types')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        name: 'Ocean View Villa',
        code: 'OVV',
        basePrice: '4200.00',
        maxAdults: 2,
        maxChildren: 1,
      });
    roomTypeId = rtRes.body.roomType.id;

    // Create room
    const rRes = await request(app)
      .post('/api/v1/hotels/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        roomTypeId,
        roomNumber: '501',
        floor: 5,
        status: 'AVAILABLE',
      });
    roomId = rRes.body.room.id;

    // Create guest
    const gRes = await request(app)
      .post('/api/v1/hotels/guests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Dr. Tedros Adhanom',
        email: 'tedros@who.int',
        phone: '+251911998877',
        nationality: 'Ethiopian',
      });
    guestId = gRes.body.guest.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a confirmed reservation with accurate financial calculations', async () => {
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 10);
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + 13); // 3 nights

    const res = await request(app)
      .post('/api/v1/hotels/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        guestId,
        roomTypeId,
        roomId,
        checkInDate: checkIn.toISOString(),
        checkOutDate: checkOut.toISOString(),
        adultsCount: 2,
        childrenCount: 0,
        nightlyRate: '4200.00',
        taxAmount: '1890.00', // 15% VAT on 12,600
      });

    expect(res.status).toBe(201);
    const resv = res.body.reservation;
    expect(resv.status).toBe('CONFIRMED');
    expect(resv.totalNights).toBe(3);
    expect(parseFloat(resv.subtotal)).toBe(12600);
    expect(parseFloat(resv.totalAmount)).toBe(14490);
    expect(parseFloat(resv.balanceDue)).toBe(14490);

    reservationId = resv.id;
  });

  it('should reject overlapping booking for the same room and dates', async () => {
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 11); // Overlaps with day 10-13!
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + 14);

    const res = await request(app)
      .post('/api/v1/hotels/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        guestId,
        roomTypeId,
        roomId, // Same room 501
        checkInDate: checkIn.toISOString(),
        checkOutDate: checkOut.toISOString(),
        nightlyRate: '4200.00',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already booked');
  });

  it('should check in guest and transition room to OCCUPIED', async () => {
    const res = await request(app)
      .post(`/api/v1/hotels/reservations/${reservationId}/check-in`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId });

    expect(res.status).toBe(200);
    expect(res.body.reservation.status).toBe('CHECKED_IN');

    // Verify room status in DB
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room?.status).toBe('OCCUPIED');
  });

  it('should check out guest, set room to DIRTY, and create housekeeping task', async () => {
    const res = await request(app)
      .post(`/api/v1/hotels/reservations/${reservationId}/check-out`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.reservation.status).toBe('CHECKED_OUT');

    // Verify room status is now DIRTY
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room?.status).toBe('DIRTY');

    // Verify housekeeping task created
    const task = await prisma.housekeepingTask.findFirst({
      where: { roomId, status: 'PENDING' },
    });
    expect(task).toBeDefined();
    expect(task?.notes).toContain('Checkout cleaning');
  });
});
