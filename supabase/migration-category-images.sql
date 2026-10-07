-- ============================================================================
-- LUMIÈRE BEAUTY — backfill category tile images (DATA ONLY, idempotent)
-- Run in Supabase SQL Editor.
--
-- CONTEXT: the `categories.image` column already exists (see
-- supabase/schema.sql) and the frontend + admin already read/write it —
-- no schema change is needed. All live rows currently have image = NULL,
-- so category cards render a placeholder icon. This fills each slug with
-- a curated professional image matching the category name.
--
-- SAFE: UPDATEs only touch rows where image IS NULL (never overwrites an
-- admin-set image). No DROP/DELETE/RLS changes. Safe to rerun.
-- NOTE: the storefront also falls back to these same URLs in code
-- (categoryFallbackUrl in src/lib/productImage.ts), so cards look right
-- even before/after this runs and for future categories without images.
-- ============================================================================

update public.categories set image = 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80'
 where slug = 'makeup' and image is null;

update public.categories set image = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'
 where slug = 'skincare' and image is null;

update public.categories set image = 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80'
 where slug = 'hair-care' and image is null;

update public.categories set image = 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80'
 where slug = 'perfumes' and image is null;

update public.categories set image = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80'
 where slug = 'body-care' and image is null;

update public.categories set image = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80'
 where slug = 'accessories' and image is null;

-- VERIFY (read-only check after Run):
--   select slug, name_en, left(image, 60) from public.categories where active = true;
--   -- every active row must show an https://images.unsplash.com URL.
