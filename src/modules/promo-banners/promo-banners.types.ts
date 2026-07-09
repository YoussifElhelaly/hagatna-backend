import { LocalizedString } from '@shared/types';

export interface CreatePromoBannerInput {
  title: LocalizedString;
  subtitle?: LocalizedString;
  ctaText?: LocalizedString;
  linkUrl?: string | null;
  gradient?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface UpdatePromoBannerInput {
  title?: LocalizedString;
  subtitle?: LocalizedString;
  ctaText?: LocalizedString;
  linkUrl?: string | null;
  gradient?: string | null;
  order?: number;
  isActive?: boolean;
}
