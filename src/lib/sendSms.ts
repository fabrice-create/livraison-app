// src/lib/sendSms.ts
// Helper SMS — utilisé partout dans l'app

export async function sendSms({
  tenant_id,
  phone,
  message,
}: {
  tenant_id: string
  phone: string
  message: string
}): Promise<void> {
  try {
    await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id, phone, message }),
    })
    // On ignore le résultat — le SMS est best-effort
    // Jamais d'erreur visible pour l'utilisateur
  } catch {
    // Silencieux — ne jamais bloquer l'action principale
  }
}

// Messages SMS prédéfinis
export const smsMessages = {
  confirmation: (customerName: string, product: string, boutique: string) =>
    `Bonjour ${customerName} ! Votre commande ${product} est confirmée ✅. Notre livreur vous appellera avant de partir. Gardez votre tel ouvert. — ${boutique}`,

  livraison: (customerName: string, product: string, boutique: string) =>
    `Bonjour ${customerName}, merci pour votre commande ${product} ! Nous espérons vous revoir bientôt. — ${boutique}`,
}
