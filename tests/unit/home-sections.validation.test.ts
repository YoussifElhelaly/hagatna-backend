import { describe, it, expect } from 'vitest';
import { UpdateHomeSectionsSchema } from '@modules/home-sections/home-sections.validation';

describe('UpdateHomeSectionsSchema', () => {
  it('accepts a valid canonical key', () => {
    const parsed = UpdateHomeSectionsSchema.parse({
      sections: [{ key: 'flashDeals', enabled: true, sortOrder: 3, itemLimit: 10 }],
    });
    expect(parsed.sections[0].key).toBe('flashDeals');
  });

  it('rejects an unknown section key', () => {
    const result = UpdateHomeSectionsSchema.safeParse({
      sections: [{ key: 'notARealSection', enabled: true, sortOrder: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate keys', () => {
    const result = UpdateHomeSectionsSchema.safeParse({
      sections: [
        { key: 'brands', enabled: true, sortOrder: 1 },
        { key: 'brands', enabled: false, sortOrder: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('requires enabled and sortOrder on each section', () => {
    const result = UpdateHomeSectionsSchema.safeParse({
      sections: [{ key: 'brands' }],
    });
    expect(result.success).toBe(false);
  });
});
