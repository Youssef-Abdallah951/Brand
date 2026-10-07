import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useLang } from "../i18n/LanguageContext";
import { t, STATUS_LABEL } from "../i18n/translations";
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
  // just created (passed via router state). A refresh loses state by design —
  // the customer then uses Track Order with the order number.
  const s = (state as SuccessState | null) ?? null;
  const orderNumber = s?.orderNumber ?? params.get("order") ?? "";
  const nowIso = useMemo(() => new Date().toISOString(), []);
  // Full snapshot (fresh checkout) → build the real WhatsApp order message
  // sent to the store's admin number. Refresh/back (only ?order= in URL) →
  // WhatsApp CTA hidden by design; tracking by order number is the source
  // of truth.
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
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-bold text-xl">{t("trackNotFound", lang)}</h1>
        <Link to="/shop" className="inline-block mt-5 bg-[#e84393] text-white font-bold px-8 py-3 rounded-2xl">{t("continueShopping", lang)}</Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 grid place-items-center text-green-600"><CheckIcon className="w-10 h-10" /></div>
        <h1 className="font-display text-3xl font-bold mt-4">{t("orderSuccess", lang)}</h1>
        <p className="text-gray-500 mt-2">{t("orderThanks", lang)}</p>
        <div className="inline-block mt-4 bg-pink-50 border border-pink-200 rounded-2xl px-6 py-3">
          <span className="text-xs text-gray-500 block">{t("orderNumber", lang)}</span>
          <span className="font-bold text-xl text-[#c2185b]" dir="ltr">#{orderNumber}</span>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 mt-3 font-bold inline-flex items-center gap-1.5">
          <AlertIcon className="w-4 h-4 shrink-0" /> {t("saveOrderNo", lang)}
        </p>
      </div>

      {s && (
        <div className="bg-white border border-pink-100 rounded-3xl p-5 mt-6 card-shadow grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">{lang === "ar" ? "الاسم" : "Name"}</span><span className="font-bold">{s.firstName} {s.lastName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t("payment", lang)}</span><span className="font-bold">{t("cod", lang)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{lang === "ar" ? "الحالة" : "Status"}</span><span className="bg-amber-100 text-amber-700 font-bold px-3 py-0.5 rounded-full text-xs">{STATUS_LABEL.pending?.[lang]}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-dashed border-pink-200 pt-3"><span>{t("total", lang)}</span><span className="text-[#c2185b]">EGP {s.total}</span></div>
        </div>
      )}

      <div className="grid gap-2.5 mt-6">
        {fullOrder && (
          <a
            href={orderWhatsAppLink(fullOrder)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-[#25D366] text-white font-bold py-3.5 text-center btn-press inline-flex items-center justify-center gap-2"
          >
            <ChatIcon className="w-5 h-5" /> {t("sendWhatsApp", lang)}
          </a>
        )}
        <div className="grid gap-2.5">
          <Link to="/shop" className="rounded-2xl border-2 border-pink-200 text-[#c2185b] font-bold py-3.5 text-center btn-press">{t("continueShopping", lang)}</Link>
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          {lang === "ar" ? "تحتاجي مساعدة؟" : "Need help?"} <a className="font-bold text-[#c2185b]" href={SITE_CONFIG.admin.telLink} dir="ltr">{SITE_CONFIG.admin.phoneLocal}</a>
        </div>
      </div>
    </main>
  );
}
