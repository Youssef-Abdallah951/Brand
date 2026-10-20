// ---------------------------------------------------------------------------
// Order-creation adapter — the single entry point every order goes through.
//
// - Supabase env vars present → INSERTs through createOrderInSupabase
//   (database = source of truth; the admin dashboard reads from there).
// - No Supabase env (seed / preview / offline) → LOCAL mode: the order is
//   stored in this browser's localStorage and the shopper is handed to
//   WhatsApp with the complete order details, so the store receives it even
//   without a backend. Checkout therefore never sees a "server unavailable"
//   error — local mode always returns a success.
// ---------------------------------------------------------------------------
import { isSupabaseConfigured, createOrderInSupabase, type CreateOrderInput } from "./supabase";
import { WHATSAPP_NUMBER } from "./config";
import type { Order } from "./types";

export type OrderMode = "supabase" | "local";

export interface CreateOrderResult {
  orderNumber: string;
  mode: OrderMode;
  // Full order snapshot. Complete in local mode; in supabase mode checkout
  // keeps using its own validated snapshot (identical shape).
  order: Order;
  // Prefilled wa.me link in local mode ("" in supabase mode).
  whatsapp: string;
}

const STORAGE_KEY = "jia_orders_v1";
const MAX_STORED = 50;

export function isLocalOrderMode(): boolean {
  return !isSupabaseConfigured;
}

function readAllLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order: Order): void {
  try {
    const all = readAllLocalOrders().filter((o) => o.orderNumber !== order.orderNumber);
    all.unshift(order);
    while (all.length > MAX_STORED) all.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage blocked/full — the order still succeeds: the success page and
       WhatsApp message both carry the snapshot in the navigation payload */
  }
}

export function getLocalOrder(orderNumber: string): Order | null {
  return readAllLocalOrders().find((o) => o.orderNumber === orderNumber) ?? null;
}

/** LM-XXXXXX — same shape as the Supabase path; validated against already
 *  stored local orders (retry on an astronomically rare 6-digit collision). */
function generateLocalOrderNumber(): string {
  const taken = new Set(readAllLocalOrders().map((o) => o.orderNumber));
  for (let i = 0; i < 250; i++) {
    const n = `LM-${Math.floor(100000 + Math.random() * 900000)}`;
    if (!taken.has(n)) return n;
  }
  // Fallback: millisecond precision makes a repeat practically impossible.
  return `LM-${String(Date.now()).slice(-9)}`;
}

/** Arabic-first order summary for the store's admin number. Arabic content
 *  is preserved verbatim — encodeURIComponent at the wa.me link boundary. */
export function buildOrderWhatsAppMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`طلب جديد رقم ${order.orderNumber}`);
  lines.push("");
  lines.push("العميل:");
  lines.push(`${order.firstName} ${order.lastName}`.trim());
  lines.push("");
  lines.push("رقم الهاتف:");
  lines.push(order.phone || order.whatsapp);
  lines.push("");
  lines.push("المحافظة:");
  lines.push(order.governorate);
  lines.push("");
  lines.push("العنوان:");
  lines.push(
    [
      order.address,
      order.area,
      order.city,
      ...(order.building ? [`عمارة ${order.building}`] : []),
      ...(order.apartment ? [`شقة ${order.apartment}`] : []),
    ].filter(Boolean).join(" - "),
  );
  lines.push("");
  lines.push("المنتجات:");
  for (const it of order.items) {
    const nm = it.nameAr || it.nameEn;
    const color = it.color ? ` — اللون: ${it.color}` : "";
    lines.push(
      `• ${nm}${color} — الكمية: ${it.qty} — سعر الوحدة: ${it.price} ج.م — الإجمالي: ${it.price * it.qty} ج.م`,
    );
  }
  lines.push("");
  lines.push(`الإجمالي الفرعي: ${order.subtotal} ج.م`);
  if (order.discount > 0) lines.push(`الخصم: -${order.discount} ج.م`);
  lines.push(`الشحن: ${order.deliveryFee} ج.م`);
  lines.push(`الإجمالي النهائي: ${order.total} ج.م`);
  lines.push("");
  lines.push("طريقة الدفع: كاش عند الاستلام");
  lines.push(`طريقة الشحن: ${order.deliveryMethod === "express" ? "سريع" : "عادي"}`);
  if (order.notes?.trim()) {
    lines.push("");
    lines.push("ملاحظات الطلب / الهدية:");
    lines.push(order.notes.trim());
  }
  lines.push("");
  lines.push("— من موقع JiA | Silk & Essentials");
  return lines.join("\n");
}

export function orderWhatsAppLink(order: Order): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderWhatsAppMessage(order))}`;
}

function toOrder(input: CreateOrderInput, orderNumber: string): Order {
  const createdAt = new Date().toISOString();
  return {
    orderNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    whatsapp: input.whatsapp,
    phone: input.phone,
    governorate: input.governorate,
    area: input.area,
    city: input.city,
    address: input.address,
    building: input.building,
    apartment: input.apartment,
    notes: input.notes,
    deliveryMethod: input.deliveryMethod,
    paymentMethod: "cod",
    paymentStatus: "pending",
    items: input.items,
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    discount: input.discount,
    total: input.total,
    status: "pending",
    createdAt,
    timeline: [{ status: "pending", at: createdAt }],
  };
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (isLocalOrderMode()) {
    const order = toOrder(input, generateLocalOrderNumber());
    saveLocalOrder(order);
    return { orderNumber: order.orderNumber, mode: "local", order, whatsapp: orderWhatsAppLink(order) };
  }
  const orderNumber = await createOrderInSupabase(input);
  return { orderNumber, mode: "supabase", order: toOrder(input, orderNumber), whatsapp: "" };
}
