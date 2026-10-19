import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategoriesRemote, fetchProductsRemote, getSupabase, isSupabaseConfigured, withRetry } from "../lib/supabase";
import { SEED_PRODUCTS } from "../lib/data";
import { useShop } from "../store/ShopContext";
import { SITE_CONFIG } from "../lib/siteConfig";
import { DEFAULT_HIJAB_PRICE, DEFAULT_HIJAB_STOCK } from "../lib/config";
import { COUPONS, type Coupon } from "../lib/coupons";
import { fmtPrice } from "../lib/format";
import { firstProductImage, onImgError } from "../components/product";
import { STATUS_LABEL } from "../i18n/translations";
import { CashIcon, ChartIcon, CheckIcon, ClockIcon, FlameIcon, GridIcon, ImageIcon, LockIcon, MapPinIcon, PackageIcon, PencilIcon, PlusIcon, ReceiptIcon, RetryIcon, StarIcon, TrashIcon, TruckIcon, UsersIcon, XIcon } from "../components/icons";
import type { Category, DeliveryZone, Order, OrderStatus, Product, ProductColor } from "../lib/types";

const card = "bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-3xl soft-shadow";
const chip = "text-xs font-bold px-3 py-1.5 rounded-full";
const cls = "w-full rounded-xl border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-3 py-2 text-sm outline-none focus:border-bronze";
const tokenOk = "bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3]";
const demoAuthKey = "lumiere_admin_demo";

/* Login gate — Supabase Auth when configured. Otherwise password NEVER lives
   in the client: the demo form calls the /api/admin-login serverless
   function, which checks ADMIN_EMAIL / ADMIN_PASSWORD env vars server-side. */
function useAdminGuard() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      // Demo session token: issued by /api/admin-login (env-var check),
      // consumed here by value + expiry only.
      let token = "";
      try { token = JSON.parse(localStorage.getItem(demoAuthKey) ?? "null")?.token ?? ""; } catch { /* noop */ }
      const exp = Number(token.split(".")[1] ?? 0);
      const ok = Boolean(token) && exp > Math.floor(Date.now() / 1000);
      setIsAdmin(ok);
      setReady(true);
      if (!ok) nav("/admin/login");
      return;
    }
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setReady(true);
        nav("/admin/login");
        return;
      }
      const { data: role } = await sb.from("admin_roles").select("role").eq("user_id", data.session.user.id).single();
      setIsAdmin(role?.role === "admin" || role?.role === "owner");
      setReady(true);
      if (!(role?.role === "admin" || role?.role === "owner")) nav("/admin/login");
    });
  }, [nav]);
  return { ready, isAdmin };
}

