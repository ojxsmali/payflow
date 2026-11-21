// Validate and normalise an uploaded logo in the browser before it's stored:
// PNG/JPEG/WebP/SVG in, ≤ 5 MB, at least 64px, re-encoded as a PNG no larger
// than 600×240 (PNG is what both the web preview and the PDF renderer accept).

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_INPUT_BYTES = 5 * 1024 * 1024
const MAX_W = 600
const MAX_H = 240

export async function prepareLogo(file: File): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Use a PNG, JPG, WebP or SVG image.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is over 5 MB. Use a smaller file.')

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('That file couldn’t be read as an image.'))
      i.src = url
    })
    const w = img.naturalWidth || MAX_W
    const h = img.naturalHeight || MAX_H
    if (w < 64 && h < 64) throw new Error('The image is too small. Use one at least 64 pixels wide.')
    const scale = Math.min(1, MAX_W / w, MAX_H / h)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('The image couldn’t be processed.')
    if (blob.size > 512 * 1024) throw new Error('The processed logo is still over 512 KB. Try a simpler image.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
