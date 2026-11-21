// Browser entry for PDF generation. Loaded with dynamic import() only when the
// user downloads or sends, so the ~500 KB renderer never weighs on page loads.
import { createElement, type ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { pdf } from '@react-pdf/renderer'
import sans400 from '../../../assets/pdf-fonts/plex-sans-400.ttf?url'
import sans500 from '../../../assets/pdf-fonts/plex-sans-500.ttf?url'
import sans600 from '../../../assets/pdf-fonts/plex-sans-600.ttf?url'
import sansExt400 from '../../../assets/pdf-fonts/plex-sans-ext-400.ttf?url'
import sansExt600 from '../../../assets/pdf-fonts/plex-sans-ext-600.ttf?url'
import mono400 from '../../../assets/pdf-fonts/plex-mono-400.ttf?url'
import serif400 from '../../../assets/pdf-fonts/newsreader-400.ttf?url'
import { InvoicePdfDocument, registerPdfFonts } from './InvoicePdf'
import type { InvoiceDocumentData } from '../../../types'

registerPdfFonts({ sans400, sans500, sans600, sansExt400, sansExt600, mono400, serif400 })

/** react-pdf only embeds PNG/JPEG; fetch the logo up front so a broken image can't fail the whole PDF. */
async function safeLogo(url?: string | null) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function renderInvoicePdf(data: InvoiceDocumentData, logoUrl?: string | null): Promise<Blob> {
  const logo = await safeLogo(logoUrl)
  return pdf(createElement(InvoicePdfDocument, { data, logoUrl: logo }) as unknown as ReactElement<DocumentProps>).toBlob()
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}
