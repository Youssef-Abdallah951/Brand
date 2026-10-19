import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { fmtPrice } from "../lib/format";
import { Stars } from "../components/chrome";
import { ProductCard, onImgError, productImage } from "../components/product";
import { CashIcon, CheckIcon, GiftIcon, HeartIcon, ImageIcon, SearchIcon, SparklesIcon, TruckIcon, UndoIcon, XIcon } from "../components/icons";

export default function ProductDetails() {
  const perkCls = "text-bronze dark:text-[#c9a06a]";
  const { id } = useParams();
  const { lang } = useLang();
  const { productById, products, addToCart, toggleWish, wishlist, pushToast, setCartOpen } = useShop();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [gift, setGift] = useState("");

  useEffect(() => {
    setQty(1);
    setImgIdx(0);
    setGift("");
    setColor(undefined);
  }, [id]);

  const p = productById(id || "");

  if (!p) {
    return (
      <main className="shell min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <SearchIcon className="w-14 h-14 mx-auto text-bronze/70" />
          <h1 className="font-display text-xl font-bold mt-4 text-ink dark:text-[#f3ede3]">{t("productNotFound", lang)}</h1>
          <Link to="/shop" className="inline-block mt-6 bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold text-sm px-8 py-3.5 rounded-full transition btn-press">{t("backHome", lang)}</Link>
        </div>
      </main>
    );
  }

  const name = lang === "ar" ? p.nameAr : p.nameEn;
  const desc = lang === "ar" ? p.descAr : p.descEn;
  const fabric = lang === "ar" ? p.fabricAr : p.fabricEn;
  const related = products.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 4);
  const wished = wishlist.includes(p.id);
  const out = p.stock <= 0;
  const sale = p.salePrice && p.salePrice < p.price ? p.salePrice : undefined;
  // Gallery: direct https URLs only — never a local path or broken src.
  const validGallery = p.images.filter((u): u is string => typeof u === "string" && /^https:\/\//i.test(u.trim()));
  const mainImg = productImage(p, Math.min(imgIdx, Math.max(0, validGallery.length - 1)));

  const notes = gift.trim();
  const handleAdd = () => {
    if (out) return;
    addToCart(p.id, qty, notes || undefined, color);
    pushToast(t("addedToCart", lang));
    setCartOpen(true);
  };
  const handleBuy = () => {
    if (out) return;
    addToCart(p.id, qty, notes || undefined, color);
    setCartOpen(false);
    nav("/checkout");
  };

  return (
    <main>
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumb" className="shell pt-5 text-xs text-mute dark:text-[#a89f92]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="hover:text-bronze transition">{t("home", lang)}</Link></li>
          <li aria-hidden="true" className="opacity-50">/</li>
          <li><Link to="/shop" className="hover:text-bronze transition">{t("shopAll", lang)}</Link></li>
          <li aria-hidden="true" className="opacity-50">/</li>
          <li className="text-ink dark:text-[#f3ede3] font-semibold line-clamp-1">{name}</li>
        </ol>
      </nav>

      <div className="shell grid md:grid-cols-2 gap-6 lg:gap-10 pt-5 pb-14">
        {/* Gallery */}
        <div>
          <div className="rounded-3xl overflow-hidden bg-sand dark:bg-[#201a15] aspect-[4/5] relative">
            {mainImg ? (
              <img src={mainImg} onError={onImgError} alt={name} fetchPriority="high" className="product-photo w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full grid place-items-center text-bronze/60"><ImageIcon className="w-16 h-16" /></span>
            )}
          </div>
          {validGallery.length > 1 && (
            <div className="flex gap-2 mt-3" role="tablist" aria-label={t("gallery", lang)}>
              {validGallery.map((src, i) => (
                <button key={`${i}${src.slice(-12)}`} onClick={() => setImgIdx(i)} role="tab" aria-selected={i === imgIdx} aria-label={`Image ${i + 1}`}
                  className={`w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden border-2 transition ${i === imgIdx ? "border-bronze" : "border-transparent hover:border-line dark:hover:border-[#2e2822]"}`}>
                  <img src={src} onError={onImgError} alt="" loading="lazy" className="product-photo w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <section>
          {p.tags?.[0] && (
            <span className="w-fit text-[11px] font-bold tracking-wide bg-cream dark:bg-[#201a15] border border-line dark:border-[#2e2822] text-bronze px-2.5 py-1 rounded-full">
              {t(p.tags[0] === "new" ? "newTag" : "bestsellerTag", lang)}
            </span>
          )}
          <h1 className="font-display t-h2 font-bold mt-2 text-ink dark:text-[#f3ede3] leading-tight">{name}</h1>
          {p.reviewsCount > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Stars value={p.rating} />
              <span className="text-xs text-mute dark:text-[#a89f92]" dir="auto">({p.reviewsCount} {t("reviewsCount", lang)})</span>
            </div>
          )}
          <div className="mt-3" dir="auto">
            <span className={`text-2xl font-extrabold ${sale ? "text-clay" : "text-ink dark:text-[#f3ede3]"}`}>{fmtPrice(sale ?? p.price, lang)}</span>
            {sale && <s className="ms-2 text-sm text-mute dark:text-[#8d8478]">{fmtPrice(p.price, lang)}</s>}
          </div>

          <p className="text-mute dark:text-[#a89f92] mt-3 leading-relaxed text-sm sm:text-base">{desc}</p>

          {/* Fabric meta row */}
          <div className="mt-4 flex flex-wrap gap-2">
            {fabric && (
              <span className="inline-flex items-center gap-1.5 bg-cream dark:bg-[#201a15] border border-line dark:border-[#2e2822] rounded-full px-3.5 py-1.5 text-xs font-bold text-ink dark:text-[#f3ede3]">
                <SparklesIcon className="w-3.5 h-3.5 text-bronze" /> {t("fabric", lang)}: <span dir="auto">{fabric}</span>
              </span>
            )}
            {p.colors && p.colors.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-cream dark:bg-[#201a15] border border-line dark:border-[#2e2822] rounded-full px-3.5 py-1.5 text-xs font-bold text-ink dark:text-[#f3ede3]">
                {p.colors.length} {t("color", lang)}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${out ? "bg-clay/10 text-clay" : "bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3]"}`}>
              {out ? <><XIcon className="w-3.5 h-3.5" /> {t("outOfStock", lang)}</> : <><CheckIcon className="w-3.5 h-3.5" /> {t("inStock", lang)}</>}
            </span>
          </div>

          {/* Colour swatches — accessible radiogroup */}
          {p.colors && p.colors.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-xs font-bold tracking-wider uppercase text-mute dark:text-[#a89f92] mb-2">{t("chooseFirst", lang)}</legend>
              <div role="radiogroup" aria-label={t("color", lang)} className="flex flex-wrap gap-2">
                {p.colors.map((c) => {
                  const active = color === c.ar;
                  return (
                    <button
                      key={c.en}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setColor(c.ar)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? "border-bronze bg-bronze text-white" : "border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}
                      dir="auto"
                    >
                      <span className="w-4 h-4 rounded-full ring-1 ring-black/10 dark:ring-white/25" style={{ background: c.hex }} aria-hidden="true" />
                      {lang === "ar" ? c.ar : c.en}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* COD badge */}
          <div className="mt-5">
            <span className="inline-flex items-center gap-2 bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3] text-xs font-bold px-4 py-2 rounded-full">
              <CashIcon className="w-4 h-4 text-bronze" /> {t("codAvailable", lang)}
            </span>
          </div>

          {/* Qty + wish */}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <span className="font-bold text-sm text-ink dark:text-[#f3ede3]">{t("qty", lang)}</span>
            <div className="flex items-center border border-line dark:border-[#2e2822] rounded-full text-ink dark:text-[#f3ede3]">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t("decrease", lang)} className="w-10 h-10 grid place-items-center text-lg hover:bg-sand dark:hover:bg-[#201a15] rounded-s-full transition">−</button>
              <span className="w-9 text-center font-bold" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(p.stock || 99, q + 1))} aria-label={t("increase", lang)} className="w-10 h-10 grid place-items-center text-lg hover:bg-sand dark:hover:bg-[#201a15] rounded-e-full transition">+</button>
            </div>
            <button onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={t("addWish", lang)}
              className={`w-11 h-11 grid place-items-center rounded-full border transition ${wished ? "bg-bronze border-bronze text-white" : "border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>
              <HeartIcon filled={wished} className="w-5 h-5" />
            </button>
          </div>

          {/* CTAs */}
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <button disabled={out} onClick={handleAdd}
              className={`min-h-[50px] rounded-full font-bold transition btn-press ${out ? "bg-ink/40 text-white/70 cursor-not-allowed" : "bg-ink text-[#f3ede3] hover:bg-bronze-deep"}`}>
              {t("addToCart", lang)}
            </button>
            <button disabled={out} onClick={handleBuy}
              className={`min-h-[50px] rounded-full font-bold transition btn-press ${out ? "bg-bronze/40 text-white/70 cursor-not-allowed" : "bg-bronze-deep hover:bg-[#6a5130] text-white"}`}>
              {t("buyNow", lang)}
            </button>
          </div>

          {/* Gift note */}
          <div className="mt-5">
            <label htmlFor="gift-msg" className="text-sm font-bold inline-flex items-center gap-1.5 text-ink dark:text-[#f3ede3]">
              <GiftIcon className={`w-4 h-4 ${perkCls}`} /> {t("giftNote", lang)}
            </label>
            <textarea id="gift-msg" value={gift} onChange={(e) => setGift(e.target.value)} rows={2}
              className="mt-1.5 w-full rounded-2xl border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-4 py-2.5 text-sm outline-none focus:border-bronze placeholder:text-mute/60 transition"
              placeholder={t("giftPlaceholder", lang)}
              dir="auto" />
          </div>

          {/* Service perks */}
          <div className="grid grid-cols-3 gap-2 mt-6 text-center text-[11px] sm:text-xs">
            {[
              { icon: <TruckIcon className="w-5 h-5" />, label: t("perksShip", lang) },
              { icon: <UndoIcon className="w-5 h-5" />, label: t("policyReturns", lang) },
              { icon: <SparklesIcon className="w-5 h-5" />, label: t("perksFabric", lang) },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-2xl py-3.5 px-2">
                <div className={`flex justify-center ${perkCls}`}>{icon}</div>
                <div className="font-bold mt-1.5 text-ink dark:text-[#f3ede3] leading-tight">{label}</div>
              </div>
            ))}
          </div>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name, offers: { "@type": "Offer", price: sale ?? p.price, priceCurrency: "EGP", availability: out ? "OutOfStock" : "InStock" } }) }} />
        </section>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="shell pb-14">
          <h2 className="font-display t-h3 font-bold mb-5 text-ink dark:text-[#f3ede3]">{t("related", lang)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </main>
  );
}

