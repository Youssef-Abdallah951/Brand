import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { t, STATUS_LABEL } from "../i18n/translations";
import { isSupabaseConfigured, trackOrderViaFunction, type TrackedOrder } from "../lib/supabase";
import { firstProductImage, onImgError } from "../components/product";
import { isValidEgyptianPhone } from "../lib/egypt";
import type { OrderStatus } from "../lib/types";

const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

// Single generic message — never reveal which field was wrong.
const GENERIC_ERROR = (lang: "ar" | "en") => t("trackNotFound", lang);

export default function TrackOrder() {
  const { lang } = useLang();
  const [params] = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get("order") || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    setErr("");
    setOrder(null);
    if (!orderNo.trim() || !whatsapp.trim()) {
      setErr(lang === "ar" ? "برجاء إدخال رقم الطلب ورقم الواتساب" : "Please enter order number and WhatsApp");
      return;
    }
    if (!isValidEgyptianPhone(whatsapp)) {
      // Invalid format can never match — return the same generic message.
      setErr(GENERIC_ERROR(lang));
      return;
    }
    if (!isSupabaseConfigured) {
      setErr(t("connError", lang));
      return;
    }
    setLoading(true);
    try {
      // Secure lookup: Edge Function verifies order_number + whatsapp match.
      // The browser never queries the orders table directly.
      const found = await trackOrderViaFunction(orderNo, whatsapp);
      setOrder(found);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // 404/wrong-input → generic message (never reveal which field was wrong).
      // Transport/edge-function outages → connection message with manual retry.
      if (msg === "not-configured" || /track-failed|failed to fetch|network|timeout|503|502/i.test(msg)) {
        setErr(t("connError", lang));
      } else setErr(GENERIC_ERROR(lang)); // 404, wrong number, or any failure → same message
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = order ? STEPS.indexOf(order.status === "cancelled" ? "pending" : order.status) : -1;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold">📦 {t("trackOrder", lang)}</h1>
      <div className="bg-white border border-pink-100 rounded-3xl p-5 mt-5 card-shadow grid gap-3">
        <input
          value={orderNo} onChange={(e) => setOrderNo(e.target.value)} dir="ltr"
          placeholder={lang === "ar" ? "رقم الطلب (مثال: LM-123456)" : "Order number (e.g. LM-123456)"}
          className="w-full rounded-2xl border border-pink-200 px-4 py-3.5 outline-none focus:border-[#e84393] focus:ring-2 focus:ring-pink-100 transition" />
        <input
          value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} dir="ltr" inputMode="tel"
          placeholder="WhatsApp: 01xxxxxxxxx"
          className="w-full rounded-2xl border border-pink-200 px-4 py-3.5 outline-none focus:border-[#e84393] focus:ring-2 focus:ring-pink-100 transition" />

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm font-bold">{err}</p>
            <button onClick={lookup} disabled={loading} className="text-sm font-bold text-[#c2185b] underline mt-1">🔁 {t("retry", lang)}</button>
          </div>
        )}
        <button onClick={lookup} disabled={loading} className="rounded-2xl bg-[#e84393] text-white font-bold py-3.5 btn-press disabled:opacity-60">
          {loading ? (lang === "ar" ? "جاري البحث…" : "Searching…") : (lang === "ar" ? "بحث" : "Track")}
        </button>
        <p className="text-[11px] text-gray-400">{t("trackHint", lang)}</p>
      </div>

      {order && (
        <div className="bg-white border border-pink-100 rounded-3xl p-5 mt-5 card-shadow animate-fadeUp">
          <div className="flex justify-between items-center gap-2">
            <span className="font-bold" dir="ltr">#{order.orderNumber}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === "cancelled" ? "bg-red-100 text-red-600" : order.status === "delivered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {STATUS_LABEL[order.status]?.[lang]}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            📅 {new Date(order.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-EG")}
          </div>

          {order.status === "cancelled" ? (
            <p className="text-sm text-red-500 font-bold mt-4">{lang === "ar" ? "تم إلغاء هذا الطلب. تواصلي معنا عبر واتساب للمساعدة." : "This order was cancelled. Contact us on WhatsApp for help."}</p>
          ) : (
            <ol className="mt-6 space-y-0">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-8 h-8 grid place-items-center rounded-full font-bold text-sm ${done ? "bg-[#e84393] text-white" : "bg-pink-100 text-gray-400"}`}>{done ? "✓" : i + 1}</span>
                      {i < STEPS.length - 1 && <span className={`w-0.5 h-8 ${i < stepIdx ? "bg-[#e84393]" : "bg-pink-100"}`} />}
                    </div>
                    <div className="pb-6">
                      <div className={`font-bold text-sm ${done ? "text-[#c2185b]" : "text-gray-400"}`}>{STATUS_LABEL[s]?.[lang]}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Customer */}
          <div className="border-t border-dashed border-pink-200 pt-3 text-sm grid gap-1.5">
            <div className="flex justify-between"><span className="text-gray-500">{lang === "ar" ? "الاسم" : "Name"}</span><span className="font-bold">{order.firstName} {order.lastName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">WhatsApp</span><span className="font-bold" dir="ltr">{order.whatsapp}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t("governorate", lang)}</span><span className="font-bold">{order.governorate}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t("area", lang)}</span><span className="font-bold">{order.area}</span></div>
            {order.city && <div className="flex justify-between"><span className="text-gray-500">{t("city", lang)}</span><span className="font-bold">{order.city}</span></div>}
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">{t("address", lang)}</span><span className="font-bold text-end">{order.address}</span></div>
            {order.building && <div className="flex justify-between"><span className="text-gray-500">{t("building", lang)}</span><span className="font-bold">{order.building}</span></div>}
            {order.apartment && <div className="flex justify-between"><span className="text-gray-500">{t("apartment", lang)}</span><span className="font-bold">{order.apartment}</span></div>}
            {order.notes && <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">{t("notes", lang)}</span><span className="font-bold text-end">{order.notes}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">{t("deliveryMethod", lang)}</span><span className="font-bold">{order.deliveryMethod === "express" ? t("express", lang) : t("standard", lang)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t("payment", lang)}</span><span className="font-bold">{t("cod", lang)}</span></div>
          </div>

          {/* Products */}
          <div className="border-t border-dashed border-pink-200 mt-3 pt-3 grid gap-2">
            {order.items.map((i, idx) => {
              const thumb = firstProductImage([i.image]);
              return (
              <div key={`${i.productId}-${idx}`} className="flex gap-2.5 items-center">
                {thumb ? <img src={thumb} onError={onImgError} alt="" className="w-12 h-14 rounded-xl object-cover shrink-0" /> : <span className="w-12 h-14 rounded-xl bg-pink-100 grid place-items-center shrink-0">💄</span>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold line-clamp-2">{lang === "ar" ? i.nameAr : i.nameEn}</div>
                  <div className="text-xs text-gray-400">× {i.qty} • EGP {i.price}</div>
                </div>
                <div className="text-sm font-bold shrink-0">EGP {i.price * i.qty}</div>
              </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-pink-200 mt-3 pt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{t("subtotal", lang)}</span><span className="font-bold">EGP {order.subtotal}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t("delivery", lang)}</span><span className="font-bold">EGP {order.deliveryFee}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">{t("discount", lang)}</span><span className="font-bold">EGP {order.discount}</span></div>}
            <div className="flex justify-between text-lg"><span className="font-bold">{t("total", lang)}</span><span className="font-bold text-[#c2185b]">EGP {order.total}</span></div>
          </div>
        </div>
      )}
    </main>
  );
}
