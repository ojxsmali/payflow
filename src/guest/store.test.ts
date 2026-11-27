import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcInvoice } from '../lib/money'
import { todayIn, addDays } from '../lib/dates'
import { createWorkspace, deriveStatus, endGuest, guestInvoices, guestPayments, guestClients, isGuest, startGuest } from './store'
import { invoiceService, paymentService } from '../services'
import { supabase } from '../lib/supabase'

const today = todayIn('Asia/Kolkata')

describe('guest workspace', () => {
  it('prices every sample invoice exactly like the database', () => {
    const d = createWorkspace()
    expect(d.invoices).toHaveLength(12)
    for (const inv of d.invoices) {
      const items = d.items.filter((i) => i.invoice_id === inv.id)
      const expected = calcInvoice({
        items: items.map((i) => ({ quantityMilli: Math.round(i.quantity * 1000), unitPrice: i.unit_price })),
        discountType: inv.discount_type,
        discountValue: inv.discount_value,
        taxRateBp: inv.tax_rate_bp,
      })
      expect(inv.total).toBe(expected.total)
      expect(inv.amount_paid).toBeLessThanOrEqual(inv.total)
    }
    // numbered INV-0001 … INV-0012, next one is 13
    expect(d.invoices.map((i) => i.invoice_number)).toEqual(Array.from({ length: 12 }, (_, i) => `INV-${String(i + 1).padStart(4, '0')}`))
    expect(d.profile.next_invoice_seq).toBe(13)
  })

  it('derives status with the view’s precedence', () => {
    const base = { total: 100, amount_paid: 0, due_date: addDays(today, 5) }
    expect(deriveStatus({ ...base, state: 'cancelled', amount_paid: 100 }, today)).toBe('cancelled')
    expect(deriveStatus({ ...base, state: 'draft' }, today)).toBe('draft')
    expect(deriveStatus({ ...base, state: 'sent', amount_paid: 100, due_date: addDays(today, -9) }, today)).toBe('paid')
    expect(deriveStatus({ ...base, state: 'viewed', amount_paid: 40, due_date: addDays(today, -1) }, today)).toBe('overdue')
    expect(deriveStatus({ ...base, state: 'viewed', amount_paid: 40 }, today)).toBe('partially_paid')
    expect(deriveStatus({ ...base, state: 'viewed' }, today)).toBe('viewed')
    expect(deriveStatus({ ...base, state: 'sent' }, today)).toBe('sent')
  })
})

describe('guest session', () => {
  beforeEach(() => {
    endGuest()
    startGuest()
  })
  afterEach(() => endGuest())

  it('runs the invoice lifecycle with the database’s rules', async () => {
    const [client] = await guestClients.list()
    const id = await guestInvoices.save({
      client_id: client.id, issue_date: today, due_date: addDays(today, 15), currency: 'INR',
      discount_type: 'percent', discount_value: 500, tax_label: 'GST', tax_rate_bp: 1800, payment_terms: '', notes: '',
      items: [{ description: 'Design', quantity: 2, unit_price: 1_000_000 }],
    })
    let inv = await guestInvoices.get(id)
    expect(inv.invoice_number).toBe('INV-0013')
    expect(inv.total).toBe(2_242_000) // 20,000 − 5% = 19,000 + 18% GST
    expect(inv.status).toBe('draft')

    await expect(guestPayments.record({ invoiceId: id, amount: 100, paidOn: today, method: 'upi', reference: '', notes: '' })).rejects.toThrow('Send the invoice')
    await guestInvoices.markSent(id, 'manual')
    await expect(guestPayments.record({ invoiceId: id, amount: inv.total + 1, paidOn: today, method: 'upi', reference: '', notes: '' })).rejects.toThrow('more than the balance')
    await expect(guestPayments.record({ invoiceId: id, amount: 100, paidOn: addDays(today, 1), method: 'upi', reference: '', notes: '' })).rejects.toThrow('future')

    const pay = await guestPayments.record({ invoiceId: id, amount: inv.total, paidOn: today, method: 'upi', reference: '', notes: '' })
    inv = await guestInvoices.get(id)
    expect(inv.status).toBe('paid')
    expect((await guestInvoices.events(id)).map((e) => e.kind)).toEqual(['created', 'sent', 'payment_recorded', 'paid'])
    await expect(guestInvoices.cancel(id, 'x')).rejects.toThrow('Void the recorded payments')
    await expect(guestInvoices.save({ ...inv, id, items: [{ description: 'x', quantity: 1, unit_price: 1 }] })).rejects.toThrow('can no longer be edited')

    await guestPayments.void(pay, 'Bounced')
    inv = await guestInvoices.get(id)
    expect(inv.amount_paid).toBe(0)
    expect(inv.status).toBe('sent')
    await guestInvoices.cancel(id, 'Client cancelled')
    expect((await guestInvoices.get(id)).status).toBe('cancelled')
    await expect(guestInvoices.deleteDraft(id)).rejects.toThrow('Only drafts')
  })

  it('opens a client link once and marks it viewed', async () => {
    const sent = (await guestInvoices.list()).find((i) => i.status === 'sent')!
    expect(await guestInvoices.getPublic('not-a-token')).toBeNull()
    const doc = await guestInvoices.getPublic(sent.public_token)
    expect(doc?.invoice_number).toBe(sent.invoice_number)
    expect((await guestInvoices.get(sent.id)).state).toBe('viewed')
  })

  it('serves the app’s services from the tab and never calls Supabase', async () => {
    const from = vi.spyOn(supabase, 'from')
    const rpc = vi.spyOn(supabase, 'rpc')
    expect(isGuest()).toBe(true)
    const list = await invoiceService.list()
    expect(list).toHaveLength(12)
    const target = list.find((i) => i.status === 'sent')!
    await paymentService.record({ invoiceId: target.id, amount: 1000, paidOn: today, method: 'cash', reference: '', notes: '' })
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    endGuest()
    expect(isGuest()).toBe(false)
  })

  it('starts fresh after leaving', async () => {
    const [first] = await guestInvoices.list()
    await guestInvoices.deleteDraft((await guestInvoices.list()).find((i) => i.status === 'draft')!.id)
    endGuest()
    startGuest()
    expect(await guestInvoices.list()).toHaveLength(12)
    expect(first).toBeTruthy()
  })
})
