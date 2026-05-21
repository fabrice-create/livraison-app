// lib/imageUtils.ts
// Compression + crop carré 1:1 automatique
// Optimal pour Instagram, Facebook, page produit

export async function compressImage(
  file: File,
  size = 800,      // taille du carré en pixels
  quality = 0.82   // qualité JPEG
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext("2d")
        if (!ctx) { resolve(file); return }

        // Fond blanc
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, size, size)

        // Crop centré carré 1:1
        const srcSize = Math.min(img.width, img.height)
        const srcX = (img.width - srcSize) / 2
        const srcY = (img.height - srcSize) / 2

        ctx.drawImage(
          img,
          srcX, srcY, srcSize, srcSize,  // source : carré centré
          0, 0, size, size               // destination : canvas carré
        )

        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return }
            const compressed = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".jpg"),
              { type: "image/jpeg", lastModified: Date.now() }
            )
            resolve(compressed)
          },
          "image/jpeg",
          quality
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}
