"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/app/lib/supabase"

interface Notification {
  id: string
  type: "nouvelle_commande" | "commande_confirmee" | "stock_bas"
  message: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

export function useNotifications(tenantId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [newOrderAlert, setNewOrderAlert] = useState(false)

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

    // Écoute temps réel des nouvelles commandes
    const channel = supabase
      .channel(`orders_${tenantId}`)
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

          // Créer notification dans la base
          await supabase.from("notifications").insert({
            tenant_id: tenantId,
            type: "nouvelle_commande",
            message: `Nouvelle commande de ${order.customer_name} — ${Number(order.amount).toLocaleString("fr-FR")} FCFA`,
            data: { order_id: order.id, customer_name: order.customer_name, amount: order.amount },
            read: false,
          })

          // Alerte sonore + visuelle
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)

          // Son notification
          try {
            const ctx = new AudioContext()
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)
            oscillator.frequency.setValueAtTime(880, ctx.currentTime)
            oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.3)
          } catch {}

          // Notification navigateur
          if (Notification.permission === "granted") {
            new Notification("🛒 Nouvelle commande !", {
              body: `${order.customer_name} — ${Number(order.amount).toLocaleString("fr-FR")} FCFA`,
              icon: "/favicon.ico",
            })
          }

          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission()
    }
  }

  return { notifications, unreadCount, newOrderAlert, markAllRead, requestPermission, loadNotifications }
}
