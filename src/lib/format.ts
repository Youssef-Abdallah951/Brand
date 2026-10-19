import type { Lang } from "./types";

/**
 * Currency display — EGP (ج.م) in Arabic, EGP in English.
 * Numbers use western (Latin) digits in both languages, matching
 * Egyptian e-commerce conventions; grouped with thousands separators.
 */
export function fmtPrice(n: number, lang: Lang): string {
  const v = Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0";
  return lang === "ar" ? `${v} ج.م` : `EGP ${v}`;
}
