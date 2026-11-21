import { describe, expect, it } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import { InvoicePdfDocument, registerPdfFonts } from './InvoicePdf'
import { calcInvoice } from '../../../lib/money'
import type { InvoiceDocumentData } from '../../../types'

const dir = fileURLToPath(new URL('../../../assets/pdf-fonts/', import.meta.url))
registerPdfFonts({
  sans400: `${dir}plex-sans-400.ttf`, sans500: `${dir}plex-sans-500.ttf`, sans600: `${dir}plex-sans-600.ttf`,
  sansExt400: `${dir}plex-sans-ext-400.ttf`, sansExt600: `${dir}plex-sans-ext-600.ttf`,
  mono400: `${dir}plex-mono-400.ttf`, serif400: `${dir}newsreader-400.ttf`,
})

function sample(n: number, longText = false): InvoiceDocumentData {
  const items = Array.from({ length: n }, (_, i) => ({
    description: longText && i % 3 === 0
      ? `Discovery workshop, stakeholder interviews and synthesis for the onboarding redesign — including two rounds of revisions on the journey map, a prioritised backlog, and a written summary for the leadership team (item ${i + 1})`
      : `Design and development, milestone ${i + 1}`,
    quantity: (i % 4) + 1,
    unit_price: 250000 + i * 12345,
  }))
  const c = calcInvoice({ items: items.map((x) => ({ quantityMilli: x.quantity * 1000, unitPrice: x.unit_price })), discountType: 'percent', discountValue: 500, taxRateBp: 1800 })
  return {
    invoice_number: `INV-00${n}`, issue_date: '2026-11-18', due_date: '2026-12-03', currency: 'INR',
    discount_type: 'percent', discount_value: 500, tax_label: 'GST', tax_rate_bp: 1800,
    subtotal: c.subtotal, discount_amount: c.discount, tax_amount: c.tax, total: c.total, amount_paid: n === 5 ? 1000000 : 0,
    status: n === 5 ? 'partially_paid' : 'sent', payment_terms: 'Payment due within 15 days. Late payments may attract 1.5% monthly interest.',
    notes: 'Thank you for the work together.',
    from: { name: 'Asha Rao', business_name: 'Asha Rao Studio', email: 'asha@studio.example', phone: '+91 98200 00000', address: '12 Lane, Koregaon Park', city: 'Pune', country: 'India', website: 'asharao.example', tax_id: '27ABCDE1234F1Z5', logo_path: null, payment_instructions: 'UPI: asha@okbank\nBank: HDFC · A/c 5010 0000 0000 · IFSC HDFC0000123' },
    to: { name: 'Acme Studio', company_name: 'Acme Studio LLP', email: 'accounts@acme.example', address: '4th floor, Baner Road', city: 'Pune', country: 'India', tax_id: '' },
    items: items.map((x, i) => ({ ...x, amount: c.lineAmounts[i] })),
  }
}

const pages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length

describe('invoice PDF', () => {
  const out = process.env.PDF_OUT
  if (out) mkdirSync(out, { recursive: true })
  for (const [n, long] of [[1, false], [5, false], [24, true]] as const) {
    it(`renders ${n} item(s)${long ? ' with long descriptions' : ''}`, async () => {
      const buf = await renderToBuffer(<InvoicePdfDocument data={sample(n, long)} />)
      if (out) writeFileSync(`${out}/invoice-${n}.pdf`, buf)
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
      if (n >= 24) expect(pages(buf)).toBeGreaterThan(1)
      if (n === 1) expect(pages(buf)).toBe(1)
      expect(buf.toString('latin1')).not.toContain('WOFF')
    }, 30000)
  }
})
