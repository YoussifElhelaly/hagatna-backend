export interface LocalizedString {
  en: string;
  ar: string;
}

export interface LegalPageData {
  type: 'terms' | 'privacy';
  audience: 'vendor' | 'customer';
  title: LocalizedString;
  content: LocalizedString;
  slug: string;
  isActive?: boolean;
}

export interface UpdateLegalPageInput {
  title?: LocalizedString;
  content?: LocalizedString;
  slug?: string;
  isActive?: boolean;
}

export interface LegalPageResponse {
  id: string;
  type: string;
  audience: string;
  title: LocalizedString;
  content: LocalizedString;
  slug: string;
  isActive: boolean;
  updatedAt: Date;
}
