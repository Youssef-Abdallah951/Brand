# JiA — Silk & Essentials E-commerce / متجر JiA للفخاريات والحجاب

[English](#english) · [العربية](#العربية)

## English

Mobile-first, bilingual (AR RTL / EN LTR) storefront for ready-made hijabs, accessories and gift boxes. Cash-on-delivery only, courier fees by governorate, admin dashboard with orders/coupons/delivery zones.

### Stack
React 19 + TypeScript + Vite (rolldown) + Tailwind CSS v4 + React Router 7 + Supabase (PostgreSQL + Auth + RLS). Route-level code splitting: the nav/footer shell is ~93 KB gzip-free min (26 KB gz), every page is its own chunk.

### Run
```bash
npm install
npm run dev     # local dev
npm run build   # tsc -b && vite build
npm run lint    # oxlint
node scripts/qacheck.cjs   # verify all t() translation keys resolve
```

### Environment variables (`.env` locally, env vars on Vercel)

| Var | Needed for |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | catalog, orders (COD INSERT via RPC), delivery zones, tracking |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | demo admin login — verified server-side in `/api/admin-login` (Vercel function), never in the client bundle |
| `VITE_ANALYTICS_ID` | optional; no analytics provider loads while unset |

### Routes
`/` home · `/shop` (URL-synced filters: `?q=&cat=&color=&sort=&stock=`) · `/product/:id` · `/cart` · `/checkout` · `/order-success` · `/track-order` · `/wishlist` · `/categories` · `/category/:slug` · `/contact` · `/policies/shipping` · `/privacy` · `/terms` · `/faq` · `/admin` · `/admin/login` · 404 page for anything else.

### Key conventions
- Admin WhatsApp/mobile: **only** in `src/lib/siteConfig.ts` → `01018340567` / `201018340567`.
- Guest checkout: Egyptian mobile number (`01XXXXXXXXX`, prefixes 010/011/012/015) is the only customer identifier.
- Coupons live in `src/lib/coupons.ts` (config array) — applied client-side, recomputed at checkout; order stores the discount.
- Language preference persisted in localStorage (`lumiere_lang`), theme in `jia-theme`, cart `lumiere_cart`, wishlist `lumiere_wish`, coupon `lumiere_coupon`, recently viewed `jia_recent`.
- Supabase optional: without keys the site runs on seed data (no orders/tracking).

### WhatsApp order flow
Order INSERT → unique order number → `/order-success` → "Send Order via WhatsApp" opens a pre-filled `wa.me` message to the admin number.

### Placeholder images to replace before launch (photos are Unsplash demo shots)

| Where | What | How to replace |
| --- | --- | --- |
| `public/hero.jpg` | Home hero (Unsplash 1561442748) | Swap with a real JiA campaign photo, keep ~1800×1013 16:9 |
| `public/logo.png` | Logo circle (navbar, boot screen, favicon, PWA icon fallback) | Real brand logo, square 512px |
| `public/icon.svg`, `public/icon-maskable.svg` | PWA icons (simple "JiA" glyph) | Real brand-mark SVG, same two files |
| `src/lib/data.ts` | ~17 unique Unsplash photo IDs used via the `img()` helper for all 16 products + category tiles + gift boxes | Replace the `photo-…` URLs with real product photography (same `img()` helper keeps `auto=format` WebP) |

Product images fall back through: admin-entered images, then seed Unsplash image. `onImgError` never renders a local path.

### Placeholder legal copy
`src/pages/Legal.tsx` holds draft Arabic shipping/returns/privacy/terms text marked `TODO(legal)` — have a lawyer review before launch.

### Deployment (Vercel)
- `vercel.json`: SPA rewrites, immutable asset caching, `no-cache` SW, CSP (`connect-src 'self' https://*.supabase.co`), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- PWA: `public/manifest.webmanifest` + static-only `public/sw.js` (never caches API calls, order inserts, or tracking).
- Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars in the Vercel project before the customers use `/admin`.

---

## العربية

متجر إلكتروني بتجاوب كامل على الجوال وبعدّة عربية وإنجليزية، يعرض الحجابات الجاهزة والأكسسوارات وعلب الهدايا. الدفع عند الاستلام فقط، ورسوم توصيل لكل محافظة، ولوحة تحكم للطلبات والكوبونات وأسعار التوصيل.

### تشغيل المشروع
```bash
npm install
npm run dev
npm run build
npm run lint
node scripts/qacheck.cjs
```

### متغيرات البيئة
انسخ `.env.example` إلى `.env` واضبط مفاتيح Supabase، وعلى Vercel أضف `ADMIN_EMAIL` و `ADMIN_PASSWORD` لدخول الديمو عبر `/api/admin-login` (تُفحص على الخادم فقط). `VITE_ANALYTICS_ID` اختياري.

### ملاحظات مهمة
- رقم واتساب/موبايل الإدارة **فقط** في `src/lib/siteConfig.ts`.
- الدفع كاش عند الاستلام فقط، ورقم الموبايل المصري الوحيد هو هوية العميل.
- الكوبونات إعداد ثابت في `src/lib/coupons.ts`.
- الصور حالياً placeholder من Unsplash — استبدليها قبل الإطلاق (جدول أعلاه)، والنصوص القانونية في `src/pages/Legal.tsx` مسودة تحتاج مراجعة قانونية.
- Service Worker ثابت لا يخزّن أي طلب أو API.
