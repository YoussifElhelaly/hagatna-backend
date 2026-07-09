import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import * as SiteSettingsService from '@modules/site-settings/site-settings.service';
import { prisma } from '@database/prisma/client';

const mockSetting = vi.mocked(prisma.setting);

describe('SiteSettingsService.getPublicSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults sellWithUsEnabled to true when unset', async () => {
    mockSetting.findUnique.mockResolvedValueOnce(null);
    const result = await SiteSettingsService.getPublicSettings();
    expect(result).toEqual({ sellWithUsEnabled: true });
  });

  it('returns the stored value when set', async () => {
    mockSetting.findUnique.mockResolvedValueOnce({
      key: 'sellWithUsEnabled',
      value: false,
      updatedAt: new Date(),
    } as never);
    const result = await SiteSettingsService.getPublicSettings();
    expect(result).toEqual({ sellWithUsEnabled: false });
  });
});

describe('SiteSettingsService.updateSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts the flag and returns the full public shape', async () => {
    mockSetting.upsert.mockResolvedValueOnce({} as never);
    mockSetting.findUnique.mockResolvedValueOnce({
      key: 'sellWithUsEnabled',
      value: false,
      updatedAt: new Date(),
    } as never);

    const result = await SiteSettingsService.updateSettings({ sellWithUsEnabled: false });

    expect(mockSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'sellWithUsEnabled' },
      create: { key: 'sellWithUsEnabled', value: false },
      update: { value: false },
    });
    expect(result).toEqual({ sellWithUsEnabled: false });
  });
});
