"use client"
import { Suspense } from "react"
import ProductPageClient from "./ProductPageClient"

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid #1E1E2E", borderTopColor:"#F59E0B", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ProductPageClient />
    </Suspense>
  )
}
