// Canonical home section keys — the storefront renders by these exact keys.
// Any key outside this list is rejected on write.
export const HOME_SECTION_KEYS = [
  'bannerCarousel',
  'sectorCards',
  'flashDeals',
  'categories',
  'newArrivals',
  'promoBanners',
  'productColumns',
  'dealOfDay',
  'newsletter',
  'brands',
  'trustBar',
] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];
