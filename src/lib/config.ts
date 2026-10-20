// Hijab price/stock defaults — SET HERE ONLY; the seed catalog (data.ts)
// consumes them so one change propagates everywhere consistently.
export const DEFAULT_HIJAB_PRICE = 100; // EGP per hijab piece
export const DEFAULT_HIJAB_STOCK = 30; // units in stock per hijab colorway

// Store WhatsApp number — SET HERE ONLY. International digits WITHOUT "+"
// (Egypt country code 20 + local number). siteConfig.ts imports it for the
// floating button / contact links, and src/lib/orders.ts uses it for the
// order-confirmation WhatsApp message.
export const WHATSAPP_NUMBER = "201018340567";
