// Egyptian governorates (bilingual)
export const GOVERNORATES: { en: string; ar: string }[] = [
  { en: "Cairo", ar: "القاهرة" },
  { en: "Giza", ar: "الجيزة" },
  { en: "Alexandria", ar: "الإسكندرية" },
  { en: "Dakahlia", ar: "الدقهلية" },
  { en: "Red Sea", ar: "البحر الأحمر" },
  { en: "Beheira", ar: "البحيرة" },
  { en: "Fayoum", ar: "الفيوم" },
  { en: "Gharbia", ar: "الغربية" },
  { en: "Ismailia", ar: "الإسماعيلية" },
  { en: "Menofia", ar: "المنوفية" },
  { en: "Minya", ar: "المنيا" },
  { en: "Qalyubia", ar: "القليوبية" },
  { en: "New Valley", ar: "الوادي الجديد" },
  { en: "Suez", ar: "السويس" },
  { en: "Aswan", ar: "أسوان" },
  { en: "Assiut", ar: "أسيوط" },
  { en: "Beni Suef", ar: "بني سويف" },
  { en: "Port Said", ar: "بورسعيد" },
  { en: "Damietta", ar: "دمياط" },
  { en: "Sharkia", ar: "الشرقية" },
  { en: "South Sinai", ar: "جنوب سيناء" },
  { en: "Kafr El Sheikh", ar: "كفر الشيخ" },
  { en: "Matrouh", ar: "مطروح" },
  { en: "Luxor", ar: "الأقصر" },
  { en: "Qena", ar: "قنا" },
  { en: "North Sinai", ar: "شمال سيناء" },
  { en: "Sohag", ar: "سوهاج" },
];

/**
 * Normalize an Egyptian WhatsApp/mobile number to canonical form: 201XXXXXXXXXX.
 * These are all treated as the same number:
 *   01018340567, +201018340567, 201018340567, "+20 101 834 0567", "0101-834-0567"
 * Strips: +, spaces, dashes, dots, parentheses, asterisks.
 */
export function normalizeWhatsApp(input: string): string {
  let p = (input || "").trim();
  // Remove +, spaces, dashes, dots, parens, asterisks, slashes
  p = p.replace(/[+\s\-().*/]/g, "");
  // 0020XXXXXXXXXX -> 20XXXXXXXXXX
  if (p.startsWith("0020")) p = p.slice(2);
  // 01XXXXXXXXX (11 digits) -> 201XXXXXXXXX
  if (/^01[0125]\d{8}$/.test(p)) p = `2${p}`;
  // 1XXXXXXXXX (10 digits, missing leading 0) -> 201XXXXXXXXX
  if (/^1[0125]\d{8}$/.test(p)) p = `20${p}`;
  return p;
}

/** Canonical form is 12 digits: 201[0,1,2,5] + 8 digits. */
export function isNormalizedWhatsApp(p: string): boolean {
  return /^201[0125]\d{8}$/.test(p);
}

/** Legacy helper: strip spaces/dashes only (kept for compatibility). */
export function normalizeEgPhone(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function isValidEgyptianPhone(input: string): boolean {
  return isNormalizedWhatsApp(normalizeWhatsApp(input));
}

/**
 * Normalize an order number: trim whitespace, remove inner spaces,
 * compare case-insensitively (stored/compared UPPERCASE).
 * "lm-123456" and "  LM-123456 " are the same.
 */
export function normalizeOrderNumber(input: string): string {
  return (input || "").trim().replace(/\s+/g, "").toUpperCase();
}
