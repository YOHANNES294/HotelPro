import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();

describe('Cashier Shifts, Payments & Reports', () => {
  let token: string;
  let branchId: string;
  let shiftId: string;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `fin-ops-${Date.now()}@resort.com`,
        password: 'Password123!',
        fullName: 'Finance Lead',
        organizationName: 'Lakeside Resort',
        branchName: 'Main Resort',
      });
    token = regRes.body.tokens.accessToken;
    branchId = regRes.body.user.branch.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should open a cashier shift with opening cash float', async () => {
    const res = await request(app)
      .post('/api/v1/financials/shifts/open')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        openingCash: '2000.00',
        notes: 'Morning shift opening cash',
      });

    expect(res.status).toBe(201);
    expect(res.body.shift.status).toBe('OPEN');
    expect(res.body.shift.openingCash).toBe('2000');

    shiftId = res.body.shift.id;
  });

  it('should record a cash payment and link to the active shift', async () => {
    const res = await request(app)
      .post('/api/v1/financials/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        targetType: 'GENERAL',
        amount: '1500.00',
        method: 'CASH',
        referenceNumber: 'REC-001',
        notes: 'Event room rental deposit',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment.amount).toBe('1500');
    expect(res.body.payment.shiftId).toBe(shiftId);
  });

  it('should close cashier shift and calculate expected cash and variance', async () => {
    // Opening: 2000.00
    // Cash received: 1500.00
    // Expected: 3500.00
    // Counted: 3520.00 (ETB +20.00 surplus)
    const res = await request(app)
      .post(`/api/v1/financials/shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        countedCash: '3520.00',
        notes: 'End of shift reconciliation with 20 ETB surplus',
      });

    expect(res.status).toBe(200);
    const shift = res.body.shift;
    expect(shift.status).toBe('CLOSED');
    expect(shift.expectedCash).toBe('3500');
    expect(shift.countedCash).toBe('3520');
    expect(shift.variance).toBe('20');
  });

  it('should return aggregated dashboard KPIs from real database records', async () => {
    const res = await request(app)
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.todayTotalRevenue).toBeDefined();
    expect(res.body.summary.occupancyRate).toBeDefined();
  });
});
