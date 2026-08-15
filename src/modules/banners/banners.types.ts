export interface LocalizedString {
  en: string;
  ar: string;
}

export type BannerButtonStyle = 'primary' | 'outline';
export type BannerTextAlign = 'right' | 'center' | 'left';

export interface BannerData {
  title: LocalizedString;
  description: LocalizedString;
  imageUrl: string;
  imagePublicId: string;
  linkUrl?: string;
  showButton?: boolean;
  buttonText?: LocalizedString;
  buttonStyle?: BannerButtonStyle;
  textAlign?: BannerTextAlign;
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
  showButton?: boolean;
  buttonText?: LocalizedString;
  buttonStyle?: BannerButtonStyle;
  textAlign?: BannerTextAlign;
  order?: number;
  isActive?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface ReorderBannerInput {
  bannerIds: string[];
}
