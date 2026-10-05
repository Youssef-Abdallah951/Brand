import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategoriesRemote, fetchProductsRemote, getSupabase, isSupabaseConfigured, withRetry } from "../lib/supabase";
import { SEED_PRODUCTS } from "../lib/data";
import { useShop } from "../store/ShopContext";
import { firstProductImage, onImgError } from "../components/product";
import { SITE_CONFIG } from "../lib/siteConfig";
import { STATUS_LABEL } from "../i18n/translations";
import type { Category, DeliveryZone, Order, OrderStatus, Product } from "../lib/types";

function useAdminGuard() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      const demo = localStorage.getItem("lumiere_admin_demo") === "1" || new URLSearchParams(location.search).get("demo") === "1";
      if (demo) localStorage.setItem("lumiere_admin_demo", "1");
      setIsAdmin(demo);
      setReady(true);
      if (!demo) nav("/admin/login");
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

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const sb = getSupabase();
    if (!sb) {
      if (email === "admin@lumiere.eg" && password === "admin123") {
        localStorage.setItem("lumiere_admin_demo", "1");
        nav("/admin?demo=1");
      } else setErr("Demo: admin@lumiere.eg / admin123 (set Supabase keys for real auth)");
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else nav("/admin");
  };

  return (
    <main className="min-h-[70vh] grid place-items-center px-4 py-10 bg-[#fff5f8]">
      <form onSubmit={login} className="w-full max-w-md bg-white rounded-3xl border border-pink-100 p-7 card-shadow">
        <h1 className="font-display text-2xl font-bold">🔐 Admin Login</h1>
        <p className="text-xs text-gray-500 mt-1">Supabase Auth — administrators only. Customers never log in.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" dir="ltr" className="mt-4 w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" dir="ltr" className="mt-2 w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none" />
        {err && <p className="text-red-500 text-xs font-bold mt-2">{err}</p>}
        <button className="mt-4 w-full rounded-2xl bg-[#2b2b30] text-white font-bold py-3.5">Login</button>
        <p className="text-[11px] text-gray-400 mt-2">Demo without Supabase: admin@lumiere.eg / admin123</p>
      </form>
    </main>
  );
}

