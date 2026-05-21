"use client"

import { useState, useRef } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", successBg: "rgba(74,222,128,0.06)",
  info: "#60A5FA", warning: "#FB923C",
}

interface ImportRow {
  customer_name: string
  phone: string
  product: string
  quantity: number
  amount: number
  city: string
  address?: string
  source?: string
  note?: string
  status: string
  error?: string
}

interface Props { tenantId: string }

const TEMPLATE_CSV = `customer_name,phone,product,quantity,amount,city,address,source,note
Kofi Mensah,+22890000001,THERAWOLF Balm 50ml,1,15000,Lomé,Adidogomé,whatsapp,
Ama Koffi,+22891000002,THERAWOLF Balm 50ml,2,30000,Lomé,Bè,facebook,Livraison rapide`

export default function ImportView({ tenantId }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState(0)
  const [done, setDone] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload")
  const fileRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split("\n")
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || "" })
      return {
        customer_name: row["customer_name"] || row["nom"] || row["name"] || "",
        phone: row["phone"] || row["telephone"] || row["tel"] || "",
        product: row["product"] || row["produit"] || "",
        quantity: Number(row["quantity"] || row["quantite"] || row["qte"] || 1),
        amount: Number(row["amount"] || row["montant"] || row["prix"] || 0),
        city: row["city"] || row["ville"] || "Lomé",
        address: row["address"] || row["adresse"] || "",
        source: row["source"] || "import",
        note: row["note"] || "",
        status: "En attente",
      }
    }).filter(r => r.customer_name && r.phone)
  }

  const parseExcel = async (file: File): Promise<ImportRow[]> => {
    // Lire comme CSV si extension .csv
    if (file.name.endsWith(".csv")) {
      const text = await file.text()
      return parseCSV(text)
    }
    // Pour xlsx, on convertit en texte basique
    const text = await file.text()
    return parseCSV(text)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const parsed = await parseExcel(file)

    // Valider chaque ligne
    const validated = parsed.map(row => ({
      ...row,
      error: !row.customer_name ? "Nom manquant" :
             !row.phone ? "Téléphone manquant" :
             !row.amount || row.amount <= 0 ? "Montant invalide" : undefined
    }))

    setRows(validated)
    setStep("preview")
  }

  const handleImport = async () => {
    setImporting(true)
    let success = 0
    let fail = 0

    for (const row of rows) {
      if (row.error) { fail++; continue }
      const { error } = await supabase.from("orders").insert({
        tenant_id: tenantId,
        customer_name: row.customer_name,
        phone: row.phone,
        product: row.product,
        quantity: row.quantity,
        amount: row.amount,
        city: row.city,
        address: row.address || null,
        source: row.source || "import",
        note: row.note || null,
        status: "En attente",
      })
      if (error) fail++
      else success++
    }

    setImported(success)
    setErrors(fail)
    setImporting(false)
    setStep("done")
  }

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template_commandes_shipivo.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setRows([]); setStep("upload")
    setImported(0); setErrors(0); setDone(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const validRows = rows.filter(r => !r.error)
  const errorRows = rows.filter(r => r.error)

  return (
    <div style={{ padding: "0 0 40px 0" }}>
      <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 6px 0" }}>Import commandes</h2>
      <p style={{ color: S.text3, fontSize: 13, margin: "0 0 24px 0" }}>Importe tes commandes depuis Excel ou CSV</p>

      {/* ÉTAPE 1 — Upload */}
      {step === "upload" && (
        <>
          {/* Template */}
          <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <p style={{ color: S.info, fontSize: 13, fontWeight: 600, margin: "0 0 6px 0" }}>📋 Colonnes requises</p>
            <p style={{ color: S.text2, fontSize: 12, margin: "0 0 10px 0", lineHeight: 1.6 }}>
              <strong>customer_name</strong>, <strong>phone</strong>, <strong>product</strong>, <strong>quantity</strong>, <strong>amount</strong>, city, address, source, note
            </p>
            <button onClick={downloadTemplate} style={{ background: S.info, border: "none", borderRadius: 8, padding: "8px 14px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ⬇️ Télécharger le modèle CSV
            </button>
          </div>

          {/* Zone upload */}
          <div onClick={() => fileRef.current?.click()} style={{
            border: `2px dashed ${S.border}`, borderRadius: 16, padding: "48px 20px",
            textAlign: "center", cursor: "pointer", background: S.card,
            transition: "border-color 0.2s",
          }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = S.gold }}
            onDragLeave={e => { e.currentTarget.style.borderColor = S.border }}
            onDrop={async e => {
              e.preventDefault()
              e.currentTarget.style.borderColor = S.border
              const file = e.dataTransfer.files[0]
              if (file) {
                const parsed = await parseExcel(file)
                const validated = parsed.map(r => ({
                  ...r,
                  error: !r.customer_name ? "Nom manquant" : !r.phone ? "Téléphone manquant" : !r.amount ? "Montant invalide" : undefined
                }))
                setRows(validated); setStep("preview")
              }
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <p style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: "0 0 6px 0" }}>Clique ou glisse ton fichier ici</p>
            <p style={{ color: S.text3, fontSize: 13, margin: 0 }}>Formats acceptés : CSV, Excel (.xlsx)</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
        </>
      )}

      {/* ÉTAPE 2 — Prévisualisation */}
      {step === "preview" && (
        <>
          {/* Résumé */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: S.success, fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>{validRows.length}</p>
              <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>Commandes prêtes à importer</p>
            </div>
            <div style={{ background: errorRows.length > 0 ? S.dangerBg : S.card, border: `1px solid ${errorRows.length > 0 ? "rgba(248,113,113,0.2)" : S.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: errorRows.length > 0 ? S.danger : S.text3, fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>{errorRows.length}</p>
              <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>Lignes avec erreurs</p>
            </div>
          </div>

          {/* Table preview */}
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}` }}>
              <p style={{ color: S.text2, fontSize: 12, fontWeight: 600, margin: 0 }}>PRÉVISUALISATION ({rows.length} lignes)</p>
            </div>
            <div style={{ overflowX: "auto" as const, maxHeight: 300, overflowY: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.card2 }}>
                    {["Statut", "Nom", "Téléphone", "Produit", "Qté", "Montant", "Ville"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, color: S.text3, fontWeight: 600, whiteSpace: "nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${S.border}`, background: row.error ? "rgba(248,113,113,0.04)" : "transparent" }}>
                      <td style={{ padding: "8px 12px" }}>
                        {row.error
                          ? <span style={{ color: S.danger, fontSize: 11 }}>⚠️ {row.error}</span>
                          : <span style={{ color: S.success }}>✓</span>}
                      </td>
                      <td style={{ padding: "8px 12px", color: S.text }}>{row.customer_name}</td>
                      <td style={{ padding: "8px 12px", color: S.text2 }}>{row.phone}</td>
                      <td style={{ padding: "8px 12px", color: S.text2 }}>{row.product}</td>
                      <td style={{ padding: "8px 12px", color: S.text2 }}>{row.quantity}</td>
                      <td style={{ padding: "8px 12px", color: S.gold, fontWeight: 700 }}>{Number(row.amount).toLocaleString("fr-FR")} F</td>
                      <td style={{ padding: "8px 12px", color: S.text2 }}>{row.city}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={reset} style={{ flex: 1, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px", color: S.text2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              ← Changer le fichier
            </button>
            <button onClick={handleImport} disabled={importing || validRows.length === 0}
              style={{ flex: 2, background: importing ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 700, cursor: importing ? "not-allowed" : "pointer" }}>
              {importing ? `Import en cours... ${imported}/${validRows.length}` : `✅ Importer ${validRows.length} commandes`}
            </button>
          </div>
        </>
      )}

      {/* ÉTAPE 3 — Résultat */}
      {step === "done" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h3 style={{ color: S.text, fontSize: 20, fontWeight: 700, margin: "0 0 8px 0" }}>Import terminé !</h3>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: S.successBg, border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "16px 24px" }}>
              <p style={{ color: S.success, fontSize: 28, fontWeight: 800, margin: "0 0 4px 0" }}>{imported}</p>
              <p style={{ color: S.text3, fontSize: 13, margin: 0 }}>importées</p>
            </div>
            {errors > 0 && (
              <div style={{ background: S.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "16px 24px" }}>
                <p style={{ color: S.danger, fontSize: 28, fontWeight: 800, margin: "0 0 4px 0" }}>{errors}</p>
                <p style={{ color: S.text3, fontSize: 13, margin: 0 }}>erreurs</p>
              </div>
            )}
          </div>
          <button onClick={reset} style={{ background: `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "12px 24px", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Importer un autre fichier
          </button>
        </div>
      )}
    </div>
  )
}
