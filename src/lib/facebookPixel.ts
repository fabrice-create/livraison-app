// lib/facebookPixel.ts
// Facebook Pixel + API Conversions — Phase 9

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mapping devise → USD (taux approximatifs)
const CURRENCY_TO_USD: Record<string, number> = {
  FCFA: 650, XAF: 650, NGN: 1600, GHS: 15, EUR: 0.92,
  USD: 1, GBP: 0.79, MAD: 10, DZD: 135, EGP: 30,
  KES: 130, ZAR: 18, GNF: 8600, XOF: 650,
}

function toUSD(amount: number, currency: string): number {
  const rate = CURRENCY_TO_USD[currency] || 650
  return Math.round((amount / rate) * 100) / 100
}

export function initPixel(pixelId: string) {
  if (typeof window === "undefined" || !pixelId) return
  if ((window as any).fbq) return

  const fbq: any = function(...args: any[]) {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args)
    else fbq.queue.push(args)
  }
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []
  ;(window as any).fbq = fbq
  ;(window as any)._fbq = fbq

  const script = document.createElement("script")
  script.async = true
  script.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(script)

  fbq("init", pixelId)
  fbq("track", "PageView")
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    ;(window as any).fbq(...args)
  }
}

export function trackViewContent(pixelId: string, productName: string, price: number, currency = "FCFA") {
  if (!pixelId) return
  fbq("track", "ViewContent", {
    content_name: productName,
    content_type: "product",
    value: toUSD(price, currency),
    currency: "USD",
  })
}

export function trackAddToCart(pixelId: string, productName: string, price: number, quantity: number, currency = "FCFA") {
  if (!pixelId) return
  fbq("track", "AddToCart", {
    content_name: productName,
    content_type: "product",
    value: toUSD(price * quantity, currency),
    currency: "USD",
    num_items: quantity,
  })
}

export function trackInitiateCheckout(pixelId: string, totalAmount: number, numItems: number, currency = "FCFA") {
  if (!pixelId) return
  fbq("track", "InitiateCheckout", {
    value: toUSD(totalAmount, currency),
    currency: "USD",
    num_items: numItems,
  })
}

export function trackPurchase(pixelId: string, totalAmount: number, orderRef: string, currency = "FCFA") {
  if (!pixelId) return
  fbq("track", "Purchase", {
    value: toUSD(totalAmount, currency),
    currency: "USD",
    content_type: "product",
    content_ids: [orderRef],
  })
}

export async function serverTrackPurchase(
  pixelId: string,
  accessToken: string,
  totalAmount: number,
  currency = "FCFA",
  customerPhone?: string
) {
  if (!pixelId || !accessToken) return
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [{
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            user_data: customerPhone ? {
              ph: [customerPhone.replace(/[^0-9]/g, "")]
            } : undefined,
            custom_data: {
              value: toUSD(totalAmount, currency),
              currency: "USD",
            },
          }],
        }),
      }
    )
  } catch (e) {
    console.warn("FB Conversions API error:", e)
  }
}
