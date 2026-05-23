// src/app/api/sms/route.ts
// Phase 7 — SMS Africa's Talking

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, message, at_username, at_api_key, at_sender_id } = body

    if (!phone || !message) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Pas de clés AT → on ignore silencieusement
    if (!at_username || !at_api_key) {
      return NextResponse.json({ skipped: true, reason: "AT non configuré" }, { status: 200 })
    }

    // Nettoyer le numéro de téléphone
    const cleanPhone = String(phone).replace(/[^\d]/g, "")
    const formattedPhone = cleanPhone.startsWith("00")
      ? "+" + cleanPhone.slice(2)
      : "+" + cleanPhone

    const senderId = at_sender_id || "Shipivo"

    // Appel API Africa's Talking
    const atResponse = await fetch("https://api.sandbox.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": at_api_key,
      },
      body: new URLSearchParams({
        username: at_username,
        to: formattedPhone,
        message: message,
        from: senderId,
      }).toString(),
    })

    const atData = await atResponse.json()
    console.log("AT Response:", JSON.stringify(atData))

    const recipients = atData?.SMSMessageData?.Recipients
    if (recipients && recipients.length > 0) {
      const recipient = recipients[0]
      console.log("AT Recipient:", JSON.stringify(recipient))
      return NextResponse.json({ 
        success: recipient.statusCode === 101, 
        status: recipient.status,
        statusCode: recipient.statusCode,
        messageId: recipient.messageId 
      })
    }

    return NextResponse.json({ success: false, raw: atData }, { status: 200 })

  } catch (err) {
    console.error("SMS API error:", err)
    return NextResponse.json({ error: "Erreur serveur SMS", detail: String(err) }, { status: 200 })
  }
}
