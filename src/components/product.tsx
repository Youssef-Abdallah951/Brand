import { Link } from "react-router-dom";
import { useState } from "react";
import type { Product } from "../lib/types";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { Stars } from "./chrome";
import { HeartIcon, ImageIcon } from "./icons";
import { firstProductImage } from "../lib/productImage";

export { firstProductImage, isDirectImageUrl, categoryFallbackUrl, categoryImageUrl, onCategoryImgError } from "../lib/productImage";

export function productImage(p: Product, idx = 0): string {
  return firstProductImage(p.images, undefined, idx);
}

/**
 * Graceful <img> failure chain:
 *   WebP → same-name JPG (public/images keeps a duplicate) → branded
 *   placeholder → hide. Remote Supabase URLs go straight to the placeholder.
 * The card behind keeps its tinted background in every case.
 */
export function onImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const el = e.currentTarget;
  const step = el.dataset.fbk ?? "";
  const src = el.getAttribute("src") ?? "";
  let next: string;
  if (step === "") {
    next = src.toLowerCase().endsWith(".webp")
      ? src.replace(/\.webp$/i, ".jpg")
      : "/images/placeholder.jpg";
  } else if (step === "jpg") {
    next = "/images/placeholder.jpg";
  } else {
    el.style.display = "none";
    return;
  }
  if (!next || next === src) {
    el.style.display = "none";
    return;
  }
  el.dataset.fbk = step === "" ? "jpg" : "ph";
  el.src = next;
}

/** Small name element reused by card + quick view + PDP. */
export function ProductName({ p, className }: { p: Product; className?: string }) {
  const { lang } = useLang();
  return (
    <span className={`font-semibold text-ink dark:text-[#f3ede3] ${className ?? ""}`}>
      {lang === "ar" ? p.nameAr : p.nameEn}
    </span>
  );
}

