import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useLang } from "../i18n/LanguageContext";
import { t, STATUS_LABEL } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { SITE_CONFIG } from "../lib/siteConfig";
import { orderWhatsAppLink } from "../lib/whatsapp";
import { AlertIcon, ChatIcon, CheckIcon } from "../components/icons";
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
  const nowIso = useMemo(() => new Date().toISOString(), []);
  // Full snapshot (fresh checkout) → build the real WhatsApp order message
  // sent to the store's admin number. Refresh/back (only ?order= in URL) →
  // WhatsApp CTA degraded to a plain contact link; order number stays visible.
  const fullOrder: Order | null =
    s && Array.isArray(s.items) && s.governorate && s.address && s.deliveryMethod
      ? {
          orderNumber: s.orderNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          whatsapp: "",
          phone: "",
          governorate: s.governorate,
          area: s.area ?? "",
          city: s.city ?? "",
          address: s.address,
          building: s.building ?? "",
          apartment: s.apartment ?? "",
          notes: s.notes ?? "",
          deliveryMethod: s.deliveryMethod,
          paymentMethod: "cod",
          paymentStatus: "pending",
          items: s.items,
          subtotal: s.subtotal ?? s.total,
          deliveryFee: s.deliveryFee ?? 0,
          discount: s.discount ?? 0,
          total: s.total,
          status: "pending",
          createdAt: s.createdAt ?? nowIso,
          timeline: [],
        }
      : null;

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
        <div className="inline-block mt-5 bg-white dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-2xl px-7 py-3.5 soft-shadow">
          <span className="text-[11px] text-mute dark:text-[#a89f92] block">{t("orderNumber", lang)}</span>
          <span className="font-display font-bold text-xl text-bronze-deep dark:text-bronze" dir="ltr">#{orderNumber}</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-full px-4 py-2 mt-4 font-bold inline-flex items-center gap-1.5">
          <AlertIcon className="w-4 h-4 shrink-0" /> {t("saveOrderNo", lang)}
        </p>
      </div>

      {s && (
        <div className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-5 mt-8 grid gap-3 text-sm soft-shadow">
          <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{lang === "ar" ? "الاسم" : "Name"}</span><span className="font-bold text-ink dark:text-[#f3ede3]">{s.firstName} {s.lastName}</span></div>
          <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("payment", lang)}</span><span className="font-bold text-ink dark:text-[#f3ede3]">{t("cod", lang)}</span></div>
          <div className="flex justify-between">
            <span className="text-mute dark:text-[#a89f92]">{lang === "ar" ? "الحالة" : "Status"}</span>
            <span className="bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3] font-bold px-3 py-0.5 rounded-full text-xs">{STATUS_LABEL.pending?.[lang]}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-dashed border-line dark:border-[#2e2822] pt-3">
            <span className="text-ink dark:text-[#f3ede3]">{t("total", lang)}</span>
            <span className="text-bronze-deep dark:text-bronze font-extrabold" dir="auto">{fmtPrice(s.total, lang)}</span>
          </div>
        </div>
      )}

      <div className="grid gap-2.5 mt-7">
        {fullOrder && (
          <a
            href={orderWhatsAppLink(fullOrder)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-[#23b26b] text-white font-bold min-h-[50px] leading-[3rem] text-center btn-press inline-flex items-center justify-center gap-2"
          >
            <ChatIcon className="w-5 h-5" /> {t("sendWhatsApp", lang)}
          </a>
        )}
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