export function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const live = isSupabaseConfigured;

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const sb = getSupabase();
    if (!sb) {
      // Demo mode: POST /api/admin-login (env vars checked server-side).
      setBusy(true);
      try {
        const r = await fetch("/api/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const v = (await r.json()) as { ok: boolean; token?: string; error?: string };
        if (r.ok && v.ok && v.token) {
          localStorage.setItem(demoAuthKey, JSON.stringify({ token: v.token, at: Date.now() }));
          nav("/admin");
        } else {
          setErr(v.error === "invalid"
            ? "Invalid credentials / بيانات الدخول غير صحيحة"
            : `Demo login unavailable: ${v.error ?? r.status}`);
        }
      } catch {
        setErr("Could not reach the login service. Configure ADMIN_EMAIL / ADMIN_PASSWORD on the host.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else nav("/admin");
  };

  return (
    <main className="min-h-[80vh] grid place-items-center px-4 py-10">
      <form onSubmit={login} className="w-full max-w-md bg-white dark:bg-[#191512] rounded-3xl border border-line dark:border-[#2e2822] p-7 soft-shadow">
        <h1 className="font-display text-xl font-bold inline-flex items-center gap-2 text-ink dark:text-[#f3ede3]"><LockIcon className="w-6 h-6 text-bronze" /> {live ? "Supabase Auth" : "Admin Login"}</h1>
        <p className="text-xs text-mute dark:text-[#a89f92] mt-1">
          {live
            ? "Supabase Auth — administrators only. Customers never log in."
            : "Serverless env-var login (ADMIN_EMAIL / ADMIN_PASSWORD checked server-side; no password ships in the client bundle)."}
        </p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" dir="ltr" required type="email" autoComplete="username" className="mt-5 w-full rounded-2xl border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-4 py-3 text-sm outline-none focus:border-bronze" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" dir="ltr" required autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-4 py-3 text-sm outline-none focus:border-bronze" />
        {err && <p className="text-clay text-xs font-bold mt-2" role="alert">{err}</p>}
        <button disabled={busy} className="mt-4 w-full min-h-[48px] rounded-full bg-ink text-[#f3ede3] font-bold hover:bg-bronze-deep transition btn-press disabled:opacity-60">
          {busy ? "…" : "Login"}
        </button>
      </form>
    </main>
  );
}

type Tab = "dash" | "orders" | "products" | "cats" | "customers" | "delivery" | "reviews" | "coupons";

interface AdminOrder extends Order {
  id: string;
}

interface ReviewRow {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function AdminDashboard() {
  const { ready, isAdmin } = useAdminGuard();
  const [tab, setTab] = useState<Tab>("dash");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [zonesState, setZonesState] = useState<DeliveryZone[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [orderFilter, setOrderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [openOrder, setOpenOrder] = useState<AdminOrder | null>(null);
  const shop = useShop();
  const zones = zonesState.length ? zonesState : shop.zones;
  const [saving, setSaving] = useState("");
  const live = isSupabaseConfigured;
  const low = SITE_CONFIG.admin.lowStock;

  const mapRow = (d: Record<string, unknown>): AdminOrder => ({
    id: String(d.id),
    orderNumber: String(d.order_number),
    firstName: String(d.first_name ?? ""), lastName: String(d.last_name ?? ""),
    whatsapp: String(d.whatsapp ?? ""), phone: String(d.phone ?? ""),
    governorate: String(d.governorate ?? ""), area: String(d.area ?? ""),
    city: String(d.city ?? ""), address: String(d.address ?? ""),
    building: String(d.building ?? ""), apartment: String(d.apartment ?? ""),
    notes: String(d.notes ?? ""),
    deliveryMethod: (d.delivery_method as "standard" | "express") ?? "standard",
    paymentMethod: "cod",
    paymentStatus: (d.payment_status as Order["paymentStatus"]) ?? "pending",
    items: (((d.order_items as unknown[]) ?? []) as Record<string, unknown>[]).map((i) => ({
      productId: String(i.product_id ?? ""),
      nameEn: String(i.name_en ?? ""), nameAr: String(i.name_ar ?? ""),
      price: Number(i.price ?? 0), qty: Number(i.qty ?? 0), image: String(i.image ?? ""),
    })),
    subtotal: Number(d.subtotal ?? 0), deliveryFee: Number(d.delivery_fee ?? 0),
    discount: Number(d.discount ?? 0), total: Number(d.total ?? 0),
    status: (d.status as OrderStatus) ?? "pending",
    createdAt: String(d.created_at ?? ""),
    timeline: [{ status: (d.status as OrderStatus) ?? "pending", at: String(d.created_at ?? "") }],
  });

  const loadOrders = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setOrdersLoading(true);
    setOrdersError(false);
    try {
      const { data } = await withRetry(() =>
        sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200),
      );
      if (data) setOrders((data as Record<string, unknown>[]).map(mapRow));
    } catch {
      setOrdersError(true);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadReviews = async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data } = await withRetry(() =>
        sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(50),
      );
      if (data) {
        setReviews(
          (data as Record<string, unknown>[]).map((r) => ({
            id: String(r.id),
            productId: String(r.product_id ?? ""),
            name: String(r.customer_name ?? ""),
            rating: Number(r.rating ?? 0),
            comment: String(r.comment ?? ""),
            createdAt: String(r.created_at ?? ""),
          })),
        );
      }
    } catch {
      /* reviews stay empty — non-critical, page still works */
    }
  };

  useEffect(() => {
    loadOrders();
    loadReviews();
    fetchProductsRemote().then((r) => {
      if (r) setProducts(r);
    });
    fetchCategoriesRemote().then((r) => {
      if (r) setCats(r);
    });
    const sb = getSupabase();
    if (sb) {
      withRetry(() => sb.from("delivery_zones").select("*").order("governorate_en"))
        .then(({ data }) => {
          if (data) {
            setZonesState(
              (data as Record<string, unknown>[]).map((z) => ({
                id: String(z.id),
                governorateEn: String(z.governorate_en),
                governorateAr: String(z.governorate_ar),
                standardFee: Number(z.standard_fee),
                expressFee: Number(z.express_fee),
                etaEn: String(z.eta_en ?? ""),
                etaAr: String(z.eta_ar ?? ""),
                active: Boolean(z.active),
              })),
            );
          }
        })
        .catch(() => { /* fallback zones from shop context stay */ });
    }
  }, []);

  const changeStatus = async (o: AdminOrder, s: OrderStatus) => {
    const sb = getSupabase();
    if (!sb) return;
    setSaving(o.orderNumber);
    const { error } = await sb.from("orders").update({ status: s }).eq("id", o.id);
    setSaving("");
    if (!error) setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status: s } : x)));
  };

  const setPay = async (o: AdminOrder, ps: Order["paymentStatus"]) => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("orders").update({ payment_status: ps }).eq("id", o.id);
    if (!error) setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, paymentStatus: ps } : x)));
  };

  const saveProduct = async (p: Product, patch: Partial<Product>) => {
    setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    if (editing?.id === p.id) setEditing({ ...editing, ...patch });
    const sb = getSupabase();
    if (!sb) return; // demo mode: in-memory only
    const images = patch.images;
    const rest: Partial<Product> = { ...patch };
    delete rest.images;
    void images;
    const dbPatch: Record<string, unknown> = {};
    if (rest.price !== undefined) dbPatch.price = rest.price;
    if (rest.salePrice !== undefined) dbPatch.sale_price = rest.salePrice;
    if (rest.stock !== undefined) dbPatch.stock = rest.stock;
    if (rest.active !== undefined) dbPatch.active = rest.active;
    if (rest.nameEn !== undefined) dbPatch.name_en = rest.nameEn;
    if (rest.nameAr !== undefined) dbPatch.name_ar = rest.nameAr;
    if (rest.descEn !== undefined) dbPatch.desc_en = rest.descEn;
    if (rest.descAr !== undefined) dbPatch.desc_ar = rest.descAr;
    if (rest.categoryId !== undefined) dbPatch.category_id = rest.categoryId || null;
    if (rest.featured !== undefined) dbPatch.featured = rest.featured;
    if (rest.bestseller !== undefined) dbPatch.bestseller = rest.bestseller;
    if (rest.tags !== undefined) dbPatch.tags = rest.tags;
    if (rest.colors !== undefined) dbPatch.colors = rest.colors;
    if (rest.fabricAr !== undefined) dbPatch.fabric_ar = rest.fabricAr;
    if (rest.fabricEn !== undefined) dbPatch.fabric_en = rest.fabricEn;
    if (Object.keys(dbPatch).length) await sb.from("products").update(dbPatch).eq("id", p.id);
    // Image URLs live in product_images (one row per URL, ordered by sort).
    if (images !== undefined) {
      await sb.from("product_images").delete().eq("product_id", p.id);
      if (images.length) {
        await sb.from("product_images").insert(
          images.filter(Boolean).map((url, i) => ({ product_id: p.id, url, sort: i })),
        );
      }
    }
  };

  const addProduct = async (draft: {
    nameEn: string; nameAr: string; price: number; salePrice?: number;
    stock: number; categoryId: string; images: string[];
    colors: ProductColor[]; tag?: "new" | "bestseller";
    featured: boolean; bestseller: boolean;
  }) => {
    const slugBase = draft.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const sb = getSupabase();
    if (!sb) {
      // Demo mode: in-memory only.
      const p: Product = {
        id: `local-${Date.now()}`, slug,
        nameEn: draft.nameEn, nameAr: draft.nameAr,
        descEn: "", descAr: "",
        price: draft.price, ...(draft.salePrice !== undefined ? { salePrice: draft.salePrice } : {}),
        stock: draft.stock,
        categoryId: draft.categoryId, images: draft.images,
        rating: 4.5, reviewsCount: 0,
        featured: draft.featured, bestseller: draft.bestseller,
        tags: draft.tag ? [draft.tag] : undefined,
        colors: draft.colors.length ? draft.colors : undefined,
        active: true, createdAt: new Date().toISOString(),
      };
      setProducts((ps) => [p, ...ps]);
      setShowAdd(false);
      return;
    }
    const catId = cats.find((c) => c.id === draft.categoryId)?.id ?? null;
    const { data, error } = await sb.from("products").insert({
      slug,
      category_id: catId,
      name_en: draft.nameEn, name_ar: draft.nameAr,
      price: draft.price,
      ...(draft.salePrice !== undefined ? { sale_price: draft.salePrice } : {}),
      stock: draft.stock, featured: draft.featured, bestseller: draft.bestseller,
      tags: draft.tag ? [draft.tag] : [],
      colors: draft.colors.length ? draft.colors : [],
      active: true, rating: 4.5, reviews_count: 0,
    }).select("id").single();
    if (error || !data) return;
    const id = String((data as { id: string }).id);
    if (draft.images.length) {
      await sb.from("product_images").insert(
        draft.images.filter(Boolean).map((url, i) => ({ product_id: id, url, sort: i })),
      );
    }
    const created: Product = {
      id, slug, nameEn: draft.nameEn, nameAr: draft.nameAr,
      descEn: "", descAr: "", price: draft.price,
      ...(draft.salePrice !== undefined ? { salePrice: draft.salePrice } : {}),
      stock: draft.stock, categoryId: catId ?? "", images: draft.images,
      rating: 4.5, reviewsCount: 0, featured: draft.featured,
      bestseller: draft.bestseller,
      tags: draft.tag ? [draft.tag] : undefined,
      colors: draft.colors.length ? draft.colors : undefined,
      active: true, createdAt: new Date().toISOString(),
    };
    setProducts((ps) => [created, ...ps]);
    setShowAdd(false);
  };

  const deleteProduct = async (p: Product) => {
    if (!window.confirm(`Delete "${p.nameEn}"?`)) return;
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
    if (editing?.id === p.id) setEditing(null);
    const sb = getSupabase();
    if (sb) await sb.from("products").delete().eq("id", p.id);
  };

  const saveCategory = async (c: Category, patch: Partial<Category>) => {
    setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
    const sb = getSupabase();
    if (!sb) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.nameEn !== undefined) dbPatch.name_en = patch.nameEn;
    if (patch.nameAr !== undefined) dbPatch.name_ar = patch.nameAr;
    if (patch.image !== undefined) dbPatch.image = patch.image;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (Object.keys(dbPatch).length) await sb.from("categories").update(dbPatch).eq("id", c.id);
  };

  const addCategory = async (slug: string, nameEn: string, nameAr: string) => {
    const sb = getSupabase();
    if (!sb) {
      setCats((cs) => [...cs, { id: `local-${Date.now()}`, slug, nameEn, nameAr, image: "", active: true }]);
      return;
    }
    const { data, error } = await sb.from("categories").insert({ slug, name_en: nameEn, name_ar: nameAr, active: true }).select("id").single();
    if (error || !data) return;
    setCats((cs) => [...cs, { id: String((data as { id: string }).id), slug, nameEn, nameAr, image: "", active: true }]);
  };

  const deleteCategory = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.nameEn}"? Products keep working (uncategorized).`)) return;
    setCats((cs) => cs.filter((x) => x.id !== c.id));
    const sb = getSupabase();
    if (sb) await sb.from("categories").delete().eq("id", c.id);
  };

  const saveZone = async (z: DeliveryZone, patch: Partial<DeliveryZone>) => {
    setZonesState((zs) => zs.map((x) => (x.id === z.id ? { ...x, ...patch } : x)));
    const sb = getSupabase();
    if (!sb) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.standardFee !== undefined) dbPatch.standard_fee = patch.standardFee;
    if (patch.expressFee !== undefined) dbPatch.express_fee = patch.expressFee;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (patch.etaEn !== undefined) dbPatch.eta_en = patch.etaEn;
    if (patch.etaAr !== undefined) dbPatch.eta_ar = patch.etaAr;
    if (Object.keys(dbPatch).length) await sb.from("delivery_zones").update(dbPatch).eq("id", z.id);
  };

  const addZone = async (en: string, ar: string, standard: number, express: number) => {
    const sb = getSupabase();
    if (!sb) {
      setZonesState((zs) => [...zs, { id: `local-${Date.now()}`, governorateEn: en, governorateAr: ar, standardFee: standard, expressFee: express, etaEn: "2-4 days", etaAr: "2-4 أيام", active: true }]);
      return;
    }
    const { data, error } = await sb.from("delivery_zones").insert({
      governorate_en: en, governorate_ar: ar,
      standard_fee: standard, express_fee: express, active: true,
    }).select("id").single();
    if (error || !data) return;
    setZonesState((zs) => [...zs, { id: String((data as { id: string }).id), governorateEn: en, governorateAr: ar, standardFee: standard, expressFee: express, etaEn: "2-4 days", etaAr: "2-4 أيام", active: true }]);
  };

  const deleteZone = async (z: DeliveryZone) => {
    if (!window.confirm(`Delete zone "${z.governorateEn}"?`)) return;
    setZonesState((zs) => zs.filter((x) => x.id !== z.id));
    const sb = getSupabase();
    if (sb) await sb.from("delivery_zones").delete().eq("id", z.id);
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    setReviews((rs) => rs.filter((r) => r.id !== id));
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("reviews").delete().eq("id", id);
      if (error) loadReviews(); // restore on failure
    }
  };

  if (!ready) return <main className="min-h-[50vh] grid place-items-center text-sm text-mute">Loading…</main>;
  if (!isAdmin) return null;

  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const count = (st: OrderStatus) => orders.filter((o) => o.status === st).length;
  const lowStockItems = products.filter((p) => p.stock <= low);
  const customers = Object.values(
    orders.reduce((acc: Record<string, { key: string; whatsapp: string; name: string; orders: number; spend: number }>, o) => {
      // Legacy orders are keyed by WhatsApp; newer orders (no number
      // collected) each get their own row keyed by order number.
      const k = o.whatsapp || `order-${o.orderNumber}`;
      if (!acc[k]) acc[k] = { key: k, whatsapp: o.whatsapp, name: `${o.firstName} ${o.lastName}`, orders: 0, spend: 0 };
      acc[k].orders += 1;
      acc[k].spend += o.total;
      return acc;
    }, {}),
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dash", label: "Dashboard", icon: <ChartIcon className="w-4 h-4" /> },
    { id: "orders", label: "Orders", icon: <ReceiptIcon className="w-4 h-4" /> },
    { id: "products", label: "Products", icon: <PackageIcon className="w-4 h-4" /> },
    { id: "cats", label: "Categories", icon: <GridIcon className="w-4 h-4" /> },
    { id: "customers", label: "Customers", icon: <UsersIcon className="w-4 h-4" /> },
    { id: "delivery", label: "Delivery", icon: <TruckIcon className="w-4 h-4" /> },
    { id: "coupons", label: "Coupons", icon: <CashIcon className="w-4 h-4" /> },
    { id: "reviews", label: "Reviews", icon: <StarIcon className="w-4 h-4" /> },
  ];

  const statusList: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];
  const shownOrders = orders.filter((o) => {
    const f = !orderFilter || (o.orderNumber + o.whatsapp + o.firstName + o.lastName).toLowerCase().includes(orderFilter.toLowerCase());
    const s = statusFilter === "all" || o.status === statusFilter;
    return f && s;
  });

  const statusChipCls = (st: OrderStatus) =>
    st === "cancelled" ? "bg-clay/15 text-clay"
    : st === "delivered" ? "bg-bronze/15 text-bronze-deep dark:text-bronze"
    : "bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3]";

  return (
    <main className="shell max-w-7xl mx-auto py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink dark:text-[#f3ede3]">Admin Dashboard</h1>
        <span className={`text-xs ${tokenOk} font-bold px-3 py-1 rounded-full`}>COD only · {SITE_CONFIG.admin.phoneLocal}</span>
        {!live && <span className="text-xs bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200 font-bold px-3 py-1 rounded-full">Demo mode — connect Supabase for live data</span>}
        <button
          onClick={() => { localStorage.removeItem(demoAuthKey); getSupabase()?.auth.signOut(); location.href = "/"; }}
          className="ms-auto text-xs font-bold border border-line dark:border-[#2e2822] rounded-full px-4 py-2 text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] transition"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)}
            className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 transition ${tab === x.id ? "bg-ink text-[#f3ede3]" : "bg-white dark:bg-[#191512] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>
            {x.icon}{x.label}
          </button>
        ))}
      </div>

      {tab === "dash" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            { icon: <ReceiptIcon className="w-4 h-4 text-bronze" />, label: "Total Orders", value: String(orders.length) },
            { icon: <ClockIcon className="w-4 h-4 text-amber-600" />, label: "Pending", value: String(count("pending")) },
            { icon: <TruckIcon className="w-4 h-4 text-bronze" />, label: "Out for Delivery", value: String(count("out_for_delivery")) },
            { icon: <CheckIcon className="w-4 h-4 text-bronze-deep" />, label: "Delivered", value: String(count("delivered")) },
            { icon: <CashIcon className="w-4 h-4 text-bronze-deep" />, label: "Revenue", value: fmtPrice(revenue, "en") },
            { icon: <PackageIcon className="w-4 h-4 text-bronze" />, label: "Products", value: String(products.length) },
            { icon: <UsersIcon className="w-4 h-4 text-bronze" />, label: "Customers", value: String(customers.length) },
            { icon: <FlameIcon className="w-4 h-4 text-clay" />, label: `Low stock (≤${low})`, value: String(lowStockItems.length) },
          ].map(({ icon, label, value }) => (
            <div key={label} className={`${card} p-5`}>
              <div className="text-xs text-mute dark:text-[#a89f92] inline-flex items-center gap-1.5">{icon}{label}</div>
              <div className="text-[1.35rem] font-extrabold mt-1 text-ink dark:text-[#f3ede3]" dir={/EGP/.test(value) ? "ltr" : undefined}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ORDERS — responsive: cards on mobile, table on lg, drawer for details */}
      {tab === "orders" && (
        <div className="mt-5 grid gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}
              placeholder="Search order number / name…"
              className="rounded-full border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-4 py-2.5 text-sm outline-none focus:border-bronze min-w-64 max-w-md flex-1" />
            <button onClick={() => setStatusFilter("all")} aria-pressed={statusFilter === "all"}
              className={`${chip} ${statusFilter === "all" ? "bg-ink text-white" : "bg-white dark:bg-[#201a15] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>All ({orders.length})</button>
            {statusList.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}
                className={`${chip} ${statusFilter === s ? "bg-ink text-white" : "bg-white dark:bg-[#201a15] border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze"}`}>
                {STATUS_LABEL[s]?.en}
              </button>
            ))}
          </div>
          {!live && <p className="text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-4 py-3 text-sm font-bold">Connect Supabase keys to view live orders.</p>}
          {live && ordersError && (
            <div className="bg-clay/10 border border-clay/30 rounded-2xl px-4 py-3 text-sm font-bold text-clay flex flex-wrap gap-3 items-center " role="alert">
              <span>Unable to load orders. Please try again.</span>
              <button onClick={loadOrders} disabled={ordersLoading} className="underline disabled:opacity-60 inline-flex items-center gap-1"><RetryIcon className="w-3.5 h-3.5" /> {ordersLoading ? "Loading…" : "Retry"}</button>
            </div>
          )}
          {live && !ordersError && ordersLoading && shownOrders.length === 0 && <p className="text-mute dark:text-[#a89f92] text-sm">Loading orders…</p>}
          {live && !ordersError && !ordersLoading && shownOrders.length === 0 && (
            <p className={`${card} p-6 text-sm text-mute dark:text-[#a89f92] text-center`}>No orders yet. New COD orders from /checkout appear here.</p>
          )}

          {/* lg+ table */}
          {shownOrders.length > 0 && (
            <div className={`${card} overflow-hidden hidden lg:block`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-mute dark:text-[#a89f92] text-xs border-b border-line dark:border-[#2e2822]">
                    <th className="text-start px-4 py-3">Order</th>
                    <th className="text-start px-2 py-3">Customer</th>
                    <th className="text-start px-2 py-3">Status</th>
                    <th className="text-start px-2 py-3">COD</th>
                    <th className="text-end px-4 py-3">Total</th>
                    <th className="px-2 py-3 w-20"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-[#2e2822]">
                  {shownOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/60 dark:hover:bg-[#201a15]/40 transition">
                      <td className="px-4 py-3 font-bold" dir="ltr">#{o.orderNumber}</td>
                      <td className="px-2 py-3">
                        {o.firstName} {o.lastName}
                        <span className="block text-xs text-mute dark:text-[#a89f92]">{o.governorate}</span>
                      </td>
                      <td className="px-2 py-3"><span className={`inline-block ${chip} ${statusChipCls(o.status)}`}>{STATUS_LABEL[o.status]?.en}</span></td>
                      <td className="px-2 py-3 text-xs font-bold">{o.paymentStatus === "paid" ? "Paid" : "Pending"}</td>
                      <td className="px-4 py-3 text-end font-extrabold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(o.total, "en")}</td>
                      <td className="px-2 py-3 text-end">
                        <button onClick={() => setOpenOrder(o)} className={`${chip} border border-line dark:border-[#2e2822] hover:border-bronze text-ink dark:text-[#f3ede3]`}>Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* <lg stacked cards */}
          <div className="grid gap-2 lg:hidden">
            {shownOrders.map((o) => (
              <button key={o.id} onClick={() => setOpenOrder(o)} className={`${card} p-4 text-start w-full hover:border-bronze transition`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" dir="ltr">#{o.orderNumber}</span>
                  <span className={`ms-auto ${chip} ${statusChipCls(o.status)}`}>{STATUS_LABEL[o.status]?.en}</span>
                </div>
                <div className="text-sm mt-1.5 text-ink dark:text-[#f3ede3] font-semibold">{o.firstName} {o.lastName} · {o.governorate}</div>
                <div className="flex items-center justify-between mt-1 text-xs text-mute dark:text-[#a89f92]">
                  <span>{o.items.length} items</span>
                  <span className="font-extrabold text-ink dark:text-[#f3ede3]" dir="auto">{fmtPrice(o.total, "en")}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order details drawer */}
      {openOrder && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Order ${openOrder.orderNumber}`}>
          <button className="absolute inset-0 bg-black/45 fade-in" onClick={() => setOpenOrder(null)} aria-label="Close order details" />
          <aside className={openOrderCls}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line dark:border-[#2e2822]">
              <span className="font-display font-bold text-lg text-ink dark:text-[#f3ede3]" dir="ltr">#{openOrder.orderNumber}</span>
              <button onClick={() => setOpenOrder(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-full hover:bg-sand dark:hover:bg-[#201a15]"><XIcon className="w-5 h-5 text-ink dark:text-[#f3ede3]" /></button>
            </div>
            <div className="overflow-y-auto p-5 grid gap-2 text-sm text-ink dark:text-[#f3ede3]">
              <p><span className="text-mute dark:text-[#a89f92]">Placed:</span> {new Date(openOrder.createdAt).toLocaleString()}</p>
              <p><span className="text-mute dark:text-[#a89f92]">Customer:</span> {openOrder.firstName} {openOrder.lastName}</p>
              <p className="inline-flex items-start gap-1.5"><MapPinIcon className="w-4 h-4 mt-0.5 shrink-0 text-bronze" /> {openOrder.address}, {openOrder.area}, {openOrder.city}, {openOrder.governorate} {openOrder.building && `Bldg ${openOrder.building}`} {openOrder.apartment && `Apt ${openOrder.apartment}`}</p>
              <p className="inline-flex items-center gap-1.5"><TruckIcon className="w-4 h-4 shrink-0 text-bronze" /> {openOrder.deliveryMethod} · {STATUS_LABEL[openOrder.status]?.en} · COD {openOrder.paymentStatus}</p>
              {openOrder.notes && <p className="bg-sand dark:bg-[#201a15] rounded-xl p-3 whitespace-pre-wrap" dir="auto">{openOrder.notes}</p>}
              <div className="border-t border-dashed border-line dark:border-[#2e2822] pt-2 mt-1">
                {openOrder.items.map((i, idx) => { const thumb = firstProductImage([i.image]); return <div key={`${i.productId}-${idx}`} className="flex gap-2 items-center py-1.5">{thumb && <img src={thumb} onError={onImgError} loading="lazy" className="product-photo w-8 h-10 rounded object-cover bg-sand dark:bg-[#201a15]" alt="" />}<span>{i.nameEn} × {i.qty}</span><span className="ms-auto font-bold" dir="auto">{fmtPrice(i.price * i.qty, "en")}</span></div>; })}
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-dashed border-line dark:border-[#2e2822]">
                <span>Total</span><span dir="auto">{fmtPrice(openOrder.total, "en")}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {statusList.map((s) => (
                  <button key={s} disabled={saving === openOrder.orderNumber} onClick={() => changeStatus(openOrder, s)}
                    className={`text-xs font-bold ${chip} border border-line dark:border-[#2e2822] transition ${openOrder.status === s ? "bg-ink text-white" : "hover:bg-white dark:hover:bg-[#201a15] text-ink dark:text-[#f3ede3] underline"} disabled:opacity-60`}>
                    {STATUS_LABEL[s]?.en}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-1">
                <span className="text-xs text-mute dark:text-[#a89f92]">COD payment:</span>
                <button onClick={() => setPay(openOrder, "paid")} className={`text-xs font-bold ${chip} ${openOrder.paymentStatus === "paid" ? "bg-bronze text-white" : "bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3]"}`}>Mark paid</button>
                <button onClick={() => setPay(openOrder, "pending")} className={`text-xs font-bold ${chip} ${openOrder.paymentStatus !== "paid" ? "bg-bronze text-white" : "bg-sand dark:bg-[#201a15] text-ink dark:text-[#f3ede3]"}`}>Mark pending</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "products" && (
        <div className="mt-5 grid gap-3">
          {!live && <p className="text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-4 py-3 font-bold">Demo mode — edits are in-memory only. Connect Supabase to persist.</p>}
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAdd((s) => !s)} className={`rounded-full ${showAdd ? tokenOk : "bg-ink text-white"} text-sm font-bold px-5 py-2.5 inline-flex items-center gap-1.5 hover:bg-bronze-deep transition`}>
              {showAdd ? <><XIcon className="w-4 h-4" /> Close</> : <><PlusIcon className="w-4 h-4" /> Add Product</>}
            </button>
            <span className="text-xs text-mute dark:text-[#a89f92]">Single source: Supabase <code>products</code> (seed fallback in <code>src/lib/data.ts</code>).</span>
          </div>
          {showAdd && <AddProductForm cats={cats} onAdd={addProduct} />}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {products.map((p) => {
              const thumb = firstProductImage(p.images);
              return (
                <div key={p.id} className={`${card} p-3`}>
                  <div className="flex gap-3 items-start">
                    {thumb ? (
                      <img src={thumb} onError={onImgError} loading="lazy" alt="" className="product-photo w-14 h-16 rounded-2xl object-cover bg-sand dark:bg-[#201a15]" />
                    ) : (
                      <span className="w-14 h-16 rounded-2xl bg-sand dark:bg-[#201a15] grid place-items-center shrink-0 text-bronze/60"><ImageIcon className="w-6 h-6" /></span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-ink dark:text-[#f3ede3]">{p.nameEn}</div>
                      <div className="text-xs text-mute dark:text-[#a89f92] inline-flex items-center gap-1 flex-wrap mt-0.5" dir="auto">
                        {fmtPrice(p.salePrice && p.salePrice < p.price ? p.salePrice : p.price, "en")}
                        {p.tags?.map((tg) => <span key={tg} className="inline-flex items-center gap-0.5">· {tg === "new" ? <StarIcon filled className="w-3 h-3 text-bronze" /> : <FlameIcon className="w-3 h-3 text-bronze" />}{tg}</span>)}
                      </div>
                      <div className="text-xs mt-1 font-bold inline-flex items-center gap-2">
                        <span className={p.stock <= low ? "text-clay" : "text-mute dark:text-[#a89f92]"}>
                          {p.stock <= low ? `Low stock: ${p.stock}` : `Stock ${p.stock}`}
                        </span>
                        {p.colors && p.colors.length > 0 && <span className="text-mute dark:text-[#a89f92]">· {p.colors.length} colours</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <button onClick={() => saveProduct(p, { active: !p.active })} className={`${chip} ${p.active ? tokenOk : "bg-line dark:bg-[#2e2822] text-mute dark:text-[#a89f92]"}`}>{p.active ? "Active" : "Hidden"}</button>
                    <button onClick={() => setEditing(editing?.id === p.id ? null : p)} className={`${chip} border border-line dark:border-[#2e2822] text-ink dark:text-[#f3ede3] hover:border-bronze inline-flex items-center gap-1`}><PencilIcon className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => deleteProduct(p)} aria-label="delete product" className="text-clay font-bold p-1.5 ms-auto"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                  {editing?.id === p.id && (
                    <ProductEditor p={editing} cats={cats} onSave={(patch) => saveProduct(p, patch)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "cats" && (
        <div className="mt-5 grid gap-3">
          {!live && <p className="text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-4 py-3 font-bold">Demo mode — categories are in-memory only.</p>}
          <AddCategoryForm onAdd={addCategory} />
          <div className="grid sm:grid-cols-2 gap-3">
            {cats.map((c) => (
              <div key={c.id} className={`${card} p-4 flex gap-3 items-center`}>
                {c.image ? <img src={c.image} alt="" loading="lazy" className="product-photo w-14 h-14 rounded-2xl object-cover bg-sand dark:bg-[#201a15]" /> : <span className="w-14 h-14 rounded-2xl bg-sand dark:bg-[#201a15] grid place-items-center text-bronze/60"><ImageIcon className="w-6 h-6" /></span>}
                <div className="flex-1 min-w-0">
                  <input value={c.nameEn} onChange={(e) => saveCategory(c, { nameEn: e.target.value })} className="font-bold w-full bg-transparent text-ink dark:text-[#f3ede3] rounded-lg border border-transparent hover:border-line dark:hover:border-[#2e2822] focus:border-bronze px-1 text-sm" title="name en" dir="ltr" />
                  <input value={c.nameAr} onChange={(e) => saveCategory(c, { nameAr: e.target.value })} className="text-sm text-mute dark:text-[#a89f92] w-full bg-transparent rounded-lg border border-transparent hover:border-line dark:hover:border-[#2e2822] focus:border-bronze px-1" title="name ar" dir="rtl" />
                  <div className="text-xs text-mute dark:text-[#a89f92] mt-0.5" dir="ltr">/{c.slug} · {products.filter((p) => p.categoryId === c.id || p.categoryId === c.slug).length}</div>
                </div>
                <div className="grid gap-1.5">
                  <button onClick={() => saveCategory(c, { active: !c.active })} className={`text-xs font-bold ${chip} ${c.active ? tokenOk : "bg-line dark:bg-[#2e2822] text-mute dark:text-[#a89f92]"}`}>{c.active ? "Active" : "Hidden"}</button>
                  <button onClick={() => deleteCategory(c)} className="text-xs text-clay font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
          {cats.length === 0 && <p className="text-sm text-mute dark:text-[#a89f92]">No categories yet — add your first one above.</p>}
        </div>
      )}

      {tab === "customers" && (
        <div className="mt-5 grid gap-2">
          {customers.map((c) => (
            <div key={c.key} className={`${card} p-4 flex justify-between text-sm`}>
              <div><div className="font-bold text-ink dark:text-[#f3ede3]">{c.name}</div><div dir="ltr" className="text-mute dark:text-[#a89f92]">{c.whatsapp || "—"}</div></div>
              <div className="text-end"><div className="font-bold text-ink dark:text-[#f3ede3]">{c.orders} orders</div><div className="text-bronze-deep dark:text-bronze font-extrabold" dir="auto">{fmtPrice(c.spend, "en")}</div></div>
            </div>
          ))}
          {customers.length === 0 && <p className="text-sm text-mute dark:text-[#a89f92]">No customers yet.</p>}
        </div>
      )}

      {tab === "delivery" && (
        <div className="mt-5 grid gap-2">
          <AddZoneForm onAdd={addZone} />
          {zones.map((z) => (
            <div key={z.id} className={`${card} p-4 text-sm flex flex-wrap gap-2 items-center`}>
              <span className="font-bold text-ink dark:text-[#f3ede3]">{z.governorateEn} · {z.governorateAr}</span>
              <label className="flex items-center gap-1 text-xs">Std <input type="number" value={z.standardFee} onChange={(e) => saveZone(z, { standardFee: Number(e.target.value) })} className="w-16 rounded-lg border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-1.5 py-1" title="standard fee" /></label>
              <label className="flex items-center gap-1 text-xs">Exp <input type="number" value={z.expressFee} onChange={(e) => saveZone(z, { expressFee: Number(e.target.value) })} className="w-16 rounded-lg border border-line dark:border-[#2e2822] bg-white dark:bg-[#1c1815] text-ink dark:text-[#f3ede3] px-1.5 py-1" title="express fee" /></label>
              <span className="text-xs text-mute dark:text-[#a89f92]">{z.etaEn}</span>
              <span className="ms-auto flex gap-1.5">
                <button onClick={() => saveZone(z, { active: !z.active })} className={`text-xs font-bold ${chip} ${z.active ? tokenOk : "bg-line dark:bg-[#2e2822] text-mute dark:text-[#a89f92]"}`}>{z.active ? "Active" : "Hidden"}</button>
                <button onClick={() => deleteZone(z)} className="text-xs text-clay font-bold">Delete</button>
              </span>
            </div>
          ))}
          <p className="text-xs text-mute dark:text-[#a89f92]" dir="ltr">Fallback defaults live in <code>src/lib/siteConfig.ts</code>. Free standard shipping over EGP {SITE_CONFIG.delivery.freeThreshold}.</p>
        </div>
      )}

      {tab === "coupons" && (
        <div className="mt-5 grid gap-2">
          {!live && <p className="text-xs text-mute dark:text-[#a89f92] bg-sand dark:bg-[#201a15] rounded-2xl px-4 py-3 font-bold">Coupons are config-based (src/lib/coupons.ts) and work in demo too.</p>}
          {COUPONS.map((c: Coupon) => (
            <div key={c.code} className={`${card} p-4 flex flex-wrap items-center gap-3 text-sm`}>
              <span className="font-display font-bold text-bronze-deep dark:text-bronze" dir="ltr">{c.code}</span>
              <span className="text-ink dark:text-[#f3ede3] font-bold" dir="auto">{c.type === "percent" ? `${c.value}% off` : `${fmtPrice(c.value, "en")} off`}</span>
              <span className="text-xs text-mute dark:text-[#a89f92]">min spend {fmtPrice(c.minSpend, "en")}{c.expires ? ` · until ${c.expires}` : " · no expiry"}</span>
            </div>
          ))}
          <p className="text-xs text-mute dark:text-[#a89f92]">Edit codes in <code>src/lib/coupons.ts</code> — applied in the cart drawer + checkout; discount travels with the order row.</p>
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-5 grid gap-2">
          {!live && <p className="text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-4 py-3 text-sm font-bold">Connect Supabase keys to manage reviews.</p>}
          {live && reviews.length === 0 && <p className="text-sm text-mute dark:text-[#a89f92]">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className={`${card} p-4 text-sm flex gap-3 items-start`}>
              <div className="flex-1">
                <div className="font-bold inline-flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} filled={i < Math.max(0, Math.min(5, r.rating))} className={`w-4 h-4 ${i < Math.max(0, Math.min(5, r.rating)) ? "text-bronze" : "text-line dark:text-[#2e2822]"}`} />
                ))} <span className="font-normal text-mute dark:text-[#a89f92] ms-1">— {r.name}</span></div>
                <div className="text-ink dark:text-[#f3ede3] mt-1">{r.comment}</div>
                <div className="text-[11px] text-mute dark:text-[#a89f92] mt-1">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
              </div>
              <button onClick={() => deleteReview(r.id)} aria-label="delete review" className="text-clay font-bold shrink-0 p-1"><TrashIcon className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const openOrderCls =
  "drawer-panel absolute end-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-[#191512] flex flex-col shadow-2xl";

// ---------- Admin forms (same styling as the dashboard) ----------

function AddProductForm({ cats, onAdd }: {
  cats: Category[];
  onAdd: (d: { nameEn: string; nameAr: string; price: number; salePrice?: number; stock: number; categoryId: string; images: string[]; colors: ProductColor[]; tag?: "new" | "bestseller"; featured: boolean; bestseller: boolean }) => void;
}) {
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [price, setPrice] = useState(DEFAULT_HIJAB_PRICE);
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [stock, setStock] = useState(DEFAULT_HIJAB_STOCK);
  const [categoryId, setCategoryId] = useState(cats[0]?.id ?? "");
  const [images, setImages] = useState("");
  const [colors, setColors] = useState("");
  const [tag, setTag] = useState<"" | "new" | "bestseller">("");
  const cls2 = cls;
  return (
    <div className="bg-sand/60 dark:bg-[#201a15] border border-line dark:border-[#2e2822] rounded-3xl p-4 grid sm:grid-cols-2 gap-2.5">
      <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name (EN) *" className={cls2} dir="ltr" />
      <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="الاسم (AR) *" className={cls2} dir="rtl" />
      <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Price (EGP) *" className={cls2} title="price" />
      <input type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Sale price (optional)" className={cls2} title="sale price" />
      <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} placeholder="Stock" className={cls2} title="stock" />
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cls2} title="category">
        <option value="">— No category —</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.nameEn} · {c.nameAr}</option>)}
      </select>
      <input value={images} onChange={(e) => setImages(e.target.value)} placeholder="Image URLs (comma separated)" className={`${cls2} sm:col-span-2`} dir="ltr" />
      <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Colours: أسود|Black|#111111, كحلي|Navy|#2b3245" className={`${cls2} sm:col-span-2`} title="colors" dir="ltr" />
      <select value={tag} onChange={(e) => setTag(e.target.value as "" | "new" | "bestseller")} className={cls2} title="tag">
        <option value="">— No tag —</option>
        <option value="new">New</option>
        <option value="bestseller">Bestseller</option>
      </select>
      <label className="flex items-center gap-2 text-sm font-bold text-ink dark:text-[#f3ede3]"><input type="checkbox" checked={tag === "new"} onChange={(e) => setTag(e.target.checked ? "new" : "")} className="accent-bronze w-4 h-4" /> New drop</label>
      <label className="flex items-center gap-2 text-sm font-bold text-ink dark:text-[#f3ede3]"><input type="checkbox" checked={tag === "bestseller"} onChange={(e) => setTag(e.target.checked ? "bestseller" : "")} className="accent-bronze w-4 h-4" /> Bestseller</label>
      <button
        onClick={() => {
          if (!nameEn.trim() || !nameAr.trim() || !(price > 0)) return;
          onAdd({
            nameEn: nameEn.trim(), nameAr: nameAr.trim(), price,
            ...(salePrice !== "" ? { salePrice } : {}),
            stock: Math.max(0, stock), categoryId,
            images: images.split(",").map((s) => s.trim()).filter(Boolean),
            colors: parseColors(colors),
            tag: tag || undefined,
            featured: tag === "new", bestseller: tag === "bestseller",
          });
        }}
        className="sm:col-span-2 rounded-full bg-ink text-[#f3ede3] text-sm font-bold min-h-[44px] hover:bg-bronze-deep transition"
      >
        Save product
      </button>
    </div>
  );
}

/** Parses "ar|en|hex, ar|en|hex" colour rows. */
export function parseColors(raw: string): ProductColor[] {
  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [ar, en, hex] = chunk.split("|").map((s) => s.trim());
      return ar && en && hex ? { ar, en, hex } : null;
    })
    .filter((c): c is ProductColor => !!c);
}

function ProductEditor({ p, cats, onSave }: { p: Product; cats: Category[]; onSave: (patch: Partial<Product>) => void }) {
  const [nameEn, setNameEn] = useState(p.nameEn);
  const [nameAr, setNameAr] = useState(p.nameAr);
  const [price, setPrice] = useState(p.price);
  const [salePrice, setSalePrice] = useState<number | "">(p.salePrice ?? "");
  const [stock, setStock] = useState(p.stock);
  const [categoryId, setCategoryId] = useState(p.categoryId);
  const [images, setImages] = useState(p.images.join(", "));
  const [colors, setColors] = useState((p.colors ?? []).map((c) => `${c.ar}|${c.en}|${c.hex}`).join(", "));
  const [tag, setTag] = useState<"" | "new" | "bestseller">(p.tags?.[0] ?? "");
  return (
    <div className="mt-3 bg-sand/60 dark:bg-[#201a15] border border-line dark:border-[#2e2822] rounded-2xl p-4 grid sm:grid-cols-2 gap-2.5">
      <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={cls} title="name en" dir="ltr" />
      <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={cls} title="name ar" dir="rtl" />
      <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={cls} title="price" />
      <input type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Sale price" className={cls} title="sale price" />
      <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={cls} title="stock" />
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cls} title="category">
        <option value="">— No category —</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.nameEn} · {c.nameAr}</option>)}
      </select>
      <input value={images} onChange={(e) => setImages(e.target.value)} placeholder="Image URLs (comma separated)" className={`${cls} sm:col-span-2`} title="images" dir="ltr" />
      <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Colours: أسود|Black|#111111, …" className={`${cls} sm:col-span-2`} title="colors" dir="ltr" />
      <select value={tag} onChange={(e) => setTag(e.target.value as "" | "new" | "bestseller")} className={cls} title="tag">
        <option value="">— No tag —</option>
        <option value="new">New</option>
        <option value="bestseller">Bestseller</option>
      </select>
      <div />
      <button
        onClick={() => onSave({
          nameEn: nameEn.trim() || p.nameEn, nameAr: nameAr.trim() || p.nameAr,
          price: Math.max(0, price),
          ...(salePrice !== "" ? { salePrice: Math.max(0, salePrice) } : { salePrice: undefined }),
          stock: Math.max(0, stock), categoryId,
          tags: tag ? [tag] : undefined,
          featured: tag === "new", bestseller: tag === "bestseller",
          images: images.split(",").map((s) => s.trim()).filter(Boolean),
          colors: parseColors(colors),
        })}
        className="sm:col-span-2 rounded-full bg-ink text-[#f3ede3] text-sm font-bold min-h-[44px] hover:bg-bronze-deep transition"
      >
        Save changes
      </button>
    </div>
  );
}

function AddCategoryForm({ onAdd }: { onAdd: (slug: string, en: string, ar: string) => void }) {
  const [slug, setSlug] = useState("");
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  return (
    <div className={`${card} p-4 flex flex-wrap gap-2`}>
      <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} placeholder="slug (e.g. satin)" className={`${cls} flex-1 min-w-36`} dir="ltr" />
      <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Name EN" className={`${cls} flex-1 min-w-36`} dir="ltr" />
      <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="الاسم AR" className={`${cls} flex-1 min-w-36`} dir="rtl" />
      <button onClick={() => { if (slug.trim() && en.trim() && ar.trim()) { onAdd(slug.trim(), en.trim(), ar.trim()); setSlug(""); setEn(""); setAr(""); } }} className="rounded-xl bg-ink text-[#f3ede3] text-sm font-bold px-5 py-2 hover:bg-bronze-deep transition">Add</button>
    </div>
  );
}

function AddZoneForm({ onAdd }: { onAdd: (en: string, ar: string, std: number, exp: number) => void }) {
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [std, setStd] = useState(60);
  const [exp, setExp] = useState(120);
  return (
    <div className={`${card} p-4 flex flex-wrap gap-2 items-center`}>
      <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Governorate EN" className={`${cls} flex-1 min-w-32`} dir="ltr" />
      <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="المحافظة AR" className={`${cls} flex-1 min-w-32`} dir="rtl" />
      <input type="number" value={std} onChange={(e) => setStd(Number(e.target.value))} className={`${cls} w-24`} title="standard fee" />
      <input type="number" value={exp} onChange={(e) => setExp(Number(e.target.value))} className={`${cls} w-24`} title="express fee" />
      <button onClick={() => { if (en.trim() && ar.trim()) { onAdd(en.trim(), ar.trim(), std, exp); setEn(""); setAr(""); } }} className="rounded-xl bg-ink text-[#f3ede3] text-sm font-bold px-5 py-2 hover:bg-bronze-deep transition">Add zone</button>
    </div>
  );
}
