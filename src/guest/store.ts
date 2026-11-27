/**
 * Guest mode: the whole PayFlow backend, in the browser tab.
 *
 * "Continue as guest" opens the full app on a realistic sample workspace with no
 * account and no network writes. Everything lives in sessionStorage — it survives
 * a refresh, disappears when the tab closes, and is never sent to Supabase.
 *
 * The functions below mirror the database exactly (supabase/migrations):
 * status precedence, invoice numbering, server-side totals (calcInvoice's rules),
 * payment checks, voids, cancellations and the activity log. store.test.ts keeps
 * them honest.
 */
import { addDays, daysBetween, todayIn } from '../lib/dates'
import { lineAmount } from '../lib/money'
import type {
  Client, ClientInput, Invoice, InvoiceDocumentData, InvoiceDraft, InvoiceEvent, InvoiceItem, InvoiceRow,
  InvoiceStatus, EventKind, Payment, PaymentMethod, Profile,
} from '../types'

const FLAG = 'pf-guest'
const DB_KEY = 'pf-guest-db'

interface GuestDb {
  profile: Profile
  clients: Client[]
  invoices: Invoice[]
  items: InvoiceItem[]
  payments: Payment[]
  events: InvoiceEvent[]
  nextEventId: number
}

/* ───────────── session plumbing ───────────── */

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

let memo: GuestDb | null = null
let memoryFlag = false // fallback when sessionStorage is blocked

export function isGuest(): boolean {
  const s = storage()
  try {
    return s ? s.getItem(FLAG) === '1' : memoryFlag
  } catch {
    return memoryFlag
  }
}

function db(): GuestDb {
  if (memo) return memo
  const s = storage()
  try {
    const raw = s?.getItem(DB_KEY)
    if (raw) return (memo = JSON.parse(raw) as GuestDb)
  } catch {
    /* fall through to a fresh workspace */
  }
  memo = createWorkspace()
  persist()
  return memo
}

function persist() {
  try {
    storage()?.setItem(DB_KEY, JSON.stringify(memo))
  } catch {
    /* quota or blocked: the in-memory copy still works for this page */
  }
}

/** Start (or resume) a guest session with a fresh sample workspace. */
export function startGuest(): Profile {
  memoryFlag = true
  try {
    storage()?.setItem(FLAG, '1')
  } catch {
    /* memory only */
  }
  return clone(db().profile)
}

/** Throw everything away. */
export function endGuest() {
  memoryFlag = false
  memo = null
  try {
    storage()?.removeItem(FLAG)
    storage()?.removeItem(DB_KEY)
  } catch {
    /* nothing to clear */
  }
}

/* ───────────── helpers ───────────── */

