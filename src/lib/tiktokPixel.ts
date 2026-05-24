// lib/tiktokPixel.ts
// TikTok Pixel tracking — Phase 9

declare global {
  interface Window {
    ttq?: {
      track: (event: string, data?: Record<string, unknown>) => void
      load: (pixelId: string) => void
      page: () => void
      identify: (data: Record<string, unknown>) => void
    }
  }
}

const CURRENCY_TO_USD: Record<string, number> = {
  FCFA: 650, XAF: 650, NGN: 1600, GHS: 15, EUR: 0.92,
  USD: 1, GBP: 0.79, MAD: 10, DZD: 135, EGP: 30,
  KES: 130, ZAR: 18, GNF: 8600, XOF: 650,
}

function toUSD(amount: number, currency: string): number {
  const rate = CURRENCY_TO_USD[currency] || 650
  return Math.round((amount / rate) * 100) / 100
}

export function initTiktokPixel(pixelId: string) {
  if (typeof window === "undefined" || !pixelId) return
  if (window.ttq) return

  const script = document.createElement("script")
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;
      var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load("${pixelId}");
      ttq.page();
    }(window, document, "ttq");
  `
  document.head.appendChild(script)
}

export function tiktokTrackViewContent(pixelId: string, productName: string, price: number, currency = "FCFA") {
  if (!pixelId || !window.ttq) return
  window.ttq.track("ViewContent", {
    content_name: productName,
    content_type: "product",
    value: toUSD(price, currency),
    currency: "USD",
  })
}

export function tiktokTrackAddToCart(pixelId: string, productName: string, price: number, currency = "FCFA") {
  if (!pixelId || !window.ttq) return
  window.ttq.track("AddToCart", {
    content_name: productName,
    content_type: "product",
    value: toUSD(price, currency),
    currency: "USD",
  })
}

export function tiktokTrackInitiateCheckout(pixelId: string, totalAmount: number, currency = "FCFA") {
  if (!pixelId || !window.ttq) return
  window.ttq.track("InitiateCheckout", {
    value: toUSD(totalAmount, currency),
    currency: "USD",
  })
}

export function tiktokTrackPurchase(pixelId: string, totalAmount: number, currency = "FCFA") {
  if (!pixelId || !window.ttq) return
  window.ttq.track("CompletePayment", {
    value: toUSD(totalAmount, currency),
    currency: "USD",
  })
}
