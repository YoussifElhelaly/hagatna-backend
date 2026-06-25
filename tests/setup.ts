import { vi } from 'vitest';

// ── Silence logger output during tests ───────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logger: {
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
