// Coupon configuration — EDIT HERE ONLY (percent | fixed, expiry, min spend).
// Applied client-side (friendly UX); every kept value is also recomputed at
// checkout from these rules, and order.discount is what the DB stores.
// TODO (server): when orders move to a real backend with admin CRUD, move
// coupon redemption server-side so codes can be rate-limited and single-use.
import type { Product } from "./types";

export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number; // percent (1-100) or EGP amount
  minSpend: number; // EGP subtotal required before it applies
  expires?: string; // ISO date string; empty = no expiry
}

export const COUPONS: Coupon[] = [
  { code: "JIA10", type: "percent", value: 10, minSpend: 500 },
  { code: "WELCOME25", type: "fixed", value: 25, minSpend: 0 },
  { code: "KHEIR200", type: "fixed", value: 200, minSpend: 1200, expires: "2026-12-31" },
];

export function normalizeCoupon(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Returns {coupon, error} — never throws; error is a translation key suffix. */
export function findCoupon(
  rawCode: string,
  subtotal: number,
): { coupon?: Coupon; error?: "invalid" | "expired" | "min-spend" } {
  const code = normalizeCoupon(rawCode);
  if (!code) return { error: "invalid" };
  const coupon = COUPONS.find((c) => c.code.toUpperCase() === code);
  if (!coupon) return { error: "invalid" };
  if (coupon.expires && new Date(coupon.expires) < new Date(new Date().toDateString()))
    return { error: "expired" };
  if (subtotal < coupon.minSpend) return { error: "min-spend" };
  return { coupon };
}

/** EGP amount off (never below 0; never above subtotal). */
export function couponDiscount(c: Coupon, subtotal: number): number {
  const off = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
  return Math.max(0, Math.min(subtotal, off));
}

/** True when any coupon in the config would apply to this subtotal/marketing hint UI. */
export function bestCouponHint(subtotal: number, products: Product[]): Coupon | undefined {
  void products;
  return COUPONS.filter((c) => subtotal >= c.minSpend)
    .sort((a, b) => couponDiscount(b, subtotal) - couponDiscount(a, subtotal))[0];
}
