import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Order, Product, Category, DeliveryZone } from "./types";
import { normalizeOrderNumber, normalizeWhatsApp } from "./egypt";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// ---------------------------------------------------------------------------
// ENV GUARD — every Supabase request needs VITE_SUPABASE_ANON_KEY at runtime.
// supabase-js always sends it as the `apikey` header (both the legacy JWT
// "eyJ..." anon key and the newer "sb_publishable_..." key are accepted).
// A response like {"message":"No API key found in request"} means the request
// reached Supabase with NO apikey header at all — i.e. the key was empty in
// the running app (dev server started before .env existed, or the deploy
// host has no VITE_SUPABASE_ANON_KEY env var). Fix: set the env var, then
// restart `npm run dev` / rebuild + redeploy. Never log the key itself.
// ---------------------------------------------------------------------------
if (!anon) {
  console.error(
    "[LUMIÈRE] VITE_SUPABASE_ANON_KEY is missing — checkout, catalog sync " +
    "and order tracking are disabled. Set it in .env (or your host's env " +
    "vars) and restart/rebuild.",
  );
}

export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  client = createClient(url!, anon!);
}

export function getSupabase(): SupabaseClient | null {
  return client;
}

// ---------------------------------------------------------------------------
// Resilience: limited retry for safe READs only (never for INSERT/UPDATE).
// Order creation must never auto-retry (duplicate-order risk).
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True for transient transport/server failures worth one more attempt. */
export function isTransientError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e ?? "");
  return /failed to fetch|network|timeout|abort|502|503|504|track-failed/i.test(msg);
}

export async function withRetry<T>(
  // PromiseLike (not just Promise): Supabase builders are thenables.
  fn: () => PromiseLike<T>,
  opts?: { attempts?: number; delayMs?: number; shouldRetry?: (e: unknown) => boolean },
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 3);
  const delayMs = opts?.delayMs ?? 400;
  const shouldRetry = opts?.shouldRetry ?? isTransientError;
  let last: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts - 1 || !shouldRetry(e)) throw e;
      await sleep(delayMs * (i + 1));
    }
  }
  throw last;
}

// ---------------------------------------------------------------------------
// Orders — Supabase is the ONLY source of truth.
// No localStorage / sessionStorage / mock order storage exists anywhere.
// React state is used only to display data fetched from Supabase.
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  firstName: string;
  lastName: string;
  // Customer contact is no longer collected at checkout — always "" for new
  // orders. Columns stay (nullable/optional, legacy rows + admin display).
  whatsapp: string;
  phone: string;
  governorate: string;
  area: string;
  city: string;
  address: string;
  building: string;
  apartment: string;
  notes: string;
  deliveryMethod: "standard" | "express";
  items: Order["items"];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

