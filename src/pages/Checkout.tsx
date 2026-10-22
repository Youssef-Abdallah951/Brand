import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop, lineId } from "../store/ShopContext";
import { t, VALIDATION_MSG } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { GOVERNORATES } from "../lib/egypt";
import { SITE_CONFIG } from "../lib/siteConfig";
import { createOrder } from "../lib/orders";
import { sanitizeText } from "../lib/sanitize";
import { usePageMeta } from "../lib/meta";
import { firstProductImage, onImgError } from "../components/product";
import { CardIcon, CashIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, ImageIcon, LockIcon, MapPinIcon, ReceiptIcon, RetryIcon, SparklesIcon, TruckIcon, UserIcon } from "../components/icons";
import type { CheckoutForm, Order } from "../lib/types";

const inputCls = "w-full rounded-2xl border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-4 py-3 text-sm outline-none focus:border-bronze transition placeholder:text-mute/60";
const labelCls = "text-xs font-bold text-ink dark:text-[#f3ede3] mb-1.5 block";
const cardCls = "bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-5 sm:p-6 soft-shadow";
const headingCls = "font-display font-bold text-lg inline-flex items-center gap-2 text-ink dark:text-[#f3ede3]";
const iconCls = "text-bronze";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className="text-clay text-xs font-bold mt-1" role="alert">{error}</p>}
    </div>
  );
}

