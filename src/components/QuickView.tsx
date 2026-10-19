import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { Stars } from "./chrome";
import { productImage, onImgError } from "./product";
import { ImageIcon, XIcon } from "./icons";

export function QuickView() {
  const { lang } = useLang();
  const { quickView, setQuickView, addToCart, toggleWish, wishlist } = useShop();
  const [activeImg, setActiveImg] = useState(0);
  const p = quickView;
  const [color, setColor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (p) { setActiveImg(0); setColor(p.colors?.[0]?.ar); }
    document.body.style.overflow = p ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [p]);

  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setQuickView(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, setQuickView]);

  if (!p) return null;
  const name = lang === "ar" ? p.nameAr : p.nameEn;
  const out = p.stock <= 0;
  const sale = p.salePrice && p.salePrice < p.price ? p.salePrice : undefined;
  const gallery = [0, 1, 2].map((i) => productImage(p, i)).filter((v, i, a) => a.indexOf(v) === i);
  const wished = wishlist.includes(p.id);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={t("quickView", lang)}>
      <button className="absolute inset-0 bg-black/50 fade-in" onClick={() => setQuickView(null)} aria-label={t("close", lang)} />
      <article className="drawer-panel relative w-full max-w-3xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#191512] rounded-3xl soft-shadow grid sm:grid-cols-2">
        <button onClick={() => setQuickView(null)} aria-label={t("close", lang)}
          className="absolute top-3 end-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-white/90 dark:bg-[#1c1815]/90 text-ink dark:text-[#f3ede3] shadow hover:scale-105 transition">
          <XIcon className="w-5 h-5" />
        </button>

        {/* Gallery */}
        <div className="relative bg-sand dark:bg-[#201a15] rounded-t-3xl sm:rounded-t-none sm:rounded-s-3xl overflow-hidden">
          {gallery[activeImg] ? (
            <img src={gallery[activeImg]} onError={onImgError} alt={name} className="product-photo w-full aspect-[3/4] object-cover" loading="lazy" />
          ) : (
            <div className="aspect-[3/4] grid place-items-center text-bronze/60"><ImageIcon className="w-10 h-10" /></div>
          )}
          {gallery.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
              {gallery.map((_, i) => (
                <button key={i} onClick={() => setActiveImg(i)} aria-label={`Image ${i + 1}`} aria-pressed={activeImg === i}
                  className={`w-2.5 h-2.5 rounded-full transition ${activeImg === i ? "bg-bronze scale-110" : "bg-white/60 hover:bg-white"}`} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-6 sm:p-8 flex flex-col gap-3">
          {p.tags?.[0] && (
            <span className="w-fit text-[11px] font-bold tracking-wide bg-cream dark:bg-[#201a15] text-bronze px-2.5 py-1 rounded-full">{t(p.tags[0] === "new" ? "newTag" : "bestsellerTag", lang)}</span>
          )}
          <h2 className="font-display text-2xl font-bold leading-snug text-ink dark:text-[#f3ede3]">{name}</h2>
          <div className="flex items-center gap-2">
            <Stars value={p.rating} />
            <span className="text-xs text-mute dark:text-[#a89f92]" dir="auto">
              {fmtPrice(sale ?? p.price, lang)}{p.reviewsCount > 0 ? ` · ${p.reviewsCount} ${t("reviewsCount", lang)}` : ""}
            </span>
          </div>
          {sale && (
            <div className="flex items-baseline gap-2" dir="auto">
              <span className="text-xl font-extrabold text-clay">{fmtPrice(sale, lang)}</span>
              <s className="text-sm text-mute dark:text-[#8d8478]">{fmtPrice(p.price, lang)}</s>
            </div>
          )}

          {p.colors && p.colors.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink dark:text-[#f3ede3] mb-1.5">{t("chooseFirst", lang)}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("color", lang)}>
                {p.colors.map((c) => (
                  <button key={c.en} role="radio" aria-checked={color === c.ar} aria-label={lang === "ar" ? c.ar : c.en}
                    onClick={() => setColor(c.ar)}
                    className={`min-w-11 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition ${color === c.ar
                      ? "border-bronze bg-bronze text-white"
                      : "border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}
                    dir="auto">
                    {c.ar}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-3 grid gap-2.5">
            <button
              disabled={out}
              onClick={() => { addToCart(p.id, 1, undefined, color); setQuickView(null); }}
              className={`w-full min-h-[46px] rounded-full text-sm font-bold transition-colors ${out ? "bg-ink/40 text-white/70 cursor-not-allowed" : "bg-ink text-[#f3ede3] hover:bg-bronze-deep"}`}
            >
              {out ? t("soldOut", lang) : t("addToCart", lang)}
            </button>
            <div className="grid grid-cols-[1fr_auto] gap-2.5">
              <Link onClick={() => setQuickView(null)} to={`/product/${p.slug}`}
                className="min-h-[46px] grid place-items-center rounded-full border border-line dark:border-[#2e2822] text-sm font-bold text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] transition">
                {t("viewDetails", lang)}
              </Link>
              <button onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={t("addWish", lang)}
                className="min-h-[46px] px-4 grid place-items-center rounded-full border border-line dark:border-[#2e2822] hover:bg-sand dark:hover:bg-[#201a15] transition">
                <svg viewBox="0 0 24 24" className={`w-5 h-5 ${wished ? "fill-bronze stroke-bronze" : "fill-none stroke-ink dark:stroke-[#f3ede3]"}`} strokeWidth={2} aria-hidden="true">
                  <path d="M20.4 4.6A5.5 5.5 0 0 0 12 4.7a5.5 5.5 0 0 0-8.4 7.7c.1.1 8.4 8.4 8.4 8.4l8.4-8.4a5.5 5.5 0 0 0 0-7.8Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
