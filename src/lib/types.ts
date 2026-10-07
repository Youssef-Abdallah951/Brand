export type Lang = "ar" | "en";

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  image: string;
  active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: number;
  stock: number;
  categoryId: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  bestseller?: boolean;
  active: boolean;
  ingredients?: string;
  createdAt: string;
}

export type DeliveryMethod = "standard" | "express";
// COD ONLY — the store accepts Cash on Delivery exclusively.
export type PaymentMethod = "cod";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
// COD orders are created with payment_status = 'pending'.
// Only an admin may change it later.
export type PaymentStatus = "pending" | "paid" | "rejected";

export interface CartItem {
  productId: string;
  qty: number;
  notes?: string;
}

export interface CheckoutForm {
  firstName: string;
  lastName: string;
  // NOTE: customer phone/WhatsApp are no longer collected at checkout.
  // Order.whatsapp/phone below stay for legacy rows + admin display.
  governorate: string;
  area: string;
  city: string;
  address: string;
  building: string;
  apartment: string;
  notes: string;
  deliveryMethod: DeliveryMethod | "";
  // Fixed to "cod" at order creation — no payment selector in checkout.
  paymentMethod: PaymentMethod;
}

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameAr: string;
  price: number;
  qty: number;
  image: string;
}

export interface Order {
  orderNumber: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  phone: string;
  governorate: string;
  area: string;
  city: string;
  address: string;
  building: string;
  apartment: string;
  notes: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  timeline: { status: OrderStatus; at: string }[];
}

export interface DeliveryZone {
  id: string;
  governorateEn: string;
  governorateAr: string;
  standardFee: number;
  expressFee: number;
  etaEn: string;
  etaAr: string;
  active: boolean;
}
