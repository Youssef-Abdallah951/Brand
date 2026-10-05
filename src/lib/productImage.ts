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
