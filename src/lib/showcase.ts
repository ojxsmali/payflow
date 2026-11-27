/**
 * The example invoice shown on the public landing page. Its totals come from the
 * same calcInvoice() the editor uses, and its lifecycle uses the real statuses,
 * so the illustration can never drift from how the app actually behaves.
 */
import { calcInvoice } from './money'
import type { InvoiceStatus } from '../types'

export const EXAMPLE_ITEMS = [
  { description: 'Brand identity system', quantityMilli: 1000, unitPrice: 4_800_000 },
  { description: 'Website design — 6 pages', quantityMilli: 6000, unitPrice: 600_000 },
  { description: 'Design QA and handover', quantityMilli: 4000, unitPrice: 150_000 },
]

export const EXAMPLE_TOTALS = calcInvoice({ items: EXAMPLE_ITEMS, discountType: 'percent', discountValue: 500, taxRateBp: 1800 })

/** Two payments that together settle the invoice exactly. */
export const EXAMPLE_PAYMENTS = [
  { amount: 5_000_000, method: 'UPI', when: '14 Nov' },
  { amount: EXAMPLE_TOTALS.total - 5_000_000, method: 'Bank transfer', when: '19 Nov' },
]

export interface LifecycleStep {
  status: InvoiceStatus
  event: string
  when: string
  paid: number
}

export const LIFECYCLE: LifecycleStep[] = [
  { status: 'draft', event: 'Invoice created', when: '3 Nov', paid: 0 },
  { status: 'sent', event: 'Emailed with the PDF attached', when: '4 Nov', paid: 0 },
  { status: 'viewed', event: 'Client opened the invoice link', when: '5 Nov', paid: 0 },
  { status: 'partially_paid', event: `Payment recorded · ${EXAMPLE_PAYMENTS[0].method}`, when: EXAMPLE_PAYMENTS[0].when, paid: EXAMPLE_PAYMENTS[0].amount },
  { status: 'paid', event: `Payment recorded · ${EXAMPLE_PAYMENTS[1].method}`, when: EXAMPLE_PAYMENTS[1].when, paid: EXAMPLE_TOTALS.total },
]

/**
 * The queue of example invoices on the landing page's 3D press. Fictional clients;
 * every total comes from calcInvoice(), the same maths the editor and database use.
 */
const q = (no: string, client: string, status: InvoiceStatus, items: { description: string; quantityMilli: number; unitPrice: number }[], taxRateBp = 1800) => ({
  no,
  client,
  status,
  items,
  total: calcInvoice({ items, discountType: 'percent', discountValue: 0, taxRateBp }).total,
})

export const PRESS_QUEUE = [
  { no: 'INV-0042', client: 'Meridian Design Co.', status: 'viewed' as InvoiceStatus, items: EXAMPLE_ITEMS, total: EXAMPLE_TOTALS.total },
  q('INV-0043', 'Orbit Systems', 'sent', [{ description: 'Landing page build', quantityMilli: 1000, unitPrice: 3_200_000 }, { description: 'CMS setup', quantityMilli: 1000, unitPrice: 900_000 }]),
  q('INV-0044', 'Acme Studio', 'overdue', [{ description: 'Illustration set — 12', quantityMilli: 12000, unitPrice: 250_000 }]),
  q('INV-0045', 'Northwind Foods', 'partially_paid', [{ description: 'Packaging design', quantityMilli: 1000, unitPrice: 5_500_000 }, { description: 'Print proofs', quantityMilli: 3000, unitPrice: 120_000 }]),
  q('INV-0046', 'Kestrel Labs', 'sent', [{ description: 'Product photography — day rate', quantityMilli: 2000, unitPrice: 1_800_000 }]),
  q('INV-0047', 'Lumen & Co.', 'viewed', [{ description: 'Motion graphics — 30s', quantityMilli: 1000, unitPrice: 4_200_000 }]),
  q('INV-0048', 'Fieldnote Press', 'sent', [{ description: 'Editorial layout — 48 pages', quantityMilli: 48000, unitPrice: 45_000 }]),
  q('INV-0049', 'Tidewater Café', 'overdue', [{ description: 'Menu redesign', quantityMilli: 1000, unitPrice: 1_600_000 }, { description: 'Signage files', quantityMilli: 4000, unitPrice: 80_000 }]),
]
export type PressInvoice = (typeof PRESS_QUEUE)[number]
