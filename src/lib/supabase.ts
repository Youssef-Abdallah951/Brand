import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Order, Product, Category, DeliveryZone, ProductTag } from "./types";
import { normalizeWhatsApp } from "./egypt";

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
  // Seed / preview mode — NOT an error. src/lib/orders.ts routes checkout to
  // the local-storage + WhatsApp flow when Supabase is not configured.
  console.warn(
    "[Jia] Supabase env vars are not set — running without a backend: " +
    "orders are stored locally and confirmed over WhatsApp.",
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
  return /failed to fetch|network|timeout|abort|502|503|504/i.test(msg);
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
// Orders — with Supabase env vars the database is the source of truth
// (createOrderInSupabase + the admin dashboard). Without them,
// src/lib/orders.ts routes checkout to the local-storage + WhatsApp flow and
// this module stays passive.
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

// ---------- Public catalog (RLS allows public SELECT on these) ----------

/**
 * Optional product columns (colors jsonb, tags text[], fabric_* text) —
 * present after the hijab-catalog migration, absent on DBs created before
 * it. Returns only keys whose data is valid, so legacy rows map cleanly.
 */
function parseProductExtras(rec: Record<string, unknown>): Partial<Product> {
  const out: Partial<Product> = {};

  if (Array.isArray(rec.colors)) {
    const colors = (rec.colors as unknown[])
      .map((raw) => {
        const c = raw as Partial<Record<"ar" | "en" | "hex", unknown>>;
        const ar = typeof c?.ar === "string" ? c.ar.trim() : "";
        const en = typeof c?.en === "string" ? c.en.trim() : "";
        const hex = typeof c?.hex === "string" && /^#[0-9a-f]{3,8}$/i.test(c.hex.trim()) ? c.hex.trim() : "";
        return ar && en && hex ? { ar, en, hex } : null;
      })
      .filter((c): c is NonNullable<typeof c> => !!c);
    if (colors.length) out.colors = colors;
  }

  if (Array.isArray(rec.tags)) {
    const tags = (rec.tags as unknown[]).filter(
      (t): t is ProductTag => t === "new" || t === "bestseller",
    );
    if (tags.length) out.tags = tags;
  }

  if (typeof rec.fabric_ar === "string" && rec.fabric_ar.trim()) {
    out.fabricAr = rec.fabric_ar.trim();
  }
  if (typeof rec.fabric_en === "string" && rec.fabric_en.trim()) {
    out.fabricEn = rec.fabric_en.trim();
  }

  return out;
}

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
        // Optional columns — DBs from before the hijab-catalog migration may
        // not have them; safe accessors keep the mapping working either way.
        ...(Number.isFinite(Number(rec.sale_price)) && rec.sale_price !== null
          ? { salePrice: Number(rec.sale_price) }
          : {}),
        stock: Number(rec.stock ?? 0),
        categoryId: String(rec.category_id ?? ""),
        images: imgs,
        rating: Number(rec.rating ?? 4.5),
        reviewsCount: Number(rec.reviews_count ?? 0),
        featured: Boolean(rec.featured),
        bestseller: Boolean(rec.bestseller),
        active: Boolean(rec.active),
        createdAt: String(rec.created_at),
        ...parseProductExtras(rec),
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