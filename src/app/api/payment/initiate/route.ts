"use server"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

const CINETPAY_API_KEY  = process.env.CINETPAY_API_KEY  || ""
const CINETPAY_SITE_ID  = process.env.CINETPAY_SITE_ID  || ""
const APP_URL           = process.env.NEXT_PUBLIC_APP_URL || "https://shipivo.app"

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, plan, months = 1, amount } = await req.json()

    if (!tenant_id || !plan || !amount) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("name, email, phone, slug")
      .eq("id", tenant_id)
      .single()

    if (tErr || !tenant) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 })
    }

    const reference = `SHV-${tenant_id.slice(0,8)}-${Date.now()}`

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .insert({
        tenant_id,
        amount,
        currency: "FCFA",
        method: "cinetpay",
        status: "pending",
        reference,
      })
      .select()
      .single()

    if (pErr || !payment) {
      return NextResponse.json({ error: "Erreur création paiement" }, { status: 500 })
    }

    // Si CinetPay pas encore configuré, retourner erreur claire
    if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
      return NextResponse.json({
        error: "CinetPay non configuré. Ajoute CINETPAY_API_KEY et CINETPAY_SITE_ID dans les variables Vercel."
      }, { status: 503 })
    }

    const cpPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: reference,
      amount,
      currency: "XOF",
      description: `Shipivo — Plan ${plan} x${months} mois`,
      return_url: `${APP_URL}/admin?payment=success&ref=${reference}`,
      notify_url: `${APP_URL}/api/payment/notify`,
      customer_name: tenant.name,
      customer_email: tenant.email || `${tenant.slug}@shipivo.app`,
      customer_phone_number: tenant.phone || "",
      customer_address: "Afrique de l'Ouest",
      customer_city: "Lomé",
      customer_country: "TG",
      customer_state: "TG",
      customer_zip_code: "00000",
      channels: "ALL",
      metadata: JSON.stringify({ tenant_id, plan, months, payment_id: payment.id }),
    }

    const cpRes = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cpPayload),
    })

    const cpData = await cpRes.json()

    if (cpData.code !== "201") {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id)
      return NextResponse.json({ error: cpData.message || "Erreur CinetPay" }, { status: 400 })
    }

    await supabaseAdmin.from("payments").update({
      cinetpay_transaction_id: cpData.data?.payment_token,
      cinetpay_payment_url: cpData.data?.payment_url,
    }).eq("id", payment.id)

    return NextResponse.json({
      success: true,
      payment_url: cpData.data?.payment_url,
      payment_id: payment.id,
      reference,
    })

  } catch (err) {
    console.error("Payment initiate error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
