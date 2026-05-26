"use client"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"

type Props = {
  value: string
  onChange: (html: string) => void
  tenantId?: string
}

// Convertit texte brut en HTML structuré si nécessaire
function toHTML(val: string): string {
  if (!val) return ""
  // Déjà du HTML — contient des balises
  if (/<[a-z][\s\S]*>/i.test(val)) return val
  // Texte brut — chaque ligne devient un <p>
  return val.split("\n")
    .map(line => line.trim() ? `<p>${line}</p>` : "<p></p>")
    .join("")
}

const BTN = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) => {
  const { active, children, style, ...rest } = props
  return (
    <button
      type="button"
      {...rest}
      style={{
        padding: "5px 9px",
        borderRadius: 7,
        border: "none",
        background: active ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)",
        color: active ? "#F59E0B" : "rgba(255,255,255,0.7)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        lineHeight: 1,
        ...style
      }}
    >
      {children}
    </button>
  )
}

export default function RichEditor({ value, onChange, tenantId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Écris la description de ton produit ici..." }),
    ],
    content: toHTML(value),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: [
          "min-height:320px",
          "padding:20px",
          "outline:none",
          "font-size:15px",
          "line-height:1.8",
          "color:rgba(248,248,252,0.88)",
        ].join(";"),
      },
    },
  })

  // Sync external value changes
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== toHTML(value)) {
      editor.commands.setContent(toHTML(value), false)
    }
  }, [value])

  const uploadImage = async (file: File) => {
    if (uploadingRef.current) return
    uploadingRef.current = true
    try {
      const ext = file.name.split(".").pop()
      const fileName = `products/${tenantId || "global"}/desc-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from("shipivo-images")
        .upload(fileName, file, { upsert: true, contentType: file.type })
      if (error) { alert("Erreur upload: " + error.message); return }
      const { data } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
      editor?.chain().focus().setImage({ src: data.publicUrl }).run()
    } catch { alert("Erreur upload image") }
    uploadingRef.current = false
  }

  if (!editor) return null

  const tb = editor

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14,
      overflow: "hidden",
      fontFamily: "DM Sans, Inter, sans-serif"
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4, padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(0,0,0,0.2)"
      }}>
        {/* Titres */}
        <BTN active={tb.isActive("heading", { level: 1 })} onClick={() => tb.chain().focus().toggleHeading({ level: 1 }).run()}>H1</BTN>
        <BTN active={tb.isActive("heading", { level: 2 })} onClick={() => tb.chain().focus().toggleHeading({ level: 2 }).run()}>H2</BTN>
        <BTN active={tb.isActive("heading", { level: 3 })} onClick={() => tb.chain().focus().toggleHeading({ level: 3 }).run()}>H3</BTN>

        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Formatage */}
        <BTN active={tb.isActive("bold")} onClick={() => tb.chain().focus().toggleBold().run()}><strong>G</strong></BTN>
        <BTN active={tb.isActive("italic")} onClick={() => tb.chain().focus().toggleItalic().run()}><em>I</em></BTN>
        <BTN active={tb.isActive("underline")} onClick={() => tb.chain().focus().toggleUnderline().run()}><span style={{ textDecoration: "underline" }}>S</span></BTN>
        <BTN active={tb.isActive("strike")} onClick={() => tb.chain().focus().toggleStrike().run()}><span style={{ textDecoration: "line-through" }}>B</span></BTN>

        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Alignement */}
        <BTN active={tb.isActive({ textAlign: "left" })} onClick={() => tb.chain().focus().setTextAlign("left").run()}>⬅</BTN>
        <BTN active={tb.isActive({ textAlign: "center" })} onClick={() => tb.chain().focus().setTextAlign("center").run()}>⬛</BTN>
        <BTN active={tb.isActive({ textAlign: "right" })} onClick={() => tb.chain().focus().setTextAlign("right").run()}>➡</BTN>

        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Listes */}
        <BTN active={tb.isActive("bulletList")} onClick={() => tb.chain().focus().toggleBulletList().run()}>• Liste</BTN>
        <BTN active={tb.isActive("orderedList")} onClick={() => tb.chain().focus().toggleOrderedList().run()}>1. Liste</BTN>

        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Lien */}
        <BTN
          active={tb.isActive("link")}
          onClick={() => {
            if (tb.isActive("link")) { tb.chain().focus().unsetLink().run(); return }
            const url = prompt("URL du lien:")
            if (url) tb.chain().focus().setLink({ href: url }).run()
          }}
        >🔗 Lien</BTN>

        {/* Image upload */}
        <BTN onClick={() => fileRef.current?.click()}>🖼 Image</BTN>
        <input
          ref={fileRef} type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = "" }}
        />

        {/* Image URL */}
        <BTN onClick={() => {
          const url = prompt("URL de l'image:")
          if (url) editor.chain().focus().setImage({ src: url }).run()
        }}>🔗 Image URL</BTN>

        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Effacer */}
        <BTN onClick={() => tb.chain().focus().clearNodes().unsetAllMarks().run()} style={{ color: "rgba(248,113,113,0.8)" }}>✕ Effacer</BTN>
      </div>

      {/* ── Zone d'édition ── */}
      <EditorContent editor={editor} />

      {/* ── Styles CSS pour le rendu dans l'éditeur ── */}
      <style>{`
        .tiptap h1 { font-size: 28px; font-weight: 800; color: #F8F8FC; margin: 20px 0 10px; font-family: 'Syne', sans-serif; }
        .tiptap h2 { font-size: 22px; font-weight: 700; color: #F8F8FC; margin: 18px 0 8px; font-family: 'Syne', sans-serif; }
        .tiptap h3 { font-size: 18px; font-weight: 700; color: rgba(248,248,252,0.9); margin: 14px 0 6px; }
        .tiptap p { margin: 0 0 12px; }
        .tiptap p:last-child { margin-bottom: 0; }
        .tiptap strong { color: #F8F8FC; font-weight: 700; }
        .tiptap em { font-style: italic; }
        .tiptap a { color: #F59E0B; text-decoration: underline; }
        .tiptap ul { padding-left: 20px; margin: 8px 0 12px; }
        .tiptap ol { padding-left: 20px; margin: 8px 0 12px; }
        .tiptap li { margin-bottom: 4px; }
        .tiptap img { max-width: 100%; border-radius: 12px; margin: 12px 0; display: block; }
        .tiptap blockquote { border-left: 3px solid #F59E0B; padding-left: 16px; color: rgba(248,248,252,0.6); margin: 12px 0; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: rgba(255,255,255,0.25); pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  )
}
