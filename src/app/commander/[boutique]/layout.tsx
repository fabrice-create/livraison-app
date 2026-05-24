// src/app/commander/[boutique]/layout.tsx
// SEO dynamique par boutique — titre, description, Open Graph

import { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  params: { boutique: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.boutique

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, phone")
    .eq("slug", slug)
    .single()

  if (!tenant) {
    return {
      title: "Boutique — Shipivo",
      description: "Commandez en ligne facilement.",
    }
  }

  const title = `${tenant.name} — Commander en ligne`
  const description = `Commandez sur ${tenant.name} — Livraison rapide. Paiement à la livraison.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: tenant.name,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default function BoutiqueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
