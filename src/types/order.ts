// types/order.ts

export type OrderStatus =
  | "en_attente"
  | "confirme"
  | "livre_paye"
  | "gare"
  | "annule";

export type OrderSource =
  | "whatsapp"
  | "shopify"
  | "youcan"
  | "woocommerce"
  | "tally"
  | "direct"
  | "wordpress"
  | "google_forms"
  | "boutique";

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  zone: string;
  city: string;
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  status: OrderStatus;
  source: OrderSource;
  assigned_driver_id?: string;
  assigned_driver_name?: string;
  assigned_driver_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  proof_photo_url?: string;
}

export interface DriverStock {
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  zone: string;
  success_rate: number;
  today_deliveries: number;
  today_objective: number;
  stock: DriverStock[];
}

export interface Commission {
  order_id: string;
  amount: number;
  type: "livreur" | "closureuse";
  status: "pending" | "paid";
}