function generateOrderNumber(): string {
  // LM-XXXXXX — 6 random digits, uppercase by construction
  return `LM-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Create order (COD) → order_items. Customer contact is optional since
 * checkout no longer collects it: empty whatsapp/phone are sent as "" and
 * the `create_cod_order()` RPC (see migration-optional-customer-contact.sql)
 * stores NULL and skips the customer upsert. Returns the order number.
 * Throws on failure — callers must NOT fall back to any local store.
 *
 * Primary path: atomic `create_cod_order()` RPC (SECURITY DEFINER). This is
 * REQUIRED because anon has INSERT-only RLS on orders/order_items (no SELECT),
 * so a direct `insert().select("id")` is rejected by RLS even for the row
 * just inserted — that was the production "تعذر الاتصال بالخادم" root cause.
 * Fallback: legacy direct inserts (for DBs without the new migration).
 */
export async function createOrderInSupabase(input: CreateOrderInput): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const whatsappNorm = normalizeWhatsApp(input.whatsapp);

  // 1. Atomic server-side path — one call, all-or-nothing.
  try {
    const { data: orderNumber, error: rpcErr } = await sb.rpc("create_cod_order", {
      p_first: input.firstName,
      p_last: input.lastName,
      p_whatsapp: input.whatsapp.trim(),
      p_whatsapp_norm: whatsappNorm,
      p_phone: input.phone.trim(),
      p_governorate: input.governorate,
      p_area: input.area.trim(),
      p_city: input.city.trim(),
      p_address: input.address.trim(),
      p_building: input.building.trim(),
      p_apartment: input.apartment.trim(),
      p_notes: input.notes,
      p_delivery_method: input.deliveryMethod,
      p_subtotal: input.subtotal,
      p_delivery_fee: input.deliveryFee,
      p_discount: input.discount,
      p_total: input.total,
      p_items: input.items.map((i) => ({
        product_id: i.productId,
        name_en: i.nameEn,
        name_ar: i.nameAr,
        price: i.price,
        qty: i.qty,
        image: i.image,
      })),
    });
    if (rpcErr) throw rpcErr;
    if (typeof orderNumber === "string" && orderNumber) return orderNumber;
    throw new Error("Order creation failed: empty response");
  } catch (rpcErr) {
    // Function missing (legacy DB without the migration)? Fall back to the
    // legacy direct-insert path. Any other error (validation/RLS/network)
    // from a DB that HAS the function must surface — retrying via a second
    // path could create a duplicate order.
    const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr ?? "");
    const missingFn =
      /function.*create_cod_order|404|PGRST202|not.*exist/i.test(msg);
    if (!missingFn) {
      throw rpcErr instanceof Error ? rpcErr : new Error(`Order creation failed: ${msg}`);
    }
    return createOrderLegacy(sb, input, whatsappNorm);
  }
}

/** Legacy direct-insert path — only for DBs without create_cod_order(). */
async function createOrderLegacy(
  sb: SupabaseClient,
  input: CreateOrderInput,
  whatsappNorm: string,
): Promise<string> {

  // 1. Resolve customer id via SECURITY DEFINER rpc (anon has no direct
  //    read/update on customers — see migration SQL). Falls back to null
  //    customer_id (nullable FK) if the rpc is unavailable.
  let customerId: string | null = null;
  try {
    const { data: rpcId, error: rpcErr } = await sb.rpc("get_or_create_customer", {
      p_whatsapp: input.whatsapp.trim(),
      p_whatsapp_norm: whatsappNorm,
      p_first: input.firstName,
      p_last: input.lastName,
      p_phone: input.phone.trim(),
    });
    if (rpcErr) throw rpcErr;
    customerId = (rpcId as string | null) ?? null;
  } catch {
    // Legacy DBs without the rpc: direct upsert (requires the permissive
    // insert policy from the original schema). Never blocks the order.
    try {
      await sb.from("customers").upsert(
        {
          whatsapp: input.whatsapp.trim(),
          whatsapp_normalized: whatsappNorm,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone.trim(),
        },
        { onConflict: "whatsapp" },
      );
    } catch {
      /* best-effort only */
    }
  }

  // 2. Insert order with retry on order_number collision. COD ONLY.
  let orderNumber = generateOrderNumber();
  let orderId: string | null = null;
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: ord, error } = await sb
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        first_name: input.firstName,
        last_name: input.lastName,
        whatsapp: input.whatsapp.trim(),
        whatsapp_normalized: whatsappNorm,
        phone: input.phone.trim(),
        governorate: input.governorate,
        area: input.area,
        city: input.city,
        address: input.address,
        building: input.building,
        apartment: input.apartment,
        notes: input.notes,
        delivery_method: input.deliveryMethod,
        payment_method: "cod",
        payment_status: "pending",
        subtotal: input.subtotal,
        delivery_fee: input.deliveryFee,
        discount: input.discount,
        total: input.total,
        status: "pending",
      })
      .select("id")
      .single();
    if (!error && ord) {
      orderId = ord.id;
      break;
    }
    lastErr = error?.message ?? "unknown";
    // Unique-violation on order_number → regenerate and retry
    if (error && (error.code === "23505" || /order_number|duplicate/i.test(error.message))) {
      orderNumber = generateOrderNumber();
      continue;
    }
    throw new Error(`Order creation failed: ${lastErr}`);
  }
  if (!orderId) throw new Error(`Order creation failed after retries: ${lastErr}`);

  // 3. Insert items
  const { error: itemsErr } = await sb.from("order_items").insert(
    input.items.map((i) => ({
      order_id: orderId,
      product_id: i.productId,
      name_en: i.nameEn,
      name_ar: i.nameAr,
      price: i.price,
      qty: i.qty,
      image: i.image,
    })),
  );
  if (itemsErr) throw new Error(`Order items save failed: ${itemsErr.message}`);

  return orderNumber;
}

export interface TrackedOrder extends Order {}

/**
 * Secure order lookup via the `track-order` Edge Function.
 * The browser NEVER runs SELECT on orders — the service-role key lives
 * only inside the Edge Function environment.
 * Lookup is by order number only (no customer phone data is collected).
 */
export async function trackOrderViaFunction(
  rawOrderNumber: string,
  rawWhatsapp?: string,
): Promise<TrackedOrder> {
  const sb = getSupabase();
  if (!sb) throw new Error("not-configured");

  const order_number = normalizeOrderNumber(rawOrderNumber);
  // Optional legacy second factor: old orders still carry a WhatsApp number
  // and the Edge Function verifies it when the stored row has one.
  const whatsapp = rawWhatsapp ? normalizeWhatsApp(rawWhatsapp) : "";

  const { data, error } = await withRetry(() =>
    sb.functions.invoke("track-order", {
      body: whatsapp ? { order_number, whatsapp } : { order_number },
    }),
  {
    attempts: 2,
    // Never retry a definitive answer — only transient transport failures.
    shouldRetry: (e) => {
      const status = (e as { context?: { status?: number } })?.context?.status;
      if (status === 404 || status === 400) return false;
      return isTransientError(e);
    },
  });
  if (error) {
    // FunctionsHttpError carries the function response status
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) throw new Error("not-found");
    if (status === 400) throw new Error("bad-request");
    throw new Error(`track-failed: ${error.message}`);
  }
  const o = (data as { order?: Record<string, unknown> })?.order;
  if (!o) throw new Error("not-found");

  const items = ((o.items as unknown[]) ?? []).map((raw) => {
    const i = raw as Record<string, unknown>;
    return {
      productId: String(i.product_id ?? ""),
      nameEn: String(i.name_en ?? ""),
      nameAr: String(i.name_ar ?? ""),
      price: Number(i.price ?? 0),
      qty: Number(i.qty ?? 0),
      image: String(i.image ?? ""),
    };
  });

  return {
    orderNumber: String(o.order_number ?? order_number),
    firstName: String(o.first_name ?? ""),
    lastName: String(o.last_name ?? ""),
    whatsapp: String(o.whatsapp ?? ""),
    phone: String(o.phone ?? ""),
    governorate: String(o.governorate ?? ""),
    area: String(o.area ?? ""),
    city: String(o.city ?? ""),
    address: String(o.address ?? ""),
    building: String(o.building ?? ""),
    apartment: String(o.apartment ?? ""),
    notes: String(o.notes ?? ""),
    deliveryMethod: (o.delivery_method as "standard" | "express") ?? "standard",
    paymentMethod: "cod",
    paymentStatus: (o.payment_status as Order["paymentStatus"]) ?? "pending",
    items,
    subtotal: Number(o.subtotal ?? 0),
    deliveryFee: Number(o.delivery_fee ?? 0),
    discount: Number(o.discount ?? 0),
    total: Number(o.total ?? 0),
    status: (o.status as Order["status"]) ?? "pending",
    createdAt: String(o.created_at ?? new Date().toISOString()),
    timeline: [{ status: (o.status as Order["status"]) ?? "pending", at: String(o.created_at ?? new Date().toISOString()) }],
  };
}

// ---------- Public catalog (RLS allows public SELECT on these) ----------

export async function fetchProductsRemote(): Promise<Product[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await withRetry(() =>
      sb
        .from("products")
        .select("*, product_images(url,sort)")
        .eq("active", true),
    );
    if (error || !data) return null;
    return (data as Record<string, unknown>[]).map((p) => {
      const rec = p as Record<string, unknown>;
      // product_images.url is the complete public image URL — pass each URL
      // through untouched (never prepend, never convert to a local path).
      // Ordered by `sort`, empties dropped; association is per-product via
      // the product_images.product_id FK in the embedded join.
      const rawImgs = (rec.product_images as { url?: unknown; sort?: unknown }[] | undefined) ?? [];
      const imgs = [...rawImgs]
        .sort((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0))
        .map((im) => String(im.url ?? "").trim())
        .filter((u) => u.length > 0);
      return {
        id: String(rec.id),
        slug: String(rec.slug),
        nameEn: String(rec.name_en),
        nameAr: String(rec.name_ar),
        descEn: String(rec.desc_en ?? ""),
        descAr: String(rec.desc_ar ?? ""),
        price: Number(rec.price),
        stock: Number(rec.stock ?? 0),
        categoryId: String(rec.category_id ?? ""),
        images: imgs,
        rating: Number(rec.rating ?? 4.5),
        reviewsCount: Number(rec.reviews_count ?? 0),
        featured: Boolean(rec.featured),
        bestseller: Boolean(rec.bestseller),
        active: Boolean(rec.active),
        createdAt: String(rec.created_at),
      };
    });
  } catch {
    return null;
  }
}

export async function fetchCategoriesRemote(): Promise<Category[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await withRetry(() =>
      sb.from("categories").select("*").eq("active", true),
    );
    if (error || !data) return null;
    return (data as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      slug: String(c.slug),
      nameEn: String(c.name_en),
      nameAr: String(c.name_ar),
      image: String(c.image ?? ""),
      active: Boolean(c.active),
    }));
  } catch {
    return null;
  }
}

export async function fetchZonesRemote(): Promise<DeliveryZone[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await withRetry(() =>
      sb.from("delivery_zones").select("*").eq("active", true),
    );
    if (error || !data) return null;
    return (data as Record<string, unknown>[]).map((z) => ({
      id: String(z.id),
      governorateEn: String(z.governorate_en),
      governorateAr: String(z.governorate_ar),
      standardFee: Number(z.standard_fee),
      expressFee: Number(z.express_fee),
      etaEn: String(z.eta_en ?? ""),
      etaAr: String(z.eta_ar ?? ""),
      active: Boolean(z.active),
    }));
  } catch {
    return null;
  }
}
