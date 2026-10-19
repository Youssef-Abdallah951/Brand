import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useLang } from "../i18n/LanguageContext";
import { useShop, lineId } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { SITE_CONFIG } from "../lib/siteConfig";
import { TrashIcon, XIcon } from "./icons";
import { productImage, onImgError } from "./product";

export function CartDrawer() {
  const { lang } = useLang();
  const {
    cart, productById, setQty, removeFromCart, cartCount,
    subtotalOf, cartOpen, setCartOpen,
  } = useShop();
  const close = () => setCartOpen(false);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCartOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  const subtotal = subtotalOf();
  const freeThreshold = SITE_CONFIG.delivery.freeThreshold;
  const freeWon = subtotal >= freeThreshold;
  const remain = freeThreshold - subtotal;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("drawerTitle", lang)}>
      <button className="absolute inset-0 bg-black/45 fade-in" onClick={close} aria-label={t("close", lang)} />
      <aside
        className="drawer-panel absolute end-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#191512] flex flex-col shadow-2xl"
        aria-label={t("drawerTitle", lang)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line dark:border-[#2e2822]">
          <h2 className="font-display text-lg font-bold text-ink dark:text-[#f3ede3]">
            {t("drawerTitle", lang)}
            <span className="text-bronze text-sm font-body font-bold ms-2">({cartCount})</span>
          </h2>
          <button onClick={close} aria-label={t("close", lang)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-sand dark:hover:bg-[#201a15] transition">
            <XIcon className="w-5 h-5 text-ink dark:text-[#f3ede3]" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8 text-center">
            <div>
              <p className="font-display text-xl font-bold text-ink dark:text-[#f3ede3]">{t("drawerEmpty", lang)}</p>
              <p className="text-sm text-mute dark:text-[#a89f92] mt-2">{t("drawerEmptySub", lang)}</p>
              <button onClick={close} className="mt-6 inline-block bg-ink text-[#f3ede3] font-bold text-sm px-8 py-3 rounded-full hover:bg-bronze-deep transition btn-press">
                {t("continueShopping", lang)}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="px-5 py-3 bg-cream dark:bg-[#201a15] border-b border-line dark:border-[#2e2822]">
              <p className="text-xs font-semibold text-ink dark:text-[#f3ede3] text-center">
                {freeWon ? t("freeShipWon", lang) : (
                  <span>
                    <span dir="auto">{fmtPrice(remain, lang)}</span> {t("freeShipRemain", lang)}
                  </span>
                )}
              </p>
              <div className="h-1 mt-2 rounded-full bg-line dark:bg-[#2e2822] overflow-hidden" aria-hidden="true">
                <div className="h-full bg-bronze rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }} />
              </div>
            </div>

            {/* Lines */}
            <ul className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-line dark:divide-[#2e2822]">
              {cart.map((item) => {
                const p = productById(item.productId);
                const lid = lineId(item.productId, item.color);
                if (!p) return null;
                const name = lang === "ar" ? p.nameAr : p.nameEn;
                const unit = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
                return (
                  <li key={lid} className="py-4 flex gap-3">
                    <Link to={`/product/${p.slug}`} onClick={close} className="shrink-0" aria-label={name}>
                      <img src={productImage(p)} onError={onImgError} alt={name}
                        className="w-20 h-24 object-cover rounded-xl bg-sand dark:bg-[#201a15]" loading="lazy" />
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <Link to={`/product/${p.slug}`} onClick={close} className="text-sm font-bold text-ink dark:text-[#f3ede3] leading-snug line-clamp-2 hover:text-bronze transition">
                        {name}
                      </Link>
                      {item.color && (
                        <span className="text-[11px] text-mute dark:text-[#a89f92] mt-0.5" dir="auto">{t("color", lang)}: {item.color}</span>
                      )}
                      {item.notes && (
                        <span className="text-[11px] text-mute dark:text-[#a89f92] mt-0.5 italic line-clamp-1" dir="auto">{item.notes}</span>
                      )}
                      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                        {/* Qty stepper */}
                        <div className="inline-flex items-center border border-line dark:border-[#2e2822] rounded-full">
                          <button onClick={() => setQty(lid, item.qty - 1)} aria-label={t("decrease", lang)} disabled={item.qty <= 1}
                            className="w-7 h-7 grid place-items-center text-ink dark:text-[#f3ede3] disabled:opacity-30 hover:text-bronze transition text-base">−</button>
                          <span className="w-7 text-center text-sm font-bold text-ink dark:text-[#f3ede3]" aria-live="polite">{item.qty}</span>
                          <button onClick={() => setQty(lid, item.qty + 1)} aria-label={t("increase", lang)}
                            className="w-7 h-7 grid place-items-center text-ink dark:text-[#f3ede3] hover:text-bronze transition text-base">+</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(unit * item.qty, lang)}</span>
                          <button onClick={() => removeFromCart(lid)} aria-label={t("remove", lang)}
                            className="w-7 h-7 grid place-items-center rounded-full text-mute hover:text-clay hover:bg-cream dark:text-[#a89f92] dark:hover:bg-[#201a15] transition">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-line dark:border-[#2e2822] bg-white dark:bg-[#191512]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-mute dark:text-[#a89f92]">{t("subtotal", lang)}</span>
                <span className="font-extrabold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(subtotal, lang)}</span>
              </div>
              <p className="text-[11px] text-mute dark:text-[#a89f92] mb-3">{t("deliveryCalc", lang)}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Link onClick={close} to="/cart" className="btn-press text-center font-bold text-sm py-3 rounded-full border border-ink dark:border-[#f3ede3] text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] transition">
                  {t("viewCart", lang)}
                </Link>
                <Link onClick={close} to="/checkout" className="btn-press text-center font-bold text-sm py-3 rounded-full bg-ink text-[#f3ede3] hover:bg-bronze-deep transition">
                  {t("checkout", lang)}
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
