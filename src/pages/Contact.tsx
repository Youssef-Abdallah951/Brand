import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { t } from "../i18n/translations";
import { SITE_CONFIG, generalWhatsAppLink } from "../lib/siteConfig";
import { firstProductImage, onImgError } from "../components/product";
import { useShop } from "../store/ShopContext";
import { isValidEgyptianPhone } from "../lib/egypt";

export default function Contact() {
  const { lang } = useLang();
  const { pushToast } = useShop();
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [msg, setMsg] = useState("");
  const cls = "w-full rounded-2xl border border-pink-200 px-4 py-3.5 outline-none focus:border-[#e84393]";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidEgyptianPhone(wa) || !msg.trim()) {
      pushToast(lang === "ar" ? "برجاء إكمال البيانات بشكل صحيح" : "Please complete the form correctly");
      return;
    }
    window.open(
      `${SITE_CONFIG.admin.whatsappLink}?text=${encodeURIComponent(`Name: ${name}\nWhatsApp: ${wa}\nMessage: ${msg}`)}`,
      "_blank",
    );
    pushToast(lang === "ar" ? "تم تجهيز رسالتك عبر واتساب" : "Your message is ready via WhatsApp");
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold">{t("contact", lang)}</h1>
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <div className="bg-white border border-pink-100 rounded-3xl p-6 card-shadow grid gap-3 content-start">
          <div className="font-bold">📞 {lang === "ar" ? "الهاتف" : "Phone"}</div>
          <a href={SITE_CONFIG.admin.telLink} dir="ltr" className="text-xl font-bold text-[#c2185b]">{SITE_CONFIG.admin.phoneLocal}</a>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <a href={SITE_CONFIG.admin.telLink} className="rounded-2xl bg-[#2b2b30] text-white font-bold py-3 text-center text-sm">📞 {t("callUs", lang)}</a>
            <a href={generalWhatsAppLink(lang)} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#25D366] text-white font-bold py-3 text-center text-sm">💬 {t("whatsappUs", lang)}</a>
          </div>
        </div>
        <form onSubmit={send} className="bg-white border border-pink-100 rounded-3xl p-6 card-shadow grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ar" ? "الاسم" : "Name"} className={cls} />
          <input value={wa} onChange={(e) => setWa(e.target.value)} dir="ltr" inputMode="tel" placeholder="WhatsApp: 01xxxxxxxxx" className={cls} />
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder={lang === "ar" ? "رسالتك…" : "Your message…"} className={cls} />
          <button className="rounded-2xl bg-[#e84393] text-white font-bold py-3.5 btn-press">💬 {t("whatsappUs", lang)}</button>
        </form>
      </div>
    </main>
  );
}

export function About() {
  const { lang } = useLang();
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold">{t("about", lang)}</h1>
      <div className="bg-white border border-pink-100 rounded-3xl p-6 mt-5 card-shadow text-gray-600 leading-relaxed grid gap-3">
        <p>{lang === "ar" ? "سياسة الاستبدال: خلال 14 يوماً بحالته الأصلية. الشحن: 2-6 أيام حسب المحافظة. الخصوصية: بياناتك تُستخدم للتوصيل فقط." : "Exchange policy: within 14 days in original condition. Shipping: 2–6 days by governorate. Privacy: your data is used for delivery only."}</p>
      </div>
    </main>
  );
}

export function CategoriesPage() {
  const { lang } = useLang();
  const { products, categories } = useShop();
  const cats = categories.map((c) => ({ slug: c.slug, en: c.nameEn, ar: c.nameAr, img: c.image, id: c.id }));
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold">{t("categories", lang)}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
        {cats.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id || p.categoryId === c.slug).length;
          const tile = firstProductImage([c.img]);
          return (
            <Link key={c.slug} to={`/shop?cat=${c.slug}`} className="relative rounded-3xl overflow-hidden aspect-[4/3] group card-shadow">
              {tile ? (
                <img src={tile} onError={onImgError} alt={c.en} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-5xl bg-pink-100">🗂</span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-4 start-4 text-white font-bold text-lg">{lang === "ar" ? c.ar : c.en} <span className="block text-xs font-normal opacity-80">{count} {lang === "ar" ? "منتج" : "products"}</span></span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
