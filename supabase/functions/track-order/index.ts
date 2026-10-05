// Supabase Edge Function: track-order
// Secure order lookup — the service-role key lives ONLY here (Edge Function
// environment secrets), never in the browser.
//
// Deploy (project ref: edtxfquerhhjwvolnfdg):
//   supabase link --project-ref edtxfquerhhjwvolnfdg
//   supabase functions deploy track-order --no-verify-jwt
//   supabase secrets set SUPABASE_URL=https://edtxfquerhhjwvolnfdg.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
//   # Optional: extra exact origins (comma-separated) besides localhost + *.vercel.app:
//   supabase secrets set ALLOWED_ORIGINS=https://www.example.com
//
// Request:  POST { "order_number": "LM-123456", "whatsapp": "01018340567" }
// Success:  200 { "order": { ...safe fields..., "items": [...] } }
// Not found: 404 { "error": "Order not found" }  (same for wrong number OR wrong whatsapp)
// Bad input: 400 { "error": "order_number and whatsapp are required" }
//
// CORS: the browser (supabase-js functions.invoke) sends apikey + Authorization
// headers, so Access-Control-Allow-Origin must echo the exact origin — never "*".
// Every response below (including OPTIONS/4xx/5xx) carries the CORS headers.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

// Exact origins always allowed (dev + vite preview).
const LOCAL_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function extraOrigins(): string[] {
  return ((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(","))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (LOCAL_ORIGINS.has(origin)) return true;
  if (extraOrigins().includes(origin)) return true;
  // Production (and preview) deployments live on *.vercel.app — allow any
  // of them over https without hardcoding one domain. No project reference
  // is committed to the repo; the deployed site's origin matches here.
  try {
    const u = new URL(origin);
    if (u.protocol === "https:" && u.hostname.endsWith(".vercel.app")) return true;
  } catch {
    return false;
  }
  return false;
}

/** CORS headers for THIS request — echoed origin, present on ALL responses. */
function corsHeadersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
  const origin = req.headers.get("origin") ?? "";
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeadersFor(req),
  });
}

/** 01018340567 / +201018340567 / "0101-834-0567" -> 201018340567 */
function normalizeWhatsApp(input: string): string {
  let p = (input || "").trim().replace(/[+\s\-().*/]/g, "");
  if (p.startsWith("0020")) p = p.slice(2);
  if (/^01[0125]\d{8}$/.test(p)) p = `2${p}`;
  if (/^1[0125]\d{8}$/.test(p)) p = `20${p}`;
  return p;
}

/** Trim + uppercase: "lm-123456" and "  LM-123456 " match. */
function normalizeOrderNumber(input: string): string {
  return (input || "").trim().replace(/\s+/g, "").toUpperCase();
}

serve(async (req: Request) => {
  // Preflight: 204 + CORS headers (browser checks for 2xx + Allow-Origin).
  if (req.method === "OPTIONS") {
    const headers = corsHeadersFor(req);
    delete headers["Content-Type"]; // 204 carries no body
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  let body: { order_number?: unknown; whatsapp?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  // 1. Validate both fields present
  if (typeof body.order_number !== "string" || typeof body.whatsapp !== "string" ||
      !body.order_number.trim() || !body.whatsapp.trim()) {
    return json(req, 400, { error: "order_number and whatsapp are required" });
  }

  // 2-3. Normalize (length-capped to block abuse with huge payloads)
  const orderNumber = normalizeOrderNumber(body.order_number).slice(0, 32);
  const whatsappNorm = normalizeWhatsApp(body.whatsapp).slice(0, 32);
  if (!orderNumber || !/^201[0125]\d{8}$/.test(whatsappNorm)) {
    // Same generic 404 — never reveal which field was wrong.
    return json(req, 404, { error: "Order not found" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(req, 503, { error: "Tracking service not configured" });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 4-5. Match BOTH order_number (case-insensitive) AND normalized whatsapp.
  // Prefer the normalized column; fall back to raw compare for legacy rows.
  // Every DB call is guarded: transport/DB outages → 502 JSON (never a crash,
  // never a stack trace, never another customer's data).
  let order: Record<string, unknown> | null = null;
  try {
    const byNorm = await admin
      .from("orders")
      .select("*")
      .ilike("order_number", orderNumber)
      .eq("whatsapp_normalized", whatsappNorm)
      .maybeSingle();
    if (byNorm.error) throw byNorm.error;

    if (byNorm.data) {
      order = byNorm.data as Record<string, unknown>;
    } else {
      // Legacy fallback: fetch by order number, compare normalized whatsapp in code.
      const byNum = await admin
        .from("orders")
        .select("*")
        .ilike("order_number", orderNumber)
        .maybeSingle();
      if (byNum.error) throw byNum.error;
      if (byNum.data) {
        const row = byNum.data as Record<string, unknown>;
        const candidates = [
          typeof row.whatsapp_normalized === "string" ? (row.whatsapp_normalized as string) : "",
          normalizeWhatsApp(String(row.whatsapp ?? "")),
        ];
        if (candidates.includes(whatsappNorm)) order = row;
      }
    }
  } catch {
    return json(req, 502, { error: "Tracking service unavailable" });
  }

  // 10. Generic 404 — same whether the number or the whatsapp was wrong.
  if (!order) {
    return json(req, 404, { error: "Order not found" });
  }

  // 6-7. Its items only (guarded like above).
  let items: Record<string, unknown>[] = [];
  try {
    const res = await admin
      .from("order_items")
      .select("product_id, name_en, name_ar, price, qty, image")
      .eq("order_id", order.id as string);
    if (res.error) throw res.error;
    items = (res.data ?? []) as Record<string, unknown>[];
  } catch {
    return json(req, 502, { error: "Tracking service unavailable" });
  }

  // 8. Only the required customer-facing fields — no admin internals.
  const safeOrder = {
    order_number: order.order_number,
    first_name: order.first_name,
    last_name: order.last_name,
    whatsapp: order.whatsapp,
    phone: order.phone ?? "",
    governorate: order.governorate,
    area: order.area,
    city: order.city ?? "",
    address: order.address,
    building: order.building ?? "",
    apartment: order.apartment ?? "",
    notes: order.notes ?? "",
    delivery_method: order.delivery_method,
    payment_method: "cod",
    payment_status: order.payment_status,
    subtotal: order.subtotal,
    delivery_fee: order.delivery_fee,
    discount: order.discount ?? 0,
    total: order.total,
    status: order.status, // 9. latest status, straight from orders.status
    created_at: order.created_at,
    items: items.map((i: Record<string, unknown>) => ({
      product_id: i.product_id,
      name_en: i.name_en,
      name_ar: i.name_ar,
      price: i.price,
      qty: i.qty,
      image: i.image ?? "",
    })),
  };

  return json(req, 200, { order: safeOrder });
});
