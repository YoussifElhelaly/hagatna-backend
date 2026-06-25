import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  role: Role;
  isVerified: boolean;
}

export interface LocalizedString {
  en: string;
  ar: string;
  [key: string]: string;
}

export type Locale = 'en' | 'ar';

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
