import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem, Category, DeliveryZone, Product } from "../lib/types";
import { SEED_PRODUCTS, SEED_ZONES, SEED_CATEGORIES } from "../lib/data";
import { fetchCategoriesRemote, fetchProductsRemote, fetchZonesRemote, isSupabaseConfigured } from "../lib/supabase";

interface Toast { id: number; msg: string }
interface ShopState {
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  reloadProducts: () => void;
  categories: Category[];
  zones: DeliveryZone[];
  cart: CartItem[];
  wishlist: string[];
  toasts: Toast[];
  addToCart: (id: string, qty?: number, notes?: string) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  toggleWish: (id: string) => void;
  cartCount: number;
  pushToast: (msg: string) => void;
  productById: (id: string) => Product | undefined;
}

const Ctx = createContext<ShopState | null>(null);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  // Seed renders instantly; remote replaces it when Supabase is configured.
  // Seed is a render fallback only — orders/checkout/tracking never use it.
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(isSupabaseConfigured);
  const [productsError, setProductsError] = useState<string | null>(null);
  // Remote categories replace the seed list when Supabase is configured;
  // seed stays as instant fallback (ids double as categoryId mapping).
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [zones, setZones] = useState<DeliveryZone[]>(SEED_ZONES);
  const [cart, setCart] = useState<CartItem[]>(() => readJSON("lumiere_cart", []));
  const [wishlist, setWishlist] = useState<string[]>(() => readJSON("lumiere_wish", []));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const loadId = useRef(0);

  const loadCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProductsLoading(false);
      setProductsError(null);
      return;
    }
    const my = ++loadId.current;
    setProductsLoading(true);
    setProductsError(null);
    try {
      const [remote, remoteZones, remoteCats] = await Promise.all([
        fetchProductsRemote(),
        fetchZonesRemote(),
        fetchCategoriesRemote(),
      ]);
      if (loadId.current !== my) return; // stale response — ignore
      // null = request failed (keep seed so the site works, flag retry);
      // [] = genuine empty catalog (show empty state, no error).
      if (remote) setProducts(remote);
      else setProductsError("catalog");
      if (remoteZones && remoteZones.length) setZones(remoteZones);
      if (remoteCats && remoteCats.length) setCategories(remoteCats);
    } catch {
      if (loadId.current !== my) return;
      // Keep the seed list so the site stays usable; surface retry.
      setProductsError("catalog");
    } finally {
      if (loadId.current === my) setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    try { localStorage.setItem("lumiere_cart", JSON.stringify(cart)); } catch { /*noop*/ }
  }, [cart]);
  useEffect(() => {
    try { localStorage.setItem("lumiere_wish", JSON.stringify(wishlist)); } catch { /*noop*/ }
  }, [wishlist]);

  // Toast timers are tracked so unmount never leaves dangling setState.
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); }, []);

  const pushToast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    const timer = window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    timers.current.push(timer);
  }, []);

  const value = useMemo<ShopState>(() => ({
    products, productsLoading, productsError, categories, zones, cart, wishlist, toasts, pushToast,
    reloadProducts: loadCatalog,
    cartCount: cart.reduce((s, c) => s + c.qty, 0),
    productById: (id) => products.find((p) => p.id === id || p.slug === id),
    addToCart: (id, qty = 1, notes) =>
      setCart((c) => {
        const f = c.find((x) => x.productId === id);
        if (f) {
          return c.map((x) =>
            x.productId === id
              ? { ...x, qty: Math.min(99, x.qty + qty), notes: notes ?? x.notes }
              : x,
          );
        }
        return [...c, { productId: id, qty: Math.min(99, Math.max(1, qty)), notes }];
      }),
    removeFromCart: (id) => setCart((c) => c.filter((x) => x.productId !== id)),
    setQty: (id, qty) =>
      setCart((c) => qty <= 0 ? c.filter((x) => x.productId !== id) : c.map((x) => x.productId === id ? { ...x, qty: Math.min(99, qty) } : x)),
    clearCart: () => setCart([]),
    toggleWish: (id) => setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
  }), [products, productsLoading, productsError, categories, zones, cart, wishlist, toasts, pushToast, loadCatalog]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop(): ShopState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShop outside provider");
  return v;
}
