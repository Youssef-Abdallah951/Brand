import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t, VALIDATION_MSG } from "../i18n/translations";
import { GOVERNORATES, isValidEgyptianPhone } from "../lib/egypt";
import { SITE_CONFIG } from "../lib/siteConfig";
import { createOrderInSupabase } from "../lib/supabase";
import { firstProductImage, onImgError } from "../components/product";
import type { CheckoutForm } from "../lib/types";

const inputCls = "w-full rounded-2xl border border-pink-200 bg-white px-4 py-3.5 outline-none focus:border-[#e84393] focus:ring-2 focus:ring-pink-100 transition placeholder:text-gray-400";
const labelCls = "text-sm font-bold text-gray-700 mb-1.5 block";
const cardCls = "bg-white border border-pink-100 rounded-3xl p-5 sm:p-6 card-shadow";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs font-bold mt-1">{error}</p>}
    </div>
  );
}

export default function Checkout() {
  const { lang } = useLang();
  const { cart, productById, clearCart, pushToast, zones } = useShop();
  const nav = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Double-submit guard: React state updates are async, so a ref blocks a
  // second tap before the disabled state paints. Never auto-retries the INSERT.
  const submitting = useRef(false);
  const [form, setForm] = useState<CheckoutForm>({
    firstName: "", lastName: "", whatsapp: "", phone: "",
    governorate: "", area: "", city: "", address: "", building: "", apartment: "", notes: "",
    deliveryMethod: "", paymentMethod: "cod",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  const rows = useMemo(
    () => cart.map((c) => ({ ...c, p: productById(c.productId)! })).filter((r) => r.p),
    [cart, productById],
  );
  const subtotal = rows.reduce((s, r) => s + r.p.price * r.qty, 0);

  // Redirect empty carts as an effect — never navigate during render.
  useEffect(() => {
    if (rows.length === 0 && !placing) nav("/cart", { replace: true });
  }, [rows.length, placing, nav]);

  const zone = zones.find((z) => z.governorateEn === form.governorate || z.governorateAr === form.governorate);
  const deliveryFee = useMemo(() => {
    if (!form.deliveryMethod) return 0;
    if (subtotal >= SITE_CONFIG.delivery.freeThreshold && form.deliveryMethod === "standard") return 0;
    const base = zone
      ? form.deliveryMethod === "express" ? zone.expressFee : zone.standardFee
      : form.deliveryMethod === "express" ? SITE_CONFIG.delivery.expressFee : SITE_CONFIG.delivery.standardFee;
    return base;
  }, [form.deliveryMethod, subtotal, zone]);
  const total = subtotal + deliveryFee;
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
    if (!form.whatsapp.trim()) e.whatsapp = vm("whatsapp");
    else if (!isValidEgyptianPhone(form.whatsapp)) e.whatsapp = vm("invalidPhone");
    if (form.phone.trim() && !isValidEgyptianPhone(form.phone)) e.phone = vm("invalidPhone");
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
    const giftBits: string[] = [];
    const items: { productId: string; nameEn: string; nameAr: string; price: number; qty: number; image: string }[] = [];
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
      items.push({ productId: fresh.id, nameEn: fresh.nameEn, nameAr: fresh.nameAr, price: fresh.price, qty, image: firstProductImage(fresh.images) });
      if (r.notes?.trim()) giftBits.push(`${fresh.nameEn}: ${r.notes.trim()}`);
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
    const liveTotal = liveSubtotal + liveDelivery;
    const notes = [form.notes.trim(), ...giftBits].filter(Boolean).join("\n");

    submitting.current = true;
    setPlacing(true);
    try {
      // Single INSERT attempt — Supabase is the only store. Throws on any
      // failure (timeout, network, RLS). Cart is preserved for safe retry.
      const orderNumber = await createOrderInSupabase({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        whatsapp: form.whatsapp.trim(),
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
        subtotal: liveSubtotal, deliveryFee: liveDelivery, discount: 0, total: liveTotal,
      });
      clearCart(); // only after the order is safely stored
      pushToast(lang === "ar" ? "تم إنشاء الطلب بنجاح" : "Order created successfully");
      nav(`/order-success?order=${orderNumber}`, {
        state: {
          orderNumber,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          whatsapp: form.whatsapp.trim(),
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
          discount: 0,
          total: liveTotal,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // Keep everything: cart, form, and a retryable error (no auto-retry).
      submitting.current = false;
      setPlacing(false);
      setSubmitError(t("connError", lang));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-10">
      <h1 className="font-display text-3xl font-bold">{t("checkout", lang)}</h1>

      {submitError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-bold animate-fadeUp">
          {submitError}
          <button onClick={placeOrder} className="block mt-2 underline">🔁 {t("retry", lang)}</button>
          <span className="block mt-1 font-normal text-xs">
            {lang === "ar" ? "أو تواصلي معنا:" : "Or contact us:"} <a className="underline" href={SITE_CONFIG.admin.telLink} dir="ltr">{SITE_CONFIG.admin.phoneLocal}</a>
          </span>
        </div>
      )}

      {/* Mobile collapsible summary */}
      <button onClick={() => setShowSummary((s) => !s)} className="lg:hidden w-full mt-4 bg-white border border-pink-200 rounded-2xl px-4 py-3.5 flex justify-between items-center font-bold">
        <span>🧾 {t("orderSummary", lang)} • EGP {total}</span>
        <span>{showSummary ? "▲" : "▼"}</span>
      </button>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5 mt-4 items-start">
        <div className="grid gap-5">
          {/* CONTACT */}
          <section className={cardCls}>
            <h2 className="font-bold text-lg mb-4">👤 {t("contactInfo", lang)}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("whatsappNum", lang)} error={errors.whatsapp}>
                <input dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={`${inputCls} text-left`} />
              </Field>
              <Field label={t("phone", lang)} error={errors.phone}>
                <input dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={`${inputCls} text-left`} />
              </Field>
              <Field label={t("firstName", lang)} error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("lastName", lang)} error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* DELIVERY */}
          <section className={cardCls}>
            <h2 className="font-bold text-lg mb-4">📍 {t("deliveryInfo", lang)}</h2>
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
            <h2 className="font-bold text-lg mb-4">🚚 {t("deliveryMethod", lang)}</h2>
            <div className="grid gap-3">
              {([
                { v: "standard", label: t("standard", lang), fee: zone?.standardFee ?? SITE_CONFIG.delivery.standardFee, eta: zone ? (lang === "ar" ? zone.etaAr : zone.etaEn) : "2-4 days" },
                { v: "express", label: t("express", lang), fee: zone?.expressFee ?? SITE_CONFIG.delivery.expressFee, eta: lang === "ar" ? "24-48 ساعة" : "24-48 hrs" },
              ] as const).map((o) => (
                <button key={o.v} type="button" onClick={() => set("deliveryMethod", o.v)}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-start transition ${form.deliveryMethod === o.v ? "border-[#2b7de9] bg-blue-50" : "border-pink-100 hover:border-pink-300"}`}>
                  <span className={`w-5 h-5 rounded-full border-2 grid place-items-center ${form.deliveryMethod === o.v ? "border-[#2b7de9]" : "border-gray-300"}`}>
                    {form.deliveryMethod === o.v && <span className="w-2.5 h-2.5 rounded-full bg-[#2b7de9]" />}
                  </span>
                  <span className="flex-1"><span className="font-bold block">{o.label}</span><span className="text-xs text-gray-500">{o.eta}</span></span>
                  <span className="font-bold text-[#c2185b]">EGP {subtotal >= SITE_CONFIG.delivery.freeThreshold && o.v === "standard" ? 0 : o.fee}</span>
                </button>
              ))}
            </div>
            {errors.deliveryMethod && <p className="text-red-500 text-xs font-bold mt-2">{errors.deliveryMethod}</p>}
            {subtotal >= SITE_CONFIG.delivery.freeThreshold && <p className="text-green-600 text-xs font-bold mt-2">🎉 {lang === "ar" ? "شحن عادي مجاني لطلبك!" : "FREE standard shipping on your order!"}</p>}
          </section>

          {/* PAYMENT — COD ONLY */}
          <section className={cardCls}>
            <h2 className="font-bold text-lg mb-4">💳 {t("payment", lang)}</h2>
            <div className="rounded-2xl border-2 border-[#2b7de9] bg-blue-50 px-4 py-4">
              <span className="font-bold">💵 {t("cod", lang)}</span>
              <span className="block text-xs text-gray-500 mt-1">{lang === "ar" ? "ادفعي كاش عند وصول المندوب — بدون أي دفع مقدم" : "Pay cash when the courier arrives — no prepayment needed"}</span>
            </div>
          </section>
        </div>

        {/* SUMMARY */}
        <aside className={`${cardCls} lg:sticky lg:top-32 ${showSummary ? "block" : "hidden lg:block"}`}>
          <h2 className="font-bold text-lg">🧾 {t("orderSummary", lang)}</h2>
          <div className="grid gap-3 mt-4 max-h-72 overflow-auto">
            {rows.map((r) => {
              const thumb = firstProductImage(r.p.images);
              return (
              <div key={r.productId} className="flex gap-2.5 items-center">
                <div className="relative shrink-0">
                  {thumb ? (
                    <img src={thumb} onError={onImgError} alt="" className="w-14 h-16 rounded-xl object-cover bg-pink-100" />
                  ) : (
                    <span className="w-14 h-16 rounded-xl bg-pink-100 grid place-items-center">💄</span>
                  )}
                  <span className="absolute -top-1.5 -end-1.5 bg-[#2b2b30] text-white text-[10px] w-5 h-5 grid place-items-center rounded-full">{r.qty}</span>
                </div>
                <div className="flex-1 min-w-0 text-sm font-semibold line-clamp-2">{lang === "ar" ? r.p.nameAr : r.p.nameEn}</div>
                <div className="text-sm font-bold shrink-0">EGP {r.p.price * r.qty}</div>
              </div>
              );
            })}
          </div>
          <div className="border-t border-dashed border-pink-200 mt-4 pt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{t("subtotal", lang)}</span><span className="font-bold">EGP {subtotal}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t("delivery", lang)}</span><span className="font-bold">EGP {deliveryFee}</span></div>
            <div className="flex justify-between text-lg"><span className="font-bold">{t("total", lang)}</span><span className="font-bold text-[#c2185b]">EGP {total}</span></div>
          </div>
          <button onClick={placeOrder} disabled={placing} className="mt-4 w-full rounded-2xl bg-[#e84393] hover:bg-[#c2185b] text-white font-bold py-4 btn-press disabled:opacity-60">
            {placing ? (lang === "ar" ? "جاري تأكيد الطلب…" : "Placing order…") : `✅ ${t("placeOrder", lang)} • EGP ${total}`}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">🔒 {lang === "ar" ? "بياناتك آمنة وتُستخدم للتوصيل فقط" : "Your data is safe and used for delivery only"}</p>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-pink-100 p-3 flex items-center gap-3">
        <div className="flex-1"><div className="text-xs text-gray-500">{t("total", lang)}</div><div className="font-bold text-lg text-[#c2185b]">EGP {total}</div></div>
        <button onClick={placeOrder} disabled={placing} className="flex-1 rounded-2xl bg-[#e84393] text-white font-bold py-3.5 btn-press disabled:opacity-60">{placing ? (lang === "ar" ? "جاري…" : "Placing…") : t("placeOrder", lang)}</button>
      </div>
    </main>
  );
}
