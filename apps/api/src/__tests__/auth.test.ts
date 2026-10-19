import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();

describe('Auth & Session API', () => {
  const testEmail = `owner-${Date.now()}@test-hospitality.com`;
  let accessToken: string;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register a new organization owner successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'SecurePassword123!',
        fullName: 'Test Owner',
        organizationName: 'Boutique Test Hotel',
        branchName: 'Main Resort',
        currency: 'ETB',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe('BUSINESS_OWNER');
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();

    accessToken = res.body.tokens.accessToken;
  });

  it('should fail registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'SecurePassword123!',
        fullName: 'Test Duplicate',
        organizationName: 'Duplicate Hotel',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'SecurePassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
  });

  it('should access /api/v1/auth/me with valid bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.session.email).toBe(testEmail);
    expect(res.body.session.role).toBe('BUSINESS_OWNER');
  });

  it('should reject /api/v1/auth/me without bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
