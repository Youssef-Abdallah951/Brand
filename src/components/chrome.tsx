import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { useTheme } from "../store/ThemeContext";
import { t } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { SITE_CONFIG } from "../lib/siteConfig";
import { CartIcon, HeartIcon, MenuIcon, MoonIcon, PhoneIcon, SearchIcon, StarIcon, SunIcon, UserIcon, XIcon } from "./icons";

export function Stars({ value = 4.5 }: { value?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-bronze" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(value)} className={`w-3.5 h-3.5 ${i <= Math.round(value) ? "" : "text-line dark:text-[#2e2822]"}`} />
      ))}
    </span>
  );
}

export function Price({ price, lang, sale }: { price: number; lang: "ar" | "en"; sale?: number }) {
  const show = sale && sale < price ? sale : price;
  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap" dir="auto">
      <span className={`font-extrabold text-[1.05rem] ${sale && sale < price ? "text-clay" : "text-ink dark:text-[#f3ede3]"}`}>{fmtPrice(show, lang)}</span>
      {sale && sale < price && <s className="text-sm text-mute dark:text-[#8d8478]">{fmtPrice(price, lang)}</s>}
    </span>
  );
}

export function ThemeToggle() {
  const { lang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = dark
    ? (lang === "ar" ? "التبديل إلى الوضع الفاتح" : "Switch to light mode")
    : (lang === "ar" ? "التبديل إلى الوضع الداكن" : "Switch to dark mode");
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="w-10 h-10 grid place-items-center rounded-full text-ink/70 dark:text-[#a89f92] hover:bg-sand dark:hover:bg-[#201a15] transition shrink-0"
    >
      {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}

const iconBtn = "relative w-10 h-10 grid place-items-center rounded-full text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] transition shrink-0";
const linkCls = ({ isActive }: { isActive: boolean }) =>
  `text-[13px] font-bold tracking-wide transition-colors hover:text-bronze py-1 ${isActive ? "text-bronze" : "text-ink dark:text-[#f3ede3]"}`;

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setQ("");
    ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="absolute inset-x-0 top-full border-t border-line dark:border-[#2e2822] bg-white dark:bg-[#191512] shadow-lg fade-in z-30" role="dialog" aria-modal="true" aria-label={t("search", lang)}>
      <form
        className="shell py-4 flex items-center gap-3"
        onSubmit={(e) => { e.preventDefault(); onClose(); nav(`/shop?q=${encodeURIComponent(q)}`); }}
      >
        <SearchIcon className="w-5 h-5 text-mute shrink-0" />
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search", lang)}
          aria-label={t("search", lang)}
          className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-ink dark:text-[#f3ede3] placeholder:text-[#b9b0a2] min-w-0"
        />
        <button type="button" onClick={onClose} aria-label={t("close", lang)} className={iconBtn}>
          <XIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang } = useLang();
  const location = useLocation();
  useEffect(() => { onClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const links = [
    { to: "/", label: t("home", lang) },
    { to: "/shop", label: t("shopAll", lang) },
    { to: "/categories", label: t("categories", lang) },
    { to: "/track-order", label: t("myAccount", lang) },
    { to: "/contact", label: t("contact", lang) },
  ];
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("menu", lang)}>
      <button className="absolute inset-0 bg-black/40 fade-in" onClick={onClose} aria-label={t("close", lang)} />
      <nav className="drawer-panel absolute start-0 top-0 bottom-0 w-[86%] max-w-sm bg-white dark:bg-[#191512] shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-line dark:border-[#2e2822]">
          <img src="/logo.png" alt="JiA" className="w-10 h-10 rounded-full object-cover" />
          <button onClick={onClose} aria-label={t("close", lang)} className={iconBtn}><XIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-4 grid gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `py-3.5 px-4 rounded-xl font-display text-[1.05rem] font-bold ${isActive ? "bg-sand text-bronze dark:bg-[#201a15]" : "text-ink dark:text-[#f3ede3] hover:bg-cream dark:hover:bg-[#201a15]"}`}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="mt-auto p-4 border-t border-line dark:border-[#2e2822] grid gap-3">
          <button onClick={() => { setLang(lang === "ar" ? "en" : "ar"); onClose(); }}
            className="justify-self-start text-xs font-bold border border-line dark:border-[#2e2822] rounded-full px-4 py-2 hover:bg-sand dark:hover:bg-[#201a15] transition">
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <p className="text-xs text-mute dark:text-[#a89f92]">
            <span>{t("perksCod", lang)} • </span><span dir="auto">ج.م EGP</span>
          </p>
        </div>
      </nav>
    </div>
  );
}

