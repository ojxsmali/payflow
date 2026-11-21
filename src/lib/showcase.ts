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
