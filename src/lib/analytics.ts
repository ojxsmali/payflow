// Business metrics. Pure functions over data the database already computed
// (invoice totals, balances, derived status) — no money math is redone here,
// only sums and ratios. Definitions are shown to users in the Analytics page
// (METRIC_DEFINITIONS) and are the same everywhere in the app.

import type { InvoiceRow, Payment } from '../types'
import { ISSUED_STATUSES, OPEN_STATUSES } from './status'
import { lastMonths, daysBetween } from './dates'
import { percentChange } from './money'

export const METRIC_DEFINITIONS = {
  collected: 'Money actually received: the sum of recorded payments (voided payments excluded), by payment date.',
  invoiced: 'Total of invoices issued to clients — sent, viewed, partially paid, overdue or paid. Drafts and cancelled invoices are excluded.',
  outstanding: 'Unpaid balance on invoices that are sent, viewed, partially paid or overdue.',
  overdue: 'The part of outstanding whose due date has passed.',
  dueSoon: 'Outstanding balance due in the next 7 days (not yet overdue).',
  collectionRate: 'Paid ÷ invoiced, on issued invoices. Shows how much of what you billed has come in.',
  averageInvoice: 'Invoiced total ÷ number of issued invoices.',
  daysToPay: 'Average days from issue date to the date an invoice was fully paid.',
} as const

export type PaymentWithInvoice = Pick<Payment, 'amount' | 'paid_on' | 'invoice_id' | 'voided_at'>

export interface Summary {
  currency: string
  invoicedTotal: number
  issuedCount: number
  paidOnIssued: number
  outstanding: number
  outstandingCount: number
  overdue: number
  overdueCount: number
  dueSoon: number
  dueSoonCount: number
  draftCount: number
  collectionRate: number | null
  averageInvoice: number | null
  averageDaysToPay: number | null
  collectedThisMonth: number
  collectedLastMonth: number
  monthChange: number | null
  collectedAllTime: number
  otherCurrencies: string[]
}

export interface MonthPoint {
  month: string // YYYY-MM
  collected: number
  invoiced: number
}

export interface ClientRevenue {
  clientId: string
  name: string
  collected: number
  invoiced: number
  outstanding: number
  invoiceCount: number
}

function inCurrency(invoices: InvoiceRow[], currency: string) {
  return invoices.filter((i) => i.currency === currency)
}

function livePayments(payments: PaymentWithInvoice[], invoiceIds: Set<string>) {
  return payments.filter((p) => !p.voided_at && invoiceIds.has(p.invoice_id))
}

export function summarize(invoices: InvoiceRow[], payments: PaymentWithInvoice[], currency: string, today: string): Summary {
  const own = inCurrency(invoices, currency)
  const issued = own.filter((i) => ISSUED_STATUSES.includes(i.status))
  const open = own.filter((i) => OPEN_STATUSES.includes(i.status))
  const overdue = open.filter((i) => i.status === 'overdue')
  const dueSoon = open.filter((i) => i.status !== 'overdue' && i.days_until_due >= 0 && i.days_until_due <= 7)
  const ids = new Set(own.map((i) => i.id))
  const pays = livePayments(payments, ids)

  const thisMonth = today.slice(0, 7)
  const lastMonth = lastMonths(today, 2)[0]
  const sumMonth = (ym: string) => pays.filter((p) => p.paid_on.startsWith(ym)).reduce((a, p) => a + p.amount, 0)

  const invoicedTotal = sum(issued.map((i) => i.total))
  const paidOnIssued = sum(issued.map((i) => i.amount_paid))
  const paidInvoices = own.filter((i) => i.status === 'paid' && i.paid_at)
  const collectedThisMonth = sumMonth(thisMonth)
  const collectedLastMonth = sumMonth(lastMonth)

  return {
    currency,
    invoicedTotal,
    issuedCount: issued.length,
    paidOnIssued,
    outstanding: sum(open.map((i) => i.balance_due)),
    outstandingCount: open.length,
    overdue: sum(overdue.map((i) => i.balance_due)),
    overdueCount: overdue.length,
    dueSoon: sum(dueSoon.map((i) => i.balance_due)),
    dueSoonCount: dueSoon.length,
    draftCount: own.filter((i) => i.status === 'draft').length,
    collectionRate: invoicedTotal > 0 ? (paidOnIssued / invoicedTotal) * 100 : null,
    averageInvoice: issued.length > 0 ? Math.round(invoicedTotal / issued.length) : null,
    averageDaysToPay: paidInvoices.length
      ? Math.round(sum(paidInvoices.map((i) => Math.max(0, daysBetween(i.issue_date, i.paid_at!.slice(0, 10))))) / paidInvoices.length)
      : null,
    collectedThisMonth,
    collectedLastMonth,
    monthChange: percentChange(collectedThisMonth, collectedLastMonth),
    collectedAllTime: sum(pays.map((p) => p.amount)),
    otherCurrencies: [...new Set(invoices.filter((i) => i.currency !== currency && i.status !== 'draft').map((i) => i.currency))].sort(),
  }
}

export function monthlySeries(invoices: InvoiceRow[], payments: PaymentWithInvoice[], currency: string, months: string[]): MonthPoint[] {
  const own = inCurrency(invoices, currency)
  const issued = own.filter((i) => ISSUED_STATUSES.includes(i.status))
  const pays = livePayments(payments, new Set(own.map((i) => i.id)))
  return months.map((month) => ({
    month,
    collected: sum(pays.filter((p) => p.paid_on.startsWith(month)).map((p) => p.amount)),
    invoiced: sum(issued.filter((i) => i.issue_date.startsWith(month)).map((i) => i.total)),
  }))
}

export function revenueByClient(invoices: InvoiceRow[], payments: PaymentWithInvoice[], currency: string): ClientRevenue[] {
  const own = inCurrency(invoices, currency)
  const byInvoice = new Map(own.map((i) => [i.id, i]))
  const rows = new Map<string, ClientRevenue>()
  const row = (i: InvoiceRow) => {
    let r = rows.get(i.client_id)
    if (!r) {
      r = { clientId: i.client_id, name: i.client_name, collected: 0, invoiced: 0, outstanding: 0, invoiceCount: 0 }
      rows.set(i.client_id, r)
    }
    return r
  }
  for (const i of own) {
    if (!ISSUED_STATUSES.includes(i.status)) continue
    const r = row(i)
    r.invoiced += i.total
    r.invoiceCount++
    if (OPEN_STATUSES.includes(i.status)) r.outstanding += i.balance_due
  }
  for (const p of livePayments(payments, new Set(byInvoice.keys()))) row(byInvoice.get(p.invoice_id)!).collected += p.amount
  return [...rows.values()].sort((a, b) => b.collected - a.collected || b.invoiced - a.invoiced)
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}
