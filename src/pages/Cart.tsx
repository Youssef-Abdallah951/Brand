import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop, lineId } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { firstProductImage, onImgError } from "../components/product";
import { usePageMeta } from "../lib/meta";
import { CartIcon, ImageIcon, TrashIcon } from "../components/icons";

export default function Cart() {
  const { lang } = useLang();
  const { cart, productById, setQty, removeFromCart, subtotalOf, pushToast } = useShop();
  usePageMeta(`${t("cart", lang)} | Jia`);
  const rows = cart
    .map((item) => {
      const p = productById(item.productId);
      return p ? { item, p, lid: lineId(item.productId, item.color) } : null;
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
  const subtotal = subtotalOf();

  const maxQty = (p: { stock: number }) => p.stock > 0 ? p.stock : 99;

  const inc = (lid: string, qty: number, stock: number, name: string) => {
    const p = rows.find((r) => r.lid === lid)?.p;
    if (p && stock > 0 && qty + 1 > stock) {
      pushToast(lang === "ar" ? `اللي متاح من "${name}" ${stock} بس` : `Only ${stock} of "${name}" available`);
      setQty(lid, stock);
      return;
    }
    setQty(lid, qty + 1);
  };

  if (rows.length === 0) {
    return (
      <main className="shell min-h-[60vh] grid place-items-center py-14">
        <div className="text-center">
          <CartIcon className="w-16 h-16 mx-auto text-bronze/70" />
          <h1 className="font-display t-h3 font-bold mt-4 text-ink dark:text-[#f3ede3]">{t("emptyCart", lang)}</h1>
          <Link to="/shop" className="inline-block mt-6 bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold text-sm px-8 py-3.5 rounded-full transition btn-press">
            {t("continueShopping", lang)}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="shell pt-8 pb-4">
        <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">
          {t("cart", lang)} <span className="text-bronze text-lg font-body font-bold">({rows.length})</span>
        </h1>
      </div>
      <div className="shell grid lg:grid-cols-[1fr_340px] gap-6 pb-14 items-start">
        {/* Lines */}
        <ul className="divide-y divide-line dark:divide-[#2e2822]">
          {rows.map(({ p, item, lid }) => {
            const name = lang === "ar" ? p.nameAr : p.nameEn;
            const thumb = firstProductImage(p.images);
            const unit = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
            return (
              <li key={lid} className="py-5 flex gap-4">
                <Link to={`/product/${p.slug}`} aria-label={name} className="shrink-0">
                  {thumb ? (
                    <img src={thumb} onError={onImgError} alt={name} loading="lazy" className="product-photo w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover bg-sand dark:bg-[#201a15]" />
                  ) : (
                    <span className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-sand dark:bg-[#201a15] grid place-items-center text-bronze/60 shrink-0"><ImageIcon className="w-7 h-7" /></span>
                  )}
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Link to={`/product/${p.slug}`} className="font-bold text-sm leading-snug line-clamp-2 text-ink dark:text-[#f3ede3] hover:text-bronze transition">{name}</Link>
                  {item.color && <span className="text-[11px] text-mute dark:text-[#a89f92] mt-0.5" dir="auto">{t("color", lang)}: {item.color}</span>}
                  {item.notes && <span className="text-[11px] italic text-mute dark:text-[#a89f92] mt-0.5 line-clamp-2" dir="auto">{item.notes}</span>}
                  <div className="mt-auto pt-2.5 flex flex-wrap items-center gap-3">
                    <div className="flex items-center border border-line dark:border-[#2e2822] rounded-full text-ink dark:text-[#f3ede3]">
                      <button onClick={() => setQty(lid, item.qty - 1)} aria-label={t("decrease", lang)} disabled={item.qty <= 1}
                        className="w-8 h-8 grid place-items-center rounded-s-full hover:bg-sand dark:hover:bg-[#201a15] transition disabled:opacity-30">−</button>
                      <span className="w-8 text-center font-bold text-sm" aria-live="polite">{item.qty}</span>
                      <button onClick={() => inc(lid, item.qty, maxQty(p), name)} aria-label={t("increase", lang)}
                        className="w-8 h-8 grid place-items-center rounded-e-full hover:bg-sand dark:hover:bg-[#201a15] transition">+</button>
                    </div>
                    <button onClick={() => removeFromCart(lid)} aria-label={t("remove", lang)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-clay hover:underline underline-offset-2">
                      <TrashIcon className="w-3.5 h-3.5" /> {t("remove", lang)}
                    </button>
                  </div>
                </div>
                <span className="font-extrabold text-sm shrink-0 text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(unit * item.qty, lang)}</span>
              </li>
            );
          })}
        </ul>
        {/* Summary */}
        <aside className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl p-5 lg:sticky lg:top-28">
          <h2 className="font-display font-bold text-lg text-ink dark:text-[#f3ede3]">{t("orderSummary", lang)}</h2>
          <div className="grid gap-2 text-sm mt-4">
            <div className="flex justify-between">
              <span className="text-mute dark:text-[#a89f92]">{t("subtotal", lang)}</span>
              <span className="font-bold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(subtotal, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mute dark:text-[#a89f92]">{t("delivery", lang)}</span>
              <span className="text-mute dark:text-[#a89f92] text-xs">{t("deliveryCalc", lang)}</span>
            </div>
            <div className="border-t border-dashed border-line dark:border-[#2e2822] pt-3 flex justify-between text-base font-display">
              <span className="font-bold text-ink dark:text-[#f3ede3]">{t("total", lang)}</span>
              <span className="font-extrabold text-bronze-deep dark:text-bronze" dir="auto">{fmtPrice(subtotal, lang)}</span>
            </div>
          </div>
          <Link to="/checkout" className="btn-press block text-center mt-5 rounded-full bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold min-h-[50px] leading-[3.1rem] transition">
            {t("checkout", lang)}
          </Link>
          <Link to="/shop" className="block text-center mt-3 text-sm font-bold text-bronze underline-offset-4 hover:underline">
            {t("continueShopping", lang)}
          </Link>
        </aside>
      </div>
    </main>
  );
}
