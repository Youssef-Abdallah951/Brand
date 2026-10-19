import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { t, STATUS_LABEL } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { isSupabaseConfigured, trackOrderViaFunction, type TrackedOrder } from "../lib/supabase";
import { firstProductImage, onImgError } from "../components/product";
import { usePageMeta } from "../lib/meta";
import { CalendarIcon, CheckIcon, ImageIcon, PackageIcon, RetryIcon } from "../components/icons";
import type { OrderStatus } from "../lib/types";

const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

// Single generic message for any lookup failure.
const GENERIC_ERROR = (lang: "ar" | "en") => t("trackNotFound", lang);

export default function TrackOrder() {
  const { lang } = useLang();
  usePageMeta(`${t("trackOrder", lang)} | JiA`, t("heroSub", lang));
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
    <main className="shell max-w-2xl mx-auto py-9">
      <h1 className="font-display t-h2 font-bold inline-flex items-center gap-2.5 text-ink dark:text-[#f3ede3]">
        <PackageIcon className="w-8 h-8 text-bronze" /> {t("trackOrder", lang)}
      </h1>

      <div className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-5 mt-5 soft-shadow grid gap-3">
        <input
          value={orderNo} onChange={(e) => setOrderNo(e.target.value)} dir="ltr"
          placeholder={lang === "ar" ? "رقم الطلب (مثال: JI-123456)" : "Order number (e.g. JI-123456)"}
          className="w-full rounded-full border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-5 py-3.5 text-sm outline-none focus:border-bronze transition placeholder:text-mute/60" />

        {err && (
          <div className="bg-clay/10 border border-clay/30 rounded-2xl px-4 py-3" role="alert">
            <p className="text-clay text-sm font-bold">{err}</p>
            <button onClick={lookup} disabled={loading} className="text-sm font-bold text-clay underline mt-1 inline-flex items-center gap-1 underline-offset-4">
              <RetryIcon className="w-3.5 h-3.5" /> {t("retry", lang)}
            </button>
          </div>
        )}
        <button onClick={lookup} disabled={loading} className="min-h-[50px] rounded-full bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold btn-press disabled:opacity-60 transition">
          {loading ? (lang === "ar" ? "جاري البحث…" : "Searching…") : (lang === "ar" ? "بحث" : "Track")}
        </button>
        <p className="text-[11px] text-mute dark:text-[#a89f92]">{t("trackHint", lang)}</p>
      </div>

      {order && (
        <div className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-5 mt-5 soft-shadow animate-fadeUp">
          <div className="flex justify-between items-center gap-2">
            <span className="font-display font-bold text-lg text-ink dark:text-[#f3ede3]" dir="ltr">#{order.orderNumber}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === "cancelled" ? "bg-clay/15 text-clay" : order.status === "delivered" ? "bg-bronze/15 text-bronze-deep dark:text-bronze" : "bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3]"}`}>
              {STATUS_LABEL[order.status]?.[lang]}
            </span>
          </div>
          <div className="text-xs text-mute dark:text-[#a89f92] mt-1 inline-flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-EG")}
          </div>

          {order.status === "cancelled" ? (
            <p className="text-sm text-clay font-bold mt-4">{lang === "ar" ? "تم إلغاء هذا الطلب. تواصلي معنا عبر واتساب للمساعدة." : "This order was cancelled. Contact us on WhatsApp for help."}</p>
          ) : (
            <ol className="mt-6">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-8 h-8 grid place-items-center rounded-full font-bold text-sm ${done ? "bg-bronze text-white" : "bg-white dark:bg-[#201a15] text-mute dark:text-[#a89f92] border border-line dark:border-[#2e2822]"}`} aria-hidden="true">{done ? <CheckIcon className="w-4 h-4" /> : i + 1}</span>
                      {i < STEPS.length - 1 && <span className={`w-0.5 h-8 ${i < stepIdx ? "bg-bronze" : "bg-line dark:bg-[#2e2822]"}`} />}
                    </div>
                    <div className="pb-6">
                      <div className={`font-bold text-sm ${done ? "text-bronze-deep dark:text-bronze" : "text-mute dark:text-[#a89f92]"}`}>{STATUS_LABEL[s]?.[lang]}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Customer */}
          <div className="border-t border-dashed border-line dark:border-[#2e2822] pt-3 text-sm grid gap-1.5">
            {([
              [lang === "ar" ? "الاسم" : "Name", `${order.firstName} ${order.lastName}`],
              ...(order.whatsapp ? [["WhatsApp", <span key="wa" dir="ltr">{order.whatsapp}</span>]] : []),
              [t("governorate", lang), order.governorate],
              [t("area", lang), order.area],
              ...(order.city ? [[t("city", lang), order.city]] : []),
            ] as [string, React.ReactNode][]).map(([k, v], idx) => (
              <div key={idx} className="flex justify-between gap-3"><span className="text-mute dark:text-[#a89f92] shrink-0">{k}</span><span className="font-semibold text-ink dark:text-[#f3ede3] text-end">{v}</span></div>
            ))}
            <div className="flex justify-between gap-4"><span className="text-mute dark:text-[#a89f92] shrink-0">{t("address", lang)}</span><span className="font-semibold text-end text-ink dark:text-[#f3ede3]">{order.address}</span></div>
            {order.building && <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("building", lang)}</span><span className="font-semibold text-ink dark:text-[#f3ede3]">{order.building}</span></div>}
            {order.apartment && <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("apartment", lang)}</span><span className="font-semibold text-ink dark:text-[#f3ede3]">{order.apartment}</span></div>}
            {order.notes && <div className="flex justify-between gap-4"><span className="text-mute dark:text-[#a89f92] shrink-0">{t("notes", lang)}</span><span className="font-semibold text-end text-ink dark:text-[#f3ede3]">{order.notes}</span></div>}
            <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("deliveryMethod", lang)}</span><span className="font-semibold text-ink dark:text-[#f3ede3]">{order.deliveryMethod === "express" ? t("express", lang) : t("standard", lang)}</span></div>
            <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("payment", lang)}</span><span className="font-semibold text-ink dark:text-[#f3ede3]">{t("cod", lang)}</span></div>
          </div>

          {/* Products */}
          <div className="border-t border-dashed border-line dark:border-[#2e2822] mt-3 pt-3 grid gap-2">
            {order.items.map((i, idx) => {
              const thumb = firstProductImage([i.image]);
              return (
                <div key={`${i.productId}-${idx}`} className="flex gap-2.5 items-center">
                  {thumb ? <img src={thumb} onError={onImgError} alt="" className="product-photo w-12 h-14 rounded-xl object-cover shrink-0 bg-sand dark:bg-[#201a15]" /> : <span className="w-12 h-14 rounded-xl bg-sand dark:bg-[#201a15] grid place-items-center shrink-0 text-bronze/60"><ImageIcon className="w-5 h-5" /></span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold line-clamp-2 text-ink dark:text-[#f3ede3]">{lang === "ar" ? i.nameAr : i.nameEn}</div>
                    <div className="text-xs text-mute dark:text-[#a89f92]" dir="auto">× {i.qty} · {fmtPrice(i.price, lang)}</div>
                  </div>
                  <div className="text-sm font-bold shrink-0 text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(i.price * i.qty, lang)}</div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-line dark:border-[#2e2822] mt-3 pt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("subtotal", lang)}</span><span className="font-bold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(order.subtotal, lang)}</span></div>
            <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("delivery", lang)}</span><span className="font-bold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(order.deliveryFee, lang)}</span></div>
            <div className="flex justify-between text-base"><span className="font-bold text-ink dark:text-[#f3ede3]">{t("total", lang)}</span><span className="font-extrabold text-bronze-deep dark:text-bronze" dir="auto">{fmtPrice(order.total, lang)}</span></div>
          </div>
        </div>
      )}
    </main>
  );
}
