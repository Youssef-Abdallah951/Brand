-- JiA hijab pricing: all hijab products -> EGP 100, stock 30, no sale price.
-- Accessories (undercap/pin set/scarf ring) and gift boxes keep their own
-- price/stock. Safe to re-run.
UPDATE public.products AS p
SET price = 100, sale_price = NULL, stock = 30
WHERE p.active = TRUE
  AND p.category_id IN (
    SELECT c.id FROM public.categories AS c
    WHERE c.slug IN ('chiffon', 'modal', 'satin')
  );
