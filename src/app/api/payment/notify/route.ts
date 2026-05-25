"use server"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY || ""
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || ""

// ── POST /api/payment/notify — webhook CinetPay ───────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cpm_trans_id, cpm_site_id } = body

    if (cpm_site_id !== CINETPAY_SITE_ID) {
      return NextResponse.json({ error: "Site ID invalide" }, { status: 403 })
    }

    // Vérifier statut paiement auprès de CinetPay
    const verifyRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: CINETPAY_API_KEY,
        site_id: CINETPAY_SITE_ID,
        transaction_id: cpm_trans_id,
      }),
    })

    const verifyData = await verifyRes.json()
    const cpStatus = verifyData.data?.status

    // Trouver le payment par référence
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("reference", cpm_trans_id)
      .single()

    if (!payment) {
      return NextResponse.json({ error: "Payment introuvable" }, { status: 404 })
    }

    if (cpStatus === "ACCEPTED") {
      const metadata = JSON.parse(verifyData.data?.metadata || "{}")
      const { tenant_id, plan, months = 1 } = metadata

      // Calculer dates abonnement
      const startedAt = new Date()
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + months)

      // Créer subscription
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          tenant_id,
          plan,
          status: "active",
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          amount: payment.amount,
          currency: "FCFA",
          payment_method: "cinetpay",
          payment_ref: payment.reference,
        })
        .select()
        .single()

      // Mettre à jour payment
      await supabaseAdmin.from("payments").update({
        status: "success",
        paid_at: new Date().toISOString(),
        subscription_id: sub?.id || null,
      }).eq("id", payment.id)

      // Mettre à jour tenant
      await supabaseAdmin.from("tenants").update({
        plan,
        subscription_status: "active",
        plan_expires_at: expiresAt.toISOString(),
      }).eq("id", tenant_id)

    } else if (cpStatus === "REFUSED" || cpStatus === "CANCELLED") {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id)
    }

    return NextResponse.json({ message: "OK" })

  } catch (err) {
    console.error("Payment notify error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// ── GET /api/payment/notify — vérification manuelle ───────
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")
  if (!ref) return NextResponse.json({ error: "ref manquant" }, { status: 400 })

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("reference", ref)
    .single()

  return NextResponse.json({ payment })
}
