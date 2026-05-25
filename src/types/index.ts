// ============================================================
// SHIPIVO — Types partagés
// ============================================================

export type Zone = {
  id: string
  tenant_id: string
  nom: string
  pays: string
  emoji: string
  frais_livraison: number
  devise: string
  is_active: boolean
  created_at?: string
}

export type Order = {
  id: number
  customer_name: string
  phone: string
  city: string
  address: string
  product: string
  delivery_type: string
  quantity?: number | null
  amount?: number | string | null
  cash_collected?: boolean | null
  cash_collected_at?: string | null
  cash_collected_by?: string | null
  status?: string
  logistic_status?: string | null
  payment_status?: string | null
  driver_name?: string | null
  assigned_driver_id?: string | null
  is_assigned?: boolean
  assigned_at?: string | null
  closer_id?: string | null
  closer_name?: string | null
  closer_commission?: number | null
  driver_commission?: number | null
  commission_calculated?: boolean | null
  created_at?: string | null
  confirmed_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  source?: string | null
  note?: string | null
  tenant_id?: string | null
  zone_id?: string | null
  zone_nom?: string | null
}

export type Profile = {
  id: string
  email: string
  role: string
  full_name: string
  phone?: string | null
  tenant_id?: string | null
  is_active?: boolean
  is_available?: boolean | null
  last_seen?: string | null
  zone_id?: string | null
  zone_nom?: string | null
}

export type DriverStock = {
  id: number
  driver_id: string
  driver_name: string
  product_name: string
  quantity: number
}

export type OrderHistory = {
  id: number
  created_at: string
  order_id: number
  action_type: string
  action_by_user_id: string
  action_by_name: string
  action_details: string
}

// Formulaire création / édition commande
export type OrderFormData = {
  customer_name: string
  phone: string
  city: string
  address: string
  product: string
  quantity: string
  amount: string
  delivery_type: string
}

// Formulaire stock
export type StockFormData = {
  driver_id: string
  product_name: string
  quantity: string
}
