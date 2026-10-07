import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { ProductCard } from "../components/product";
import { AlertIcon, ChevronDownIcon, ChevronUpIcon, FilterIcon, HeartIcon, ImageIcon, RetryIcon } from "../components/icons";

export default function Shop() {
  const { lang } = useLang();
  const { products, productsLoading, productsError, reloadProducts, wishlist, categories } = useShop();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [cat, setCat] = useState(params.get("cat") || "all");
  const [sort, setSort] = useState("new");
  const [maxPrice, setMaxPrice] = useState(1500);
  const [inStock, setInStock] = useState(false);
  const [visible, setVisible] = useState(12);
  const [showFilters, setShowFilters] = useState(false);

  // Stay in sync when navigating (e.g. navbar search while already on /shop)
  const urlQ = params.get("q") || "";
  const urlCat = params.get("cat") || "all";
  const wishOnly = params.get("wish") === "1";
  useEffect(() => { setQ(urlQ); }, [urlQ]);
  useEffect(() => { setCat(urlCat); }, [urlCat]);
  useEffect(() => { setVisible(12); }, [urlQ, urlCat, wishOnly]);

  const list = useMemo(() => {
    let l = [...products];
    if (wishOnly) l = l.filter((p) => wishlist.includes(p.id));
    if (cat !== "all") {
      {
        // Remote categories use uuid ids; seed products use "c-*" ids.
        // Match the selected slug against the live category list, then match
        // products by category id OR legacy seed id OR slug.
        const c = categories.find((x) => x.slug === cat);
        if (c) l = l.filter((p) => p.categoryId === c.id || p.categoryId === c.slug);
      }
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter((p) => (p.nameEn + p.nameAr + p.descEn + p.descAr).toLowerCase().includes(s));
    }
    l = l.filter((p) => p.price <= maxPrice);
    if (inStock) l = l.filter((p) => p.stock > 0);
    if (sort === "low") l.sort((a, b) => a.price - b.price);
    if (sort === "high") l.sort((a, b) => b.price - a.price);
    if (sort === "rating") l.sort((a, b) => b.rating - a.rating);
    return l;
  }, [products, cat, q, sort, maxPrice, inStock, wishOnly, wishlist, categories]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-display text-3xl font-bold inline-flex items-center gap-2">
        {wishOnly && <HeartIcon className="w-7 h-7 text-[#e84393]" />} {wishOnly ? t("wishlist", lang) : t("shop", lang)}
      </h1>
      {productsError && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-amber-800 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><AlertIcon className="w-4 h-4" /> {t("cachedList", lang)}</span>
          <button onClick={reloadProducts} disabled={productsLoading} className="underline disabled:opacity-60 inline-flex items-center gap-1">
            <RetryIcon className="w-4 h-4" /> {productsLoading ? "…" : t("retryLoad", lang)}
          </button>
        </div>
      )}

      {/* Mobile filter toggle */}
      <button
        onClick={() => setShowFilters((s) => !s)}
        className="lg:hidden mt-4 flex items-center gap-2 rounded-2xl border-2 border-pink-200 px-4 py-2.5 text-sm font-bold text-[#c2185b] bg-white"
      >
        <FilterIcon className="w-4 h-4" /> {lang === "ar" ? "الفلاتر" : "Filters"}
        {showFilters ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
      </button>

      <div className="mt-4 flex flex-col lg:flex-row gap-5">
        {/* Filters */}
        <aside className={`lg:w-64 shrink-0 bg-white border border-pink-100 rounded-3xl p-5 h-fit lg:sticky lg:top-32 ${showFilters ? "block" : "hidden lg:block"}`}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search", lang)} className="w-full rounded-2xl border border-pink-200 bg-pink-50/50 px-4 py-2.5 outline-none focus:border-[#e84393] mb-4" />
          <div className="font-bold text-sm mb-2">{t("categories", lang)}</div>
          <div className="grid gap-1 mb-4">
            {[{ slug: "all", en: "All", ar: "الكل" }, ...categories.map((c) => ({ slug: c.slug, en: c.nameEn, ar: c.nameAr }))].map((c) => (
              <button key={c.slug} onClick={() => { setCat(c.slug); setShowFilters(false); }} className={`text-start text-sm px-3 py-2 rounded-xl ${cat === c.slug ? "bg-pink-100 text-[#c2185b] font-bold" : "hover:bg-pink-50 text-gray-600"}`}>
                {lang === "ar" ? c.ar : c.en}
              </button>
            ))}
          </div>
          <label className="font-bold text-sm">{lang === "ar" ? `السعر حتى ${maxPrice} ج` : `Up to EGP ${maxPrice}`}</label>
          <input type="range" min={150} max={1500} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#e84393] my-2" />
          <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-[#e84393] w-4 h-4" /> {lang === "ar" ? "متوفر فقط" : "In stock only"}</label>
          <div className="font-bold text-sm mt-4 mb-2">{lang === "ar" ? "ترتيب" : "Sort"}</div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full rounded-2xl border border-pink-200 px-3 py-2.5 text-sm">
            <option value="new">{lang === "ar" ? "الأحدث" : "Newest"}</option>
            <option value="low">{lang === "ar" ? "السعر: من الأقل" : "Price: Low to High"}</option>
            <option value="high">{lang === "ar" ? "السعر: من الأعلى" : "Price: High to Low"}</option>
            <option value="rating">{lang === "ar" ? "الأعلى تقييماً" : "Top Rated"}</option>
          </select>
        </aside>
        {/* Grid */}
        <section className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 mb-3">{list.length} {lang === "ar" ? "منتج" : "products"}</div>
          {productsLoading && list.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-pink-100 overflow-hidden animate-pulse">
                  <div className="aspect-[4/5] bg-pink-100" />
                  <div className="p-3 space-y-2"><div className="h-4 bg-pink-100 rounded" /><div className="h-4 w-2/3 bg-pink-100 rounded" /></div>
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-20 bg-pink-50 rounded-3xl">
              <div className="flex justify-center text-pink-300">{wishOnly ? <HeartIcon className="w-12 h-12" /> : <ImageIcon className="w-12 h-12" />}</div>
              <div className="font-bold mt-3">
                {wishOnly
                  ? (lang === "ar" ? "قائمة المفضلة فارغة" : "Your wishlist is empty")
                  : (lang === "ar" ? "لا توجد منتجات مطابقة" : "No products found")}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {list.slice(0, visible).map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              {visible < list.length && (
                <button onClick={() => setVisible((v) => v + 12)} className="mt-6 mx-auto block rounded-2xl border-2 border-pink-200 px-8 py-3 font-bold text-[#c2185b]">
                  {lang === "ar" ? "عرض المزيد" : "Load More"}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
