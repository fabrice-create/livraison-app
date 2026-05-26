import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || ""
  const url = req.nextUrl.clone()

  // Ignorer les assets, API, et fichiers statiques
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/widget") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/livreur") ||
    url.pathname.startsWith("/closeuse") ||
    url.pathname.includes(".") ||
    host.includes("localhost")
  ) {
    return NextResponse.next()
  }

  // ── Sous-domaine automatique : therawolf.shipivo.app ──
  const isShipivoSubdomain = host.endsWith(".shipivo.app") && !host.startsWith("www.")
  if (isShipivoSubdomain) {
    const slug = host.replace(".shipivo.app", "")
    if (slug && slug !== "shipivo") {
      // Réécrire vers la boutique
      if (url.pathname === "/" || url.pathname === "") {
        url.pathname = `/commander/${slug}`
        return NextResponse.rewrite(url)
      }
      // Garder les autres paths mais avec le contexte du slug
      return NextResponse.next()
    }
  }

  // ── Domaine personnalisé : boutique.forako.shop ──
  const isMainDomain = host === "shipivo.app" || host === "www.shipivo.app"
  if (!isMainDomain && !isShipivoSubdomain && !host.includes("vercel.app")) {
    // C'est un domaine personnalisé — on laisse passer
    // Le routing sera géré côté app via la table tenants.custom_domain
    url.searchParams.set("custom_domain", host)
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)",
  ],
}
