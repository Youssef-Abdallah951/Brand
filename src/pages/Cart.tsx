import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { firstProductImage, onImgError } from "../components/product";

export default function Cart() {
  const { lang } = useLang();
  const { cart, productById, setQty, removeFromCart, pushToast } = useShop();
  const rows = cart.map((c) => ({ ...c, p: productById(c.productId)! })).filter((r) => r.p);
  const subtotal = rows.reduce((s, r) => s + r.p.price * r.qty, 0);

  const inc = (id: string, qty: number, stock: number, name: string) => {
    if (stock > 0 && qty + 1 > stock) {
      pushToast(lang === "ar" ? `المتاح من "${name}" ${stock} فقط` : `Only ${stock} of "${name}" available`);
      setQty(id, stock);
      return;
    }
    setQty(id, qty + 1);
  };

  if (rows.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl">🛒</div>
        <h1 className="font-display text-2xl font-bold mt-4">{t("emptyCart", lang)}</h1>
        <Link to="/shop" className="inline-block mt-6 bg-[#e84393] text-white font-bold px-8 py-3.5 rounded-2xl">{t("continueShopping", lang)}</Link>
      </main>
    );
  }
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-display text-3xl font-bold">{t("cart", lang)} ({rows.length})</h1>
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mt-5 items-start">
        <div className="grid gap-3">
          {rows.map((r) => {
            const name = lang === "ar" ? r.p.nameAr : r.p.nameEn;
            const thumb = firstProductImage(r.p.images);
            return (
              <div key={r.productId} className="bg-white border border-pink-100 rounded-3xl p-3 flex gap-2.5 sm:gap-3 card-shadow overflow-hidden">
                {thumb ? (
                  <img src={thumb} onError={onImgError} alt={name} className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover shrink-0" />
                ) : (
                  <span className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-pink-100 grid place-items-center shrink-0">💄</span>
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${r.p.slug}`} className="font-bold text-sm sm:text-[15px] line-clamp-2 break-words">{name}</Link>
                  <div className="text-[#c2185b] font-bold mt-1 text-sm sm:text-base">EGP {r.p.price}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="flex items-center border border-pink-200 rounded-xl overflow-hidden">
                      <button onClick={() => setQty(r.productId, r.qty - 1)} className="px-2.5 sm:px-3 py-1.5 hover:bg-pink-50">−</button>
                      <span className="w-7 sm:w-8 text-center font-bold text-sm">{r.qty}</span>
                      <button onClick={() => inc(r.productId, r.qty, r.p.stock, name)} className="px-2.5 sm:px-3 py-1.5 hover:bg-pink-50">+</button>
                    </div>
                    <button onClick={() => removeFromCart(r.productId)} className="text-xs text-red-500 font-bold hover:underline">🗑 {lang === "ar" ? "حذف" : "Remove"}</button>
                  </div>
                </div>
                <div className="font-bold text-xs sm:text-sm shrink-0">EGP {r.p.price * r.qty}</div>
              </div>
            );
          })}
        </div>
        <aside className="bg-white border border-pink-100 rounded-3xl p-5 card-shadow lg:sticky lg:top-32">
          <h2 className="font-bold">{t("orderSummary", lang)}</h2>
          <div className="grid gap-2 text-sm mt-3">
            <div className="flex justify-between"><span className="text-gray-500">{t("subtotal", lang)}</span><span className="font-bold">EGP {subtotal}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t("delivery", lang)}</span><span className="text-gray-400 text-xs">{lang === "ar" ? "يُحسب عند إتمام الطلب" : "Calculated at checkout"}</span></div>
            <div className="border-t border-dashed border-pink-200 pt-2 flex justify-between text-base"><span className="font-bold">{t("total", lang)}</span><span className="font-bold text-[#c2185b]">EGP {subtotal}</span></div>
          </div>
          <Link to="/checkout" className="block text-center mt-4 rounded-2xl bg-[#e84393] text-white font-bold py-4 btn-press">{t("checkout", lang)}</Link>
          <Link to="/shop" className="block text-center mt-2 text-sm font-bold text-[#c2185b]">{t("continueShopping", lang)}</Link>
        </aside>
      </div>
    </main>
  );
}
