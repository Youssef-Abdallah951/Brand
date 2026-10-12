import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useShop } from "../store/ShopContext";
import { t } from "../i18n/translations";
import { Price, Stars } from "../components/chrome";
import { ProductCard, onImgError, productImage } from "../components/product";
import { CashIcon, CheckIcon, FlaskIcon, GiftIcon, HeartIcon, ImageIcon, SearchIcon, SparklesIcon, TruckIcon, UndoIcon, XIcon } from "../components/icons";

export default function ProductDetails() {
  const { id } = useParams();
  const { lang } = useLang();
  const { productById, products, addToCart, toggleWish, wishlist, pushToast } = useShop();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [gift, setGift] = useState("");
  // Reset per-product UI when navigating between products.
  useEffect(() => {
    setQty(1);
    setImgIdx(0);
    setGift("");
  }, [id]);
  const p = productById(id || "");
  if (!p) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="flex justify-center text-pink-300 dark:text-neutral-600"><SearchIcon className="w-16 h-16" /></div>
        <h1 className="font-bold text-[1.4rem] mt-4 text-[#171717] dark:text-white">{lang === "ar" ? "المنتج غير موجود" : "Product not found"}</h1>
        <Link to="/shop" className="inline-block mt-6 bg-[#e84393] hover:bg-[#c2185b] text-white font-bold px-8 py-3 rounded-2xl">{t("shop", lang)}</Link>
      </main>
    );
  }
  const name = lang === "ar" ? p.nameAr : p.nameEn;
  const desc = lang === "ar" ? p.descAr : p.descEn;
  const related = products.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 4);
  const wished = wishlist.includes(p.id);
  const mainImg = productImage(p, Math.min(imgIdx, Math.max(0, p.images.length - 1)));
  // Gallery strips anything that is not a direct https:// URL so no <img>
  // ever receives a local path or broken src value.
  const validGallery = p.images.filter((u): u is string =>
    typeof u === "string" && /^https:\/\//i.test(u.trim()),
  );
  // The gift message travels with the cart line and is appended to the
  // order notes at checkout — it is never silently dropped.
  const giftNote = gift.trim();
  const handleAdd = () => {
    addToCart(p.id, qty, giftNote || undefined);
    pushToast(lang === "ar" ? "تمت إضافة المنتج إلى السلة" : "Product added to cart");
  };
  const handleBuy = () => {
    addToCart(p.id, qty, giftNote || undefined);
    nav("/checkout");
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <nav className="text-xs text-gray-400 dark:text-[#A3A3A3] mb-4"><Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / <span className="text-gray-600 dark:text-[#D4D4D4]">{name}</span></nav>
      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        <div>
          <div className="rounded-[1.5rem] overflow-hidden border border-[#E5E5E5] dark:border-[#333333] bg-pink-50 dark:bg-[#0A0A0A] aspect-square">
            {mainImg ? (
              <img src={mainImg} onError={onImgError} alt={name} className="product-photo w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full grid place-items-center bg-pink-50 dark:bg-[#0A0A0A] text-pink-300 dark:text-neutral-600"><ImageIcon className="w-20 h-20" /></span>
            )}
          </div>
          {validGallery.length > 1 && (
            <div className="flex gap-2 mt-3">
              {validGallery.map((src, i) => (
                <button key={i} onClick={() => setImgIdx(i)} aria-label={`view image ${i + 1}`} className={`w-20 h-20 rounded-2xl overflow-hidden border-2 ${i === imgIdx ? "border-[#e84393]" : "border-[#E5E5E5] dark:border-[#333333]"}`}>
                  <img src={src} onError={onImgError} alt="" className="product-photo w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2"><Stars value={p.rating} /><span className="text-sm text-gray-400 dark:text-[#A3A3A3]">({p.reviewsCount})</span></div>
          <h1 className="font-display text-[1.4rem] sm:text-[1.7rem] font-bold mt-2 text-[#171717] dark:text-white">{name}</h1>
          <div className="mt-3"><Price price={p.price} lang={lang} /></div>
          <p className="text-[#525252] dark:text-[#D4D4D4] mt-4 leading-relaxed">{desc}</p>
          {p.ingredients && <p className="text-xs text-gray-400 dark:text-[#A3A3A3] mt-2 inline-flex items-center gap-1"><FlaskIcon className="w-3.5 h-3.5" /> {p.ingredients}</p>}
          <div className={`mt-4 text-sm font-bold inline-flex items-center gap-1.5 ${p.stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
            {p.stock > 0 ? (<><CheckIcon className="w-4 h-4" /> {t("inStock", lang)} ({p.stock})</>) : (<><XIcon className="w-4 h-4" /> {t("outOfStock", lang)}</>)}
          </div>
          <div className="mt-4"><span className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 text-sm font-bold px-4 py-2 rounded-full"><CashIcon className="w-4 h-4" /> {t("codAvailable", lang)}</span></div>
          <div className="flex items-center gap-3 mt-6">
            <span className="font-bold text-sm text-[#171717] dark:text-white">{t("qty", lang)}</span>
            <div className="flex items-center border border-[#E5E5E5] dark:border-[#333333] rounded-2xl overflow-hidden text-[#171717] dark:text-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="decrease quantity" className="px-4 py-2.5 text-xl hover:bg-black/5 dark:hover:bg-white/10">−</button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(p.stock || 99, q + 1))} aria-label="increase quantity" className="px-4 py-2.5 text-xl hover:bg-black/5 dark:hover:bg-white/10">+</button>
            </div>
            <button onClick={() => toggleWish(p.id)} aria-label="wishlist" className={`w-12 h-12 grid place-items-center rounded-2xl border ${wished ? "bg-[#e84393] text-white border-[#e84393]" : "border-[#E5E5E5] dark:border-[#333333] text-gray-500 dark:text-[#D4D4D4]"}`}><HeartIcon filled={wished} className="w-5 h-5" /></button>
          </div>
          <div className="grid gap-2.5 mt-6">
            <button disabled={p.stock <= 0} onClick={handleAdd} className="rounded-2xl bg-[#2b7de9] hover:bg-[#1f63c4] text-white font-bold py-4 btn-press disabled:bg-gray-300 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500">{t("addToCart", lang)}</button>
            <button disabled={p.stock <= 0} onClick={handleBuy} className="rounded-2xl bg-[#e84393] hover:bg-[#c2185b] text-white font-bold py-4 btn-press disabled:bg-gray-300 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500">{t("buyNow", lang)}</button>
          </div>
          <div className="mt-5">
            <label className="text-sm font-bold inline-flex items-center gap-1.5 text-[#171717] dark:text-white"><GiftIcon className="w-4 h-4 text-[#e84393] dark:text-[#ff8fb8]" /> {lang === "ar" ? "رسالة إهداء (اختياري)" : "Gift message (optional)"}</label>
            <textarea value={gift} onChange={(e) => setGift(e.target.value)} rows={2} className="mt-1.5 w-full rounded-2xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#0A0A0A] text-[#171717] dark:text-white px-4 py-2.5 outline-none focus:border-[#e84393] placeholder:text-gray-400 dark:placeholder:text-neutral-500" placeholder={lang === "ar" ? "اكتبي رسالتك…" : "Write your message…"} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6 text-center text-xs">
            {[
              { icon: <TruckIcon className="w-5 h-5 text-[#e84393] dark:text-[#ff8fb8]" />, label: lang === "ar" ? "شحن سريع" : "Fast ship" },
              { icon: <UndoIcon className="w-5 h-5 text-[#e84393] dark:text-[#ff8fb8]" />, label: lang === "ar" ? "استبدال سهل" : "Easy exchange" },
              { icon: <SparklesIcon className="w-5 h-5 text-[#e84393] dark:text-[#ff8fb8]" />, label: lang === "ar" ? "أصلي 100%" : "100% original" },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#333333] rounded-2xl py-3"><div className="flex justify-center">{icon}</div><div className="font-bold mt-1 text-[#171717] dark:text-white">{label}</div></div>
            ))}
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name, offers: { "@type": "Offer", price: p.price, priceCurrency: "EGP", availability: p.stock > 0 ? "InStock" : "OutOfStock" } }) }} />
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-[1.4rem] font-bold mb-5 text-[#171717] dark:text-white">{t("related", lang)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </main>
  );
}
