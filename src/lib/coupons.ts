// Coupon configuration — EDIT HERE ONLY (percent | fixed, expiry, min spend).
// Customer-facing coupon redemption is disabled (no form in cart/checkout);
// this list exists for the admin dashboard catalog of promo codes. Any stored
// order keeps its own discount field in the DB.
export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number; // percent (1-100) or EGP amount
  minSpend: number; // EGP subtotal required before it applies
  expires?: string; // ISO date string; empty = no expiry
}

export const COUPONS: Coupon[] = [
  { code: "JIA10", type: "percent", value: 10, minSpend: 300 },
  { code: "WELCOME25", type: "fixed", value: 25, minSpend: 0 },
  { code: "KHEIR200", type: "fixed", value: 200, minSpend: 600, expires: "2026-12-31" },
];
