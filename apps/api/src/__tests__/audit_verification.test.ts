import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();

describe('Auditor Deep Verification — Concurrency, Idempotency & Edge Cases', () => {
  let tenantToken: string;
  let tenantOrgId: string;
  let tenantBranchId: string;
  let roomId: string;
  let roomTypeId: string;
  let guestId: string;

  beforeAll(async () => {
    // Register dedicated test tenant
    const uniqueEmail = `audit_${Date.now()}@testresort.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: 'Password123!',
        fullName: 'Audit Director',
        organizationName: 'Audit Luxury Resort',
        branchName: 'Main Branch',
      });

    tenantToken = regRes.body.tokens.accessToken;
    tenantBranchId = regRes.body.user.branch.id;
    tenantOrgId = regRes.body.user.organizationId;

    // Create a Room Type
    const rtRes = await request(app)
      .post('/api/v1/hotels/room-types')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        branchId: tenantBranchId,
        name: 'Presidential Suite',
        code: 'PRES-01',
        basePrice: '5000.00',
        maxAdults: 2,
        maxChildren: 1,
      });
    roomTypeId = rtRes.body.roomType.id;

    // Create a Room
    const roomRes = await request(app)
      .post('/api/v1/hotels/rooms')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        branchId: tenantBranchId,
        roomTypeId,
        roomNumber: '801',
        floor: 8,
      });
    roomId = roomRes.body.room.id;

    // Create a Guest
    const guestRes = await request(app)
      .post('/api/v1/hotels/guests')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        fullName: 'Abebe Kebede',
        email: 'abebe@ethio.com',
        phone: '+251911223344',
      });
    guestId = guestRes.body.guest.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Concurrent Overlapping Room Reservations', () => {
    it('should reject race condition double booking when two requests book same room simultaneously', async () => {
      const checkInDate = '2026-12-01T14:00:00Z';
      const checkOutDate = '2026-12-05T10:00:00Z';

      const bookingPayload = {
        branchId: tenantBranchId,
        roomId,
        roomTypeId,
        guestId,
        checkInDate,
        checkOutDate,
        adultsCount: 2,
        childrenCount: 0,
        nightlyRate: '5000.00',
      };

      // Send two concurrent booking requests simultaneously using Promise.all
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/hotels/reservations')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send(bookingPayload),
        request(app)
          .post('/api/v1/hotels/reservations')
          .set('Authorization', `Bearer ${tenantToken}`)
          .send(bookingPayload),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (201) and one must be rejected (409)
      expect(statuses).toEqual([201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error).toContain('already booked for these dates');
    });
  });

  describe('2. Partial Payments & Folio Balance Precision', () => {
    it('should calculate balance due with exact decimal precision across multiple payments', async () => {
      // Create a 2-night reservation: 5000 * 2 = 10,000 ETB
      const resvRes = await request(app)
        .post('/api/v1/hotels/reservations')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          branchId: tenantBranchId,
          roomTypeId,
          guestId,
          checkInDate: '2026-12-10T14:00:00Z',
          checkOutDate: '2026-12-12T10:00:00Z',
          adultsCount: 1,
          nightlyRate: '5000.00',
        });

      expect(resvRes.status).toBe(201);
      const resvId = resvRes.body.reservation.id;
      expect(parseFloat(resvRes.body.reservation.totalAmount)).toBe(10000);
      expect(parseFloat(resvRes.body.reservation.balanceDue)).toBe(10000);

      // 1st partial payment: 3,500.50 ETB via Telebirr
      const pay1 = await request(app)
        .post('/api/v1/financials/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          branchId: tenantBranchId,
          targetType: 'RESERVATION',
          reservationId: resvId,
          amount: '3500.50',
          method: 'TELEBIRR',
          reference: 'TB-998811',
        });

      expect(pay1.status).toBe(201);
      expect(parseFloat(pay1.body.payment.amount)).toBe(3500.5);

      // Verify reservation updated balances
      const updated1 = await prisma.reservation.findUnique({ where: { id: resvId } });
      expect(parseFloat(updated1!.paidAmount.toString())).toBe(3500.5);
      expect(parseFloat(updated1!.balanceDue.toString())).toBe(6499.5);

      // 2nd payment: remaining 6,499.50 ETB via Cash
      const pay2 = await request(app)
        .post('/api/v1/financials/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          branchId: tenantBranchId,
          targetType: 'RESERVATION',
          reservationId: resvId,
          amount: '6499.50',
          method: 'CASH',
        });

      expect(pay2.status).toBe(201);

      const updated2 = await prisma.reservation.findUnique({ where: { id: resvId } });
      expect(parseFloat(updated2!.paidAmount.toString())).toBe(10000);
      expect(parseFloat(updated2!.balanceDue.toString())).toBe(0);
    });
  });

  describe('3. Offline Sync Idempotency & Duplicate Replay Protection', () => {
    it('should apply mutation once and skip duplicate replay with identical mutation ID', async () => {
      const fixedIdempotencyKey = 'a0000000-0000-4000-8000-000000000001';
      const payload = {
        operations: [
          {
            idempotencyKey: fixedIdempotencyKey,
            type: 'UPDATE_ROOM_STATUS',
            clientTimestamp: new Date().toISOString(),
            payload: {
              roomId,
              status: 'AVAILABLE',
            },
          },
        ],
      };

      // First sync push
      const push1 = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send(payload);

      expect(push1.status).toBe(200);
      expect(push1.body.results).toBeDefined();
      expect(push1.body.results[0].status).toBe('PROCESSED');

      // Second identical sync push (replay with same idempotency key)
      const push2 = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send(payload);

      expect(push2.status).toBe(200);
      // Replayed operation returns existing logged status without re-executing
      expect(push2.body.results[0].idempotencyKey).toBe(fixedIdempotencyKey);
      expect(push2.body.results[0].status).toBe('PROCESSED');
    });
  });

  describe('4. Public QR Menu Security & Privacy Audit', () => {
    it('should NEVER expose cost prices, recipes, staff secrets or other tenant data on public QR menu', async () => {
      const publicRes = await request(app).get(`/api/v1/restaurants/public/menu/${tenantBranchId}`);

      expect(publicRes.status).toBe(200);
      expect(publicRes.body.branch).toBeDefined();
      expect(publicRes.body.branch.name).toBe('Main Branch');

      // Verify no sensitive fields in categories or items
      const bodyStr = JSON.stringify(publicRes.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('costPrice');
      expect(bodyStr).not.toContain('recipe');
      expect(bodyStr).not.toContain('supplier');
      expect(bodyStr).not.toContain('auditLog');
    });
  });

  describe('5. Refresh Token Revocation & Security', () => {
    it('should reject access when old refresh token is reused after logout', async () => {
      // Login to obtain active refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `audit_${Date.now()}@testresort.com`, // will fail with non-existent or we use registered email
        });

      // Let's use the known registered user email
      const user = await prisma.user.findFirst({ where: { organizationId: tenantOrgId } });
      const activeLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user!.email,
          password: 'Password123!',
        });

      expect(activeLogin.status).toBe(200);
      const refreshToken = activeLogin.body.tokens.refreshToken;

      // Logout with this refresh token
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      // Attempt to refresh using revoked token
      const reattempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(reattempt.status).toBe(401);
      expect(reattempt.body.error).toContain('Invalid or expired refresh token');
    });
  });
});
