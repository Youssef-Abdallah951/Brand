import { whatsappLinkWithMessage } from "./siteConfig";
import type { Order } from "./types";

export function buildOrderWhatsAppMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`New Order #${order.orderNumber}`);
  lines.push("");
  lines.push("Customer:");
  lines.push(`${order.firstName} ${order.lastName}`.trim());
  lines.push("");
  lines.push("WhatsApp:");
  lines.push(order.whatsapp);
  lines.push("");
  lines.push("Products:");
  for (const it of order.items) {
    const nm = it.nameEn || it.nameAr;
    lines.push(`${nm} x${it.qty} — EGP ${it.price * it.qty}`);
  }
  lines.push("");
  lines.push(`Subtotal: EGP ${order.subtotal}`);
  lines.push(`Delivery: EGP ${order.deliveryFee}`);
  if (order.discount > 0) lines.push(`Discount: EGP ${order.discount}`);
  lines.push(`Total: EGP ${order.total}`);
  lines.push("");
  lines.push("Delivery Address:");
  lines.push(
    `${order.address}, ${order.area}, ${order.city}, ${order.governorate}` +
      (order.building ? ` - Bldg ${order.building}` : "") +
      (order.apartment ? ` Apt ${order.apartment}` : ""),
  );
  lines.push("");
  lines.push(`Delivery Method: ${order.deliveryMethod}`);
  lines.push(`Payment Method: ${order.paymentMethod}`);
  if (order.notes) {
    lines.push("");
    lines.push("Customer Notes:");
    lines.push(order.notes);
  }
  return lines.join("\n");
}

export function orderWhatsAppLink(order: Order): string {
  return whatsappLinkWithMessage(buildOrderWhatsAppMessage(order));
}
