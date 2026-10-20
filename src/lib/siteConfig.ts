// Centralized site / admin configuration.
// The admin number is edited in ../config.ts (WHATSAPP_NUMBER) — this file
// imports it so there is exactly one place to change.
import { WHATSAPP_NUMBER } from "./config";

export const SITE_CONFIG = {
  brand: {
    nameEn: "JiA",
    nameAr: "JiA",
    taglineEn: "Silk & Essentials",
    taglineAr: "Silk & Essentials",
  },
  admin: {
    // Local format
    phoneLocal: "01018340567",
    // International digits without + (single source: WHATSAPP_NUMBER in config.ts)
    phoneIntl: WHATSAPP_NUMBER,
    get whatsappLink(): string {
      return `https://wa.me/${SITE_CONFIG.admin.phoneIntl}`;
    },
    get telLink(): string {
      return `tel:+${SITE_CONFIG.admin.phoneIntl}`;
    },
    // Default chat message
    defaultChatMessageEn: "Hello JiA! I need help with my order.",
    defaultChatMessageAr: "أهلاً JiA! محتاجة مساعدة في الطلب بتاعي.",
    // Admin-only display affordance: products at/below this stock get a
    // low-stock badge in the dashboard.
    lowStock: 5,
  },
  delivery: {
    standardFee: 60,
    expressFee: 120,
    // Free standard shipping from 8 hijab pieces (order accommodates the
    // single-piece price point; gift boxes reach it even sooner).
    freeThreshold: 800,
    currency: "EGP",
  },
  // NOTE: COD ONLY store — no online payment configuration exists.
} as const;

export function whatsappLinkWithMessage(message: string): string {
  return `${SITE_CONFIG.admin.whatsappLink}?text=${encodeURIComponent(message)}`;
}

export function generalWhatsAppLink(lang: "ar" | "en"): string {
  const msg =
    lang === "ar"
      ? SITE_CONFIG.admin.defaultChatMessageAr
      : SITE_CONFIG.admin.defaultChatMessageEn;
  return whatsappLinkWithMessage(msg);
}
