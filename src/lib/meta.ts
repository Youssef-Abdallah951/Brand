import { useEffect } from "react";

export const SITE_URL = "https://brand-alpha-sandy.vercel.app";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(path: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = SITE_URL + path;
}

function upsertNoindex(on: boolean) {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (on) {
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
  } else {
    el?.remove();
  }
}

/** Per-page <title>, meta description, canonical URL and OG tags.
 *  SPA best-effort: crawlers that execute JS see it, static prerender can be
 *  added later without changing call sites. */
export function usePageMeta(title: string, description?: string, image?: string) {
  useEffect(() => {
    document.title = title;
    upsertMeta("property", "og:title", title);
    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
    }
    if (image) upsertMeta("property", "og:image", image);
    upsertCanonical(`${window.location.pathname}${window.location.search}`);
    upsertNoindex(false);
  }, [title, description, image]);
}

/** For customer-facing failure states (order-not-found, 404…) — indexable
 *  pages must not leak error chrome into search results. */
export function usePageNoindex() {
  useEffect(() => {
    upsertNoindex(true);
  }, []);
}
