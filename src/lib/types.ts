export type Lang = "ar" | "en";

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  image: string;
  active: boolean;
}

export interface ProductColor {
  ar: string;
  en: string;
  hex: string;
}

export type ProductTag = "new" | "bestseller";

export interface Product {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: number;
  salePrice?: number;
  stock: number;
  categoryId: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  bestseller?: boolean;
  tags?: ProductTag[];
  colors?: ProductColor[];
  fabricAr?: string;
  fabricEn?: string;
  active: boolean;
  ingredients?: string;
  createdAt: string;
}

export type DeliveryMethod = "standard" | "express";
// Payment methods supported at checkout.
export type PaymentMethod = "cod" | "instapay" | "vodafone_cash";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
// COD orders are created with payment_status = 'pending'.
// Manual payments (InstaPay / Vodafone Cash) start as 'pending_verification'
// and are only ever changed by an admin (approve -> 'paid', reject -> 'rejected').
export type PaymentStatus = "pending" | "pending_verification" | "paid" | "rejected";

export interface CartItem {
  productId: string;
  qty: number;
  notes?: string;
  color?: string;
}

export interface CheckoutForm {
  firstName: string;
  lastName: string;
  // Egyptian mobile number (01XXXXXXXXX) — used for delivery coordination.
  phone: string;
  governorate: string;
  area: string;
  city: string;
  address: string;
  building: string;
  apartment: string;
  notes: string;
  deliveryMethod: DeliveryMethod | "";
  paymentMethod: PaymentMethod | "";
  // Manual-payment details (InstaPay / Vodafone Cash) — only used when
  // paymentMethod is not "cod". Kept optional for COD orders.
  paymentRecipientNumber?: string;
  senderPhone?: string;
  transactionRef?: string;
  paymentScreenshot?: string;
}

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameAr: string;
  price: number;
  qty: number;
  image: string;
  // Colour variant chosen at checkout (when any) — used by the WhatsApp
  // order message and kept in the local order snapshot.
  color?: string;
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
  // Manual-payment details (InstaPay / Vodafone Cash). Empty for COD.
  paymentRecipientNumber?: string;
  senderPhone?: string;
  transactionRef?: string;
  paymentScreenshot?: string;
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
