// Centralized site / admin configuration.
// Change the admin number HERE ONLY — everything else imports from this file.
export const SITE_CONFIG = {
  brand: {
    nameEn: "LUMIÈRE Beauty",
    nameAr: "لوميير بيوتي",
    taglineEn: "Premium Egyptian Cosmetics",
    taglineAr: "مستحضرات تجميل مصرية فاخرة",
  },
  admin: {
    // Local format
    phoneLocal: "01018340567",
    // International digits without +
    phoneIntl: "201018340567",
    get whatsappLink(): string {
      return `https://wa.me/${SITE_CONFIG.admin.phoneIntl}`;
    },
    get telLink(): string {
      return `tel:+${SITE_CONFIG.admin.phoneIntl}`;
    },
    // Default chat message
    defaultChatMessageEn: "Hello LUMIÈRE Beauty! I need help with my order.",
    defaultChatMessageAr: "أهلاً لوميير بيوتي! محتاجة مساعدة في الطلب بتاعي.",
  },
  delivery: {
    standardFee: 60,
    expressFee: 120,
    freeThreshold: 1500,
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
