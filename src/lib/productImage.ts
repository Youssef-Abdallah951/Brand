/** Only direct https:// URLs are valid product image sources. */
export function isDirectImageUrl(u: unknown): u is string {
  return typeof u === "string" && /^https:\/\//i.test(u.trim());
}

/**
 * First valid direct image URL (mirrors the required behavior:
 * first entry with a usable URL, then legacy single-URL field, else "").
 * The URL is passed to <img src> untouched — never converted to a local path.
 */
export function firstProductImage(
  images: unknown,
  imageUrl?: unknown,
  idx = 0,
): string {
  if (Array.isArray(images)) {
    // Indexed variant (gallery): the requested slot when valid, else first valid.
    const atIdx = images[idx];
    const directAtIdx =
      typeof atIdx === "string" ? atIdx : (atIdx as { url?: unknown } | null)?.url;
    if (isDirectImageUrl(directAtIdx)) return (directAtIdx as string).trim();
    for (const im of images) {
      const u = typeof im === "string" ? im : (im as { url?: unknown } | null)?.url;
      if (isDirectImageUrl(u)) return (u as string).trim();
    }
  }
  if (isDirectImageUrl(imageUrl)) return (imageUrl as string).trim();
  return "";
}

const catImg = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

// Curated fallback per category slug — used ONLY when the Supabase
// `categories.image` value is missing. Supabase stays the source of truth:
// a stored https URL always wins. IDs match the seed catalog and were
// verified (HTTP 200) so tiles never render empty in production.
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  makeup: catImg("photo-1512496015851-a90fb38ba796"),
  skincare: catImg("photo-1556228720-195a672e8a03"),
  "hair-care": catImg("photo-1522337660859-02fbefca4702"),
  perfumes: catImg("photo-1541643600914-78b084683601"),
  "body-care": catImg("photo-1570172619644-dfd03ed5d881"),
  accessories: catImg("photo-1596462502278-27bfdc403348"),
};

const GENERIC_CATEGORY_IMAGE = catImg("photo-1487412947147-5cebf100ffc2");

/** Fallback tile for a category slug (unknown slugs get a generic cosmetics image). */
export function categoryFallbackUrl(slug: unknown): string {
  const key = String(slug ?? "").trim().toLowerCase();
  return CATEGORY_FALLBACK_IMAGES[key] ?? GENERIC_CATEGORY_IMAGE;
}

/**
 * Resolved tile image for a category: stored Supabase `image` first,
 * curated slug fallback otherwise. Never returns a local path.
 */
export function categoryImageUrl(image: unknown, slug: unknown): string {
  return firstProductImage([image]) || categoryFallbackUrl(slug);
}

/**
 * Graceful <img> failure: swap once to the curated fallback, hide only if
 * the fallback also fails. The card behind keeps its tinted background.
 */
export function onCategoryImgError(
  e: React.SyntheticEvent<HTMLImageElement>,
  fallbackSrc?: string,
): void {
  const el = e.currentTarget;
  if (fallbackSrc && !el.dataset.fbk) {
    el.dataset.fbk = "1";
    el.src = fallbackSrc;
    return;
  }
  el.style.display = "none";
}