export function CardBadges({ p }: { p: Product }) {
  const { lang } = useLang();
  const onSale = !!p.salePrice && p.salePrice < p.price;
  const tag = p.tags?.[0];
  if (!tag && !onSale) return null;
  return (
    <div className="absolute top-3 start-3 z-10 flex flex-col items-start gap-1.5">
      {tag === "new" && (
        <span className="bg-ink/90 text-[#f3ede3] text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide">{t("newTag", lang)}</span>
      )}
      {tag === "bestseller" && (
        <span className="bg-bronze/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide">{t("bestsellerTag", lang)}</span>
      )}
      {onSale && (
        <span className="bg-clay text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide">{t("saleTag", lang)}</span>
      )}
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const { lang } = useLang();
  const { addToCart, toggleWish, wishlist, setQuickView, setCartOpen, pushToast } = useShop();
  const [addState, setAddState] = useState<"idle" | "busy" | "done">("idle");
  const wished = wishlist.includes(p.id);
  const name = lang === "ar" ? p.nameAr : p.nameEn;
  const out = p.stock <= 0;
  const imgA = productImage(p);
  const imgB = productImage(p, 1);
  const sale = !!p.salePrice && p.salePrice < p.price ? p.salePrice : undefined;
  const firstColor = p.colors?.[0]?.ar;

  const quickAdd = async () => {
    if (out || addState !== "idle") return;
    addToCart(p.id, 1, undefined, firstColor);
    pushToast(t("addedToCart", lang));
    setCartOpen(true);
    setAddState("busy");
    window.setTimeout(() => setAddState("done"), 420);
    window.setTimeout(() => setAddState("idle"), 1700);
  };

  return (
    <article className="group relative flex flex-col min-w-0">
      {/* Image */}
      <div className="relative overflow-hidden rounded-2xl bg-sand dark:bg-[#201a15]">
        <Link to={`/product/${p.slug}`} className="block aspect-[3/4]" aria-label={name}>
          {imgA ? (
            <>
              <img src={imgA} onError={onImgError} alt={name}
                loading="lazy"
                className={`product-photo absolute inset-0 w-full h-full object-cover transition duration-500 ${imgB ? "group-hover:opacity-0" : ""}`} />
              {imgB && (
                <img src={imgB} onError={onImgError} alt="" aria-hidden="true"
                  loading="lazy"
                  className="product-photo absolute inset-0 w-full h-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
              )}
            </>
          ) : (
            <span className="absolute inset-0 grid place-items-center text-bronze/60 dark:text-[#6b6155]"><ImageIcon className="w-10 h-10" /></span>
          )}
        </Link>
        <CardBadges p={p} />
        {out && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-6 bg-ink/80 text-[#f3ede3] text-center text-xs font-bold py-2 rounded-full" aria-hidden="true">{t("soldOut", lang)}</span>
        )}

        {/* Hover actions */}
        <div className="absolute top-3 end-3 z-10 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition duration-300">
          <button
            onClick={() => toggleWish(p.id)}
            aria-label={wished ? t("removeWish", lang) : t("addWish", lang)}
            aria-pressed={wished}
            className={`w-9 h-9 grid place-items-center rounded-full backdrop-blur ${wished ? "bg-bronze text-white" : "bg-white/90 text-ink hover:bg-white dark:bg-[#1c1815]/90 dark:text-[#f3ede3] dark:hover:bg-[#1c1815]"}`}
          >
            <HeartIcon filled={wished} className="w-4 h-4" />
          </button>
          <button
            onClick={() => setQuickView(p)}
            aria-label={t("quickView", lang) + " — " + name}
            className="w-9 h-9 grid place-items-center rounded-full bg-white/90 text-ink hover:bg-white dark:bg-[#1c1815]/90 dark:text-[#f3ede3] dark:hover:bg-[#1c1815] backdrop-blur"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
        </div>

        {/* Quick add — slides up on hover (desktop), always visible on mobile */}
        <div className="absolute inset-x-3 bottom-3 translate-y-0 opacity-100 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition duration-300">
          <button
            disabled={out}
            onClick={quickAdd}
            className={`w-full min-h-[44px] rounded-full text-sm font-bold transition-colors ${out
              ? "bg-ink/50 text-white/80 cursor-not-allowed"
              : addState === "done"
                ? "bg-bronze-deep text-white"
                : "bg-ink text-[#f3ede3] hover:bg-black"}`}
          >
            {out ? t("soldOut", lang) : addState === "busy" ? t("addToCartBusy", lang) : addState === "done" ? t("addToCartDone", lang) : t("quickAdd", lang)}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="pt-3 pb-1 px-0.5 flex flex-col gap-1">
        <ProductName p={p} className="text-sm leading-snug line-clamp-2 min-h-[2.6rem]" />
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-extrabold text-[0.95rem] ${sale ? "text-clay" : "text-ink dark:text-[#f3ede3]"}`} dir="auto">
            {fmtPrice(sale ?? p.price, lang)}
          </span>
          {sale && (
            <s className="text-xs text-mute dark:text-[#8d8478]" dir="auto">{fmtPrice(p.price, lang)}</s>
          )}
        </div>
        {p.reviewsCount > 0 && (
          <div className="flex items-center gap-1.5 opacity-80">
            <Stars value={p.rating ?? 0} />
            <span className="text-[11px] text-mute dark:text-[#8d8478]">({p.reviewsCount})</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function SectionTitle({ overline, title, sub }: { overline?: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col text-center gap-2 mb-8">
      {overline && <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-bronze">{overline}</span>}
      <h2 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">{title}</h2>
      {sub && <p className="text-mute dark:text-[#a89f92] text-sm max-w-xl mx-auto">{sub}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-none">
      <div className="rounded-2xl overflow-hidden bg-sand dark:bg-[#201a15]">
        <div className="skel aspect-[3/4]" />
      </div>
      <div className="pt-3 space-y-2">
        <div className="skel h-4 rounded w-3/4" />
        <div className="skel h-4 rounded w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5">
      {Array.from({ length: n }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** Full-page fallback shown by Suspense while a route chunk is loading. */
export function PageLoader() {
  return (
    <div className="min-h-[70vh] grid place-items-center" role="status" aria-live="polite">
      <div className="w-full max-w-6xl shell">
        <SkeletonGrid n={8} />
      </div>
    </div>
  );
}
