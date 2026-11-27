// Data access. Every Supabase call in the app lives in this file; components
// only call these functions. In guest mode the same functions are served by the
// in-tab store in src/guest/store.ts, so nothing is ever written to Supabase. RLS scopes every read to the signed-in user, and
// invoice/payment writes go through database functions (see the migration).

import { supabase } from '../lib/supabase'
import { guestActivity, guestClients, guestInvoices, guestPayments, guestProfile, guestSample, isGuest } from '../guest/store'
import type {
  Client, ClientInput, Invoice, InvoiceDocumentData, InvoiceDraft, InvoiceEvent, InvoiceItem, InvoiceRow,
  Payment, PaymentMethod, Profile,
} from '../types'

function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

// ── profile ─────────────────────────────────────────────────────────────────
const remote_profileService = {
  async get(): Promise<Profile> {
    return must(await supabase.from('profiles').select('*').single())
  },
  async update(id: string, patch: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
    return must(await supabase.from('profiles').update(patch).eq('id', id).select('*').single())
  },
  async uploadLogo(userId: string, png: Blob): Promise<string> {
    const path = `${userId}/logo-${Date.now()}.png`
    const { error } = await supabase.storage.from('logos').upload(path, png, { contentType: 'image/png', upsert: false })
    if (error) throw error
    return path
  },
  async removeLogo(path: string) {
    await supabase.storage.from('logos').remove([path])
  },
}

// ── clients ─────────────────────────────────────────────────────────────────
const remote_clientService = {
  async list(): Promise<Client[]> {
    return must(await supabase.from('clients').select('*').order('name'))
  },
  async get(id: string): Promise<Client> {
    return must(await supabase.from('clients').select('*').eq('id', id).single())
  },
  async create(input: ClientInput): Promise<Client> {
    return must(await supabase.from('clients').insert(input).select('*').single())
  },
  async update(id: string, input: Partial<ClientInput>): Promise<Client> {
    return must(await supabase.from('clients').update(input).eq('id', id).select('*').single())
  },
  async setArchived(id: string, archived: boolean): Promise<void> {
    must(await supabase.from('clients').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id).select('id'))
  },
  /** Only succeeds when the client has no invoices (FK restrict). */
  async remove(id: string): Promise<void> {
    must(await supabase.from('clients').delete().eq('id', id).select('id'))
  },
}

// ── invoices ────────────────────────────────────────────────────────────────
const remote_invoiceService = {
  async list(): Promise<InvoiceRow[]> {
    return must(await supabase.from('invoice_overview').select('*').order('issue_date', { ascending: false }).order('invoice_number', { ascending: false }))
  },
  async listForClient(clientId: string): Promise<InvoiceRow[]> {
    return must(await supabase.from('invoice_overview').select('*').eq('client_id', clientId).order('issue_date', { ascending: false }))
  },
  async get(id: string): Promise<InvoiceRow> {
    return must(await supabase.from('invoice_overview').select('*').eq('id', id).single())
  },
  async items(id: string): Promise<InvoiceItem[]> {
    return must(await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position'))
  },
  async events(id: string): Promise<InvoiceEvent[]> {
    return must(await supabase.from('invoice_events').select('*').eq('invoice_id', id).order('created_at').order('id'))
  },
  /** Creates or updates; the database assigns the number and computes all totals. */
  async save(draft: InvoiceDraft): Promise<string> {
    return must(await supabase.rpc('save_invoice', { p: draft }))
  },
  async markSent(id: string, channel: 'email' | 'manual', to?: string) {
    must(await supabase.rpc('mark_invoice_sent', { p_invoice: id, p_channel: channel, p_to: to ?? null }))
  },
  async cancel(id: string, reason: string) {
    must(await supabase.rpc('cancel_invoice', { p_invoice: id, p_reason: reason }))
  },
  async deleteDraft(id: string) {
    must(await supabase.rpc('delete_draft_invoice', { p_invoice: id }))
  },
  async duplicate(id: string): Promise<string> {
    return must(await supabase.rpc('duplicate_invoice', { p_invoice: id }))
  },
  async getPublic(token: string): Promise<InvoiceDocumentData | null> {
    return must(await supabase.rpc('get_public_invoice', { p_token: token }))
  },
}

// ── payments ────────────────────────────────────────────────────────────────
const remote_paymentService = {
  async listForInvoice(invoiceId: string): Promise<Payment[]> {
    return must(await supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('paid_on').order('created_at'))
  },
  async listAll(): Promise<Payment[]> {
    return must(await supabase.from('payments').select('*').order('paid_on', { ascending: false }))
  },
  async record(input: { invoiceId: string; amount: number; paidOn: string; method: PaymentMethod; reference: string; notes: string }) {
    return must(await supabase.rpc('record_payment', {
      p_invoice: input.invoiceId, p_amount: input.amount, p_paid_on: input.paidOn,
      p_method: input.method, p_reference: input.reference, p_notes: input.notes,
    }))
  },
  async void(paymentId: string, reason: string) {
    must(await supabase.rpc('void_payment', { p_payment: paymentId, p_reason: reason }))
  },
}

// ── activity ────────────────────────────────────────────────────────────────
const remote_activityService = {
  async recent(limit = 25): Promise<(InvoiceEvent & { invoices: Pick<Invoice, 'invoice_number' | 'currency'> | null })[]> {
    return must(await supabase.from('invoice_events').select('*, invoices(invoice_number, currency)').order('created_at', { ascending: false }).limit(limit))
  },
}

// ── sample data ─────────────────────────────────────────────────────────────
const remote_sampleService = {
  async load() {
    must(await supabase.rpc('load_sample_data'))
  },
  async remove() {
    must(await supabase.rpc('remove_sample_data'))
  },
}

// ── email (server function in api/send-invoice.ts) ─────────────────────────
const remote_emailService = {
  async status(): Promise<{ configured: boolean; from?: string }> {
    try {
      const res = await fetch('/api/send-invoice')
      if (!res.ok) return { configured: false }
      return await res.json()
    } catch {
      return { configured: false }
    }
  },
  async send(input: { invoiceId: string; subject: string; message: string; pdfBase64: string }) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Your session expired. Log in again.')
    const res = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(body.error || 'The email could not be sent.'), { code: '22023' })
    return body as { id: string; to: string }
  },
}

// ── guest dispatch ──────────────────────────────────────────────────────────
/** Same API either way: methods resolve to the guest store while a guest session is active. */
function dual<T extends object>(remote: T, guest: Partial<T>): T {
  return new Proxy(remote, {
    get(target, key) {
      if (isGuest() && key in guest) return (guest as Record<PropertyKey, unknown>)[key]
      return (target as Record<PropertyKey, unknown>)[key]
    },
  })
}

export const profileService = dual(remote_profileService, guestProfile)
export const clientService = dual(remote_clientService, guestClients)
export const invoiceService = dual(remote_invoiceService, guestInvoices)
export const paymentService = dual(remote_paymentService, guestPayments)
export const activityService = dual(remote_activityService, guestActivity as Partial<typeof remote_activityService>)
export const sampleService = dual(remote_sampleService, guestSample)
export const emailService = dual(remote_emailService, {
  // Guests can't send email; the app falls back to copy link / mark as sent.
  async status() {
    return { configured: false }
  },
  async send(): Promise<{ id: string; to: string }> {
    throw Object.assign(new Error('Email is off in guest mode. Create an account to send invoices by email.'), { code: '22023' })
  },
})