export function Navbar() {
  const { lang, setLang } = useLang();
  const { cartCount, wishlist, setCartOpen } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const links = [
    { to: "/", label: t("home", lang) },
    { to: "/shop", label: t("shopAll", lang) },
    { to: "/categories", label: t("categories", lang) },
    { to: "/contact", label: t("contact", lang) },
  ];
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#14110e]/95 backdrop-blur border-b border-line dark:border-[#2e2822]">
      {/* Announcement bar */}
      <div className="bg-ink dark:bg-[#201a15] text-[#f3ede3] text-center text-[11px] sm:text-xs font-semibold py-2 px-3">
        {t("announcement", lang)}
      </div>

      {/* Main bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 md:h-[4.5rem]">
        {/* Start */}
        <div className="flex items-center gap-1 ps-2 sm:ps-4">
          <button onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-label={t("menu", lang)} className={`${iconBtn} md:hidden`}>
            <MenuIcon className="w-5 h-5" />
          </button>
          <nav className="hidden lg:flex items-center gap-6 ps-2" aria-label="main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>
            ))}
          </nav>
        </div>

        {/* Centered logo */}
        <Link to="/" className="flex flex-col items-center justify-center gap-0.5 px-2 select-none" aria-label="JiA Silk & Essentials — الرئيسية">
          <img src="/logo.png" alt="" aria-hidden="true" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover shrink-0" />
          <span className="font-display font-bold text-[1.05rem] md:text-xl leading-none text-ink dark:text-[#f3ede3]">{"JiA"}</span>
          <span className="hidden min-[380px]:block text-[9px] tracking-[0.28em] uppercase text-bronze leading-none">Silk &amp; Essentials</span>
        </Link>

        {/* End actions */}
        <div className="flex items-center justify-end gap-0.5 pe-2 sm:pe-4">
          <button onClick={() => setSearchOpen((s) => !s)} aria-expanded={searchOpen} aria-label={t("search", lang)} className={`${iconBtn} hidden sm:grid`}>
            <SearchIcon className="w-5 h-5" />
          </button>
          <Link to="/track-order" aria-label={t("myAccount", lang)} className={`${iconBtn} hidden sm:grid`}>
            <UserIcon className="w-5 h-5" />
          </Link>
          <Link to="/shop?wish=1" aria-label={t("wishlist", lang)} className={iconBtn}>
            <HeartIcon className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -end-0.5 bg-bronze text-white text-[10px] min-w-4 h-4 px-1 grid place-items-center rounded-full font-bold">{wishlist.length}</span>
            )}
          </Link>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            aria-label={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
            className="hidden md:grid w-10 h-10 place-items-center rounded-full text-[11px] font-extrabold text-bronze border border-line dark:border-[#2e2822] hover:bg-sand dark:hover:bg-[#201a15] transition shrink-0">
            {lang === "ar" ? "EN" : "ع"}
          </button>
          <ThemeToggle />
          <button onClick={() => setCartOpen(true)} aria-label={`${t("cart", lang)} (${cartCount})`} className={iconBtn}>
            <CartIcon className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 bg-ink dark:bg-bronze text-white text-[10px] min-w-4 h-4 px-1 grid place-items-center rounded-full font-bold" aria-hidden="true">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile inline nav (below logo, tablet down) */}
      <nav className="hidden max-[1023px]:hidden sm:flex lg:hidden sm:pb-2.5 sm:-mt-1 sm:gap-6 justify-center" aria-label="main-compact" data-nav="tablet">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>
        ))}
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

const socialBtn = "w-9 h-9 grid place-items-center rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/40 transition";

export function Footer() {
  const { lang } = useLang();
  return (
    <footer className="mt-20 bg-ink dark:bg-[#191512] text-[#f3ede3]/85">
      <div className="shell py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="font-display font-bold text-xl text-white">JiA <span className="text-bronze">•</span> Silk &amp; Essentials</div>
          <p className="text-sm text-white/65 mt-3 leading-relaxed">{t("footerAbout", lang)}</p>
          <div className="mt-5 flex gap-2">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className={socialBtn}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className={socialBtn}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
            </a>
            <a href={SITE_CONFIG.admin.whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={socialBtn}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok" className={socialBtn}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M16 3v8.6a4.2 4.2 0 1 1-3.6-4.16" /><path d="M16 3c.4 2.3 1.9 3.9 4.4 4.2" /></svg>
            </a>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-bronze mb-4">{t("quickLinks", lang)}</div>
          <div className="grid gap-2.5 text-sm">
            <Link className="hover:text-white transition w-fit" to="/shop">{t("shopAll", lang)}</Link>
            <Link className="hover:text-white transition w-fit" to="/categories">{t("categories", lang)}</Link>
            <Link className="hover:text-white transition w-fit" to="/shop?wish=1">{t("wishlist", lang)}</Link>
            <Link className="hover:text-white transition w-fit" to="/contact">{t("contact", lang)}</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-bronze mb-4">{t("customerService", lang)}</div>
          <div className="grid gap-2.5 text-sm">
            <Link className="hover:text-white transition w-fit" to="/track-order">{t("trackOrder", lang)}</Link>
            <span>{t("codNoteFooter", lang)}</span>
            <span>{t("allGov", lang)}</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-bronze mb-4">{t("contact", lang)}</div>
          <div className="text-sm grid gap-2.5">
            <a href={SITE_CONFIG.admin.telLink} dir="ltr" className="hover:text-white transition w-fit inline-flex items-center gap-1.5"><PhoneIcon className="w-4 h-4" /> {SITE_CONFIG.admin.phoneLocal}</a>
            <a href={SITE_CONFIG.admin.whatsappLink} target="_blank" rel="noreferrer" className="hover:text-white transition w-fit">{t("whatsappUs", lang)}</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs py-5 text-white/50">
        © 2026 JiA — Silk &amp; Essentials · {t("copyright", lang)} · {t("madeInEgypt", lang)}
      </div>
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
      className="fixed bottom-5 end-5 z-40 w-[3.25rem] h-[3.25rem] rounded-full bg-[#23b26b] grid place-items-center shadow-lg hover:scale-105 transition btn-press">
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.4 0 .1 0 .5-.2 1.2Z" /></svg>
    </a>
  );
}

export function Toasts() {
  const { toasts } = useShop();
  return (
    <div className="fixed bottom-20 inset-x-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="bg-ink text-[#f3ede3] text-sm px-5 py-2.5 rounded-full shadow-xl animate-fadeUp" role="status">{toast.msg}</div>
      ))}
    </div>
  );
}
