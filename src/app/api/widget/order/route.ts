"use server"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("boutique")
  if (!slug) return NextResponse.json({ error: "boutique requis" }, { status: 400 })

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, delivery_fee, currency, brand_color, is_active")
    .eq("slug", slug)
    .single()

  if (!tenant || !tenant.is_active) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 })
  }

  return NextResponse.json({ tenant }, {
    headers: { "Access-Control-Allow-Origin": "*" }
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { boutique_slug, customer_name, phone, city, address, product, quantity, amount, note } = body

    if (!boutique_slug || !customer_name || !phone || !city) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 }, )
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, is_active, delivery_fee")
      .eq("slug", boutique_slug)
      .single()

    if (!tenant || !tenant.is_active) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 })
    }

    const { error } = await supabase.from("orders").insert({
      tenant_id: tenant.id,
      customer_name: customer_name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: (address || "").trim(),
      product: (product || "Commande directe").trim(),
      quantity: quantity || 1,
      amount: amount || (tenant.delivery_fee || 0),
      status: "En attente",
      source: "widget_external",
      note: note || null,
    })

    if (error) throw error

    return NextResponse.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    })

  } catch (err) {
    console.error("Widget API error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    })
  }
}
