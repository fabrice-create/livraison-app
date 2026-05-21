// lib/facebookPixel.ts
// Tracking Facebook Pixel + API Conversions
// Envoi côté client (pixel) ET côté serveur (API Conversions)
// Plus fiable depuis iOS 14

// ── CLIENT SIDE (Pixel) ──────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

export function initPixel(pixelId: string) {
  if (typeof window === "undefined" || !pixelId) return
  if (window.fbq) return // déjà initialisé

  // Injection du script pixel Facebook
  const f = window as Window & typeof globalThis
  const fbq = function(...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args)
    } else {
      fbq.queue.push(args)
    }
  } as {
    (...args: unknown[]): void
    callMethod?: (...args: unknown[]) => void
    queue: unknown[][]
    loaded: boolean
    version: string
    push: (...args: unknown[]) => void
  }

  if (!f._fbq) f._fbq = fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []
  f.fbq = fbq

  const script = document.createElement("script")
  script.async = true
  script.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(script)

  window.fbq("init", pixelId)
  window.fbq("track", "PageView")
}

export function trackViewContent(pixelId: string, productName: string, price: number) {
  if (typeof window === "undefined" || !pixelId || !window.fbq) return
  window.fbq("track", "ViewContent", {
    content_name: productName,
    content_type: "product",
    value: price / 650, // FCFA → USD approximatif
    currency: "USD",
  })
}

export function trackAddToCart(pixelId: string, productName: string, price: number, quantity: number) {
  if (typeof window === "undefined" || !pixelId || !window.fbq) return
  window.fbq("track", "AddToCart", {
    content_name: productName,
    content_type: "product",
    value: (price * quantity) / 650,
    currency: "USD",
    num_items: quantity,
  })
}

export function trackPurchase(pixelId: string, totalAmount: number, orderRef: string) {
  if (typeof window === "undefined" || !pixelId || !window.fbq) return
  window.fbq("track", "Purchase", {
    value: totalAmount / 650,
    currency: "USD",
    content_type: "product",
    content_ids: [orderRef],
  })
}

// ── SERVER SIDE (API Conversions) ────────────────────────────

interface ConversionEvent {
  event_name: string
  event_time: number
  user_data?: {
    ph?: string[]  // téléphone hashé
    em?: string[]  // email hashé
  }
  custom_data?: {
    value?: number
    currency?: string
    content_name?: string
    content_type?: string
    num_items?: number
  }
}

export async function sendServerEvent(
  pixelId: string,
  accessToken: string,
  event: ConversionEvent
) {
  if (!pixelId || !accessToken) return

  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [event],
          test_event_code: undefined, // retirer en production
        }),
      }
    )
  } catch (e) {
    console.warn("Facebook API Conversions error:", e)
  }
}

export async function serverTrackPurchase(
  pixelId: string,
  accessToken: string,
  totalAmount: number,
  customerPhone?: string
) {
  await sendServerEvent(pixelId, accessToken, {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    user_data: customerPhone ? {
      ph: [customerPhone.replace(/[^0-9]/g, "")]
    } : undefined,
    custom_data: {
      value: totalAmount / 650,
      currency: "USD",
      content_type: "product",
    },
  })
}
