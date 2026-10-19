-- JiA | Silk & Essentials — seed imagery swap
-- Old Unsplash placeholder URLs (and any other legacy hosts) are replaced by
-- the local branded assets shipped in public/images/. Run once against the
-- production database; Admin can still overwrite any row afterwards.
-- Safe to re-run: updates only rows whose url still points at a legacy host.

-- 1) Category tiles =======================================================
UPDATE public.categories AS c
SET image = v.new_url
FROM (VALUES
  ('chiffon',     '/images/p-h1-hover.webp'),
  ('modal',       '/images/p-h5-hover.webp'),
  ('satin',       '/images/p-h9-hover.webp'),
  ('accessories', '/images/p-h13-main.webp'),
  ('gifts',       '/images/p-h15-main.webp')
) AS v(slug, new_url)
WHERE c.slug = v.slug
  AND (c.image IS NULL OR c.image LIKE '%images.unsplash.com%');

-- 2) Product galleries (product_images.product_id FK, ordered by sort) =====
DELETE FROM public.product_images
WHERE url LIKE '%images.unsplash.com%'
  OR url LIKE '%images.pexels.com%';

INSERT INTO public.product_images (product_id, url, sort)
SELECT p.id, v.url, v.sort
FROM (VALUES
  ('p-h1', '/images/p-h1-main.webp',  1), ('p-h1', '/images/p-h1-hover.webp',  2),
  ('p-h2', '/images/p-h2-main.webp',  1), ('p-h2', '/images/p-h2-hover.webp',  2),
  ('p-h3', '/images/p-h3-main.webp',  1), ('p-h3', '/images/p-h3-hover.webp',  2),
  ('p-h4', '/images/p-h4-main.webp',  1), ('p-h4', '/images/p-h4-hover.webp',  2),
  ('p-h5', '/images/p-h5-main.webp',  1), ('p-h5', '/images/p-h5-hover.webp',  2),
  ('p-h6', '/images/p-h6-main.webp',  1), ('p-h6', '/images/p-h6-hover.webp',  2),
  ('p-h7', '/images/p-h7-main.webp',  1), ('p-h7', '/images/p-h7-hover.webp',  2),
  ('p-h8', '/images/p-h8-main.webp',  1), ('p-h8', '/images/p-h8-hover.webp',  2),
  ('p-h9', '/images/p-h9-main.webp',  1), ('p-h9', '/images/p-h9-hover.webp',  2),
  ('p-h10', '/images/p-h10-main.webp', 1), ('p-h10', '/images/p-h10-hover.webp', 2),
  ('p-h11', '/images/p-h11-main.webp', 1), ('p-h11', '/images/p-h11-hover.webp', 2),
  ('p-h12', '/images/p-h12-main.webp', 1), ('p-h12', '/images/p-h12-hover.webp', 2),
  ('p-h13', '/images/p-h13-main.webp', 1), ('p-h13', '/images/p-h13-hover.webp', 2),
  ('p-h14', '/images/p-h14-main.webp', 1), ('p-h14', '/images/p-h14-hover.webp', 2),
  ('p-h15', '/images/p-h15-main.webp', 1), ('p-h15', '/images/p-h15-hover.webp', 2),
  ('p-h16', '/images/p-h16-main.webp', 1), ('p-h16', '/images/p-h16-hover.webp', 2)
) AS v(pid, url, sort)
JOIN public.products AS p ON p.id = v.pid;
