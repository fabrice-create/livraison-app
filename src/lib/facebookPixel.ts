// lib/facebookPixel.ts
// Facebook Pixel + API Conversions

/* eslint-disable @typescript-eslint/no-explicit-any */

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

export function trackViewContent(pixelId: string, productName: string, price: number) {
  if (!pixelId) return
  fbq("track", "ViewContent", {
    content_name: productName,
    content_type: "product",
    value: price / 650,
    currency: "USD",
  })
}

export function trackAddToCart(pixelId: string, productName: string, price: number, quantity: number) {
  if (!pixelId) return
  fbq("track", "AddToCart", {
    content_name: productName,
    content_type: "product",
    value: (price * quantity) / 650,
    currency: "USD",
    num_items: quantity,
  })
}

export function trackPurchase(pixelId: string, totalAmount: number, orderRef: string) {
  if (!pixelId) return
  fbq("track", "Purchase", {
    value: totalAmount / 650,
    currency: "USD",
    content_type: "product",
    content_ids: [orderRef],
  })
}

export async function serverTrackPurchase(
  pixelId: string,
  accessToken: string,
  totalAmount: number,
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
              value: totalAmount / 650,
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
