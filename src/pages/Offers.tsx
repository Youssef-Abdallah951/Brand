import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { ProductCard, SectionTitle } from "../components/product";

export default function Offers() {
  const { lang } = useLang();
  const { products } = useShop();
  const list = products.filter((p) => p.compareAt);
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="rounded-[2rem] bg-gradient-to-l from-[#c2185b] to-[#e84393] text-white p-8 sm:p-12 mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">🎉 {lang === "ar" ? "عروض لوميير" : "LUMIÈRE Offers"}</h1>
        <p className="text-white/80 mt-2">{lang === "ar" ? "خصومات حقيقية حتى 30% — الكمية محدودة!" : "Real discounts up to 30% — limited stock!"}</p>
      </div>
      <SectionTitle title={lang === "ar" ? `كل العروض (${list.length})` : `All offers (${list.length})`} />
      {list.length === 0 ? (
        <div className="text-center py-20 bg-pink-50 rounded-3xl">
          <div className="text-5xl">🎉</div>
          <div className="font-bold mt-3">{lang === "ar" ? "لا توجد عروض حالياً — تابعينا قريباً" : "No offers right now — check back soon"}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </main>
  );
}
