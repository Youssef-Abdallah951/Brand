# JiA — Silk & Essentials E-commerce

Mobile-first, bilingual (AR RTL / EN LTR), WhatsApp-order-flow cosmetics store.

## Stack
React + TypeScript + Vite + Tailwind CSS v4 + React Router + Supabase (PostgreSQL + Auth + RLS).

## Run
```bash
npm install
npm run dev
npm run build
```

## Supabase setup
1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL editor
3. Create admin user (Authentication → Users), then insert into `admin_roles`:
```sql
insert into admin_roles(user_id, role) values ('<auth-user-uuid>', 'admin');
```
4. Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
5. Without keys the app runs fully on seed data + localStorage (demo mode).

## Key conventions
- Admin WhatsApp: **only** in `src/lib/siteConfig.ts` → `01018340567` / `201018340567`
- No customer email anywhere. Customer ID = WhatsApp number. Guest checkout.
- Admin auth = Supabase Auth + `admin_roles` + RLS. Demo login: `admin@lumiere.eg / admin123` → `/admin?demo=1`
- Routes: `/` `/shop` `/product/:id` `/cart` `/checkout` `/order-success` `/track-order` `/contact` `/about` `/offers` `/categories` `/admin` `/admin/login`

## WhatsApp order flow
Order saved (Supabase or local) → unique `ORD-xxxxx` → `/order-success` → "Send Order via WhatsApp" opens `https://wa.me/201018340567?text=<prefilled order>`.
