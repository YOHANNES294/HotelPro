import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();

describe('Tenant Isolation & Cross-Tenant Security', () => {
  let tenantAToken: string;
  let tenantABranchId: string;
  let tenantARoomTypeId: string;
  let tenantBToken: string;

  beforeAll(async () => {
    // 1. Create Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tenantA-${Date.now()}@hotela.com`,
        password: 'Password123!',
        fullName: 'Owner A',
        organizationName: 'Hotel Alpha Corp',
        branchName: 'Alpha Branch',
      });
    tenantAToken = resA.body.tokens.accessToken;
    tenantABranchId = resA.body.user.branch.id;

    // Tenant A creates a room type
    const rtRes = await request(app)
      .post('/api/v1/hotels/room-types')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({
        branchId: tenantABranchId,
        name: 'Alpha Presidential Suite',
        code: 'APS',
        basePrice: '5000.00',
        maxAdults: 2,
        maxChildren: 1,
      });
    tenantARoomTypeId = rtRes.body.roomType.id;

    // 2. Create Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tenantB-${Date.now()}@hotelb.com`,
        password: 'Password123!',
        fullName: 'Owner B',
        organizationName: 'Hotel Beta Corp',
        branchName: 'Beta Branch',
      });
    tenantBToken = resB.body.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should NOT allow Tenant B to see Tenant A room types', async () => {
    const res = await request(app)
      .get('/api/v1/hotels/room-types')
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(res.status).toBe(200);
    const roomTypeIds = res.body.roomTypes.map((rt: any) => rt.id);
    expect(roomTypeIds).not.toContain(tenantARoomTypeId);
  });

  it('should reject Tenant B trying to create a room in Tenant A branch', async () => {
    const res = await request(app)
      .post('/api/v1/hotels/rooms')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({
        branchId: tenantABranchId, // Target Tenant A branch!
        roomTypeId: tenantARoomTypeId,
        roomNumber: '999',
        floor: 9,
      });

    // Should return 404 branch not found (because branch does not belong to Tenant B's organization)
    expect(res.status).toBe(404);
  });

  it('should reject Tenant B trying to access Tenant A branches', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/branches')
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(res.status).toBe(200);
    const branchIds = res.body.branches.map((b: any) => b.id);
    expect(branchIds).not.toContain(tenantABranchId);
  });
});