type Tab = "dash" | "orders" | "products" | "cats" | "customers" | "delivery" | "reviews";

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
  const shop = useShop();
  const fallbackZones = shop.zones;
  const zones = zonesState.length ? zonesState : fallbackZones;
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState("");
  const live = isSupabaseConfigured;

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
    const { images: _imgs, ...rest } = patch as Partial<Product> & { images?: string[] };
    void _imgs;
    const dbPatch: Record<string, unknown> = {};
    if (rest.price !== undefined) dbPatch.price = rest.price;
    if (rest.stock !== undefined) dbPatch.stock = rest.stock;
    if (rest.active !== undefined) dbPatch.active = rest.active;
    if (rest.nameEn !== undefined) dbPatch.name_en = rest.nameEn;
    if (rest.nameAr !== undefined) dbPatch.name_ar = rest.nameAr;
    if (rest.descEn !== undefined) dbPatch.desc_en = rest.descEn;
    if (rest.descAr !== undefined) dbPatch.desc_ar = rest.descAr;
    if (rest.compareAt !== undefined) dbPatch.compare_at = rest.compareAt;
    if (rest.categoryId !== undefined) dbPatch.category_id = rest.categoryId || null;
    if (rest.featured !== undefined) dbPatch.featured = rest.featured;
    if (rest.bestseller !== undefined) dbPatch.bestseller = rest.bestseller;
    if (rest.rating !== undefined) dbPatch.rating = rest.rating;
    if (Object.keys(dbPatch).length) await sb.from("products").update(dbPatch).eq("id", p.id);
    // Image URLs live in product_images (one row per URL, ordered by sort).
    if (patch.images !== undefined) {
      await sb.from("product_images").delete().eq("product_id", p.id);
      if (patch.images.length) {
        await sb.from("product_images").insert(
          patch.images.filter(Boolean).map((url, i) => ({ product_id: p.id, url, sort: i })),
        );
      }
    }
  };

  const addProduct = async (draft: {
    nameEn: string; nameAr: string; price: number; compareAt?: number;
    stock: number; categoryId: string; images: string[];
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
        price: draft.price, compareAt: draft.compareAt, stock: draft.stock,
        categoryId: draft.categoryId, images: draft.images,
        rating: 4.5, reviewsCount: 0,
        featured: draft.featured, bestseller: draft.bestseller,
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
      price: draft.price, compare_at: draft.compareAt ?? null,
      stock: draft.stock, featured: draft.featured, bestseller: draft.bestseller,
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
      descEn: "", descAr: "", price: draft.price, compareAt: draft.compareAt,
      stock: draft.stock, categoryId: catId ?? "", images: draft.images,
      rating: 4.5, reviewsCount: 0, featured: draft.featured,
      bestseller: draft.bestseller, active: true, createdAt: new Date().toISOString(),
    };
    setProducts((ps) => [created, ...ps]);
    setShowAdd(false);
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.nameEn}"?`)) return;
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
    if (!confirm(`Delete category "${c.nameEn}"? Products keep working (uncategorized).`)) return;
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
    if (!confirm(`Delete zone "${z.governorateEn}"?`)) return;
    setZonesState((zs) => zs.filter((x) => x.id !== z.id));
    const sb = getSupabase();
    if (sb) await sb.from("delivery_zones").delete().eq("id", z.id);
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    setReviews((rs) => rs.filter((r) => r.id !== id));
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("reviews").delete().eq("id", id);
      if (error) loadReviews(); // restore on failure
    }
  };

  if (!ready) return <main className="p-10 text-center">Loading…</main>;
  if (!isAdmin) return null;

  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const count = (st: OrderStatus) => orders.filter((o) => o.status === st).length;
  const customers = Object.values(
    orders.reduce((acc: Record<string, { whatsapp: string; name: string; orders: number; spend: number }>, o) => {
      const k = o.whatsapp;
      if (!acc[k]) acc[k] = { whatsapp: k, name: `${o.firstName} ${o.lastName}`, orders: 0, spend: 0 };
      acc[k].orders += 1;
      acc[k].spend += o.total;
      return acc;
    }, {}),
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "dash", label: "📊 Dashboard" },
    { id: "orders", label: "🧾 Orders" },
    { id: "products", label: "💄 Products" },
    { id: "cats", label: "🗂 Categories" },
    { id: "customers", label: "👥 Customers" },
    { id: "delivery", label: "🚚 Delivery" },
    { id: "reviews", label: "⭐ Reviews" },
  ];

  const shownOrders = orders.filter((o) =>
    !filter || (o.orderNumber + o.whatsapp + o.firstName + o.lastName).toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">COD only • {SITE_CONFIG.admin.phoneLocal}</span>
        {!live && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full">Demo mode — connect Supabase for live data</span>}
        <button
          onClick={() => { localStorage.removeItem("lumiere_admin_demo"); getSupabase()?.auth.signOut(); location.href = "/"; }}
          className="ms-auto text-xs font-bold border rounded-full px-4 py-2"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-bold ${tab === x.id ? "bg-[#2b2b30] text-white" : "bg-white border border-pink-200"}`}>
            {x.label}
          </button>
        ))}
      </div>

      {tab === "dash" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            ["🧾 Total Orders", orders.length],
            ["⏳ Pending", count("pending")],
            ["🚚 Out for Delivery", count("out_for_delivery")],
            ["✅ Delivered", count("delivered")],
            ["💰 Revenue (EGP)", revenue],
            ["💄 Products", products.length],
            ["👥 Customers", customers.length],
            ["✔ Confirmed", count("confirmed")],
          ].map(([l, v]) => (
            <div key={l as string} className="bg-white border border-pink-100 rounded-3xl p-5 card-shadow">
              <div className="text-xs text-gray-500">{l}</div>
              <div className="text-2xl font-bold mt-1">{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-5 grid gap-3">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search order / whatsapp / name…" className="rounded-2xl border border-pink-200 px-4 py-3 outline-none max-w-md" />
          {!live && <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold">Connect Supabase keys to view live orders.</p>}
          {live && ordersError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm font-bold text-red-700 flex flex-wrap gap-3 items-center">
              <span>Unable to load orders. Please try again.</span>
              <button onClick={loadOrders} disabled={ordersLoading} className="underline disabled:opacity-60">🔁 {ordersLoading ? "Loading…" : "Retry"}</button>
            </div>
          )}
          {live && !ordersError && ordersLoading && shownOrders.length === 0 && <p className="text-gray-400 text-sm">Loading orders…</p>}
          {live && !ordersError && !ordersLoading && shownOrders.length === 0 && <p className="text-gray-400 text-sm">No orders yet. New COD orders from /checkout appear here.</p>}
          {shownOrders.map((o) => (
            <details key={o.id} className="bg-white border border-pink-100 rounded-3xl p-4 card-shadow">
              <summary className="flex flex-wrap items-center gap-2 cursor-pointer font-bold text-sm">
                <span dir="ltr">#{o.orderNumber}</span>
                <span>{o.firstName} {o.lastName}</span>
                <span dir="ltr" className="text-gray-500">{o.whatsapp}</span>
                <span className="ms-auto text-[#c2185b]">EGP {o.total}</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{STATUS_LABEL[o.status]?.en}</span>
              </summary>
              <div className="text-sm mt-3 grid gap-1.5 text-gray-600">
                <div>📍 {o.address}, {o.area}, {o.city}, {o.governorate} {o.building && `Bldg ${o.building}`} {o.apartment && `Apt ${o.apartment}`}</div>
                <div>🚚 {o.deliveryMethod} • 💵 COD ({o.paymentStatus}) • 📅 {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}</div>
                {o.notes && <div>📝 {o.notes}</div>}
                {o.items.map((i, idx) => { const thumb = firstProductImage([i.image]); return <div key={`${i.productId}-${idx}`} className="flex gap-2 items-center">{thumb && <img src={thumb} onError={onImgError} className="w-8 h-10 rounded object-cover" alt="" />}<span>{i.nameEn} × {i.qty} — EGP {i.price * i.qty}</span></div>; })}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as OrderStatus[]).map((s) => (
                    <button key={s} disabled={saving === o.orderNumber} onClick={() => changeStatus(o, s)} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${o.status === s ? "bg-[#2b2b30] text-white" : "hover:bg-pink-50"}`}>{s}</button>
                  ))}
                </div>
                <div className="flex gap-2 mt-1 items-center">
                  <span className="text-xs text-gray-400">COD payment:</span>
                  <button onClick={() => setPay(o, "paid")} className={`text-xs font-bold px-3 py-1.5 rounded-full ${o.paymentStatus === "paid" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>Mark paid</button>
                  <button onClick={() => setPay(o, "pending")} className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full">Mark pending</button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {tab === "products" && (
        <div className="mt-5 grid gap-3">
          {!live && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 font-bold">Demo mode — edits are in-memory only. Connect Supabase to persist.</p>}
          <div>
            <button onClick={() => setShowAdd((s) => !s)} className="rounded-2xl bg-[#e84393] text-white text-sm font-bold px-5 py-2.5">
              {showAdd ? "✕ Close" : "＋ Add Product"}
            </button>
          </div>
          {showAdd && <AddProductForm cats={cats} onAdd={addProduct} />}
          {products.map((p) => (
            <div key={p.id} className="bg-white border border-pink-100 rounded-3xl p-3 overflow-hidden">
              <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                {(() => { const thumb = firstProductImage(p.images); return thumb ? <img src={thumb} onError={onImgError} alt="" className="w-14 h-16 rounded-2xl object-cover" /> : <span className="w-14 h-16 rounded-2xl bg-pink-100 grid place-items-center shrink-0">💄</span>; })()}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{p.nameEn}</div>
                  <div className="text-xs text-gray-500">EGP {p.price} • stock {p.stock} {p.compareAt && `• sale ${p.compareAt}`} {p.featured && "• ⭐"} {p.bestseller && "• 🔥"}</div>
                </div>
                <input type="number" value={p.price} onChange={(e) => saveProduct(p, { price: Number(e.target.value) })} className="w-[4.5rem] sm:w-20 max-w-full rounded-xl border px-2 py-1.5 text-sm" title="price" />
                <input type="number" value={p.stock} onChange={(e) => saveProduct(p, { stock: Number(e.target.value) })} className="w-14 sm:w-16 max-w-full rounded-xl border px-2 py-1.5 text-sm" title="stock" />
                <button onClick={() => saveProduct(p, { active: !p.active })} className={`text-xs font-bold px-3 py-1.5 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{p.active ? "Active" : "Hidden"}</button>
                <button onClick={() => setEditing(editing?.id === p.id ? null : p)} className="text-xs font-bold px-3 py-1.5 rounded-full border">✏️ Edit</button>
                <button onClick={() => deleteProduct(p)} className="text-red-500 font-bold">✕</button>
              </div>
              {editing?.id === p.id && (
                <ProductEditor p={editing} cats={cats} onSave={(patch) => saveProduct(p, patch)} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "cats" && (
        <div className="mt-5 grid gap-3">
          {!live && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 font-bold">Demo mode — categories are in-memory only.</p>}
          <AddCategoryForm onAdd={addCategory} />
          <div className="grid sm:grid-cols-2 gap-3">
            {cats.map((c) => (
              <div key={c.id} className="bg-white border rounded-3xl p-4 flex gap-3 items-center">
                {c.image ? <img src={c.image} alt="" className="w-14 h-14 rounded-2xl object-cover" /> : <span className="w-14 h-14 rounded-2xl bg-pink-100 grid place-items-center">🗂</span>}
                <div className="flex-1 min-w-0">
                  <input value={c.nameEn} onChange={(e) => saveCategory(c, { nameEn: e.target.value })} className="font-bold w-full rounded-lg border border-transparent hover:border-pink-200 px-1" title="name en" />
                  <input value={c.nameAr} onChange={(e) => saveCategory(c, { nameAr: e.target.value })} className="text-sm text-gray-500 w-full rounded-lg border border-transparent hover:border-pink-200 px-1" title="name ar" dir="rtl" />
                  <div className="text-xs text-gray-400">/{c.slug} • {products.filter((p) => p.categoryId === c.id || p.categoryId === c.slug).length} products</div>
                </div>
                <div className="grid gap-1.5">
                  <button onClick={() => saveCategory(c, { active: !c.active })} className={`text-xs font-bold px-3 py-1 rounded-full ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{c.active ? "Active" : "Hidden"}</button>
                  <button onClick={() => deleteCategory(c)} className="text-xs text-red-500 font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
          {cats.length === 0 && <p className="text-sm text-gray-400">No categories yet — add your first one above.</p>}
        </div>
      )}

      {tab === "customers" && (
        <div className="mt-5 grid gap-2">
          {customers.map((c) => (
            <div key={c.whatsapp} className="bg-white border rounded-3xl p-4 flex justify-between text-sm">
              <div><div className="font-bold">{c.name}</div><div dir="ltr" className="text-gray-500">{c.whatsapp}</div></div>
              <div className="text-end"><div className="font-bold">{c.orders} orders</div><div className="text-[#c2185b] font-bold">EGP {c.spend}</div></div>
            </div>
          ))}
          {customers.length === 0 && <p className="text-sm text-gray-400">No customers yet.</p>}
        </div>
      )}

      {tab === "delivery" && (
        <div className="mt-5 grid gap-2">
          <AddZoneForm onAdd={addZone} />
          {zones.map((z) => (
            <div key={z.id} className="bg-white border rounded-3xl p-4 text-sm flex flex-wrap gap-2 items-center">
              <span className="font-bold">{z.governorateEn} • {z.governorateAr}</span>
              <label className="flex items-center gap-1 text-xs">Std <input type="number" value={z.standardFee} onChange={(e) => saveZone(z, { standardFee: Number(e.target.value) })} className="w-16 rounded-lg border px-1.5 py-1" title="standard fee" /></label>
              <label className="flex items-center gap-1 text-xs">Exp <input type="number" value={z.expressFee} onChange={(e) => saveZone(z, { expressFee: Number(e.target.value) })} className="w-16 rounded-lg border px-1.5 py-1" title="express fee" /></label>
              <span className="text-xs text-gray-400">{z.etaEn}</span>
              <span className="ms-auto flex gap-1.5">
                <button onClick={() => saveZone(z, { active: !z.active })} className={`text-xs font-bold px-3 py-1 rounded-full ${z.active ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{z.active ? "Active" : "Hidden"}</button>
                <button onClick={() => deleteZone(z)} className="text-xs text-red-500 font-bold">Delete</button>
              </span>
            </div>
          ))}
          <p className="text-xs text-gray-400">Fallback defaults live in <code>src/lib/siteConfig.ts</code>. Free standard shipping over EGP {SITE_CONFIG.delivery.freeThreshold}.</p>
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-5 grid gap-2">
          {!live && <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold">Connect Supabase keys to manage reviews.</p>}
          {live && reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border rounded-3xl p-4 text-sm flex gap-3 items-start">
              <div className="flex-1">
                <div className="font-bold">{"★".repeat(Math.max(0, Math.min(5, r.rating)))}<span className="text-gray-300">{"☆".repeat(Math.max(0, 5 - Math.min(5, r.rating)))}</span> <span className="font-normal text-gray-500">— {r.name}</span></div>
                <div className="text-gray-600 mt-1">{r.comment}</div>
                <div className="text-[11px] text-gray-400 mt-1">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
              </div>
              <button onClick={() => deleteReview(r.id)} className="text-red-500 font-bold shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ---------- Admin forms (same styling as the dashboard) ----------

function AddProductForm({ cats, onAdd }: {
  cats: Category[];
  onAdd: (d: { nameEn: string; nameAr: string; price: number; compareAt?: number; stock: number; categoryId: string; images: string[]; featured: boolean; bestseller: boolean }) => void;
}) {
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [price, setPrice] = useState(0);
  const [compareAt, setCompareAt] = useState("");
  const [stock, setStock] = useState(10);
  const [categoryId, setCategoryId] = useState(cats[0]?.id ?? "");
  const [images, setImages] = useState("");
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const cls = "w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-[#e84393]";
  return (
    <div className="bg-pink-50/60 border border-pink-200 rounded-3xl p-4 grid sm:grid-cols-2 gap-2.5">
      <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name (EN) *" className={cls} dir="ltr" />
      <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="الاسم (AR) *" className={cls} dir="rtl" />
      <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Price *" className={cls} title="price" />
      <input type="number" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="Compare-at (sale, optional)" className={cls} title="compare at" />
      <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} placeholder="Stock" className={cls} title="stock" />
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cls} title="category">
        <option value="">— No category —</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.nameEn} • {c.nameAr}</option>)}
      </select>
      <input value={images} onChange={(e) => setImages(e.target.value)} placeholder="Image URLs (comma separated)" className={`${cls} sm:col-span-2`} dir="ltr" />
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#e84393] w-4 h-4" /> ⭐ Featured</label>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={bestseller} onChange={(e) => setBestseller(e.target.checked)} className="accent-[#e84393] w-4 h-4" /> 🔥 Bestseller</label>
      <button
        onClick={() => {
          if (!nameEn.trim() || !nameAr.trim() || !(price > 0)) return;
          onAdd({
            nameEn: nameEn.trim(), nameAr: nameAr.trim(), price,
            compareAt: compareAt ? Number(compareAt) : undefined,
            stock: Math.max(0, stock), categoryId,
            images: images.split(",").map((s) => s.trim()).filter(Boolean),
            featured, bestseller,
          });
        }}
        className="sm:col-span-2 rounded-2xl bg-[#2b2b30] text-white text-sm font-bold py-2.5"
      >
        Save product
      </button>
    </div>
  );
}

function ProductEditor({ p, cats, onSave }: { p: Product; cats: Category[]; onSave: (patch: Partial<Product>) => void }) {
  const [nameEn, setNameEn] = useState(p.nameEn);
  const [nameAr, setNameAr] = useState(p.nameAr);
  const [price, setPrice] = useState(p.price);
  const [compareAt, setCompareAt] = useState(p.compareAt ? String(p.compareAt) : "");
  const [stock, setStock] = useState(p.stock);
  const [categoryId, setCategoryId] = useState(p.categoryId);
  const [images, setImages] = useState(p.images.join(", "));
  const [featured, setFeatured] = useState(!!p.featured);
  const [bestseller, setBestseller] = useState(!!p.bestseller);
  const cls = "w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-[#e84393]";
  return (
    <div className="mt-3 bg-pink-50/60 border border-pink-200 rounded-2xl p-4 grid sm:grid-cols-2 gap-2.5">
      <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={cls} title="name en" dir="ltr" />
      <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={cls} title="name ar" dir="rtl" />
      <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className={cls} title="price" />
      <input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="Compare-at (empty = no sale)" className={cls} title="compare at" />
      <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className={cls} title="stock" />
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cls} title="category">
        <option value="">— No category —</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.nameEn} • {c.nameAr}</option>)}
      </select>
      <input value={images} onChange={(e) => setImages(e.target.value)} placeholder="Image URLs (comma separated)" className={`${cls} sm:col-span-2`} title="images" dir="ltr" />
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#e84393] w-4 h-4" /> ⭐ Featured</label>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={bestseller} onChange={(e) => setBestseller(e.target.checked)} className="accent-[#e84393] w-4 h-4" /> 🔥 Bestseller</label>
      <button
        onClick={() => onSave({
          nameEn: nameEn.trim() || p.nameEn, nameAr: nameAr.trim() || p.nameAr,
          price: Math.max(0, price), compareAt: compareAt ? Number(compareAt) : undefined,
          stock: Math.max(0, stock), categoryId, featured, bestseller,
          images: images.split(",").map((s) => s.trim()).filter(Boolean),
        })}
        className="sm:col-span-2 rounded-2xl bg-[#2b2b30] text-white text-sm font-bold py-2.5"
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
  const cls = "rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-[#e84393]";
  return (
    <div className="bg-white border border-pink-200 rounded-3xl p-4 flex flex-wrap gap-2">
      <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} placeholder="slug (e.g. skincare)" className={`${cls} flex-1 min-w-36`} dir="ltr" />
      <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Name EN" className={`${cls} flex-1 min-w-36`} dir="ltr" />
      <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="الاسم AR" className={`${cls} flex-1 min-w-36`} dir="rtl" />
      <button onClick={() => { if (slug.trim() && en.trim() && ar.trim()) { onAdd(slug.trim(), en.trim(), ar.trim()); setSlug(""); setEn(""); setAr(""); } }} className="rounded-xl bg-[#2b2b30] text-white text-sm font-bold px-5 py-2">Add</button>
    </div>
  );
}

function AddZoneForm({ onAdd }: { onAdd: (en: string, ar: string, std: number, exp: number) => void }) {
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [std, setStd] = useState(60);
  const [exp, setExp] = useState(120);
  const cls = "rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-[#e84393]";
  return (
    <div className="bg-white border border-pink-200 rounded-3xl p-4 flex flex-wrap gap-2 items-center">
      <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Governorate EN" className={`${cls} flex-1 min-w-32`} dir="ltr" />
      <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="المحافظة AR" className={`${cls} flex-1 min-w-32`} dir="rtl" />
      <input type="number" value={std} onChange={(e) => setStd(Number(e.target.value))} className={`${cls} w-24`} title="standard fee" />
      <input type="number" value={exp} onChange={(e) => setExp(Number(e.target.value))} className={`${cls} w-24`} title="express fee" />
      <button onClick={() => { if (en.trim() && ar.trim()) { onAdd(en.trim(), ar.trim(), std, exp); setEn(""); setAr(""); } }} className="rounded-xl bg-[#2b2b30] text-white text-sm font-bold px-5 py-2">Add zone</button>
    </div>
  );
}
