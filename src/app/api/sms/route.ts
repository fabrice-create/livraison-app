// src/app/api/sms/route.ts
// Phase 7 — SMS Africa's Talking

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, phone, message } = body

    if (!tenant_id || !phone || !message) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Récupérer les clés AT du tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("at_username, at_api_key, at_sender_id, name")
      .eq("id", tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 })
    }

    // Pas de clés AT configurées → on ignore silencieusement
    if (!tenant.at_username || !tenant.at_api_key) {
      return NextResponse.json({ skipped: true, reason: "AT non configuré" }, { status: 200 })
    }

    // Nettoyer le numéro de téléphone
    const cleanPhone = String(phone).replace(/[^\d]/g, "")
    // Ajouter le + si pas présent
    const formattedPhone = cleanPhone.startsWith("00")
      ? "+" + cleanPhone.slice(2)
      : "+" + cleanPhone

    const senderId = tenant.at_sender_id || "Shipivo"

    // Appel API Africa's Talking
    const atResponse = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": tenant.at_api_key,
      },
      body: new URLSearchParams({
        username: tenant.at_username,
        to: formattedPhone,
        message: message,
        from: senderId,
      }).toString(),
    })

    const atData = await atResponse.json()

    // Vérifier le résultat
    const recipients = atData?.SMSMessageData?.Recipients
    if (recipients && recipients.length > 0) {
      const recipient = recipients[0]
      if (recipient.statusCode === 101) {
        return NextResponse.json({ success: true, messageId: recipient.messageId })
      } else {
        return NextResponse.json({
          success: false,
          status: recipient.status,
          statusCode: recipient.statusCode,
        }, { status: 200 }) // 200 pour ne pas bloquer le flow
      }
    }

    return NextResponse.json({ success: false, raw: atData }, { status: 200 })

  } catch (err) {
    console.error("SMS API error:", err)
    // On retourne 200 pour ne jamais bloquer l'action principale
    return NextResponse.json({ error: "Erreur serveur SMS", detail: String(err) }, { status: 200 })
  }
}
