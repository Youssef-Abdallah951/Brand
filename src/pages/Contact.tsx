import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { t } from "../i18n/translations";
import { SITE_CONFIG, generalWhatsAppLink } from "../lib/siteConfig";
import { categoryFallbackUrl, categoryImageUrl, onCategoryImgError } from "../components/product";
import { useShop } from "../store/ShopContext";
import { Reveal } from "../components/reveal";
import { usePageMeta } from "../lib/meta";
import { ChatIcon, ImageIcon, PhoneIcon } from "../components/icons";

export default function Contact() {
  const { lang } = useLang();
  const { pushToast } = useShop();
  usePageMeta(`${t("contact", lang)} | Jia`, t("heroSub", lang));
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const cls = "w-full rounded-2xl border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-4 py-3.5 text-sm outline-none focus:border-bronze transition placeholder:text-mute/60";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) {
      pushToast(lang === "ar" ? "أكملي بياناتك الأول" : "Please complete the form correctly");
      return;
    }
    window.open(
      `${SITE_CONFIG.admin.whatsappLink}?text=${encodeURIComponent(`Name: ${name}\nMessage: ${msg}`)}`,
      "_blank",
    );
    pushToast(lang === "ar" ? "رسالتك جاهزة على واتساب" : "Your message is ready via WhatsApp");
  };

  return (
    <main className="shell max-w-4xl mx-auto py-10">
      <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">{t("contact", lang)}</h1>
      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <Reveal tag="section" className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-6 soft-shadow grid gap-3 content-start">
          <div className="font-bold inline-flex items-center gap-1.5 text-ink dark:text-[#f3ede3]"><PhoneIcon className="w-4 h-4 text-bronze" /> {lang === "ar" ? "الهاتف" : "Phone"}</div>
          <a href={SITE_CONFIG.admin.telLink} dir="ltr" className="text-xl font-extrabold text-bronze-deep dark:text-bronze underline-offset-4 hover:underline w-fit">{SITE_CONFIG.admin.phoneLocal}</a>
          <div className="grid grid-cols-2 gap-2.5 mt-2">
            <a href={SITE_CONFIG.admin.telLink} className="min-h-[48px] rounded-full bg-ink text-[#f3ede3] font-bold py-3 text-center text-sm inline-flex items-center justify-center gap-1.5 hover:bg-bronze-deep transition btn-press"><PhoneIcon className="w-4 h-4" /> {t("callUs", lang)}</a>
            <a href={generalWhatsAppLink(lang)} target="_blank" rel="noreferrer" className="min-h-[48px] rounded-full bg-[#23b26b] text-white font-bold py-3 text-center text-sm inline-flex items-center justify-center gap-1.5 hover:brightness-95 transition btn-press"><ChatIcon className="w-4 h-4" /> {t("whatsappUs", lang)}</a>
          </div>
        </Reveal>
        <Reveal tag="form" onSubmit={send} className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-6 soft-shadow grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ar" ? "الاسم" : "Name"} className={cls} aria-label={lang === "ar" ? "الاسم" : "Name"} />
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder={lang === "ar" ? "رسالتك…" : "Your message…"} className={cls} aria-label={lang === "ar" ? "رسالتك" : "Your message"} />
          <button className="min-h-[50px] rounded-full bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold btn-press inline-flex items-center justify-center gap-2 transition"><ChatIcon className="w-5 h-5" /> {t("whatsappUs", lang)}</button>
        </Reveal>
      </div>
    </main>
  );
}

export function CategoriesPage() {
  const { lang } = useLang();
  const { products, categories } = useShop();
  const cats = categories.map((c) => ({ slug: c.slug, en: c.nameEn, ar: c.nameAr, img: categoryImageUrl(c.image, c.slug), id: c.id }));
  return (
    <main className="shell max-w-7xl mx-auto py-10">
      <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">{t("categories", lang)}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {cats.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id || p.categoryId === c.slug).length;
          const tile = c.img;
          const fallback = categoryFallbackUrl(c.slug);
          return (
            <Reveal key={c.slug}>
              <Link to={`/shop?cat=${c.slug}`} className="block relative rounded-3xl overflow-hidden aspect-[4/3] group soft-shadow bg-sand dark:bg-[#201a15]">
                {tile ? (
                  <img src={tile} onError={(e) => onCategoryImgError(e, tile === fallback ? undefined : fallback)} alt={lang === "ar" ? c.ar : c.en} loading="lazy" className="product-photo absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-bronze/60"><ImageIcon className="w-12 h-12" /></span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                <span className="absolute bottom-4 start-4 text-white font-display font-bold text-lg leading-tight">
                  {lang === "ar" ? c.ar : c.en}
                  <span className="block text-[11px] font-body font-semibold opacity-80" dir="auto">{count} {t("productsCount", lang)}</span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </main>
  );
}
