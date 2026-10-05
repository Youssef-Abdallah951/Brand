import type { Category, DeliveryZone, Product } from "./types";

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=800&q=80`;

export const SEED_CATEGORIES: Category[] = [
  { id: "c-makeup", slug: "makeup", nameEn: "Makeup", nameAr: "المكياج", image: img("photo-1512496015851-a90fb38ba796"), active: true },
  { id: "c-skin", slug: "skincare", nameEn: "Skincare", nameAr: "العناية بالبشرة", image: img("photo-1556228720-195a672e8a03"), active: true },
  { id: "c-hair", slug: "hair-care", nameEn: "Hair Care", nameAr: "العناية بالشعر", image: img("photo-1522337660859-02fbefca4702"), active: true },
  { id: "c-perfume", slug: "perfumes", nameEn: "Perfumes", nameAr: "العطور", image: img("photo-1541643600914-78b084683601"), active: true },
  { id: "c-body", slug: "body-care", nameEn: "Body Care", nameAr: "العناية بالجسم", image: img("photo-1570172619644-dfd03ed5d881"), active: true },
  { id: "c-acc", slug: "accessories", nameEn: "Accessories", nameAr: "الإكسسوارات", image: img("photo-1596462502278-27bfdc403348"), active: true },
  { id: "c-offers", slug: "offers", nameEn: "Offers", nameAr: "العروض", image: img("photo-1487412947147-5cebf100ffc2"), active: true },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "p1", slug: "velvet-matte-lipstick", nameEn: "Velvet Matte Lipstick — Rosewood", nameAr: "أحمر شفاه مخملي مطفي — روزوود",
    descEn: "Long-wear velvet matte lipstick with vitamin E. Rich pigment, lightweight feel.", descAr: "أحمر شفاه مخملي طويل الثبات بفيتامين E. لون غني وملمس خفيف.",
    price: 349, compareAt: 449, stock: 42, categoryId: "c-makeup",
    images: [img("photo-1586495777744-4413f21062fa"), img("photo-1512496015851-a90fb38ba796")],
    rating: 4.8, reviewsCount: 214, featured: true, bestseller: true, active: true, createdAt: "2026-01-10",
    ingredients: "Ricinus oil, Vitamin E, Shea butter",
  },
  {
    id: "p2", slug: "vitamin-c-serum", nameEn: "Vitamin C Brightening Serum 30ml", nameAr: "سيروم فيتامين C للتفتيح 30 مل",
    descEn: "15% vitamin C + hyaluronic acid for glow and even tone.", descAr: "فيتامين C بتركيز 15% مع الهيالورونيك لبشرة مشرقة وموحدة.",
    price: 549, compareAt: 699, stock: 35, categoryId: "c-skin",
    images: [img("photo-1620916566398-39f1143ab7be"), img("photo-1556228720-195a672e8a03")],
    rating: 4.9, reviewsCount: 386, featured: true, bestseller: true, active: true, createdAt: "2026-02-01",
  },
  {
    id: "p3", slug: "argan-hair-oil", nameEn: "Moroccan Argan Hair Oil 100ml", nameAr: "زيت الأرجان المغربي للشعر 100 مل",
    descEn: "Repairing argan oil for frizz-free shine.", descAr: "زيت أرجان معالج للهيشان ولمعان صحي.",
    price: 429, stock: 50, categoryId: "c-hair",
    images: [img("photo-1526947425960-945c6e72858f")],
    rating: 4.7, reviewsCount: 158, bestseller: true, active: true, createdAt: "2026-01-20",
  },
  {
    id: "p4", slug: "rose-oud-parfum", nameEn: "Rose Oud Eau de Parfum 75ml", nameAr: "عطر الورد والعود 75 مل",
    descEn: "Elegant rose, oud and amber. Long-lasting.", descAr: "ورد أنيق مع العود والعنبر. ثبات عالي.",
    price: 1299, compareAt: 1599, stock: 18, categoryId: "c-perfume",
    images: [img("photo-1541643600914-78b084683601")],
    rating: 4.9, reviewsCount: 97, featured: true, active: true, createdAt: "2026-03-01",
  },
  {
    id: "p5", slug: "hydra-body-lotion", nameEn: "Shea Hydra Body Lotion", nameAr: "لوشن الجسم بزبدة الشيا",
    descEn: "48h moisture with shea + niacinamide.", descAr: "ترطيب 48 ساعة بزبدة الشيا والنياسيناميد.",
    price: 279, stock: 60, categoryId: "c-body",
    images: [img("photo-1570172619644-dfd03ed5d881")],
    rating: 4.6, reviewsCount: 143, active: true, createdAt: "2026-02-12",
  },
  {
    id: "p6", slug: "hydra-foundation", nameEn: "Skin Tint Hydra Foundation", nameAr: "كريم أساس مرطب خفيف",
    descEn: "Natural coverage with SPF 15.", descAr: "تغطية طبيعية مع حماية SPF 15.",
    price: 499, compareAt: 599, stock: 28, categoryId: "c-makeup",
    images: [img("photo-1631730359585-38a4935cbec4"), img("photo-1596462502278-27bfdc403348")],
    rating: 4.5, reviewsCount: 88, featured: true, active: true, createdAt: "2026-03-10",
  },
  {
    id: "p7", slug: "lash-volume-mascara", nameEn: "Volume Lash Mascara", nameAr: "ماسكارا تكثيف الرموش",
    descEn: "Clump-free volume, smudge-proof.", descAr: "كثافة بدون تكتل ومقاومة للتلطخ.",
    price: 299, stock: 70, categoryId: "c-makeup",
    images: [img("photo-1631214540242-3cd8c4b0b3b8")],
    rating: 4.4, reviewsCount: 64, active: true, createdAt: "2026-02-20",
  },
  {
    id: "p8", slug: "hair-repair-mask", nameEn: "Keratin Repair Hair Mask", nameAr: "ماسك الكيراتين لإصلاح الشعر",
    descEn: "Deep repair in 5 minutes.", descAr: "إصلاح عميق في 5 دقائق.",
    price: 379, compareAt: 459, stock: 33, categoryId: "c-hair",
    images: [img("photo-1535585209827-a15fcdbc4c2d")],
    rating: 4.7, reviewsCount: 112, bestseller: true, active: true, createdAt: "2026-01-28",
  },
  {
    id: "p9", slug: "glow-set", nameEn: "Glow Routine Set (Cleanser + Serum + Cream)", nameAr: "مجموعة النضارة (غسول + سيروم + كريم)",
    descEn: "Complete 3-step glow routine, save 20%.", descAr: "روتين النضارة الكامل 3 خطوات مع توفير 20%.",
    price: 999, compareAt: 1249, stock: 22, categoryId: "c-skin",
    images: [img("photo-1556228578-8c89e6adf883")],
    rating: 4.9, reviewsCount: 201, featured: true, bestseller: true, active: true, createdAt: "2026-03-15",
  },
  {
    id: "p10", slug: "silk-blush", nameEn: "Silk Blush — Peachy Glow", nameAr: "بلاشر حريري — خوخي",
    descEn: "Silky powder blush, natural flush.", descAr: "بلاشر حريري بلون طبيعي مشرق.",
    price: 259, stock: 48, categoryId: "c-makeup",
    images: [img("photo-1487412947147-5cebf100ffc2")],
    rating: 4.6, reviewsCount: 73, active: true, createdAt: "2026-02-28",
  },
  {
    id: "p11", slug: "vanilla-musk", nameEn: "Vanilla Musk Body Mist 200ml", nameAr: "بادي ميست الفانيليا والمسك 200 مل",
    descEn: "Soft daily vanilla musk mist.", descAr: "رذاذ يومي ناعم بالفانيليا والمسك.",
    price: 329, compareAt: 399, stock: 40, categoryId: "c-perfume",
    images: [img("photo-1592945403244-b3fbafd7f539")],
    rating: 4.7, reviewsCount: 129, active: true, createdAt: "2026-03-05",
  },
  {
    id: "p12", slug: "jade-roller-set", nameEn: "Jade Roller + Gua Sha Set", nameAr: "طقم رولر اليشم والجوا شا",
    descEn: "Facial massage set for glow.", descAr: "طقم مساج الوجه للنضارة.",
    price: 199, stock: 80, categoryId: "c-acc",
    images: [img("photo-1571781926291-c477ebfd024b")],
    rating: 4.5, reviewsCount: 58, active: true, createdAt: "2026-01-15",
  },
];

export const SEED_ZONES: DeliveryZone[] = [
  { id: "z-cairo", governorateEn: "Cairo", governorateAr: "القاهرة", standardFee: 60, expressFee: 110, etaEn: "2-4 days", etaAr: "2-4 أيام", active: true },
  { id: "z-giza", governorateEn: "Giza", governorateAr: "الجيزة", standardFee: 60, expressFee: 110, etaEn: "2-4 days", etaAr: "2-4 أيام", active: true },
  { id: "z-alex", governorateEn: "Alexandria", governorateAr: "الإسكندرية", standardFee: 70, expressFee: 130, etaEn: "3-5 days", etaAr: "3-5 أيام", active: true },
  { id: "z-other", governorateEn: "Other", governorateAr: "أخرى", standardFee: 80, expressFee: 150, etaEn: "3-6 days", etaAr: "3-6 أيام", active: true },
];
