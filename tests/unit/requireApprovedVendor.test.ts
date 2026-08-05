import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, VendorStatus } from '@prisma/client';
import { ApiError } from '@shared/utils/ApiError';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    vendorProfile: { findUnique: vi.fn() },
  },
}));

import { requireApprovedVendor } from '@shared/middlewares/requireApprovedVendor';
import { prisma } from '@database/prisma/client';

const mockVendorProfile = vi.mocked(prisma.vendorProfile);

const buildReq = (role?: Role) => ({ user: role ? { id: 'user-1', role } : undefined }) as any;
const next = () => vi.fn();
// asyncHandler fires the middleware body without awaiting it, so tests need to
// flush the microtask queue before asserting on the (async) next() call.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('requireApprovedVendor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 401 when there is no authenticated user', async () => {
    const nextFn = next();
    requireApprovedVendor()(buildReq(undefined), {} as any, nextFn);
    await flush();
    expect(nextFn).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFn.mock.calls[0][0].statusCode).toBe(401);
  });

  it('lets a bypass role (e.g. admin) through without checking VendorProfile', async () => {
    const nextFn = next();
    requireApprovedVendor(Role.admin)(buildReq(Role.admin), {} as any, nextFn);
    await flush();
    expect(nextFn).toHaveBeenCalledWith();
    expect(mockVendorProfile.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a customer role with 403', async () => {
    const nextFn = next();
    requireApprovedVendor()(buildReq(Role.customer), {} as any, nextFn);
    await flush();
    expect(nextFn.mock.calls[0][0].statusCode).toBe(403);
  });

  it('rejects a vendor with no VendorProfile at all', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce(null);
    const nextFn = next();
    requireApprovedVendor()(buildReq(Role.vendor), {} as any, nextFn);
    await flush();
    expect(nextFn.mock.calls[0][0].statusCode).toBe(403);
  });

  it('rejects a vendor whose application is still pending', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ status: VendorStatus.pending } as any);
    const nextFn = next();
    requireApprovedVendor()(buildReq(Role.vendor), {} as any, nextFn);
    await flush();
    expect(nextFn.mock.calls[0][0].statusCode).toBe(403);
  });

  it('allows an approved vendor through', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ status: VendorStatus.approved } as any);
    const nextFn = next();
    requireApprovedVendor()(buildReq(Role.vendor), {} as any, nextFn);
    await flush();
    expect(nextFn).toHaveBeenCalledWith();
  });
});
