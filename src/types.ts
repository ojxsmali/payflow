import type { CurrencyCode, DiscountType } from './lib/money'

export type InvoiceState = 'draft' | 'sent' | 'viewed' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'card' | 'paypal' | 'cheque' | 'other'

export interface Profile {
  id: string
  full_name: string
  business_name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  website: string
  tax_id: string
  logo_path: string | null
  payment_instructions: string
  default_currency: CurrencyCode
  default_tax_rate_bp: number
  default_tax_label: string
  default_due_days: number
  default_payment_terms: string
  default_notes: string
  invoice_prefix: string
  next_invoice_seq: number
  timezone: string
  email_copy_to_self: boolean
  onboarded_at: string | null
}

export interface Client {
  id: string
  user_id: string
  name: string
  company_name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  tax_id: string
  notes: string
  is_sample: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}
export type ClientInput = Pick<Client, 'name' | 'company_name' | 'email' | 'phone' | 'address' | 'city' | 'country' | 'tax_id' | 'notes'>

export interface Invoice {
  id: string
  user_id: string
  client_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  currency: CurrencyCode
  discount_type: DiscountType
  discount_value: number
  tax_label: string
  tax_rate_bp: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  amount_paid: number
  state: InvoiceState
  sent_at: string | null
  viewed_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  payment_terms: string
  notes: string
  public_token: string
  is_sample: boolean
  created_at: string
  updated_at: string
}

/** Row of the invoice_overview view: invoice + client + derived fields */
export interface InvoiceRow extends Invoice {
  client_name: string
  client_company: string
  client_email: string
  balance_due: number
  status: InvoiceStatus
  days_until_due: number
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  position: number
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  paid_on: string
  method: PaymentMethod
  reference: string
  notes: string
  voided_at: string | null
  void_reason: string | null
  created_at: string
}

export type EventKind =
  | 'created' | 'edited' | 'sent' | 'resent' | 'viewed'
  | 'payment_recorded' | 'payment_voided' | 'paid' | 'cancelled'

export interface InvoiceEvent {
  id: number
  invoice_id: string
  kind: EventKind
  detail: Record<string, unknown>
  created_at: string
}

/** What the editor submits; the database computes every amount from it. */
export interface InvoiceDraft {
  id?: string
  client_id: string
  issue_date: string
  due_date: string
  currency: CurrencyCode
  discount_type: DiscountType
  discount_value: number
  tax_label: string
  tax_rate_bp: number
  payment_terms: string
  notes: string
  items: { description: string; quantity: number; unit_price: number }[]
}

/** Shape returned by get_public_invoice() and used by the document/PDF renderers. */
export interface InvoiceDocumentData {
  invoice_number: string
  issue_date: string
  due_date: string
  currency: CurrencyCode
  discount_type: DiscountType
  discount_value: number
  tax_label: string
  tax_rate_bp: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  amount_paid: number
  status: InvoiceStatus
  payment_terms: string
  notes: string
  from: {
    name: string
    business_name: string
    email: string
    phone: string
    address: string
    city: string
    country: string
    website: string
    tax_id: string
    logo_path: string | null
    payment_instructions: string
  }
  to: { name: string; company_name: string; email: string; address: string; city: string; country: string; tax_id: string }
  items: { description: string; quantity: number; unit_price: number; amount: number }[]
}
