import type { Category, DeliveryZone, Product } from "./types";

// ---------------------------------------------------------------------------
// PLACEHOLDER IMAGERY — Unsplash (free license) photo IDs, verified HTTP 200.
// Replace with real product photography here only; every catalog consumer
// reads images from this file (or Supabase `product_images` when configured).
// ---------------------------------------------------------------------------

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=900&q=75`;

// Modest-fashion model shots (seed pool for products)
const M_BLACK = "photo-1630735988694-12186aedd73d";
const M_GREY = "photo-1752794674886-fb12817a5e96";
const M_WALL = "photo-1554545729-bfecfdf2f989";
const M_PURPLE = "photo-1622024773508-c7567eb2835b";
const M_BEIGE = "photo-1561442748-c50715dc32f6";
const M_BLUE = "photo-1587181281559-c3865cf7d71f";
const M_GARDEN = "photo-1560350530-a12ec1414cf5";
const M_LACE = "photo-1772474500365-c2c520545f44";
const M_PAINT = "photo-1577975819014-2d6f1e721e77";
const M_SCARF = "photo-1575897368738-aa5401c4af7d";
// Fabric / accessory / gift placeholder shots
const F_CHIFFON = "photo-1528459801416-a9e53bbf4e17";
const F_HILDA = "photo-1558769132-cb1aea458c5e";
const F_SOFT = "photo-1620799139507-2a76f79a2f4d";
const F_CRAFT = "photo-1618354691373-d851c5c3a990";
const ACC_SCARF = "photo-1609803384069-19f3e5a70e75";
const ACC_CAP = "photo-1521369909029-2afed882baee";
const GIFT_BOX = "photo-1549465220-1a8b9238cd48";
const GIFT_STACK = "photo-1513885535751-8b9238bd345a";

export const SEED_CATEGORIES: Category[] = [
  { id: "c-chiffon", slug: "chiffon", nameEn: "Chiffon", nameAr: "شيفون", image: img(F_CHIFFON), active: true },
  { id: "c-modal", slug: "modal", nameEn: "Modal", nameAr: "مودال", image: img(F_HILDA), active: true },
  { id: "c-satin", slug: "satin", nameEn: "Satin", nameAr: "ساتان", image: img(F_SOFT), active: true },
  { id: "c-acc", slug: "accessories", nameEn: "Accessories", nameAr: "إكسسوارات", image: img(ACC_SCARF), active: true },
  { id: "c-gift", slug: "gifts", nameEn: "Gifts", nameAr: "هدايا", image: img(GIFT_BOX), active: true },
];

// Color swatch shortcuts
const C = {
  black: { ar: "أسود", en: "Black", hex: "#26211d" },
  ivory: { ar: "أبيض عاجي", en: "Ivory", hex: "#f3ecdf" },
  sand: { ar: "بيج رملي", en: "Sand", hex: "#cbb499" },
  olive: { ar: "زيتي", en: "Olive", hex: "#6f7154" },
  mocha: { ar: "موكا", en: "Mocha", hex: "#8a6a52" },
  grey: { ar: "رمادي دافئ", en: "Warm Grey", hex: "#a49c93" },
  cream: { ar: "كريمي", en: "Cream", hex: "#efe5d2" },
  blush: { ar: "وردي باهت", en: "Blush", hex: "#d8a8a2" },
  sky: { ar: "أزرق سماوي", en: "Sky Blue", hex: "#9cb9c9" },
  mint: { ar: "أخضر منت", en: "Mint", hex: "#a9c4b0" },
  lilac: { ar: "موف فاتح", en: "Lilac", hex: "#b5a8c4" },
  champagne: { ar: "شامبين", en: "Champagne", hex: "#d9c39d" },
  ombreBlue: { ar: "أزرق متدرج", en: "Ombré Blue", hex: "#7f97b2" },
  navy: { ar: "كحلي", en: "Navy", hex: "#2b3245" },
  gold: { ar: "ذهبي", en: "Gold", hex: "#c8a24b" },
  silver: { ar: "فضي", en: "Silver", hex: "#b9bdc4" },
} as const;

export const SEED_PRODUCTS: Product[] = [
  // ------------------------------ CHIFFON ------------------------------
  {
    id: "p-h1", slug: "classic-chiffon-hijab",
    nameEn: "Classic Chiffon Hijab", nameAr: "حجاب شيفون كلاسيك",
    descEn: "Feather-light matte chiffon with a soft drape — an everyday essential that stays put all day.",
    descAr: "شيفون خفيف كالريشة بطرف مطفي ناعم — أساسية يومية تدوم معك كل اليوم.",
    price: 185, stock: 40, categoryId: "c-chiffon",
    images: [img(M_BEIGE), img(F_CHIFFON)],
    colors: [C.black, C.ivory, C.sand, C.olive],
    fabricAr: "شيفون مطفي", fabricEn: "Matte chiffon",
    rating: 4.8, reviewsCount: 214, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-01-10",
  },
  {
    id: "p-h2", slug: "printed-chiffon-hijab",
    nameEn: "Printed Chiffon Hijab", nameAr: "حجاب شيفون مطبوع",
    descEn: "Hand-sketched botanical print on airy chiffon, hand-hemmed with a fine edge.",
    descAr: "طبعة نباتية مرسومة يدوياً على شيفون هوائي، مع مينا مشطوفة يدوياً.",
    price: 215, salePrice: 185, stock: 25, categoryId: "c-chiffon",
    images: [img(M_GARDEN), img(F_CHIFFON)],
    colors: [C.blush, C.sky, C.mint],
    fabricAr: "شيفون مطبوع", fabricEn: "Printed chiffon",
    rating: 4.6, reviewsCount: 88, tags: ["new"],
    active: true, createdAt: "2026-03-05",
  },
  {
    id: "p-h3", slug: "chiffon-duo-set",
    nameEn: "Chiffon Duo Set — 2 Scarves", nameAr: "طقم شيفون دِيو — قطعتان",
    descEn: "Two coordinating chiffon scarves in our signature neutrals, wrapped in a keepsake sleeve.",
    descAr: "شالان شيفون منسّقان بألواننا الأساسية، داخل غلاف هدية أنيق يصلح للإهداء.",
    price: 345, salePrice: 299, stock: 18, categoryId: "c-chiffon",
    images: [img(M_LACE), img(F_HILDA)],
    colors: [C.black, C.sand, C.grey],
    fabricAr: "شيفون مطفي", fabricEn: "Matte chiffon",
    rating: 4.9, reviewsCount: 57, tags: ["new"],
    active: true, createdAt: "2026-03-18",
  },
  {
    id: "p-h4", slug: "ombre-chiffon-scarf",
    nameEn: "Ombré Chiffon Scarf", nameAr: "شال شيفون متدرج",
    descEn: "A calm gradient woven into gauzy chiffon — the finishing touch to every look.",
    descAr: "تدرّج لوني هادئ داخل شيفون خفيف — اللمسة النهائية لأي إطلالة.",
    price: 235, stock: 14, categoryId: "c-chiffon",
    images: [img(M_BLUE), img(F_SOFT)],
    colors: [C.ombreBlue, C.lilac],
    fabricAr: "شيفون متدرج", fabricEn: "Ombré chiffon",
    rating: 4.7, reviewsCount: 63, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-02-20",
  },
  // ------------------------------ MODAL ------------------------------
  {
    id: "p-h5", slug: "everyday-modal-hijab",
    nameEn: "Everyday Modal Hijab", nameAr: "حجاب مودال لكل يوم",
    descEn: "Silky plant-based modal with natural stretch — breathable, barely-there, endlessly wearable.",
    descAr: "مودال نباتي حريري بمرونة طبيعية — يتنفس، خفيف كأنه غير موجود، يدوم طويلاً.",
    price: 265, stock: 52, categoryId: "c-modal",
    images: [img(M_GREY), img(F_HILDA)],
    colors: [C.grey, C.black, C.cream],
    fabricAr: "مودال ممزوج", fabricEn: "Modal blend",
    rating: 4.9, reviewsCount: 312, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-01-20",
  },
  {
    id: "p-h6", slug: "stretch-modal-hijab",
    nameEn: "Stretch Modal Hijab", nameAr: "حجاب مودال مطاطي",
    descEn: "A second-skin fit with deep elasticity that holds weightless volume without pins.",
    descAr: "مرونة عالية ترسم شكلاً حجابياً مطروفاً بدون دبابيز، وثبات يدوم للساعات.",
    price: 285, stock: 30, categoryId: "c-modal",
    images: [img(M_PURPLE), img(F_HILDA)],
    colors: [C.mocha, C.navy, C.ivory],
    fabricAr: "مودال إيلاستان", fabricEn: "Modal + elastane",
    rating: 4.8, reviewsCount: 121, tags: ["new"],
    active: true, createdAt: "2026-03-22",
  },
  {
    id: "p-h7", slug: "premium-modal-shawl",
    nameEn: "Premium Modal Shawl", nameAr: "شال مودال فاخر",
    descEn: "Extra-wide modal shawl with a whisper-soft finish, generous enough for effortless draping.",
    descAr: "شال مودال عريض بملمس ناعم جداً واتساع يسمح لفّة أنيقة سهلة.",
    price: 325, salePrice: 289, stock: 16, categoryId: "c-modal",
    images: [img(M_WALL), img(ACC_SCARF)],
    colors: [C.sand, C.mocha, C.olive],
    fabricAr: "مودال حريري", fabricEn: "Silky modal",
    rating: 4.9, reviewsCount: 74, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-02-02",
  },
  {
    id: "p-h8", slug: "modal-square-scarf",
    nameEn: "Modal Square Scarf", nameAr: "إيشارب مودال مربع",
    descEn: "The square-cut classic in breathable modal — folds crisp, drapes soft.",
    descAr: "كلاسيكية القطع المربع بمودال يتنفس — تُطوى حادة وتنسدل ناعمة.",
    price: 245, stock: 0, categoryId: "c-modal",
    images: [img(M_SCARF), img(F_CHIFFON)],
    colors: [C.ivory, C.grey],
    fabricAr: "مودال ناعم", fabricEn: "Buttery modal",
    rating: 4.6, reviewsCount: 95,
    active: true, createdAt: "2026-02-14",
  },
  // ------------------------------ SATIN ------------------------------
  {
    id: "p-h9", slug: "silky-satin-hijab",
    nameEn: "Silky Satin Hijab", nameAr: "حجاب ساتان حريري",
    descEn: "Lustrous charmeuse satin that resists creases and gives elegant shine without slipping.",
    descAr: "ساتان شارموس لامع لا يتجعّد، يعطي بريقاً راقياً ولا ينزلق.",
    price: 295, stock: 28, categoryId: "c-satin",
    images: [img(M_BLACK), img(F_SOFT)],
    colors: [C.black, C.champagne, C.mocha],
    fabricAr: "ساتان شارموس", fabricEn: "Charmeuse satin",
    rating: 4.8, reviewsCount: 167, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-01-28",
  },
  {
    id: "p-h10", slug: "occasion-satin-hijab",
    nameEn: "Occasion Satin Hijab", nameAr: "حجاب ساتان للمناسبات",
    descEn: "Our jewel-rich satin for events — deep, light-catching colour with an elegant fall.",
    descAr: "ساتان بألوان فاخرة للمناسبات — لون عميق يلتقط الضوء بانسدال راقٍ.",
    price: 355, salePrice: 299, stock: 14, categoryId: "c-satin",
    images: [img(M_LACE), img(F_SOFT)],
    colors: [C.navy, C.olive, C.champagne],
    fabricAr: "ساتان راقٍ", fabricEn: "Premium satin",
    rating: 4.9, reviewsCount: 41, tags: ["new"],
    active: true, createdAt: "2026-03-28",
  },
  {
    id: "p-h11", slug: "satin-stripe-hijab",
    nameEn: "Satin Stripe Hijab", nameAr: "حجاب ساتان بخطوط",
    descEn: "Tone-on-tone stitched stripes add quiet texture to liquid-smooth satin.",
    descAr: "خطوط مطرزة بنفس اللون تضيف ملمساً هادئاً على نعومة الساتان.",
    price: 265, stock: 22, categoryId: "c-satin",
    images: [img(M_PAINT), img(F_CHIFFON)],
    colors: [C.cream, C.blush, C.sky],
    fabricAr: "ساتان مطرز", fabricEn: "Textured satin",
    rating: 4.5, reviewsCount: 29,
    active: true, createdAt: "2026-03-08",
  },
  // ------------------------------ ACCESSORIES ------------------------------
  {
    id: "p-h12", slug: "no-slip-undercap",
    nameEn: "No-Slip Undercap", nameAr: "طاقية حجاب مثبتة",
    descEn: "Featherweight cotton-soft undercap with a hidden silicone band — zero slipping.",
    descAr: "طاقية خفيفة كالقطن بشريط سيليكون مخفي — لا تنزلق ولا تسبب احتكاكاً.",
    price: 95, stock: 60, categoryId: "c-acc",
    images: [img(ACC_CAP), img(F_CRAFT)],
    colors: [C.black, C.ivory, C.mocha],
    fabricAr: "قطن مخلوط", fabricEn: "Cotton blend",
    rating: 4.7, reviewsCount: 143, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-01-15",
  },
  {
    id: "p-h13", slug: "hijab-pin-set",
    nameEn: "Hijab Pin Set — 6 Pins", nameAr: "طقم دبابيز حجاب — 6 قطع",
    descEn: "Six polished precision pins with smooth safety tongues in a travel-friendly case.",
    descAr: "ستّ دبابيز مصقولة بأسنان آمنة ملساء، في علبة عملية للحمل أثناء السفر.",
    price: 85, stock: 75, categoryId: "c-acc",
    images: [img(ACC_SCARF), img(GIFT_STACK)],
    colors: [C.gold, C.silver],
    fabricAr: "معدن مصقول", fabricEn: "Polished metal",
    rating: 4.8, reviewsCount: 96, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-02-08",
  },
  {
    id: "p-h14", slug: "scarf-ring-duo",
    nameEn: "Scarf Ring Duo", nameAr: "ثنائية حلقات الشال",
    descEn: "Sculpted rings that finish any drape into a designed detail without pins or knots.",
    descAr: "حلقان أنيقان يحوّلان أي لفّة إلى لمسة مصممة بدون دبابيز ولا عقد.",
    price: 120, stock: 9, categoryId: "c-acc",
    images: [img(F_CRAFT), img(ACC_SCARF)],
    colors: [C.gold, C.silver],
    fabricAr: "معدن مطلي", fabricEn: "Plated metal",
    rating: 4.6, reviewsCount: 18, tags: ["new"],
    active: true, createdAt: "2026-04-02",
  },
  // ------------------------------ GIFTS ------------------------------
  {
    id: "p-h15", slug: "signature-gift-box",
    nameEn: "Signature Gift Box — 3 Hijabs + Pins", nameAr: "بوكس هدية — 3 حجابات + دبابيز",
    descEn: "Three best-loved scarves and a pin set, ribboned inside our keepsake gift box.",
    descAr: "ثلاث حجابات مفضلة لدينا مع طقم دبابيز، ملفوفة بشرابط داخل بوكس هدية يُحتفظ به.",
    price: 999, salePrice: 849, stock: 12, categoryId: "c-gift",
    images: [img(GIFT_BOX), img(GIFT_STACK)],
    colors: [C.sand, C.black, C.cream],
    fabricAr: "تشكيلة قماشات", fabricEn: "Curated fabrics",
    rating: 4.9, reviewsCount: 64, bestseller: true, tags: ["bestseller"],
    active: true, createdAt: "2026-03-01",
  },
  {
    id: "p-h16", slug: "eid-luxe-box",
    nameEn: "Eid Luxe Gift Box", nameAr: "بوكس العيد الفاخر",
    descEn: "Satin + modal edit with a gold pin duo and a handwritten card — our most-loved Eid pick.",
    descAr: "مزيج ساتان ومودال مع طقم دبابيز ذهبي وكارت مكتوب بخط اليد — أكثر اختيار للعيد طلباً عندنا.",
    price: 1499, stock: 6, categoryId: "c-gift",
    images: [img(GIFT_STACK), img(GIFT_BOX)],
    colors: [C.champagne, C.navy],
    fabricAr: "تشكيلة فاخرة", fabricEn: "Luxe edit",
    rating: 5, reviewsCount: 22, tags: ["new"],
    active: true, createdAt: "2026-04-05",
  },
];

export const SEED_ZONES: DeliveryZone[] = [
  { id: "z-cairo", governorateEn: "Cairo", governorateAr: "القاهرة", standardFee: 60, expressFee: 110, etaEn: "2-4 days", etaAr: "2-4 أيام", active: true },
  { id: "z-giza", governorateEn: "Giza", governorateAr: "الجيزة", standardFee: 60, expressFee: 110, etaEn: "2-4 days", etaAr: "2-4 أيام", active: true },
  { id: "z-alex", governorateEn: "Alexandria", governorateAr: "الإسكندرية", standardFee: 70, expressFee: 130, etaEn: "3-5 days", etaAr: "3-5 أيام", active: true },
  { id: "z-other", governorateEn: "Other", governorateAr: "أخرى", standardFee: 80, expressFee: 150, etaEn: "3-6 days", etaAr: "3-6 أيام", active: true },
];