export default function Checkout() {
  const { lang } = useLang();
  const { cart, productById, clearCart, pushToast, zones } = useShop();
  usePageMeta(`${t("checkout", lang)} | Jia`);
  const nav = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Double-submit guard: React state updates are async, so a ref blocks a
  // second tap before the disabled state paints. Never auto-retries the INSERT.
  const submitting = useRef(false);
  const [form, setForm] = useState<CheckoutForm>({
    firstName: "", lastName: "",
    phone: "",
    governorate: "", area: "", city: "", address: "", building: "", apartment: "", notes: "",
    deliveryMethod: "", paymentMethod: "cod",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  const rows = useMemo(
    () => cart.map((c) => {
      const p = productById(c.productId);
      return p ? { ...c, p, lid: lineId(c.productId, c.color) } : null;
    }).filter((r): r is NonNullable<typeof r> => !!r),
    [cart, productById],
  );
  const unitPrice = (p: { price: number; salePrice?: number }) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);
  const subtotal = rows.reduce((s, r) => s + unitPrice(r.p) * r.qty, 0);

  // Redirect empty carts as an effect — never navigate during render.
  useEffect(() => {
    if (rows.length === 0 && !placing) nav("/cart", { replace: true });
  }, [rows.length, placing, nav]);

  const zone = zones.find((z) => z.governorateEn === form.governorate || z.governorateAr === form.governorate);
  const deliveryFee = useMemo(() => {
    if (!form.deliveryMethod) return 0;
    if (subtotal >= SITE_CONFIG.delivery.freeThreshold && form.deliveryMethod === "standard") return 0;
    return zone
      ? form.deliveryMethod === "express" ? zone.expressFee : zone.standardFee
      : form.deliveryMethod === "express" ? SITE_CONFIG.delivery.expressFee : SITE_CONFIG.delivery.standardFee;
  }, [form.deliveryMethod, subtotal, zone]);
  // COD pricing: the displayed total is exactly Subtotal + Delivery Fee.
  const total = Math.max(0, subtotal + deliveryFee);
  const vm = (k: string) => VALIDATION_MSG[k]?.[lang] ?? k;

  const set = (k: keyof CheckoutForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  if (rows.length === 0) return null;

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = vm("name");
    if (!form.lastName.trim()) e.lastName = vm("name");
    if (!/^01[0125]\d{8}$/.test(form.phone.trim())) e.phone = vm("phone");
    if (!form.governorate) e.governorate = vm("gov");
    if (!form.area.trim()) e.area = vm("area");
    if (!form.address.trim()) e.address = vm("address");
    if (!form.deliveryMethod) e.deliveryMethod = vm("delivery");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    // Block double taps / double submissions. The cart is kept on failure.
    if (submitting.current || placing) return;
    setSubmitError("");
    if (!validate()) {
      pushToast(lang === "ar" ? "برجاء مراجعة البيانات" : "Please review the form");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Re-validate every line against the live catalog: product must exist,
    // be active, have a sane price; quantity clamped to available stock.
    // Totals are computed from THESE trusted values, not from stored state.
    // The selected colour variant travels with the line notes so the atelier
    // can pick exactly what was ordered.
    const giftBits: string[] = [];
    const items: Order["items"] = [];
    for (const r of rows) {
      const fresh = productById(r.productId);
      if (!fresh || !fresh.active || !(fresh.price > 0)) {
        setSubmitError(t("genericError", lang));
        return;
      }
      const qty = Math.max(1, Math.min(r.qty, fresh.stock > 0 ? fresh.stock : r.qty));
      if (qty !== r.qty) {
        pushToast(lang === "ar" ? `تم تعديل كمية "${fresh.nameAr}" حسب المتاح` : `Adjusted "${fresh.nameEn}" quantity to available stock`);
      }
      if (qty <= 0) {
        setSubmitError(t("genericError", lang));
        return;
      }
      items.push({ productId: fresh.id, nameEn: fresh.nameEn, nameAr: fresh.nameAr, price: unitPrice(fresh), qty, image: firstProductImage(fresh.images), color: r.color?.trim() || undefined });
      if (r.color?.trim()) giftBits.push(`${fresh.nameEn}: ${lang === "ar" ? "اللون" : "color"} ${sanitizeText(r.color, 60)}`);
      if (r.notes?.trim()) giftBits.push(`${fresh.nameEn}: ${sanitizeText(r.notes, 240)}`);
    }
    if (items.length === 0) {
      setSubmitError(t("genericError", lang));
      return;
    }
    const liveSubtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const liveDelivery = liveSubtotal >= SITE_CONFIG.delivery.freeThreshold && form.deliveryMethod === "standard"
      ? 0
      : (zone
        ? form.deliveryMethod === "express" ? zone.expressFee : zone.standardFee
        : form.deliveryMethod === "express" ? SITE_CONFIG.delivery.expressFee : SITE_CONFIG.delivery.standardFee);
    // Discount stays 0 — customer-facing coupon redemption is disabled, but
    // the DB column/API field is still required by the order pipeline.
    const liveDiscount = 0;
    const liveTotal = Math.max(0, liveSubtotal - liveDiscount + liveDelivery);
    const notes = [sanitizeText(form.notes, 240), ...giftBits].filter(Boolean).join("\n");

    submitting.current = true;
    setPlacing(true);
    try {
      // One adapter for both worlds: with Supabase env → database INSERT;
      // without → local order (localStorage) + WhatsApp handoff. Local mode
      // completes inside the click's user activation, so the window.open
      // below is allowed to open the prefilled WhatsApp message.
      const res = await createOrder({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        whatsapp: form.phone.trim(),
        phone: form.phone.trim(),
        governorate: form.governorate,
        area: form.area.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        building: form.building.trim(),
        apartment: form.apartment.trim(),
        notes,
        deliveryMethod: form.deliveryMethod as "standard" | "express",
        items,
        subtotal: liveSubtotal, deliveryFee: liveDelivery, discount: liveDiscount, total: liveTotal,
      });
      clearCart(); // only after the order is safely stored
      pushToast(lang === "ar" ? "تم إنشاء الطلب بنجاح" : "Order created successfully");
      // Local mode: best-effort WhatsApp popup right away. If the browser
      // blocks it, the success page always shows the "Send order" button.
      if (res.mode === "local" && res.whatsapp) {
        try {
          const w = window.open(res.whatsapp, "_blank");
          if (w) w.opener = null;
        } catch { /* popup blocked — success page CTA covers it */ }
      }
      nav(`/order-success?order=${res.orderNumber}`, {
        state: {
          orderNumber: res.orderNumber,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          governorate: form.governorate,
          area: form.area.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          building: form.building.trim(),
          apartment: form.apartment.trim(),
          notes,
          deliveryMethod: form.deliveryMethod as "standard" | "express",
          paymentMethod: "cod" as const,
          paymentStatus: "pending" as const,
          items,
          subtotal: liveSubtotal,
          deliveryFee: liveDelivery,
          discount: liveDiscount,
          total: liveTotal,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // Server mode only: keep everything (cart, form) and a retryable error.
      submitting.current = false;
      setPlacing(false);
      setSubmitError(t("connError", lang));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main>
      <div className="shell py-7">
        <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">{t("checkout", lang)}</h1>

        {submitError && (
          <div className="mt-4 bg-clay/10 border border-clay/30 text-clay rounded-2xl px-5 py-4 text-sm font-bold animate-fadeUp" role="alert">
            {submitError}
            <button onClick={placeOrder} className="mt-2 underline inline-flex items-center gap-1"><RetryIcon className="w-3.5 h-3.5" /> {t("retry", lang)}</button>
            <span className="block mt-1 font-normal text-xs opacity-90">
              {lang === "ar" ? "أو تواصلي معنا:" : "Or contact us:"} <a className="underline" href={SITE_CONFIG.admin.telLink} dir="ltr">{SITE_CONFIG.admin.phoneLocal}</a>
            </span>
          </div>
        )}
      </div>

      {/* Mobile collapsible summary */}
      <div className="shell">
        <button onClick={() => setShowSummary((s) => !s)} aria-expanded={showSummary} className="lg:hidden w-full bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] rounded-2xl px-4 py-3.5 flex justify-between items-center font-bold text-sm">
          <span className="inline-flex items-center gap-2"><ReceiptIcon className={`w-5 h-5 ${iconCls}`} /> {t("orderSummary", lang)} · <span dir="auto">{fmtPrice(total, lang)}</span></span>
          {showSummary ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>
      </div>

      <div className="shell grid lg:grid-cols-[1fr_380px] gap-6 mt-4 pb-32 lg:pb-12 items-start">
        <div className="grid gap-5">
          {/* CONTACT */}
          <section className={cardCls}>
            <h2 className={`${headingCls} mb-4`}><UserIcon className={`w-5 h-5 ${iconCls}`} /> {t("contactInfo", lang)}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("firstName", lang)} error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputCls} autoComplete="given-name" />
              </Field>
              <Field label={t("lastName", lang)} error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputCls} autoComplete="family-name" />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("phone", lang)} error={errors.phone}>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                    className={inputCls}
                    type="tel" inputMode="numeric" dir="ltr" autoComplete="tel" maxLength={11}
                    placeholder="01XXXXXXXXX"
                  />
                </Field>
                <p className="text-[11px] text-mute dark:text-[#a89f92] mt-1">{lang === "ar" ? "للتواصل بخصوص التوصيل فقط" : "Used by the courier for delivery coordination only"}</p>
              </div>
            </div>
          </section>

          {/* DELIVERY */}
          <section className={cardCls}>
            <h2 className={`${headingCls} mb-4`}><MapPinIcon className={`w-5 h-5 ${iconCls}`} /> {t("deliveryInfo", lang)}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("governorate", lang)} error={errors.governorate}>
                <select value={form.governorate} onChange={(e) => set("governorate", e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {GOVERNORATES.map((g) => <option key={g.en} value={g.en}>{lang === "ar" ? g.ar : g.en}</option>)}
                </select>
              </Field>
              <Field label={t("area", lang)} error={errors.area}>
                <input value={form.area} onChange={(e) => set("area", e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("city", lang)}>
                <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("address", lang)} error={errors.address}>
                <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} placeholder={lang === "ar" ? "اسم الشارع / علامة مميزة" : "Street / landmark"} />
              </Field>
              <Field label={t("building", lang)}>
                <input value={form.building} onChange={(e) => set("building", e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("apartment", lang)}>
                <input value={form.apartment} onChange={(e) => set("apartment", e.target.value)} className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("notes", lang)}>
                  <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          </section>

          {/* DELIVERY METHOD */}
          <section className={cardCls}>
            <h2 className={`${headingCls} mb-4`}><TruckIcon className={`w-5 h-5 ${iconCls}`} /> {t("deliveryMethod", lang)}</h2>
            <div className="grid gap-2.5" role="radiogroup" aria-label={t("deliveryMethod", lang)}>
              {([
                { v: "standard", label: t("standard", lang), fee: zone?.standardFee ?? SITE_CONFIG.delivery.standardFee, eta: zone ? (lang === "ar" ? zone.etaAr : zone.etaEn) : "2-4 days" },
                { v: "express", label: t("express", lang), fee: zone?.expressFee ?? SITE_CONFIG.delivery.expressFee, eta: lang === "ar" ? "24-48 ساعة" : "24-48 hrs" },
              ] as const).map((o) => {
                const selected = form.deliveryMethod === o.v;
                return (
                  <button key={o.v} type="button" role="radio" aria-checked={selected} onClick={() => set("deliveryMethod", o.v)}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-start transition ${selected ? "border-bronze bg-sand dark:bg-[#201a15]" : "border-line dark:border-[#2e2822] hover:border-bronze/50"}`}>
                    <span className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${selected ? "border-bronze" : "border-line dark:border-[#2e2822]"}`} aria-hidden="true">
                      {selected && <span className="w-2.5 h-2.5 rounded-full bg-bronze" />}
                    </span>
                    <span className="flex-1 min-w-0"><span className="font-bold block text-ink dark:text-[#f3ede3] text-sm">{o.label}</span><span className="text-xs text-mute dark:text-[#a89f92]" dir="auto">{o.eta}</span></span>
                    <span className="font-extrabold text-sm text-ink dark:text-[#f3ede3]" dir="auto">
                      {fmtPrice(subtotal >= SITE_CONFIG.delivery.freeThreshold && o.v === "standard" ? 0 : o.fee, lang)}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.deliveryMethod && <p className="text-clay text-xs font-bold mt-2" role="alert">{errors.deliveryMethod}</p>}
            {subtotal >= SITE_CONFIG.delivery.freeThreshold && (
              <p className="text-bronze-deep dark:text-bronze text-xs font-bold mt-2.5 inline-flex items-center gap-1">
                <SparklesIcon className="w-4 h-4" /> {lang === "ar" ? "شحن عادي مجاني لطلبك!" : "FREE standard shipping on your order!"}
              </p>
            )}
          </section>

          {/* PAYMENT — COD ONLY */}
          <section className={cardCls}>
            <h2 className={`${headingCls} mb-4`}><CardIcon className={`w-5 h-5 ${iconCls}`} /> {t("payment", lang)}</h2>
            <div className="rounded-2xl border border-bronze/40 bg-sand dark:bg-[#201a15] px-4 py-4">
              <span className="font-bold inline-flex items-center gap-1.5 text-ink dark:text-[#f3ede3] text-sm"><CashIcon className="w-5 h-5 text-bronze" /> {t("cod", lang)}</span>
              <span className="block text-xs text-mute dark:text-[#a89f92] mt-1">{lang === "ar" ? "ادفعي كاش عند وصول المندوب — بدون أي دفع مقدم" : "Pay cash when the courier arrives — no prepayment needed"}</span>
            </div>
          </section>
        </div>

        {/* SUMMARY */}
        <aside className={`${cardCls} lg:sticky lg:top-28 ${showSummary ? "block" : "hidden lg:block"}`}>
          <h2 className={`${headingCls} inline-flex items-center gap-2`}><ReceiptIcon className={`w-5 h-5 ${iconCls}`} /> {t("orderSummary", lang)}</h2>

          <div className="grid gap-3 mt-4 max-h-72 overflow-auto pe-1">
            {rows.map((r) => {
              const thumb = firstProductImage(r.p.images);
              const unit = unitPrice(r.p);
              return (
                <div key={r.lid} className="flex gap-2.5 items-center">
                  <div className="relative shrink-0">
                    {thumb ? (
                      <img src={thumb} onError={onImgError} alt="" loading="lazy" className="product-photo w-14 h-16 rounded-xl object-cover bg-sand dark:bg-[#201a15]" />
                    ) : (
                      <span className="w-14 h-16 rounded-xl bg-sand dark:bg-[#201a15] grid place-items-center text-bronze/60"><ImageIcon className="w-6 h-6" /></span>
                    )}
                    <span className="absolute -top-1.5 -end-1.5 bg-ink dark:bg-bronze text-white text-[10px] w-5 h-5 grid place-items-center rounded-full font-bold" aria-hidden="true">{r.qty}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-2 text-ink dark:text-[#f3ede3] leading-snug">{lang === "ar" ? r.p.nameAr : r.p.nameEn}</p>
                    {r.color && <p className="text-[11px] text-mute dark:text-[#a89f92] mt-0.5" dir="auto">{t("color", lang)}: {r.color}</p>}
                  </div>
                  <div className="text-sm font-bold shrink-0 text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(unit * r.qty, lang)}</div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-dashed border-line dark:border-[#2e2822] mt-4 pt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("subtotal", lang)}</span><span className="font-bold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(subtotal, lang)}</span></div>
            <div className="flex justify-between"><span className="text-mute dark:text-[#a89f92]">{t("delivery", lang)}</span><span className="font-bold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(deliveryFee, lang)}</span></div>
            <div className="flex justify-between text-base font-display"><span className="font-bold text-ink dark:text-[#f3ede3]">{t("total", lang)}</span><span className="font-extrabold text-bronze-deep dark:text-bronze" dir="auto">{fmtPrice(total, lang)}</span></div>
          </div>
          <button onClick={placeOrder} disabled={placing} className="mt-4 w-full min-h-[52px] rounded-full bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold transition btn-press disabled:opacity-60 disabled:cursor-wait">
            {placing ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-[#f3ede3]/40 border-t-[#f3ede3] spin" aria-hidden="true" />
                {t("placingOrder", lang)}
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5"><CheckIcon className="w-5 h-5" /> {t("placeOrder", lang)} — <span dir="auto">{fmtPrice(total, lang)}</span></span>
            )}
          </button>
          <p className="text-[11px] text-mute dark:text-[#a89f92] text-center mt-2.5 inline-flex items-center justify-center gap-1 w-full"><LockIcon className="w-3.5 h-3.5" /> {lang === "ar" ? "بياناتك آمنة وتُستخدم للتوصيل فقط" : "Your data is safe and used for delivery only"}</p>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#14110e] border-t border-line dark:border-[#2e2822] p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-mute dark:text-[#a89f92]">{t("total", lang)}</div>
          <div className="font-extrabold text-lg text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(total, lang)}</div>
        </div>
        <button onClick={placeOrder} disabled={placing} className="flex-1 rounded-full bg-clay text-white font-bold py-3.5 btn-press disabled:opacity-60">
          {placing ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white spin" aria-hidden="true" />
              {t("placingOrder", lang)}
            </span>
          ) : t("placeOrder", lang)}
        </button>
      </div>
    </main>
  );
}
