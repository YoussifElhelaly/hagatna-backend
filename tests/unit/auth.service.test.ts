import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@shared/utils/ApiError';

// ── Mock all external dependencies before importing the service ───────────────

vi.mock('@database/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
    },
    vendorProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@database/redis/client', () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
  RedisKeys: {
    otp: (email: string) => `otp:${email}`,
  },
  TTL: { OTP: 600, RESET_TOKEN: 1800 },
}));

vi.mock('@shared/utils/email', () => ({
  sendOtpEmail:           vi.fn(),
  sendWelcomeEmail:       vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@config/env', () => ({
  env: {
    NODE_ENV:              'test',
    JWT_ACCESS_SECRET:     'test_access_secret',
    JWT_REFRESH_SECRET:    'test_refresh_secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN:'7d',
    FRONTEND_URL:          'http://localhost:3000',
  },
}));

// ── Now import service (after all mocks are set up) ───────────────────────────
import * as AuthService from '@modules/auth/auth.service';
import { prisma }       from '@database/prisma/client';
import { redis }        from '@database/redis/client';

// ── Typed mock helpers ────────────────────────────────────────────────────────
const mockUser = vi.mocked(prisma.user);
const mockRedis = vi.mocked(redis);

const fakeUser = {
  id:           'user-123',
  name:         'Ahmed',
  email:        'ahmed@test.com',
  passwordHash: '$2a$12$hashedpassword',
  role:         'customer' as const,
  isVerified:   true,
  isActive:     true,
  avatar:       null,
  refreshToken: null,
  phone:        null,
  provider:     'local' as const,
  createdAt:    new Date(),
  updatedAt:    new Date(),
};

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 409 if email already exists', async () => {
    mockUser.findUnique.mockResolvedValueOnce(fakeUser);
    await expect(
      AuthService.register({ name: 'Ahmed', email: 'ahmed@test.com', password: 'Pass1234!' })
    ).rejects.toThrow(ApiError);
  });

  it('creates user and stores OTP in Redis', async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    mockUser.create.mockResolvedValueOnce({ ...fakeUser, isVerified: false });
    mockRedis.set.mockResolvedValueOnce('OK');

    const result = await AuthService.register({
      name:     'Ahmed',
      email:    'ahmed@test.com',
      password: 'Pass1234!',
    });

    expect(mockUser.create).toHaveBeenCalledOnce();
    expect(mockRedis.set).toHaveBeenCalledOnce();
    // In test env (NODE_ENV=test), no devOtp returned — only in development
    expect(result).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 401 when user does not exist', async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    await expect(
      AuthService.login({ email: 'nobody@test.com', password: 'Pass1234!' })
    ).rejects.toThrow(ApiError);
  });

  it('throws 401 when password is wrong', async () => {
    mockUser.findUnique.mockResolvedValueOnce(fakeUser);
    await expect(
      AuthService.login({ email: 'ahmed@test.com', password: 'WrongPass!' })
    ).rejects.toThrow(ApiError);
  });

  it('throws 400 when email is not verified', async () => {
    mockUser.findUnique.mockResolvedValueOnce({ ...fakeUser, isVerified: false });
    await expect(
      AuthService.login({ email: 'ahmed@test.com', password: 'any' })
    ).rejects.toThrow(ApiError);
  });

  it('throws 403 when account is suspended', async () => {
    mockUser.findUnique.mockResolvedValueOnce({ ...fakeUser, isActive: false });
    await expect(
      AuthService.login({ email: 'ahmed@test.com', password: 'any' })
    ).rejects.toThrow(ApiError);
  });

  it('returns user + vendor data on valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('Pass1234!', 12);

    mockUser.findUnique.mockResolvedValueOnce({ ...fakeUser, passwordHash: hash });
    mockUser.update.mockResolvedValueOnce(fakeUser);
    vi.mocked(prisma.vendorProfile.findUnique).mockResolvedValueOnce(null);

    const result = await AuthService.login({ email: 'ahmed@test.com', password: 'Pass1234!' });

    expect(result.user.email).toBe('ahmed@test.com');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.vendor).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshToken
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.refreshToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 401 for an invalid token string', async () => {
    await expect(AuthService.refreshToken('not-a-jwt')).rejects.toThrow(ApiError);
  });

  it('throws 401 when user has no stored refresh token', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign(
      { id: 'user-123', role: 'customer', isVerified: true },
      'test_refresh_secret',
      { expiresIn: '7d' }
    );

    mockUser.findUnique.mockResolvedValueOnce({ ...fakeUser, refreshToken: null });

    await expect(AuthService.refreshToken(token)).rejects.toThrow(ApiError);
  });

  it('throws 401 when stored hash does not match token', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign(
      { id: 'user-123', role: 'customer', isVerified: true },
      'test_refresh_secret',
      { expiresIn: '7d' }
    );

    mockUser.findUnique.mockResolvedValueOnce({
      ...fakeUser,
      refreshToken: 'completely_different_hash',
    });

    await expect(AuthService.refreshToken(token)).rejects.toThrow(ApiError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// forgotPassword
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.forgotPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns silently when email does not exist (no user enumeration)', async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    await expect(AuthService.forgotPassword('nobody@test.com')).resolves.toBeUndefined();
  });

  it('stores reset token in Redis when user exists', async () => {
    mockUser.findUnique.mockResolvedValueOnce(fakeUser);
    mockRedis.set.mockResolvedValueOnce('OK');

    await AuthService.forgotPassword('ahmed@test.com');

    expect(mockRedis.set).toHaveBeenCalledOnce();
    // Key should start with 'reset:'
    expect((mockRedis.set as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(/^reset:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.resetPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 400 for an invalid or expired token', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    await expect(
      AuthService.resetPassword('invalid-token', 'NewPass1234!')
    ).rejects.toThrow(ApiError);
  });

  it('updates password and clears refresh tokens on success', async () => {
    mockRedis.get.mockResolvedValueOnce('user-123');
    mockUser.update.mockResolvedValueOnce(fakeUser);
    mockRedis.del.mockResolvedValueOnce(1);

    await AuthService.resetPassword('valid-token', 'NewPass1234!');

    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data:  expect.objectContaining({ refreshToken: null }),
      })
    );
    expect(mockRedis.del).toHaveBeenCalledOnce();
  });
});
