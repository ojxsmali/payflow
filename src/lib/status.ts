import type { InvoiceStatus, PaymentMethod } from '../types'

// Status is derived in the database (invoice_overview.status):
//   cancelled > draft > paid > overdue > partially_paid > viewed > sent
// "Overdue" can also have part-payments; the balance column shows that.

export const STATUS_META: Record<InvoiceStatus, { label: string; tone: 'muted' | 'accent' | 'success' | 'warning' | 'danger'; help: string }> = {
  draft: { label: 'Draft', tone: 'muted', help: 'Not sent yet. Only you can see it.' },
  sent: { label: 'Sent', tone: 'accent', help: 'Sent to the client and awaiting payment.' },
  viewed: { label: 'Viewed', tone: 'accent', help: 'The client opened the invoice link.' },
  partially_paid: { label: 'Partially paid', tone: 'warning', help: 'Some payment received; a balance remains.' },
  paid: { label: 'Paid', tone: 'success', help: 'Payments cover the full total.' },
  overdue: { label: 'Overdue', tone: 'danger', help: 'Past the due date with a balance remaining.' },
  cancelled: { label: 'Cancelled', tone: 'muted', help: 'Voided. Excluded from every total.' },
}

export const STATUS_ORDER: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'partially_paid', 'overdue', 'paid', 'cancelled']

/** Statuses that represent money a client currently owes. */
export const OPEN_STATUSES: InvoiceStatus[] = ['sent', 'viewed', 'partially_paid', 'overdue']
/** Statuses that count as "invoiced" (issued to a client and not voided). */
export const ISSUED_STATUSES: InvoiceStatus[] = ['sent', 'viewed', 'partially_paid', 'overdue', 'paid']

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
  paypal: 'PayPal',
  cheque: 'Cheque',
  other: 'Other',
}
