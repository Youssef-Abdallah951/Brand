import { useLayoutEffect, useRef, type HTMLAttributes, type LiHTMLAttributes, type ReactNode, type Ref, type RefObject } from "react";

/* One shared IntersectionObserver for the whole app — every observed element
   registers a one-shot callback; the observer itself lives for the page. */
let io: IntersectionObserver | null = null;
const shown = new WeakMap<Element, () => void>();

function getIO(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io?.unobserve(entry.target);
          shown.get(entry.target)?.();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );
  }
  return io;
}

function motionOK(): boolean {
  if (!getIO()) return false;
  return !(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/**
 * Fade-and-rise scroll reveal. The hidden state is added Imperatively AFTER
 * layout (not in markup/CSS by default), so a missing IntersectionObserver,
 * a dropped JS execution or a reduced-motion visitor always gets the plain,
 * fully-visible page — content can never get stuck hidden.
 *
 * Staggering is derived by DOM position (index among the element's siblings,
 * capped and recycled) so grids get a soft cascade without any React state,
 * timers or re-renders.
 */
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const obs = getIO();
    if (!el || !obs || !motionOK()) return;
    el.classList.add("reveal");
    const idx = Array.from(el.parentElement?.children ?? []).indexOf(el);
    if (idx > 0) el.style.setProperty("--rd", `${(idx % 8) * 60}ms`);
    shown.set(el, () => el.classList.add("reveal-in"));
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      shown.delete(el);
    };
  }, []);
  return ref;
}

type RevealTag = "div" | "li" | "section" | "form";

/**
 * Small wrapper for list items / sections that aren't covered by the card
 * hooks. Renders the same element it wraps (no extra nesting beyond the
 * wrapper itself) and applies the identical once-only reveal.
 */
export function Reveal({
  tag = "div",
  className,
  children,
  ...attrs
}: { tag?: RevealTag; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement> & LiHTMLAttributes<HTMLElement>) {
  const ref = useReveal<HTMLElement>();
  const Tag = tag as "div";
  return (
    <Tag ref={ref as Ref<HTMLDivElement>} className={className} {...(attrs as HTMLAttributes<HTMLElement>)}>
      {children}
    </Tag>
  );
}
