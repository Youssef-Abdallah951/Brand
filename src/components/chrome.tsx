import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { SITE_CONFIG } from "../lib/siteConfig";
import { CartIcon, HeartIcon, MenuIcon, PhoneIcon, SearchIcon, StarIcon } from "./icons";

export function Stars({ value = 4.5 }: { value?: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${value}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(value)} className={`w-3.5 h-3.5 ${i <= Math.round(value) ? "" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

export function Price({ price, compareAt, lang }: { price: number; compareAt?: number; lang: "ar" | "en" }) {
  const off = compareAt ? Math.round((1 - price / compareAt) * 100) : 0;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-bold text-lg text-[#c2185b]">EGP {price}</span>
      {compareAt && (
        <>
          <span className="text-sm line-through text-gray-400">EGP {compareAt}</span>
          <span className="text-xs font-bold bg-[#e84393] text-white px-2 py-0.5 rounded-full">-{off}%</span>
        </>
      )}
      <span className="sr-only">{lang === "ar" ? "جنيه" : "EGP"}</span>
    </div>
  );
}

export function Navbar() {
  const { lang, setLang } = useLang();
  const { cartCount, wishlist } = useShop();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const links = [
    { to: "/", label: t("home", lang) },
    { to: "/shop", label: t("shop", lang) },
    { to: "/categories", label: t("categories", lang) },
    { to: "/about", label: t("about", lang) },
    { to: "/contact", label: t("contact", lang) },
  ];
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-pink-100 d-flex flex-wrap">
      <div className="bg-gradient-to-l from-[#e84393] to-[#ff7bac] text-white text-center text-xs sm:text-sm py-1.5 px-3">
        {t("announcement", lang)}
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-2 sm:gap-4 h-16">
        <button className="md:hidden p-2 rounded-xl hover:bg-pink-50 text-gray-700" onClick={() => setOpen(!open)} aria-label="menu"><MenuIcon className="w-6 h-6" /></button>
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#e84393] to-[#ffb3cd] grid place-items-center text-white font-display text-xl shadow shrink-0">L</span>
          <span className="font-display font-bold text-lg leading-tight min-w-0 truncate">
            {lang === "ar" ? SITE_CONFIG.brand.nameAr : SITE_CONFIG.brand.nameEn}
            <span className="hidden min-[380px]:block text-[11px] font-body font-normal text-pink-500 truncate">{lang === "ar" ? SITE_CONFIG.brand.taglineAr : SITE_CONFIG.brand.taglineEn}</span>
          </span>
        </Link>
        <nav className="hidden md:flex flex-wrap items-center gap-5 mx-auto text-[15px] font-medium">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "text-[#c2185b] font-bold" : "text-gray-600 hover:text-[#c2185b]")}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 ms-auto">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="text-xs sm:text-sm font-bold border border-pink-200 rounded-full px-3 py-1.5 hover:bg-pink-50"
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <Link to="/shop?wish=1" className="relative p-2 rounded-xl hover:bg-pink-50 text-gray-700" title="wishlist">
            <HeartIcon className="w-5 h-5" />{wishlist.length > 0 && <span className="absolute -top-0.5 -end-0.5 bg-[#e84393] text-white text-[10px] w-5 h-5 grid place-items-center rounded-full">{wishlist.length}</span>}
          </Link>
        </div>
      </div>
      <div className="px-3 pb-2">
        <form onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q)}`); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search", lang)} className="flex-1 rounded-2xl border border-pink-200 bg-pink-50/50 px-4 py-2.5 outline-none focus:border-[#e84393]" />
          <button className="rounded-2xl bg-[#e84393] text-white px-4 btn-press grid place-items-center" aria-label="search"><SearchIcon className="w-5 h-5" /></button>
          <Link to="/cart" className="relative p-2 rounded-xl hover:bg-pink-50 text-gray-700" title={t("cart", lang)}>
            <CartIcon className="w-5 h-5" />{cartCount > 0 && <span className="absolute -top-0.5 -end-0.5 bg-[#c2185b] text-white text-[10px] w-5 h-5 grid place-items-center rounded-full">{cartCount}</span>}
          </Link>
        </form>
      </div>
      {open && (
        <nav className="md:hidden border-t border-pink-100 bg-white px-4 py-2 grid gap-1 animate-fadeUp">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className={({ isActive }) => `py-2.5 px-2 rounded-xl ${isActive ? "bg-pink-100 text-[#c2185b] font-bold" : "text-gray-700"}`}>{l.label}</NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const { lang } = useLang();
  return (
    <footer className="mt-16 bg-[#2b2b30] text-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-display font-bold text-xl">{lang === "ar" ? SITE_CONFIG.brand.nameAr : SITE_CONFIG.brand.nameEn}</div>
          <p className="text-sm text-white/70 mt-2">{lang === "ar" ? "جمالك يبدأ من هنا — منتجات أصلية 100% وتوصيل سريع." : "Beauty starts here — 100% original products, fast delivery."}</p>
          <div className="flex gap-2 mt-4">
            <a href={SITE_CONFIG.admin.whatsappLink} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white rounded-full px-4 py-2 text-sm font-bold">WhatsApp</a>
            <a href={SITE_CONFIG.admin.telLink} className="bg-white/10 rounded-full px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5"><PhoneIcon className="w-4 h-4" /> <span dir="ltr">{SITE_CONFIG.admin.phoneLocal}</span></a>
          </div>
        </div>
        <div>
          <div className="font-bold mb-3">{lang === "ar" ? "روابط سريعة" : "Quick Links"}</div>
          <div className="grid gap-2 text-sm text-white/80">
            <Link to="/shop">{t("shop", lang)}</Link>
            <Link to="/contact">{t("contact", lang)}</Link>
          </div>
        </div>
        <div>
          <div className="font-bold mb-3">{lang === "ar" ? "خدمة العملاء" : "Customer Service"}</div>
          <div className="grid gap-2 text-sm text-white/80">
            <span>{lang === "ar" ? "الدفع عند الاستلام متاح" : "Cash on Delivery Available"}</span>
            <span>{lang === "ar" ? "توصيل لجميع المحافظات" : "Delivery to all governorates"}</span>
            <Link to="/about">{lang === "ar" ? "سياسة الخصوصية والشروط" : "Privacy & Terms"}</Link>
          </div>
        </div>
        <div>
          <div className="font-bold mb-3">{t("contact", lang)}</div>
          <div className="text-sm text-white/80 grid gap-1">
            <span dir="ltr">{SITE_CONFIG.admin.phoneLocal}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs py-4 text-white/60">© 2026 {SITE_CONFIG.brand.nameEn} • {lang === "ar" ? "صنع بحب في مصر" : "Made with love in Egypt"}</div>
    </footer>
  );
}

export function FloatingWhatsApp() {
  const { lang } = useLang();
  const { pathname } = useLocation();
  // Checkout has its own sticky bottom CTA on mobile — the floating button
  // would cover it, so it stays hidden there (all other pages unchanged).
  if (pathname.startsWith("/checkout")) return null;
  const href = `${SITE_CONFIG.admin.whatsappLink}?text=${encodeURIComponent(lang === "ar" ? SITE_CONFIG.admin.defaultChatMessageAr : SITE_CONFIG.admin.defaultChatMessageEn)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label="WhatsApp"
      className="fixed bottom-5 end-5 z-40 w-14 h-14 rounded-full bg-[#25D366] grid place-items-center text-3xl shadow-2xl hover:scale-105 transition btn-press">
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.4 0 .1 0 .5-.2 1.2Z" /></svg>
    </a>
  );
}

export function Toasts() {
  const { toasts } = useShop();
  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="bg-[#2b2b30] text-white text-sm px-5 py-2.5 rounded-full shadow-xl animate-fadeUp">{toast.msg}</div>
      ))}
    </div>
  );
}
