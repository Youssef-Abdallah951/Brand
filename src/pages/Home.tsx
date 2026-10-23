import { Link } from "react-router-dom";
import { useMemo } from "react";
import type { Category } from "../lib/types";
import { ProductCard, ProductRail, SectionTitle, SkeletonGrid, categoryImageUrl, onCategoryImgError, onImgError } from "../components/product";
import { Reveal, useReveal } from "../components/reveal";
import { AlertIcon, CashIcon, ChatIcon, ImageIcon, RetryIcon, SparklesIcon, TruckIcon } from "../components/icons";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { firstProductImage } from "../lib/productImage";
import { usePageMeta } from "../lib/meta";

export default function Home() {
  const { lang } = useLang();
  const { products, productsLoading, productsError, reloadProducts, categories } = useShop();

  const newDrops = useMemo(() => products.filter((p) => p.tags?.includes("new")).slice(0, 10), [products]);
  const bestsellers = useMemo(() => products.filter((p) => p.tags?.includes("bestseller")).slice(0, 8), [products]);
  const spotlight = useMemo(
    () => products.find((p) => p.salePrice && p.salePrice < p.price && (p.tags?.includes("bestseller") ?? false)) ?? products.find((p) => p.salePrice && p.salePrice < p.price),
    [products],
  );
  const spotImg = spotlight ? firstProductImage(spotlight.images) : "";
  const spotName = spotlight ? (lang === "ar" ? spotlight.nameAr : spotlight.nameEn) : "";

  usePageMeta("Jia — Silk & Essentials", t("heroSub", lang));

  if (productsError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertIcon className="w-12 h-12 mx-auto text-bronze mb-4" />
          <p className="font-display t-h3 font-bold text-ink dark:text-[#f3ede3]">{t("connError", lang)}</p>
          <p className="text-sm text-mute dark:text-[#a89f92] mt-2">{t("genericError", lang)}</p>
          <button onClick={reloadProducts} className="mt-6 inline-flex items-center gap-2 bg-ink text-[#f3ede3] text-sm font-bold px-7 py-3 rounded-full hover:bg-bronze-deep transition btn-press">
            <RetryIcon className="w-4 h-4" /> {t("retry", lang)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main>
      {/* Organization + WebSite structured data for the whole storefront */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Jia", url: "https://brand-alpha-sandy.vercel.app", logo: "https://brand-alpha-sandy.vercel.app/logo.png", sameAs: [], contactPoint: { "@type": "ContactPoint", telephone: "+2" + "201018340567", contactType: "customer service", availableLanguage: ["ar", "en"] } }) }} />
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="shell pt-5 pb-8 sm:pt-8 sm:pb-12">
        <div className="relative rounded-3xl overflow-hidden soft-shadow">
          <div className="relative min-h-[430px] sm:min-h-[520px] lg:min-h-[560px]">
            <picture>
              <source srcSet="/images/hero.webp" type="image/webp" />
              <img
                src="/images/hero.jpg"
                alt={t("imgHeroAlt", lang)}
                width={1800}
                height={1013}
                fetchPriority="high"
                className="product-photo absolute inset-0 h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </picture>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" aria-hidden="true" />
          <div className="absolute top-22 inset-0 flex flex-col justify-end p-7 sm:p-10 lg:p-14">
            <h1 className="font-display t-hero font-bold text-white max-w-xl">{t("heroTitle", lang)}</h1>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/shop" className="min-h-[48px] inline-flex items-center bg-white text-ink font-bold text-sm px-8 rounded-full hover:bg-cream transition btn-press">
                {t("shopNow", lang)}
              </Link>
              <Link to="/categories" className="min-h-[48px] inline-flex items-center border border-white/60 text-white font-bold text-sm px-8 rounded-full hover:bg-white/10 transition btn-press">
                {t("categories", lang)}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Trust strip --------------------------- */}
      <Perks />

      {/* --------------------------- New drops ---------------------------- */}
      <section className="shell py-12 sm:py-14">
        <SectionTitle overline={t("heroOverline", lang)} title={t("newDropsTitle", lang)} sub={t("newDropsSub", lang)} />
        {productsLoading ? (
          <SkeletonGrid n={4} />
        ) : (
          <ProductRail label={t("newDropsTitle", lang)}>
            {newDrops.map((p) => (
              <div key={p.id} className="w-[46%] sm:w-[30%] lg:w-[23%] shrink-0 snap-start">
                <ProductCard p={p} />
              </div>
            ))}
          </ProductRail>
        )}
      </section>

      {/* -------------------------- Fabric cards -------------------------- */}
      <section className="bg-cream dark:bg-[#191512] py-12 sm:py-14">
        <div className="shell">
          <SectionTitle title={t("fabricTitle", lang)} sub={t("fabricSub", lang)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((c) => (
              <CategoryCard key={c.id} c={c} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------- Bestseller obsession ---------------------- */}
      <section className="shell py-12 sm:py-14">
        <SectionTitle title={t("obsessionTitle", lang)} sub={t("obsessionSub", lang)} />
        {productsLoading ? (
          <SkeletonGrid n={8} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5">
            {bestsellers.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
        <div className="text-center mt-9">
          <Link to="/shop" className="inline-block min-h-[48px] leading-[3rem] border border-ink dark:border-[#f3ede3] text-ink dark:text-[#f3ede3] font-bold text-sm px-9 rounded-full hover:bg-sand dark:hover:bg-[#201a15] transition btn-press">
            {t("shopAll", lang)}
          </Link>
        </div>
      </section>

      {/* ---------------------------- Spotlight ---------------------------- */}
      {spotlight && (
        <section className="shell pb-12 sm:pb-14">
          <div className="relative rounded-3xl overflow-hidden bg-ink dark:bg-[#201a15] min-h-[380px] sm:min-h-[420px]">
            {spotImg && (
              <img src={spotImg} onError={onImgError} alt={spotName}
                className="product-photo absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" aria-hidden="true" />
            <Reveal className="relative min-h-[380px] sm:min-h-[420px] flex flex-col justify-end p-7 sm:p-12">
              <span className="w-fit text-[11px] font-bold tracking-[0.22em] uppercase text-bronze bg-white/95 dark:bg-black/50 px-3 py-1.5 rounded-full mb-4">
                {t("spotlightLabel", lang)}
              </span>
              <h2 className="font-display t-h2 font-bold text-white max-w-lg leading-tight">{spotName}</h2>
              <Link to={`/product/${spotlight.slug}`} className="mt-6 w-fit min-h-[48px] inline-flex items-center bg-white text-ink font-bold text-sm px-8 rounded-full hover:bg-cream transition btn-press">
                {t("spotlightCta", lang)}
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ----------------------------- Reviews ----------------------------- */}

      {/* ---------------------------- Newsletter --------------------------- */}
    </main>
  );
}

/* ------------------------------- Perks ------------------------------- */
function Perks() {
  const { lang } = useLang();
  const items = [
    { Icon: TruckIcon, k: "perksShip" },
    { Icon: CashIcon, k: "perksCod" },
    { Icon: SparklesIcon, k: "perksFabric" },
    { Icon: ChatIcon, k: "perksSupport" },
  ] as const;
  return (
    <div className="shell">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {items.map(({ Icon, k }) => (
          <Reveal tag="li" key={k} className="flex items-center gap-3 bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-2xl px-3.5 py-3">
            <span className="text-bronze shrink-0" aria-hidden="true"><Icon className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink dark:text-[#f3ede3] leading-tight">{t(k, lang)}</p>
              <p className="text-[11px] text-mute dark:text-[#a89f92] leading-tight mt-0.5">{t(`${k}Sub`, lang)}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------- Category card --------------------------- */
function CategoryCard({ c, lang }: { c: Category; lang: "ar" | "en" }) {
  const img = categoryImageUrl(c.image, c.slug);
  const name = lang === "ar" ? c.nameAr : c.nameEn;
  const reveal = useReveal<HTMLAnchorElement>();
  return (
    <Link
      ref={reveal}
      to={`/category/${c.slug}`}
      className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-sand dark:bg-[#201a15]"
      aria-label={name}
    >
      {img ? (
        <img
          src={img}
          onError={(e) => onCategoryImgError(e, undefined)}
          alt={name}
          loading="lazy"
          className="product-photo absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-bronze/50"><ImageIcon className="w-8 h-8" /></span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <span className="font-display font-bold text-white text-lg leading-tight">{name}</span>
        <span className="block text-[11px] text-white/70 mt-1 opacity-0 group-hover:opacity-100 transition">{t("viewAll", lang)}</span>
      </div>
    </Link>
  );
}

/* ------------------------------ Reviews ----------------------------- */


/* ---------------------------- Newsletter ----------------------------- */

