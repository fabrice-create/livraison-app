import { supabase } from "@/app/lib/supabase"

export type UserRole = "super_admin" | "admin" | "closureuse" | "livreur" | "partenaire"

export interface UserProfile {
  id: string
  role: UserRole
  tenant_id: string | null
  full_name: string
  phone: string | null
  is_active: boolean
}

export function getRedirectByRole(role: UserRole): string {
  switch (role) {
    case "super_admin": return "/super-admin"
    case "admin":       return "/admin"
    case "closureuse":  return "/closureuse"
    case "livreur":     return "/livreur"
    case "partenaire":  return "/partenaire"
    default:            return "/login"
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // 1. Vérifier super_admin
  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("id, full_name")
    .eq("user_id", userId)
    .single()

  if (superAdmin) {
    return {
      id: userId,
      role: "super_admin",
      tenant_id: null,
      full_name: superAdmin.full_name,
      phone: null,
      is_active: true,
    }
  }

  // 2. Profil standard
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, tenant_id, full_name, phone, is_active")
    .eq("user_id", userId)
    .single()

  if (!profile) return null
  return profile as UserProfile
}

export async function createTenantAndAdmin(params: {
  userId: string
  email: string
  fullName: string
  businessName: string
  phone: string
  country: string
}) {
  const { userId, email, fullName, businessName, phone, country } = params

  const slug = businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: businessName,
      slug,
      email,
      phone,
      country,
      is_active: true,
      plan: "trial",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single()

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message || "Erreur création boutique")
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      tenant_id: tenant.id,
      role: "admin",
      full_name: fullName,
      phone,
      is_active: true,
    })

  if (profileError) {
    await supabase.from("tenants").delete().eq("id", tenant.id)
    throw new Error(profileError.message)
  }

  await supabase.from("subscriptions").insert({
    tenant_id: tenant.id,
    plan: "trial",
    status: "active",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return { tenantId: tenant.id, slug }
}
