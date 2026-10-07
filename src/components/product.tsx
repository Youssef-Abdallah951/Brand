import { Link } from "react-router-dom";
import type { Product } from "../lib/types";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { Price, Stars } from "./chrome";
import { ArrowLeftIcon, HeartIcon, ImageIcon } from "./icons";
import { firstProductImage } from "../lib/productImage";

export { firstProductImage, isDirectImageUrl, categoryFallbackUrl, categoryImageUrl, onCategoryImgError } from "../lib/productImage";

export function productImage(p: Product, idx = 0): string {
  return firstProductImage(p.images, undefined, idx);
}

export function onImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
  // Broken remote image → hide the element (never swap in fake/mock imagery).
  e.currentTarget.style.display = "none";
}

export function ProductCard({ p }: { p: Product }) {
  const { lang } = useLang();
  const { addToCart, toggleWish, wishlist, pushToast } = useShop();
  const wished = wishlist.includes(p.id);
  const name = lang === "ar" ? p.nameAr : p.nameEn;
  const out = p.stock <= 0;
  const cardImg = productImage(p);
  return (
    <article className="group bg-white rounded-3xl border border-pink-100 overflow-hidden card-shadow hover:-translate-y-1 transition-all flex flex-col">
      <Link to={`/product/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-blush-100">
        {cardImg ? (
          <img src={cardImg} onError={onImgError} alt={name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        ) : (
          <span className="w-full h-full grid place-items-center bg-pink-50 text-pink-300"><ImageIcon className="w-12 h-12" /></span>
        )}
        {p.compareAt && (
          <span className="absolute top-3 start-3 bg-[#e84393] text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{Math.round((1 - p.price / p.compareAt) * 100)}%
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); toggleWish(p.id); }}
          aria-label="wishlist"
          className={`absolute top-3 end-3 w-9 h-9 grid place-items-center rounded-full shadow ${wished ? "bg-[#e84393] text-white" : "bg-white text-gray-500"}`}
        >
          <HeartIcon filled={wished} className="w-4 h-4" />
        </button>
        {p.stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-center text-sm py-1.5">{t("outOfStock", lang)}</span>
        )}
      </Link>
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5">
          <Stars value={p.rating} />
          <span className="text-xs text-gray-400">({p.reviewsCount})</span>
        </div>
        <Link to={`/product/${p.slug}`} className="font-semibold text-[15px] leading-snug line-clamp-2 min-h-[42px]">{name}</Link>
        <Price price={p.price} compareAt={p.compareAt} lang={lang} />
        <button
          disabled={out}
          onClick={() => { addToCart(p.id); pushToast(lang === "ar" ? "تمت إضافة المنتج إلى السلة" : "Product added to cart"); }}
          className="mt-auto w-full rounded-2xl bg-[#2b7de9] hover:bg-[#1f63c4] disabled:bg-gray-300 text-white font-bold py-2.5 text-sm btn-press transition"
        >
          {t("addToCart", lang)}
        </button>
      </div>
    </article>
  );
}

export function SectionTitle({ title, sub, link, linkLabel }: { title: string; sub?: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold">{title}</h2>
        {sub && <p className="text-gray-500 text-sm mt-1">{sub}</p>}
      </div>
      {link && <Link to={link} className="text-sm font-bold text-[#c2185b] hover:underline shrink-0 inline-flex items-center gap-1">{linkLabel} <ArrowLeftIcon className="w-4 h-4" /></Link>}
    </div>
  );
}

export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-pink-100 overflow-hidden animate-pulse">
          <div className="aspect-[4/5] bg-pink-100" />
          <div className="p-3 space-y-2"><div className="h-4 bg-pink-100 rounded" /><div className="h-4 w-2/3 bg-pink-100 rounded" /></div>
        </div>
      ))}
    </div>
  );
}