const fail = (message: string, code = '22023') => Object.assign(new Error(message), { code })
const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `g-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
function token48() {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}
const nowIso = () => new Date().toISOString()
const today = (d: GuestDb) => todayIn(d.profile.timezone)
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function log(d: GuestDb, invoiceId: string, kind: EventKind, detail: Record<string, unknown> = {}, at = nowIso()) {
  d.events.push({ id: d.nextEventId++, invoice_id: invoiceId, kind, detail, created_at: at })
}

/** pf_recompute_invoice */
function recompute(d: GuestDb, inv: Invoice) {
  const items = d.items.filter((i) => i.invoice_id === inv.id)
  const sub = items.reduce((a, i) => a + i.amount, 0)
  const disc = inv.discount_type === 'percent' ? Math.round((sub * inv.discount_value) / 10000) : inv.discount_type === 'fixed' ? Math.min(inv.discount_value, sub) : 0
  const tax = Math.round(((sub - disc) * inv.tax_rate_bp) / 10000)
  const live = d.payments.filter((p) => p.invoice_id === inv.id && !p.voided_at)
  const paid = live.reduce((a, p) => a + p.amount, 0)
  inv.subtotal = sub
  inv.discount_amount = disc
  inv.tax_amount = tax
  inv.total = sub - disc + tax
  inv.amount_paid = paid
  const cleared = live.map((p) => p.paid_on).sort().at(-1)
  inv.paid_at = paid >= inv.total && paid > 0 && cleared ? `${cleared}T00:00:00.000Z` : null
  inv.updated_at = nowIso()
}

/** The invoice_overview view. Precedence: cancelled > draft > paid > overdue > partially_paid > viewed > sent */
export function deriveStatus(inv: Pick<Invoice, 'state' | 'amount_paid' | 'total' | 'due_date'>, todayIso: string): InvoiceStatus {
  if (inv.state === 'cancelled') return 'cancelled'
  if (inv.state === 'draft') return 'draft'
  if (inv.amount_paid >= inv.total) return 'paid'
  if (inv.due_date < todayIso) return 'overdue'
  if (inv.amount_paid > 0) return 'partially_paid'
  if (inv.state === 'viewed') return 'viewed'
  return 'sent'
}

function row(d: GuestDb, inv: Invoice): InvoiceRow {
  const c = d.clients.find((x) => x.id === inv.client_id)
  const t = today(d)
  return {
    ...clone(inv),
    client_name: c?.name ?? '',
    client_company: c?.company_name ?? '',
    client_email: c?.email ?? '',
    balance_due: inv.total - inv.amount_paid,
    status: deriveStatus(inv, t),
    days_until_due: daysBetween(t, inv.due_date),
  }
}

function nextNumber(d: GuestDb) {
  const n = d.profile.next_invoice_seq
  d.profile.next_invoice_seq = n + 1
  return d.profile.invoice_prefix + String(n).padStart(4, '0')
}

function getInvoice(d: GuestDb, id: string) {
  const inv = d.invoices.find((i) => i.id === id)
  if (!inv) throw fail('Invoice not found', 'P0002')
  return inv
}

function setItems(d: GuestDb, invoiceId: string, items: { description: string; quantity: number; unit_price: number }[]) {
  d.items = d.items.filter((i) => i.invoice_id !== invoiceId)
  items.forEach((it, position) =>
    d.items.push({
      id: uuid(),
      invoice_id: invoiceId,
      position,
      description: it.description.trim(),
      quantity: Number(it.quantity),
      unit_price: it.unit_price,
      amount: lineAmount(Math.round(Number(it.quantity) * 1000), it.unit_price),
    }),
  )
}

const byIssueDesc = (a: Invoice, b: Invoice) => (a.issue_date === b.issue_date ? b.invoice_number.localeCompare(a.invoice_number) : b.issue_date.localeCompare(a.issue_date))

/* ───────────── the services ───────────── */

export const guestProfile = {
  async get(): Promise<Profile> {
    return clone(db().profile)
  },
  async update(_id: string, patch: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
    const d = db()
    Object.assign(d.profile, patch)
    persist()
    return clone(d.profile)
  },
  /** Kept in the tab as a data URL; never uploaded. */
  async uploadLogo(_userId: string, png: Blob): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(fail('The logo could not be read.'))
      r.readAsDataURL(png)
    })
  },
  async removeLogo() {},
}

export const guestClients = {
  async list(): Promise<Client[]> {
    return clone(db().clients).sort((a, b) => a.name.localeCompare(b.name))
  },
  async get(id: string): Promise<Client> {
    const c = db().clients.find((x) => x.id === id)
    if (!c) throw fail('Not found. It may have been removed.', 'P0002')
    return clone(c)
  },
  async create(input: ClientInput): Promise<Client> {
    const d = db()
    const c: Client = { ...input, id: uuid(), user_id: d.profile.id, is_sample: false, archived_at: null, created_at: nowIso(), updated_at: nowIso() }
    d.clients.push(c)
    persist()
    return clone(c)
  },
  async update(id: string, input: Partial<ClientInput>): Promise<Client> {
    const d = db()
    const c = d.clients.find((x) => x.id === id)
    if (!c) throw fail('Not found. It may have been removed.', 'P0002')
    Object.assign(c, input, { updated_at: nowIso() })
    persist()
    return clone(c)
  },
  async setArchived(id: string, archived: boolean) {
    const d = db()
    const c = d.clients.find((x) => x.id === id)
    if (c) c.archived_at = archived ? nowIso() : null
    persist()
  },
  async remove(id: string) {
    const d = db()
    if (d.invoices.some((i) => i.client_id === id)) throw fail('This is still used by an invoice, so it can’t be removed. Archive it instead.')
    d.clients = d.clients.filter((c) => c.id !== id)
    persist()
  },
}

export const guestInvoices = {
  async list(): Promise<InvoiceRow[]> {
    const d = db()
    return [...d.invoices].sort(byIssueDesc).map((i) => row(d, i))
  },
  async listForClient(clientId: string): Promise<InvoiceRow[]> {
    const d = db()
    return d.invoices.filter((i) => i.client_id === clientId).sort(byIssueDesc).map((i) => row(d, i))
  },
  async get(id: string): Promise<InvoiceRow> {
    const d = db()
    return row(d, getInvoice(d, id))
  },
  async items(id: string): Promise<InvoiceItem[]> {
    return clone(db().items.filter((i) => i.invoice_id === id).sort((a, b) => a.position - b.position))
  },
  async events(id: string): Promise<InvoiceEvent[]> {
    return clone(db().events.filter((e) => e.invoice_id === id).sort((a, b) => (a.created_at === b.created_at ? a.id - b.id : a.created_at.localeCompare(b.created_at))))
  },
  /** save_invoice */
  async save(p: InvoiceDraft): Promise<string> {
    const d = db()
    if (!d.clients.some((c) => c.id === p.client_id && !c.archived_at)) throw fail('Choose an active client for this invoice')
    if (!p.items.length) throw fail('Add at least one line item')
    if (p.items.length > 200) throw fail('An invoice can have at most 200 line items')
    const dval = p.discount_type === 'none' ? 0 : p.discount_value
    const fields = {
      client_id: p.client_id,
      issue_date: p.issue_date,
      due_date: p.due_date,
      currency: p.currency,
      discount_type: p.discount_type,
      discount_value: dval,
      tax_label: p.tax_label || 'Tax',
      tax_rate_bp: p.tax_rate_bp || 0,
      payment_terms: p.payment_terms ?? '',
      notes: p.notes ?? '',
    }
    let inv: Invoice
    if (!p.id) {
      inv = {
        ...fields,
        id: uuid(),
        user_id: d.profile.id,
        invoice_number: nextNumber(d),
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        total: 0,
        amount_paid: 0,
        state: 'draft',
        sent_at: null,
        viewed_at: null,
        paid_at: null,
        cancelled_at: null,
        public_token: token48(),
        is_sample: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      }
      d.invoices.push(inv)
      log(d, inv.id, 'created', { number: inv.invoice_number })
    } else {
      inv = getInvoice(d, p.id)
      if (inv.state === 'cancelled') throw fail('Cancelled invoices cannot be edited')
      if (inv.amount_paid > 0) throw fail('This invoice has payments recorded, so it can no longer be edited')
      Object.assign(inv, fields)
      if (inv.state !== 'draft') log(d, inv.id, 'edited')
    }
    setItems(d, inv.id, p.items)
    recompute(d, inv)
    if (inv.discount_type === 'fixed' && inv.discount_value > inv.subtotal) throw fail('The discount is larger than the subtotal')
    persist()
    return inv.id
  },
  async markSent(id: string, channel: 'email' | 'manual', to?: string) {
    const d = db()
    const inv = getInvoice(d, id)
    if (inv.state === 'cancelled') throw fail('Cancelled invoices cannot be sent')
    if (inv.total === 0) throw fail('This invoice totals zero. Add an amount before sending.')
    if (inv.state === 'draft') {
      inv.state = 'sent'
      inv.sent_at = nowIso()
      log(d, id, 'sent', { channel, to: to ?? null })
    } else log(d, id, 'resent', { channel, to: to ?? null })
    persist()
  },
  async cancel(id: string, reason: string) {
    const d = db()
    const inv = getInvoice(d, id)
    if (inv.state === 'cancelled') return
    if (inv.state === 'draft') throw fail('Drafts are deleted, not cancelled')
    if (inv.amount_paid > 0) throw fail('Void the recorded payments before cancelling this invoice')
    inv.state = 'cancelled'
    inv.cancelled_at = nowIso()
    log(d, id, 'cancelled', { reason: (reason ?? '').slice(0, 300) })
    persist()
  },
  async deleteDraft(id: string) {
    const d = db()
    const inv = getInvoice(d, id)
    if (inv.state !== 'draft') throw fail('Only drafts can be deleted. Cancel sent invoices instead.')
    d.invoices = d.invoices.filter((i) => i.id !== id)
    d.items = d.items.filter((i) => i.invoice_id !== id)
    d.events = d.events.filter((e) => e.invoice_id !== id)
    persist()
  },
  async duplicate(id: string): Promise<string> {
    const d = db()
    const src = getInvoice(d, id)
    const t = today(d)
    const copy: Invoice = {
      ...clone(src),
      id: uuid(),
      invoice_number: nextNumber(d),
      issue_date: t,
      due_date: addDays(t, daysBetween(src.issue_date, src.due_date)),
      state: 'draft',
      amount_paid: 0,
      sent_at: null,
      viewed_at: null,
      paid_at: null,
      cancelled_at: null,
      public_token: token48(),
      is_sample: false,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    d.invoices.push(copy)
    setItems(d, copy.id, d.items.filter((i) => i.invoice_id === id).sort((a, b) => a.position - b.position))
    recompute(d, copy)
    log(d, copy.id, 'created', { duplicated_from: src.invoice_number })
    persist()
    return copy.id
  },
  /** get_public_invoice — works for links opened in this same tab. */
  async getPublic(token: string): Promise<InvoiceDocumentData | null> {
    const d = db()
    if (!/^[0-9a-f]{48}$/.test(token)) return null
    const inv = d.invoices.find((i) => i.public_token === token)
    if (!inv || inv.state === 'draft') return null
    if (inv.state === 'sent') {
      inv.state = 'viewed'
      inv.viewed_at = nowIso()
      log(d, inv.id, 'viewed')
      persist()
    }
    const p = d.profile
    const c = d.clients.find((x) => x.id === inv.client_id)!
    return {
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      currency: inv.currency,
      discount_type: inv.discount_type,
      discount_value: inv.discount_value,
      tax_label: inv.tax_label,
      tax_rate_bp: inv.tax_rate_bp,
      subtotal: inv.subtotal,
      discount_amount: inv.discount_amount,
      tax_amount: inv.tax_amount,
      total: inv.total,
      amount_paid: inv.amount_paid,
      status: deriveStatus(inv, today(d)),
      payment_terms: inv.payment_terms,
      notes: inv.notes,
      from: { name: p.full_name, business_name: p.business_name, email: p.email, phone: p.phone, address: p.address, city: p.city, country: p.country, website: p.website, tax_id: p.tax_id, logo_path: p.logo_path, payment_instructions: p.payment_instructions },
      to: { name: c.name, company_name: c.company_name, email: c.email, address: c.address, city: c.city, country: c.country, tax_id: c.tax_id },
      items: d.items.filter((i) => i.invoice_id === inv.id).sort((a, b) => a.position - b.position).map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, amount: i.amount })),
    }
  },
}

export const guestPayments = {
  async listForInvoice(invoiceId: string): Promise<Payment[]> {
    return clone(db().payments.filter((p) => p.invoice_id === invoiceId).sort((a, b) => (a.paid_on === b.paid_on ? a.created_at.localeCompare(b.created_at) : a.paid_on.localeCompare(b.paid_on))))
  },
  async listAll(): Promise<Payment[]> {
    return clone(db().payments).sort((a, b) => b.paid_on.localeCompare(a.paid_on))
  },
  /** record_payment */
  async record(input: { invoiceId: string; amount: number; paidOn: string; method: PaymentMethod; reference: string; notes: string }) {
    const d = db()
    const inv = getInvoice(d, input.invoiceId)
    if (inv.state === 'draft') throw fail('Send the invoice before recording a payment')
    if (inv.state === 'cancelled') throw fail('Cancelled invoices cannot take payments')
    const balance = inv.total - inv.amount_paid
    if (!input.amount || input.amount <= 0) throw fail('Enter a payment amount above zero')
    if (input.amount > balance) throw fail('The payment is more than the balance due')
    if (!input.paidOn || input.paidOn > today(d)) throw fail('The payment date cannot be in the future')
    const pay: Payment = {
      id: uuid(),
      invoice_id: inv.id,
      amount: input.amount,
      paid_on: input.paidOn,
      method: input.method,
      reference: (input.reference ?? '').slice(0, 120),
      notes: (input.notes ?? '').slice(0, 500),
      voided_at: null,
      void_reason: null,
      created_at: nowIso(),
    }
    d.payments.push(pay)
    recompute(d, inv)
    log(d, inv.id, 'payment_recorded', { payment_id: pay.id, amount: pay.amount, method: pay.method })
    if (input.amount === balance) log(d, inv.id, 'paid')
    persist()
    return pay.id
  },
  /** void_payment */
  async void(paymentId: string, reason: string) {
    const d = db()
    const pay = d.payments.find((p) => p.id === paymentId)
    if (!pay) throw fail('Payment not found', 'P0002')
    if (pay.voided_at) return
    if (!reason?.trim()) throw fail('Give a reason for voiding this payment')
    pay.voided_at = nowIso()
    pay.void_reason = reason.trim().slice(0, 300)
    recompute(d, getInvoice(d, pay.invoice_id))
    log(d, pay.invoice_id, 'payment_voided', { payment_id: pay.id, amount: pay.amount, reason: pay.void_reason })
    persist()
  },
}

export const guestActivity = {
  async recent(limit = 25) {
    const d = db()
    return [...d.events]
      .sort((a, b) => (a.created_at === b.created_at ? b.id - a.id : b.created_at.localeCompare(a.created_at)))
      .slice(0, limit)
      .map((e) => {
        const inv = d.invoices.find((i) => i.id === e.invoice_id)
        return { ...clone(e), invoices: inv ? { invoice_number: inv.invoice_number, currency: inv.currency } : null }
      })
  },
}

export const guestSample = {
  async load() {
    const d = db()
    if (d.clients.some((c) => c.is_sample)) throw fail('Sample data is already loaded')
    seedSample(d)
    persist()
  },
  async remove() {
    const d = db()
    const gone = new Set(d.invoices.filter((i) => i.is_sample).map((i) => i.id))
    d.invoices = d.invoices.filter((i) => !gone.has(i.id))
    d.items = d.items.filter((i) => !gone.has(i.invoice_id))
    d.payments = d.payments.filter((p) => !gone.has(p.invoice_id))
    d.events = d.events.filter((e) => !gone.has(e.invoice_id))
    d.clients = d.clients.filter((c) => !c.is_sample || d.invoices.some((i) => i.client_id === c.id))
    persist()
  },
}

/* ───────────── the sample workspace (same as load_sample_data) ───────────── */

export function createWorkspace(): GuestDb {
  const profile: Profile = {
    id: 'guest',
    full_name: 'Guest',
    business_name: 'Guest Studio',
    email: 'you@guest-studio.example',
    phone: '',
    address: '',
    city: 'Pune',
    country: 'India',
    website: '',
    tax_id: '',
    logo_path: null,
    payment_instructions: 'UPI: guest-studio@upi · Bank transfer details on request.',
    default_currency: 'INR',
    default_tax_rate_bp: 1800,
    default_tax_label: 'GST',
    default_due_days: 15,
    default_payment_terms: 'Payment due within 15 days of the invoice date.',
    default_notes: 'Thank you for the work together.',
    invoice_prefix: 'INV-',
    next_invoice_seq: 1,
    timezone: 'Asia/Kolkata',
    email_copy_to_self: false,
    onboarded_at: nowIso(),
  }
  const d: GuestDb = { profile, clients: [], invoices: [], items: [], payments: [], events: [], nextEventId: 1 }
  seedSample(d)
  return d
}

type SamplePay = { amount: number | 'full'; on: number; method: PaymentMethod; ref: string }

function seedSample(d: GuestDb) {
  const t = today(d)
  const at = (offset: number, hour: number) => `${addDays(t, offset)}T${String(hour).padStart(2, '0')}:00:00.000Z`
  const client = (name: string, company: string, email: string, city: string, notes = '') => {
    const c: Client = { id: uuid(), user_id: d.profile.id, name, company_name: company, email, phone: '', address: '', city, country: 'India', tax_id: '', notes, is_sample: true, archived_at: null, created_at: at(-200, 9), updated_at: at(-200, 9) }
    d.clients.push(c)
    return c.id
  }
  const c1 = client('Acme Studio', 'Acme Studio LLP', 'accounts@acme-studio.example', 'Pune', 'Retainer for product design.')
  const c2 = client('Nova Labs', 'Nova Labs Pvt Ltd', 'finance@novalabs.example', 'Bengaluru')
  const c3 = client('Northstar Media', '', 'hello@northstar.example', 'Mumbai')
  const c4 = client('Orbit Systems', 'Orbit Systems', 'ap@orbit.example', 'Hyderabad')

  const invoice = (clientId: string, issue: number, dueDays: number, items: [string, number, number][], state: 'draft' | 'sent' | 'viewed', pays: SamplePay[], disc: { type: 'none' | 'percent'; value: number } = { type: 'none', value: 0 }) => {
    const inv: Invoice = {
      id: uuid(),
      user_id: d.profile.id,
      client_id: clientId,
      invoice_number: nextNumber(d),
      issue_date: addDays(t, issue),
      due_date: addDays(t, issue + dueDays),
      currency: d.profile.default_currency,
      discount_type: disc.type,
      discount_value: disc.value,
      tax_label: d.profile.default_tax_label,
      tax_rate_bp: 1800,
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total: 0,
      amount_paid: 0,
      state,
      sent_at: state === 'draft' ? null : at(issue, 10),
      viewed_at: state === 'viewed' ? at(issue + 1, 10) : null,
      paid_at: null,
      cancelled_at: null,
      payment_terms: `Payment due within ${dueDays} days of the invoice date.`,
      notes: 'Thank you for the work together.',
      public_token: token48(),
      is_sample: true,
      created_at: at(issue, 9),
      updated_at: at(issue, 9),
    }
    d.invoices.push(inv)
    setItems(d, inv.id, items.map(([description, quantity, unit_price]) => ({ description, quantity, unit_price })))
    recompute(d, inv)
    log(d, inv.id, 'created', {}, at(issue, 9))
    if (state !== 'draft') log(d, inv.id, 'sent', { channel: 'manual' }, at(issue, 10))
    for (const p of pays) {
      const amount = p.amount === 'full' ? inv.total - inv.amount_paid : p.amount
      d.payments.push({ id: uuid(), invoice_id: inv.id, amount, paid_on: addDays(t, p.on), method: p.method, reference: p.ref, notes: '', voided_at: null, void_reason: null, created_at: at(p.on, 12) })
      recompute(d, inv)
      log(d, inv.id, 'payment_recorded', { amount, method: p.method }, at(p.on, 12))
    }
  }

  invoice(c1, -190, 15, [['Brand identity refresh', 1, 6500000]], 'sent', [{ amount: 'full', on: -178, method: 'bank_transfer', ref: 'NEFT 4471' }])
  invoice(c2, -160, 30, [['Website development — phase 1', 1, 9000000], ['Hosting setup', 1, 450000]], 'sent', [{ amount: 'full', on: -135, method: 'bank_transfer', ref: 'IMPS 99012' }])
  invoice(c3, -128, 15, [['Editorial illustrations', 6, 850000]], 'sent', [{ amount: 'full', on: -117, method: 'upi', ref: 'UPI 6620' }])
  invoice(c1, -98, 15, [['Product design retainer — month 1', 1, 7500000]], 'sent', [{ amount: 'full', on: -86, method: 'bank_transfer', ref: 'NEFT 5120' }])
  invoice(c4, -75, 30, [['API integration', 40, 250000], ['Code review', 6, 250000]], 'sent', [{ amount: 'full', on: -50, method: 'bank_transfer', ref: 'RTGS 220' }], { type: 'percent', value: 500 })
  invoice(c1, -68, 15, [['Product design retainer — month 2', 1, 7500000]], 'sent', [{ amount: 'full', on: -49, method: 'bank_transfer', ref: 'NEFT 5544' }])
  invoice(c2, -45, 60, [['Website development — phase 2', 1, 12000000], ['Content migration', 18, 150000]], 'sent', [{ amount: 4000000, on: -30, method: 'bank_transfer', ref: 'IMPS 10441' }])
  invoice(c1, -38, 15, [['Product design retainer — month 3', 1, 7500000]], 'sent', [])
  invoice(c3, -20, 15, [['Podcast cover art', 3, 1200000], ['Social templates', 1, 1800000]], 'viewed', [{ amount: 'full', on: -6, method: 'upi', ref: 'UPI 7731' }])
  invoice(c4, -9, 14, [['Dashboard UI audit', 1, 3600000]], 'viewed', [])
  invoice(c1, -4, 15, [['Product design retainer — month 4', 1, 7500000]], 'sent', [])
  invoice(c2, 0, 30, [['Maintenance — monthly', 3, 500000]], 'draft', [])
}
