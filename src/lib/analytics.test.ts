import { describe, expect, it } from 'vitest'
import { monthlySeries, revenueByClient, summarize } from './analytics'
import type { InvoiceRow, InvoiceStatus } from '../types'

let n = 0
function inv(p: Partial<InvoiceRow> & { status: InvoiceStatus; total: number }): InvoiceRow {
  n++
  const amount_paid = p.amount_paid ?? (p.status === 'paid' ? p.total : 0)
  return {
    id: `i${n}`, user_id: 'u', client_id: p.client_id ?? 'c1', client_name: p.client_name ?? 'Acme', client_company: '', client_email: '',
    invoice_number: `INV-${n}`, issue_date: p.issue_date ?? '2026-11-01', due_date: '2026-11-15', currency: p.currency ?? 'INR',
    discount_type: 'none', discount_value: 0, tax_label: 'GST', tax_rate_bp: 0, subtotal: p.total, discount_amount: 0, tax_amount: 0,
    total: p.total, amount_paid, balance_due: p.total - amount_paid, state: 'sent', sent_at: null, viewed_at: null,
    paid_at: p.paid_at ?? null, cancelled_at: null, payment_terms: '', notes: '', public_token: 'x', is_sample: false,
    created_at: '', updated_at: '', status: p.status, days_until_due: p.days_until_due ?? 5,
  }
}

describe('summarize', () => {
  it('returns safe empty values with no data', () => {
    const s = summarize([], [], 'INR', '2026-11-21')
    expect(s.collectionRate).toBeNull()
    expect(s.averageInvoice).toBeNull()
    expect(s.monthChange).toBeNull()
    expect(s.outstanding).toBe(0)
  })

  it('excludes drafts and cancelled invoices from every total', () => {
    const rows = [
      inv({ status: 'draft', total: 1000 }),
      inv({ status: 'cancelled', total: 5000 }),
      inv({ status: 'sent', total: 2000, days_until_due: 3 }),
      inv({ status: 'paid', total: 3000, paid_at: '2026-11-11T10:00:00Z', issue_date: '2026-11-01' }),
      inv({ status: 'overdue', total: 4000, amount_paid: 1000, days_until_due: -4 }),
    ]
    const pays = [
      { invoice_id: rows[3].id, amount: 3000, paid_on: '2026-11-11', voided_at: null },
      { invoice_id: rows[4].id, amount: 1000, paid_on: '2026-10-20', voided_at: null },
      { invoice_id: rows[4].id, amount: 999, paid_on: '2026-11-02', voided_at: '2026-11-03' },
    ]
    const s = summarize(rows, pays, 'INR', '2026-11-21')
    expect(s.invoicedTotal).toBe(9000)
    expect(s.issuedCount).toBe(3)
    expect(s.outstanding).toBe(5000)
    expect(s.overdue).toBe(3000)
    expect(s.overdueCount).toBe(1)
    expect(s.dueSoon).toBe(2000)
    expect(s.draftCount).toBe(1)
    expect(s.collectionRate).toBeCloseTo((4000 / 9000) * 100)
    expect(s.averageInvoice).toBe(3000)
    expect(s.averageDaysToPay).toBe(10)
    expect(s.collectedThisMonth).toBe(3000) // voided payment ignored
    expect(s.collectedLastMonth).toBe(1000)
    expect(s.monthChange).toBeCloseTo(200)
  })

  it('keeps currencies apart and reports the others', () => {
    const s = summarize([inv({ status: 'sent', total: 100, currency: 'USD' }), inv({ status: 'sent', total: 700 })], [], 'INR', '2026-11-21')
    expect(s.outstanding).toBe(700)
    expect(s.otherCurrencies).toEqual(['USD'])
  })
})

describe('series and clients', () => {
  it('buckets collected by payment month and invoiced by issue month', () => {
    const a = inv({ status: 'paid', total: 500, issue_date: '2026-10-30' })
    const series = monthlySeries([a], [{ invoice_id: a.id, amount: 500, paid_on: '2026-11-02', voided_at: null }], 'INR', ['2026-10', '2026-11'])
    expect(series).toEqual([
      { month: '2026-10', collected: 0, invoiced: 500 },
      { month: '2026-11', collected: 500, invoiced: 0 },
    ])
  })
  it('ranks clients by money collected', () => {
    const a = inv({ status: 'paid', total: 100, client_id: 'a', client_name: 'A' })
    const b = inv({ status: 'paid', total: 900, client_id: 'b', client_name: 'B' })
    const c = inv({ status: 'sent', total: 50, client_id: 'a', client_name: 'A' })
    const r = revenueByClient([a, b, c], [
      { invoice_id: a.id, amount: 100, paid_on: '2026-11-01', voided_at: null },
      { invoice_id: b.id, amount: 900, paid_on: '2026-11-01', voided_at: null },
    ], 'INR')
    expect(r.map((x) => x.name)).toEqual(['B', 'A'])
    expect(r[1]).toMatchObject({ invoiced: 150, outstanding: 50, invoiceCount: 2 })
  })
})
