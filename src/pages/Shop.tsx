import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { ProductCard, SkeletonGrid } from "../components/product";
import { AlertIcon, ChevronDownIcon, ChevronUpIcon, FilterIcon, HeartIcon, ImageIcon, RetryIcon } from "../components/icons";
import type { ProductColor } from "../lib/types";

const sortLabels = { new: "sortNew", low: "sortPriceLow", high: "sortPriceHigh", rating: "sortRating" } as const;

export default function Shop() {
  const { lang } = useLang();
  const { products, productsLoading, productsError, reloadProducts, wishlist, categories } = useShop();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [cat, setCat] = useState(params.get("cat") || "all");
  const [color, setColor] = useState<string>("all");
  const [sort, setSort] = useState<keyof typeof sortLabels>("new");
  const [inStock, setInStock] = useState(false);
  const [visible, setVisible] = useState(12);
  const [showFilters, setShowFilters] = useState(false);

  const urlQ = params.get("q") || "";
  const urlCat = params.get("cat") || "all";
  const wishOnly = params.get("wish") === "1";
  useEffect(() => { setQ(urlQ); }, [urlQ]);
  useEffect(() => { setCat(urlCat); }, [urlCat]);
  useEffect(() => { setVisible(12); }, [urlQ, urlCat, wishOnly]);

  // Palette chips gathered from products' colour variants (dedup by Arabic name).
  const palette = useMemo(() => {
    const map = new Map<string, ProductColor>();
    products.forEach((p) => p.colors?.forEach((c) => { if (!map.has(c.ar)) map.set(c.ar, c); }));
    return [...map.values()].slice(0, 14);
  }, [products]);

  const list = useMemo(() => {
    let l = [...products];
    if (wishOnly) l = l.filter((p) => wishlist.includes(p.id));
    if (cat !== "all") {
      // Remote categories use uuid ids; seed products use "c-*" ids.
      // Match the selected slug against the live category list, then match
      // products by category id OR legacy seed id OR slug.
      const c = categories.find((x) => x.slug === cat);
      if (c) l = l.filter((p) => p.categoryId === c.id || p.categoryId === c.slug);
    }
    if (color !== "all") l = l.filter((p) => p.colors?.some((c) => c.ar === color));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter((p) => (p.nameEn + p.nameAr + p.descEn + p.descAr).toLowerCase().includes(s));
    }
    if (inStock) l = l.filter((p) => p.stock > 0);
    if (sort === "low") {
      l.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    } else if (sort === "high") {
      l.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    } else if (sort === "rating") {
      l.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return l;
  }, [products, cat, color, q, sort, inStock, wishOnly, wishlist, categories]);

  const headerTitle = wishOnly ? t("wishlist", lang) : cat === "all" ? t("shopAll", lang) : (lang === "ar" ? categories.find((c) => c.slug === cat)?.nameAr : categories.find((c) => c.slug === cat)?.nameEn) ?? t("shopAll", lang);

  return (
    <main>
      {/* Header */}
      <div>
        <div className="shell pt-8 pb-9">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3] inline-flex items-center gap-2.5">
              {wishOnly && <HeartIcon filled className="w-7 h-7 text-bronze" />} {headerTitle}
            </h1>
            <span className="text-sm text-mute dark:text-[#a89f92]">
              {list.length} {t("productsCount", lang)}
            </span>
          </header>
          {productsError && (
            <div className="mt-4 bg-clay/10 border border-clay/25 rounded-2xl px-5 py-3 font-bold flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 text-clay"><AlertIcon className="w-4 h-4" /> {t("cachedList", lang)}</span>
              <button onClick={reloadProducts} disabled={productsLoading} className="inline-flex items-center gap-1.5 underline underline-offset-4 text-clay disabled:opacity-50">
                <RetryIcon className="w-4 h-4" /> {t("retryLoad", lang)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="shell sticky top-0 z-30 bg-white/95 dark:bg-[#14110e]/95 backdrop-blur py-2.5 border-b border-line dark:border-[#2e2822]">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}
            className="inline-flex items-center gap-2 rounded-full border border-line dark:border-[#2e2822] px-4 py-2 text-xs font-bold text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] transition">
            <FilterIcon className="w-4 h-4" /> {t("filters", lang)}
            {showFilters ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>
          <label className="sr-only" htmlFor="shop-sort">{t("sort", lang)}</label>
          <select id="shop-sort" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof sortLabels)}
            className="rounded-full border border-line dark:border-[#2e2822] bg-transparent px-4 py-2 text-xs font-bold text-ink dark:text-[#f3ede3] outline-none">
            {(Object.keys(sortLabels) as Array<keyof typeof sortLabels>).map((k) => (
              <option key={k} value={k} className="dark:text-black">{t(sortLabels[k], lang)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="shell flex flex-col lg:flex-row gap-6 pt-5 pb-14">
        {/* Filters */}
        <aside className={`${showFilters ? "block" : "hidden lg:block"} w-full lg:w-60 shrink-0 lg:sticky lg:top-28 h-fit bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-4`}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search", lang)}
            className="w-full rounded-full bg-white dark:bg-[#1c1815] border border-line dark:border-[#2e2822] px-4 py-2.5 text-sm outline-none focus:border-bronze text-ink dark:text-[#f3ede3] mb-4" />

          <p className="text-[11px] font-bold tracking-wider uppercase text-mute dark:text-[#a89f92] mb-2">{t("filterCategory", lang)}</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {[{ slug: "all", en: t("all", lang), ar: t("all", lang) }, ...categories.map((c) => ({ slug: c.slug, en: c.nameEn, ar: c.nameAr }))].map((c) => (
              <button key={c.slug} onClick={() => { setCat(c.slug); setShowFilters(false); }} aria-pressed={cat === c.slug}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${cat === c.slug ? "bg-ink text-[#f3ede3]" : "bg-white dark:bg-[#201a15] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>
                {lang === "ar" ? c.ar : c.en}
              </button>
            ))}
          </div>

          {palette.length > 0 && (
            <>
              <p className="text-[11px] font-bold tracking-wider uppercase text-mute dark:text-[#a89f92] mb-2">{t("filterColor", lang)}</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                <button onClick={() => setColor("all")} aria-pressed={color === "all"}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${color === "all" ? "bg-ink text-[#f3ede3]" : "bg-white dark:bg-[#201a15] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>
                  {t("all", lang)}
                </button>
                {palette.map((c) => {
                  const active = color === c.ar;
                  return (
                    <button key={c.ar} onClick={() => setColor(c.ar)} aria-pressed={active} title={lang === "ar" ? c.ar : c.en}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition ${active ? "bg-ink text-[#f3ede3]" : "bg-white dark:bg-[#201a15] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20" style={{ background: c.hex }} aria-hidden="true" />
                      {lang === "ar" ? c.ar : c.en}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-ink dark:text-[#f3ede3] cursor-pointer">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="w-4 h-4 accent-bronze" />
            {t("inStockOnly", lang)}
          </label>

          {(color !== "all" || q.trim() || inStock || cat !== "all") && (
            <button onClick={() => { setColor("all"); setQ(""); setInStock(false); setCat("all"); }}
              className="mt-4 text-xs font-bold text-clay underline underline-offset-4">
              {t("clearFilters", lang)}
            </button>
          )}
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {productsLoading && list.length === 0 ? (
            <SkeletonGrid n={9} />
          ) : list.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border border-dashed border-line dark:border-[#2e2822]">
              <div className="text-bronze/70">{wishOnly ? <HeartIcon filled className="w-12 h-12 mx-auto" /> : <ImageIcon className="w-12 h-12 mx-auto" />}</div>
              <p className="font-display font-bold mt-3 text-ink dark:text-[#f3ede3]">
                {wishOnly ? t("emptyWishlist", lang) : t("noResults", lang)}
              </p>
              <Link to="/shop" onClick={() => { setQ(""); setColor("all"); setCat("all"); }} className="mt-5 inline-block text-sm font-bold text-bronze underline underline-offset-4">
                {t("shopAll", lang)}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-6 sm:gap-x-5">
                {list.slice(0, visible).map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              {visible < list.length && (
                <button onClick={() => setVisible((v) => v + 12)}
                  className="mt-8 mx-auto block min-h-[48px] px-9 rounded-full border border-ink dark:border-[#f3ede3] font-bold text-sm text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] transition btn-press">
                  {t("loadMore", lang)}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

