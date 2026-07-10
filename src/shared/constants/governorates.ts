/**
 * The 27 Egyptian governorates. Codes are ISO 3166-2:EG.
 *
 * Shipping zones group these codes; a customer address carries one of them,
 * and zone matching compares the two. Keep this list in sync with the
 * governorate pickers in hagatna-admin and hagatna-customer.
 */
export const EG_GOVERNORATES = [
  { code: 'C',   en: 'Cairo',            ar: 'القاهرة' },
  { code: 'GZ',  en: 'Giza',             ar: 'الجيزة' },
  { code: 'ALX', en: 'Alexandria',       ar: 'الإسكندرية' },
  { code: 'DK',  en: 'Dakahlia',         ar: 'الدقهلية' },
  { code: 'BA',  en: 'Red Sea',          ar: 'البحر الأحمر' },
  { code: 'BH',  en: 'Beheira',          ar: 'البحيرة' },
  { code: 'FYM', en: 'Faiyum',           ar: 'الفيوم' },
  { code: 'GH',  en: 'Gharbia',          ar: 'الغربية' },
  { code: 'IS',  en: 'Ismailia',         ar: 'الإسماعيلية' },
  { code: 'MNF', en: 'Monufia',          ar: 'المنوفية' },
  { code: 'MN',  en: 'Minya',            ar: 'المنيا' },
  { code: 'KB',  en: 'Qalyubia',         ar: 'القليوبية' },
  { code: 'WAD', en: 'New Valley',       ar: 'الوادي الجديد' },
  { code: 'SUZ', en: 'Suez',             ar: 'السويس' },
  { code: 'ASN', en: 'Aswan',            ar: 'أسوان' },
  { code: 'AST', en: 'Asyut',            ar: 'أسيوط' },
  { code: 'BNS', en: 'Beni Suef',        ar: 'بني سويف' },
  { code: 'PTS', en: 'Port Said',        ar: 'بورسعيد' },
  { code: 'DT',  en: 'Damietta',         ar: 'دمياط' },
  { code: 'SHR', en: 'Sharqia',          ar: 'الشرقية' },
  { code: 'SIN', en: 'South Sinai',      ar: 'جنوب سيناء' },
  { code: 'KFS', en: 'Kafr El Sheikh',   ar: 'كفر الشيخ' },
  { code: 'MT',  en: 'Matrouh',          ar: 'مطروح' },
  { code: 'LX',  en: 'Luxor',            ar: 'الأقصر' },
  { code: 'QNA', en: 'Qena',             ar: 'قنا' },
  { code: 'SHG', en: 'Sohag',            ar: 'سوهاج' },
  { code: 'SIN_N', en: 'North Sinai',    ar: 'شمال سيناء' },
] as const;

export type GovernorateCode = (typeof EG_GOVERNORATES)[number]['code'];

const CODES = new Set<string>(EG_GOVERNORATES.map((g) => g.code));

export const isGovernorateCode = (v: unknown): v is GovernorateCode =>
  typeof v === 'string' && CODES.has(v);

export const GOVERNORATE_CODES = EG_GOVERNORATES.map((g) => g.code);
