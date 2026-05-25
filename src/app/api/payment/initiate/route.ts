"use server"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CINETPAY_API_KEY  = process.env.CINETPAY_API_KEY  || ""
const CINETPAY_SITE_ID  = process.env.CINETPAY_SITE_ID  || ""
const APP_URL           = process.env.NEXT_PUBLIC_APP_URL || "https://shipivo.app"

// ── POST /api/payment/initiate ────────────────────────────
// Body: { tenant_id, plan, months, amount }
export async function POST(req: NextRequest) {
  try {
    const { tenant_id, plan, months = 1, amount } = await req.json()

    if (!tenant_id || !plan || !amount) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Récupérer infos tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("name, email, phone, slug")
      .eq("id", tenant_id)
      .single()

    if (tErr || !tenant) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 })
    }

    // Créer payment record (pending)
    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .insert({
        tenant_id,
        amount,
        currency: "FCFA",
        method: "cinetpay",
        status: "pending",
        reference: `SHV-${tenant_id.slice(0,8)}-${Date.now()}`,
      })
      .select()
      .single()

    if (pErr || !payment) {
      return NextResponse.json({ error: "Erreur création paiement" }, { status: 500 })
    }

    // Appel CinetPay
    const cpPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: payment.reference,
      amount,
      currency: "XOF",
      description: `Shipivo — Plan ${plan} x${months} mois`,
      return_url: `${APP_URL}/admin?payment=success&ref=${payment.reference}`,
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
      // Marquer payment comme failed
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id)
      return NextResponse.json({ error: cpData.message || "Erreur CinetPay" }, { status: 400 })
    }

    // Sauvegarder lien CinetPay
    await supabaseAdmin.from("payments").update({
      cinetpay_transaction_id: cpData.data?.payment_token,
      cinetpay_payment_url: cpData.data?.payment_url,
    }).eq("id", payment.id)

    return NextResponse.json({
      success: true,
      payment_url: cpData.data?.payment_url,
      payment_id: payment.id,
      reference: payment.reference,
    })

  } catch (err) {
    console.error("Payment initiate error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
