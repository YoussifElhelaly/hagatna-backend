import { Request, Response, NextFunction } from 'express';
import { parse } from 'accept-language-parser';
import { Locale } from '@shared/types';

const SUPPORTED_LOCALES: Locale[] = ['en', 'ar'];
const DEFAULT_LOCALE: Locale = 'en';

/**
 * Reads the Accept-Language header and sets req.locale.
 * Falls back to 'en' if the requested locale is not supported.
 *
 * Frontend usage:
 *   fetch('/api/v1/products', { headers: { 'Accept-Language': 'ar' } })
 */
export const localeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers['accept-language'];

  if (!header) {
    req.locale = DEFAULT_LOCALE;
    return next();
  }

  const parsed = parse(header);
  const matched = parsed.find((lang) =>
    SUPPORTED_LOCALES.includes(lang.code as Locale)
  );

  req.locale = (matched?.code as Locale) ?? DEFAULT_LOCALE;
  next();
};

/**
 * Picks the localized value from a JSON field.
 * Falls back to English if the requested locale is missing.
 *
 * @example
 * const name = pick(product.name, req.locale); // { en: 'Phone', ar: 'هاتف' } → 'هاتف'
 */
export const pick = (field: unknown, locale: Locale): string => {
  if (!field || typeof field !== 'object') return '';
  const obj = field as Record<string, string>;
  return obj[locale] ?? obj['en'] ?? '';
};
