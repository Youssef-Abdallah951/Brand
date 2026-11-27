import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useLang } from "../i18n/LanguageContext";
import { t, STATUS_LABEL } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { SITE_CONFIG } from "../lib/siteConfig";
import { getLocalOrder } from "../lib/orders";
import { ChatIcon, CheckIcon } from "../components/icons";
import type { Order } from "../lib/types";

type SuccessState = Partial<Order> & {
  orderNumber: string;
  firstName: string;
  lastName: string;
  total: number;
};

export default function OrderSuccess() {
  const { lang } = useLang();
  const { state } = useLocation();
  const [params] = useSearchParams();
  // Supabase is the source of truth; this page only displays what checkout
  // just created (passed via router state). A refresh keeps the order number
  // via the ?order= param; full item details are transient by design.
  const s = (state as SuccessState | null) ?? null;
  const orderNumber = s?.orderNumber ?? params.get("order") ?? "";
  // Local orders (no-Supabase mode) live in localStorage — a refresh or a
  // reopened ?order= link restores the full summary from there.
  const restored = useMemo(
    () => (orderNumber && !s ? getLocalOrder(orderNumber) : null),
    [orderNumber, s],
  );
  const snap = s ?? (restored as SuccessState | null);

  // Full snapshot (fresh checkout or a stored local order) → real WhatsApp
  // order message sent to the store's admin number. Degraded view (only
  // ?order= in server mode after a refresh) → generic WhatsApp contact link.
  // keep snap for display; no external handoff needed
  if (!orderNumber) {
    return (
      <main className="shell max-w-xl mx-auto py-20 text-center">
        <h1 className="font-display text-xl font-bold text-ink dark:text-[#f3ede3]">{t("orderMissingNo", lang)}</h1>
        <Link to="/shop" className="inline-block mt-5 bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold text-sm px-8 py-3.5 rounded-full transition btn-press">{t("continueShopping", lang)}</Link>
      </main>
    );
  }

  return (
    <main className="shell max-w-2xl mx-auto py-10">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-sand dark:bg-[#201a15] grid place-items-center text-bronze-deep dark:text-bronze soft-shadow"><CheckIcon className="w-9 h-9" /></div>
        <h1 className="font-display t-h2 font-bold mt-5 text-ink dark:text-[#f3ede3]">{t("orderSuccess", lang)}</h1>
        <p className="text-mute dark:text-[#a89f92] mt-2">{t("orderThanks", lang)}</p>
        <p className="text-xs text-mute dark:text-[#a89f92] mt-1">{t("orderConfirmedMsg", lang)}</p>
      </div>

      {snap && (
        <div className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-5 mt-8 grid gap-3 text-sm soft-shadow">
          <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{lang === "ar" ? "الاسم" : "Name"}</span><span className="font-bold text-ink dark:text-[#f3ede3]">{snap.firstName} {snap.lastName}</span></div>
          <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("payment", lang)}</span><span className="font-bold text-ink dark:text-[#f3ede3]">{snap.paymentMethod === "instapay" ? t("instapay", lang) : snap.paymentMethod === "vodafone_cash" ? t("vodafoneCash", lang) : t("cod", lang)}</span></div>
          <div className="flex justify-between">
            <span className="text-mute dark:text-[#a89f92]">{lang === "ar" ? "الحالة" : "Status"}</span>
            <span className="bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3] font-bold px-3 py-0.5 rounded-full text-xs">{snap.paymentStatus === "pending_verification" ? t("pendingVerification", lang) : (STATUS_LABEL[snap.paymentStatus ?? "pending"]?.[lang] ?? snap.paymentStatus)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-dashed border-line dark:border-[#2e2822] pt-3">
            <span className="text-ink dark:text-[#f3ede3]">{t("total", lang)}</span>
            <span className="text-bronze-deep dark:text-bronze font-extrabold" dir="auto">{fmtPrice(snap.total, lang)}</span>
          </div>
        </div>
      )}

      <div className="grid gap-2.5 mt-7">
        <a
          href={SITE_CONFIG.admin.whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-[#23b26b]/95 border border-[#23b26b] text-white font-bold min-h-[50px] leading-[3rem] text-center btn-press inline-flex items-center justify-center gap-2"
        >
          <ChatIcon className="w-5 h-5" /> {t("helpWhatsApp", lang)}
        </a>
        <Link to="/shop" className="rounded-2xl border border-ink dark:border-[#f3ede3] text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] font-bold min-h-[50px] leading-[3rem] text-center btn-press transition">{t("continueShopping", lang)}</Link>
        <div className="text-center text-sm text-mute dark:text-[#a89f92] mt-2">
          {lang === "ar" ? "تحتاجي مساعدة؟" : "Need help?"} <a className="font-bold text-bronze-deep dark:text-bronze underline-offset-4 hover:underline" href={SITE_CONFIG.admin.telLink} dir="ltr">{SITE_CONFIG.admin.phoneLocal}</a>
        </div>
      </div>
    </main>
  );
}
