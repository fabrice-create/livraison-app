// lib/googleAnalytics.ts
// Google Analytics 4 — Phase 9

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function initGA(measurementId: string) {
  if (typeof window === "undefined" || !measurementId) return
  if (window.gtag) return

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag("js", new Date())
  window.gtag("config", measurementId)
}

export function gaTrackViewItem(measurementId: string, productName: string, price: number, currency = "FCFA") {
  if (!measurementId || !window.gtag) return
  window.gtag("event", "view_item", {
    currency,
    value: price,
    items: [{ item_name: productName, price, quantity: 1 }],
  })
}

export function gaTrackAddToCart(measurementId: string, productName: string, price: number, quantity: number, currency = "FCFA") {
  if (!measurementId || !window.gtag) return
  window.gtag("event", "add_to_cart", {
    currency,
    value: price * quantity,
    items: [{ item_name: productName, price, quantity }],
  })
}

export function gaTrackBeginCheckout(measurementId: string, totalAmount: number, currency = "FCFA") {
  if (!measurementId || !window.gtag) return
  window.gtag("event", "begin_checkout", {
    currency,
    value: totalAmount,
  })
}

export function gaTrackPurchase(measurementId: string, totalAmount: number, orderId: string, currency = "FCFA") {
  if (!measurementId || !window.gtag) return
  window.gtag("event", "purchase", {
    transaction_id: orderId,
    currency,
    value: totalAmount,
  })
}
