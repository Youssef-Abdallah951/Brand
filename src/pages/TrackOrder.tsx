import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { t, STATUS_LABEL } from "../i18n/translations";
import { isSupabaseConfigured, trackOrderViaFunction, type TrackedOrder } from "../lib/supabase";
import { firstProductImage, onImgError } from "../components/product";
import { CalendarIcon, CheckIcon, ImageIcon, PackageIcon, RetryIcon } from "../components/icons";
import type { OrderStatus } from "../lib/types";

const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

// Single generic message for any lookup failure.
const GENERIC_ERROR = (lang: "ar" | "en") => t("trackNotFound", lang);

export default function TrackOrder() {
  const { lang } = useLang();
  const [params] = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get("order") || "");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    setErr("");
    setOrder(null);
    if (!orderNo.trim()) {
      setErr(lang === "ar" ? "برجاء إدخال رقم الطلب" : "Please enter your order number");
      return;
    }
    if (!isSupabaseConfigured) {
      setErr(t("connError", lang));
      return;
    }
    setLoading(true);
    try {
      // Secure lookup: the Edge Function finds the order by its number.
      // No customer phone data is collected or required.
      const found = await trackOrderViaFunction(orderNo);
      setOrder(found);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // Unknown order number → generic message.
      // Transport/edge-function outages → connection message with manual retry.
      if (msg === "not-configured" || /track-failed|failed to fetch|network|timeout|503|502/i.test(msg)) {
        setErr(t("connError", lang));
      } else setErr(GENERIC_ERROR(lang)); // 404 or any failure → same message
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = order ? STEPS.indexOf(order.status === "cancelled" ? "pending" : order.status) : -1;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-[1.7rem] font-bold inline-flex items-center gap-2 text-[#171717] dark:text-white"><PackageIcon className="w-8 h-8 text-[#e84393] dark:text-[#ff8fb8]" /> {t("trackOrder", lang)}</h1>
      <div className="bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#333333] rounded-3xl p-5 mt-5 card-shadow grid gap-3">
        <input
          value={orderNo} onChange={(e) => setOrderNo(e.target.value)} dir="ltr"
          placeholder={lang === "ar" ? "رقم الطلب (مثال: LM-123456)" : "Order number (e.g. LM-123456)"}
          className="w-full rounded-2xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#0A0A0A] text-[#171717] dark:text-white px-4 py-3.5 outline-none focus:border-[#e84393] focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-500/20 transition placeholder:text-gray-400 dark:placeholder:text-neutral-500" />

        {err && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl px-4 py-3">
            <p className="text-red-600 dark:text-red-300 text-sm font-bold">{err}</p>
            <button onClick={lookup} disabled={loading} className="text-sm font-bold text-[#c2185b] dark:text-[#ff8fb8] underline mt-1 inline-flex items-center gap-1"><RetryIcon className="w-3.5 h-3.5" /> {t("retry", lang)}</button>
          </div>
        )}
        <button onClick={lookup} disabled={loading} className="rounded-2xl bg-[#e84393] hover:bg-[#c2185b] text-white font-bold py-3.5 btn-press disabled:opacity-60">
          {loading ? (lang === "ar" ? "جاري البحث…" : "Searching…") : (lang === "ar" ? "بحث" : "Track")}
        </button>
        <p className="text-[11px] text-gray-400 dark:text-[#A3A3A3]">{t("trackHint", lang)}</p>
      </div>

      {order && (
        <div className="bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#333333] rounded-3xl p-5 mt-5 card-shadow animate-fadeUp">
          <div className="flex justify-between items-center gap-2">
            <span className="font-bold text-[#171717] dark:text-white" dir="ltr">#{order.orderNumber}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === "cancelled" ? "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-300" : order.status === "delivered" ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300" : "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200"}`}>
              {STATUS_LABEL[order.status]?.[lang]}
            </span>
          </div>
          <div className="text-xs text-gray-400 dark:text-[#A3A3A3] mt-1 inline-flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-EG")}
          </div>

          {order.status === "cancelled" ? (
            <p className="text-sm text-red-500 dark:text-red-400 font-bold mt-4">{lang === "ar" ? "تم إلغاء هذا الطلب. تواصلي معنا عبر واتساب للمساعدة." : "This order was cancelled. Contact us on WhatsApp for help."}</p>
          ) : (
            <ol className="mt-6 space-y-0">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-8 h-8 grid place-items-center rounded-full font-bold text-sm ${done ? "bg-[#e84393] text-white" : "bg-pink-100 dark:bg-[#1f1f1f] text-gray-400 dark:text-neutral-500"}`}>{done ? <CheckIcon className="w-4 h-4" /> : i + 1}</span>
                      {i < STEPS.length - 1 && <span className={`w-0.5 h-8 ${i < stepIdx ? "bg-[#e84393]" : "bg-pink-100 dark:bg-[#333333]"}`} />}
                    </div>
                    <div className="pb-6">
                      <div className={`font-bold text-sm ${done ? "text-[#c2185b] dark:text-[#ff8fb8]" : "text-gray-400 dark:text-neutral-500"}`}>{STATUS_LABEL[s]?.[lang]}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Customer */}
          <div className="border-t border-dashed border-[#E5E5E5] dark:border-[#333333] pt-3 text-sm grid gap-1.5">
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{lang === "ar" ? "الاسم" : "Name"}</span><span className="font-bold text-[#171717] dark:text-white">{order.firstName} {order.lastName}</span></div>
            {order.whatsapp && <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">WhatsApp</span><span className="font-bold text-[#171717] dark:text-white" dir="ltr">{order.whatsapp}</span></div>}
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("governorate", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{order.governorate}</span></div>
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("area", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{order.area}</span></div>
            {order.city && <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("city", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{order.city}</span></div>}
            <div className="flex justify-between gap-4"><span className="text-[#525252] dark:text-[#A3A3A3] shrink-0">{t("address", lang)}</span><span className="font-bold text-end text-[#171717] dark:text-white">{order.address}</span></div>
            {order.building && <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("building", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{order.building}</span></div>}
            {order.apartment && <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("apartment", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{order.apartment}</span></div>}
            {order.notes && <div className="flex justify-between gap-4"><span className="text-[#525252] dark:text-[#A3A3A3] shrink-0">{t("notes", lang)}</span><span className="font-bold text-end text-[#171717] dark:text-white">{order.notes}</span></div>}
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("deliveryMethod", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{order.deliveryMethod === "express" ? t("express", lang) : t("standard", lang)}</span></div>
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("payment", lang)}</span><span className="font-bold text-[#171717] dark:text-white">{t("cod", lang)}</span></div>
          </div>

          {/* Products */}
          <div className="border-t border-dashed border-[#E5E5E5] dark:border-[#333333] mt-3 pt-3 grid gap-2">
            {order.items.map((i, idx) => {
              const thumb = firstProductImage([i.image]);
              return (
              <div key={`${i.productId}-${idx}`} className="flex gap-2.5 items-center">
                {thumb ? <img src={thumb} onError={onImgError} alt="" className="product-photo w-12 h-14 rounded-xl object-cover shrink-0" /> : <span className="w-12 h-14 rounded-xl bg-pink-100 dark:bg-[#161616] grid place-items-center shrink-0 text-pink-300 dark:text-neutral-600"><ImageIcon className="w-6 h-6" /></span>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold line-clamp-2 text-[#171717] dark:text-white">{lang === "ar" ? i.nameAr : i.nameEn}</div>
                  <div className="text-xs text-gray-400 dark:text-[#A3A3A3]">× {i.qty} • EGP {i.price}</div>
                </div>
                <div className="text-sm font-bold shrink-0 text-[#171717] dark:text-white">EGP {i.price * i.qty}</div>
              </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-[#E5E5E5] dark:border-[#333333] mt-3 pt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("subtotal", lang)}</span><span className="font-bold text-[#171717] dark:text-white">EGP {order.subtotal}</span></div>
            <div className="flex justify-between"><span className="text-[#525252] dark:text-[#A3A3A3]">{t("delivery", lang)}</span><span className="font-bold text-[#171717] dark:text-white">EGP {order.deliveryFee}</span></div>
            <div className="flex justify-between text-lg"><span className="font-bold text-[#171717] dark:text-white">{t("total", lang)}</span><span className="font-bold text-[#c2185b] dark:text-[#ff8fb8]">EGP {order.total}</span></div>
          </div>
        </div>
      )}
    </main>
  );
}
