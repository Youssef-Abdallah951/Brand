import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { ProductCard, SectionTitle, categoryFallbackUrl, categoryImageUrl, onCategoryImgError, onImgError } from "../components/product";
import { AlertIcon, CashIcon, ChatIcon, ImageIcon, LockIcon, RetryIcon, SparklesIcon, TruckIcon } from "../components/icons";

export default function Home() {
  const { lang } = useLang();
  const { products, productsError, productsLoading, reloadProducts, categories } = useShop();
  const best = products.filter((p) => p.bestseller).slice(0, 8);
  const feat = products.filter((p) => p.featured).slice(0, 4);

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff0f5] via-[#ffe0ec] to-[#fff9f5] dark:from-[#140509] dark:via-[#1c0a12] dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="animate-fadeUp">
            <h1 className="font-display text-[1.9rem] sm:text-[2.7rem] lg:text-[3.4rem] font-bold leading-[1.15] text-[#171717] dark:text-white">{t("heroTitle", lang)}</h1>
            <p className="text-[#525252] dark:text-[#D4D4D4] mt-4 text-[0.95rem] sm:text-[1.05rem] max-w-md">{t("heroSub", lang)}</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/shop" className="rounded-2xl bg-[#e84393] hover:bg-[#c2185b] text-white font-bold px-8 py-3.5 btn-press shadow-lg shadow-pink-300 dark:shadow-none">{t("shopNow", lang)}</Link>
            </div>
            <div className="flex gap-6 mt-8 text-sm">
              {[
                { icon: <TruckIcon className="w-5 h-5 text-[#e84393] dark:text-[#ff8fb8]" />, label: lang === "ar" ? "توصيل سريع" : "Fast Delivery" },
                { icon: <CashIcon className="w-5 h-5 text-[#e84393] dark:text-[#ff8fb8]" />, label: lang === "ar" ? "الدفع عند الاستلام" : "Cash on Delivery" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">{icon}<span className="font-semibold text-[#525252] dark:text-[#D4D4D4]">{label}</span></div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80" onError={onImgError} alt="hero" className="product-photo rounded-[2rem] card-shadow w-full aspect-[4/5] sm:aspect-square object-cover animate-floaty" />
          </div>
        </div>
      </section>

      {productsError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-5 py-3 text-sm font-bold text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5"><AlertIcon className="w-4 h-4" /> {t("cachedList", lang)}</span>
            <button onClick={reloadProducts} disabled={productsLoading} className="underline disabled:opacity-60 inline-flex items-center gap-1">
              <RetryIcon className="w-4 h-4" /> {productsLoading ? "…" : t("retryLoad", lang)}
            </button>
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        <SectionTitle title={t("categories", lang)} link="/categories" linkLabel={lang === "ar" ? "عرض الكل" : "View all"} />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories.map((c) => (
            <Link key={c.id} to={`/shop?cat=${c.slug}`} className="group text-center">
              <div className="rounded-3xl overflow-hidden aspect-square border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#0A0A0A] group-hover:border-[#e84393] transition">
                {(() => {
                  const tile = categoryImageUrl(c.image, c.slug);
                  const fallback = categoryFallbackUrl(c.slug);
                  const alt = lang === "ar" ? c.nameAr : c.nameEn;
                  return tile ? <img src={tile} onError={(e) => onCategoryImgError(e, tile === fallback ? undefined : fallback)} alt={alt} loading="lazy" className="product-photo w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <span className="w-full h-full grid place-items-center bg-pink-50 dark:bg-[#161616] text-pink-300 dark:text-neutral-600"><ImageIcon className="w-10 h-10" /></span>;
                })()}
              </div>
              <div className="text-sm font-bold mt-2 text-[#171717] dark:text-white">{lang === "ar" ? c.nameAr : c.nameEn}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14">
        <SectionTitle title={t("bestSellers", lang)} sub={lang === "ar" ? "الأكثر طلباً من عميلاتنا" : "Loved by our customers"} link="/shop" linkLabel={lang === "ar" ? "تسوقي الكل" : "Shop all"} />
        {best.length === 0 && !productsLoading ? (
          <div className="text-center py-14 bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#333333] rounded-3xl">
            <div className="flex justify-center text-pink-300 dark:text-neutral-600"><ImageIcon className="w-12 h-12" /></div>
            <div className="font-bold mt-2 text-sm text-[#171717] dark:text-white">{lang === "ar" ? "لا توجد منتجات حالياً" : "No products right now"}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {best.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* DELIVERY BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14">
        <div className="rounded-[2rem] overflow-hidden bg-gradient-to-l from-[#2b2b30] to-[#4a2b3d] dark:from-[#0A0A0A] dark:to-[#1c0a12] dark:border dark:border-[#333333] text-white grid md:grid-cols-2">
          <div className="p-8 sm:p-12">
            <h2 className="font-display text-[1.7rem] sm:text-[2.1rem] font-bold">{t("beautyDoor", lang)}</h2>
            <p className="text-white/70 dark:text-[#D4D4D4] mt-3">{t("beautyDoorSub", lang)}</p>
            <Link to="/shop" className="inline-block mt-6 bg-[#e84393] hover:bg-[#ff5ba6] text-white font-bold px-8 py-3 rounded-2xl btn-press">{t("shopNow", lang)}</Link>
          </div>
          <img src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80" alt="delivery" className="product-photo h-64 md:h-auto object-cover" loading="lazy" />
        </div>
      </section>

      {feat.length > 0 && (
        <section className="bg-white dark:bg-black border-y border-[#E5E5E5] dark:border-[#333333] mt-14 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionTitle title={lang === "ar" ? "مختارات JiA" : "JiA Picks"} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
              {feat.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* WHY US */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { icon: <TruckIcon className="w-6 h-6 text-[#e84393] dark:text-[#ff8fb8]" />, title: lang === "ar" ? "توصيل سريع" : "Fast Delivery", sub: lang === "ar" ? "لجميع المحافظات" : "All governorates" },
            { icon: <CashIcon className="w-6 h-6 text-[#e84393] dark:text-[#ff8fb8]" />, title: lang === "ar" ? "الدفع عند الاستلام" : "Cash on Delivery", sub: lang === "ar" ? "ادفعي عند وصول طلبك" : "Pay when it arrives" },
            { icon: <LockIcon className="w-6 h-6 text-[#e84393] dark:text-[#ff8fb8]" />, title: lang === "ar" ? "دفع آمن" : "Secure Payment", sub: lang === "ar" ? "خيارات دفع موثوقة" : "Trusted options" },
            { icon: <SparklesIcon className="w-6 h-6 text-[#e84393] dark:text-[#ff8fb8]" />, title: lang === "ar" ? "منتجات أصلية" : "Original Products", sub: lang === "ar" ? "جودة مضمونة 100%" : "100% guaranteed" },
            { icon: <ChatIcon className="w-6 h-6 text-[#e84393] dark:text-[#ff8fb8]" />, title: lang === "ar" ? "خدمة عملاء" : "Support", sub: lang === "ar" ? "عبر واتساب يومياً" : "Via WhatsApp daily" },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#333333] rounded-3xl p-5 text-center card-shadow hover:transition-all hover:scale-105">
              <div className="flex justify-center">{icon}</div>
              <div className="font-bold text-sm mt-2 text-[#171717] dark:text-white">{title}</div>
              <div className="text-xs text-[#525252] dark:text-[#A3A3A3]">{sub}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
