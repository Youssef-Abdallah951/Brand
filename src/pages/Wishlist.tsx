import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { ProductCard, SkeletonGrid } from "../components/product";
import { HeartIcon } from "../components/icons";

export default function Wishlist() {
  const { lang } = useLang();
  const { products, wishlist, productsLoading } = useShop();

  const items = wishlist
    .map((id) => products.find((p) => p.id === id || p.slug === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main>
      <div className="shell pt-8 pb-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3] inline-flex items-center gap-2.5">
            <HeartIcon filled className="w-7 h-7 text-bronze" /> {t("wishlist", lang)}
          </h1>
          {items.length > 0 && (
            <span className="text-sm text-mute dark:text-[#a89f92]">
              {items.length} {t("productsCount", lang)}
            </span>
          )}
        </header>
        <p className="text-sm text-mute dark:text-[#a89f92] mt-1">{t("wishSub", lang)}</p>
      </div>

      <div className="shell pb-14">
        {productsLoading && items.length === 0 ? (
          <SkeletonGrid n={4} />
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-line dark:border-[#2e2822]">
            <HeartIcon filled className="w-12 h-12 mx-auto text-bronze/70" />
            <p className="font-display font-bold mt-3 text-ink dark:text-[#f3ede3]">{t("emptyWishlist", lang)}</p>
            <Link to="/shop" className="mt-5 inline-block text-sm font-bold text-bronze underline underline-offset-4">
              {t("shopAll", lang)}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </main>
  );
}
