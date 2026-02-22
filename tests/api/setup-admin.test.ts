import { GET } from '@/app/api/setup-admin/route';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock Auth
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password_mock'),
}));

describe('Admin Setup Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ADMIN_SETUP_KEY = 'valid-setup-key';
    process.env.ADMIN_EMAIL = 'admin@test.com';
    process.env.ADMIN_PASSWORD = 'securepassword';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 500 if ADMIN_SETUP_KEY is not configured on server', async () => {
    delete process.env.ADMIN_SETUP_KEY;

    const req = new NextRequest('http://localhost:3000/api/setup-admin?key=any');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Server misconfiguration/i);
  });

  it('should return 401 if key query param is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/setup-admin'); // No key
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Unauthorized/i);
  });

  it('should return 401 if key query param is incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/setup-admin?key=wrong-key');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('should return 500 if ADMIN_EMAIL or ADMIN_PASSWORD missing from env', async () => {
    delete process.env.ADMIN_EMAIL;

    const req = new NextRequest('http://localhost:3000/api/setup-admin?key=valid-setup-key');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Server misconfiguration/i);
  });

  it('should create admin successfully with valid key and env vars', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      email: 'admin@test.com',
      role: 'ADMIN'
    });

    const req = new NextRequest('http://localhost:3000/api/setup-admin?key=valid-setup-key');
    const res = await GET(req);

    expect(res.status).toBe(201); // Created

    // Verify password was hashed
    expect(hashPassword).toHaveBeenCalledWith('securepassword');

    // Verify create was called with correct data
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'admin@test.com',
        password: 'hashed_password_mock',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
    }));
  });

  it('should return 403 or 200 if admin already exists (idempotency)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-admin' });

    const req = new NextRequest('http://localhost:3000/api/setup-admin?key=valid-setup-key');
    const res = await GET(req);

    // Assuming we want to return 200 (OK) or 409 (Conflict) or 403 (Forbidden)
    // The existing code returned 200 with a message. Let's stick to that or improve it.
    // I'll update the implementation to match the test expectation. Let's expect 403 Forbidden for security.
    // Wait, if it's a setup script, idempotency (200 OK "Already done") is often nicer for automation.
    // But security-wise, revealing that an admin exists is minor info leak if the key is correct (authorized).
    // So 200 is fine if authorized.

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Admin already exists');
  });
});
