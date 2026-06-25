export interface LocalizedString {
  en: string;
  ar: string;
}

export interface BannerData {
  title: LocalizedString;
  description: LocalizedString;
  imageUrl: string;
  imagePublicId: string;
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface UpdateBannerInput {
  title?: LocalizedString;
  description?: LocalizedString;
  imageUrl?: string;
  imagePublicId?: string;
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface ReorderBannerInput {
  bannerIds: string[];
}
