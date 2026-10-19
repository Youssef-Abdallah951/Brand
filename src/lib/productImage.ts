/**
 * Valid image sources are direct https:// URLs (Supabase / admin-provided)
 * or local site paths ("/images/..." files bundled in public/images).
 */
export function isDirectImageUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const s = u.trim();
  return /^https:\/\//i.test(s) || (s.startsWith("/") && !s.startsWith("//"));
}

/**
 * First valid direct image URL (mirrors the required behavior:
 * first entry with a usable URL, then legacy single-URL field, else "").
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

// Curated local fallback per category slug — used ONLY when the Supabase
// `categories.image` value is missing. Supabase stays the source of truth:
// a stored URL always wins. Files live in public/images (WebP with JPG
// duplicates; onError chains swap WebP → JPG before giving up). Content was
// verified image-by-image: hijab / modest-fashion / fabric / gift shots only.
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  chiffon: "/images/p-h1-hover.webp",
  modal: "/images/p-h5-hover.webp",
  satin: "/images/p-h9-hover.webp",
  accessories: "/images/p-h13-main.webp",
  gifts: "/images/p-h15-main.webp",
};

const GENERIC_CATEGORY_IMAGE = "/images/placeholder.webp";

/** Fallback tile for a category slug (unknown slugs get the branded placeholder). */
export function categoryFallbackUrl(slug: unknown): string {
  const key = String(slug ?? "").trim().toLowerCase();
  return CATEGORY_FALLBACK_IMAGES[key] ?? GENERIC_CATEGORY_IMAGE;
}

/**
 * Resolved tile image for a category: stored Supabase `image` first,
 * curated slug fallback otherwise (local branded assets).
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
