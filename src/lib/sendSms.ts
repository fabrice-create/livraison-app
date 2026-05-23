// src/lib/sendSms.ts
// Helper SMS — utilisé partout dans l'app

export interface SmsConfig {
  tenant_id: string
  phone: string
  message: string
  at_username?: string | null
  at_api_key?: string | null
  at_sender_id?: string | null
}

export async function sendSms(config: SmsConfig): Promise<void> {
  try {
    if (!config.at_username || !config.at_api_key) return
    await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: config.phone,
        message: config.message,
        at_username: config.at_username,
        at_api_key: config.at_api_key,
        at_sender_id: config.at_sender_id || "Shipivo",
      }),
    })
  } catch {
    // Silencieux — ne jamais bloquer l'action principale
  }
}

// Messages SMS prédéfinis
export const smsMessages = {
  confirmation: (customerName: string, product: string, boutique: string) =>
    `Bonjour ${customerName} ! Votre commande ${product} est confirmee. Notre livreur vous appellera avant de partir. Gardez votre tel ouvert. - ${boutique}`,

  livraison: (customerName: string, product: string, boutique: string) =>
    `Bonjour ${customerName}, merci pour votre commande ${product} ! Nous esperons vous revoir bientot. - ${boutique}`,
}
