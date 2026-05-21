"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/app/lib/supabase"

interface Notification {
  id: string
  tenant_id: string
  user_id?: string
  title: string
  body: string
  type: string
  read: boolean
  data?: Record<string, unknown>
  created_at: string
}

export function useNotifications(tenantId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [newOrderAlert, setNewOrderAlert] = useState<string>("")

  const loadNotifications = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setUnreadCount((data || []).filter((n: Notification) => !n.read).length)
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    loadNotifications()

    // Écoute temps réel nouvelles commandes
    const channel = supabase
      .channel(`orders_realtime_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          const order = payload.new as Record<string, unknown>
          const customerName = String(order.customer_name || "Client")
          const amount = Number(order.amount || 0)

          // Créer notification
          await supabase.from("notifications").insert({
            tenant_id: tenantId,
            title: "🛒 Nouvelle commande !",
            body: `${customerName} — ${amount.toLocaleString("fr-FR")} FCFA`,
            type: "nouvelle_commande",
            read: false,
            data: { order_id: order.id, customer_name: customerName, amount },
          })

          // Alerte visuelle
          setNewOrderAlert(`${customerName} — ${amount.toLocaleString("fr-FR")} FCFA`)
          setTimeout(() => setNewOrderAlert(""), 5000)

          // Son
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.setValueAtTime(880, ctx.currentTime)
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
          } catch {}

          // Notification navigateur
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("🛒 Nouvelle commande !", {
              body: `${customerName} — ${amount.toLocaleString("fr-FR")} FCFA`,
            })
          }

          loadNotifications()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenantId, loadNotifications])

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("tenant_id", tenantId)
      .eq("read", false)
    setUnreadCount(0)
    loadNotifications()
  }

  const requestPermission = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission()
    }
  }

  return { notifications, unreadCount, newOrderAlert, markAllRead, requestPermission }
}
