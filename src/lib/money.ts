// Money helpers. Amounts are integers in the currency's minor unit (paise, cents).
// Percentages are integers in basis points (1800 = 18%).
//
// The database (pf_recompute_invoice) is the source of truth for every stored
// total. calcInvoice() mirrors it exactly so the editor can show a live preview;
// src/lib/money.test.ts and supabase/tests/db-check.mjs keep the two in step.
// BigInt is used for the products so nothing ever goes through a float.

export const CURRENCIES = {
  INR: { code: 'INR', label: 'Indian rupee', locale: 'en-IN' },
  USD: { code: 'USD', label: 'US dollar', locale: 'en-US' },
  EUR: { code: 'EUR', label: 'Euro', locale: 'en-IE' },
  GBP: { code: 'GBP', label: 'British pound', locale: 'en-GB' },
} as const
export type CurrencyCode = keyof typeof CURRENCIES
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[]
export const MINOR_DIGITS = 2 // all supported currencies use two decimals

export const MAX_UNIT_PRICE = 100_000_000_000_000 // minor units (DB check constraint)
export const MAX_QUANTITY = 1_000_000

const formatters = new Map<string, Intl.NumberFormat>()
function formatter(currency: string, compact: boolean, cents: boolean) {
  const key = `${currency}|${compact}|${cents}`
  let f = formatters.get(key)
  if (!f) {
    const locale = CURRENCIES[currency as CurrencyCode]?.locale ?? 'en-IN'
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: compact ? 0 : cents ? 2 : 0,
      maximumFractionDigits: compact ? 1 : 2,
    })
    formatters.set(key, f)
  }
  return f
}

/** 10030000 → "₹1,00,300" (decimals shown only when non-zero, unless `cents`). */
export function formatMoney(minor: number, currency: string, opts: { cents?: boolean; compact?: boolean } = {}) {
  const hasFraction = minor % 100 !== 0
  return formatter(currency, !!opts.compact, opts.cents ?? hasFraction).format(minor / 100)
}

/** Plain number without the symbol, for inputs: 150050 → "1500.50" */
export function minorToInput(minor: number) {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / 100)
  const frac = abs % 100
  return `${sign}${whole}${frac ? '.' + String(frac).padStart(2, '0') : ''}`
}

/**
 * Parse what a person typed into minor units without floating point.
 * Accepts "1500", "1,500.5", "₹ 1,00,000.25". Returns null for anything malformed
 * or with more than two decimals.
 */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[\s,₹$€£]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const minor = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2))
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(minor)
}

/** Quantity as thousandths (DB column is numeric(12,3)). "1.5" → 1500 */
export function parseQuantity(input: string): number | null {
  const s = input.trim()
  if (!/^\d+(\.\d{0,3})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const milli = Number(whole) * 1000 + Number((frac + '000').slice(0, 3))
  if (milli <= 0 || milli > MAX_QUANTITY * 1000) return null
  return milli
}

export function formatQuantity(q: number | string) {
  const n = typeof q === 'string' ? Number(q) : q
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)))
}

/** Half-up rounding division for non-negative bigints. */
function divRound(num: bigint, den: bigint) {
  return (num * 2n + den) / (den * 2n)
}

/** amount = round(quantity × unit price) */
export function lineAmount(quantityMilli: number, unitPrice: number) {
  return Number(divRound(BigInt(quantityMilli) * BigInt(unitPrice), 1000n))
}

export type DiscountType = 'none' | 'percent' | 'fixed'
export interface CalcInput {
  items: { quantityMilli: number; unitPrice: number }[]
  discountType: DiscountType
  /** basis points for percent, minor units for fixed */
  discountValue: number
  taxRateBp: number
}
export interface CalcResult {
  lineAmounts: number[]
  subtotal: number
  discount: number
  taxable: number
  tax: number
  total: number
}

export function calcInvoice({ items, discountType, discountValue, taxRateBp }: CalcInput): CalcResult {
  const lineAmounts = items.map((i) => lineAmount(i.quantityMilli, i.unitPrice))
  const subtotal = lineAmounts.reduce((a, b) => a + b, 0)
  let discount = 0
  if (discountType === 'percent') discount = Number(divRound(BigInt(subtotal) * BigInt(discountValue), 10000n))
  else if (discountType === 'fixed') discount = Math.min(discountValue, subtotal)
  const taxable = subtotal - discount
  const tax = Number(divRound(BigInt(taxable) * BigInt(taxRateBp), 10000n))
  return { lineAmounts, subtotal, discount, taxable, tax, total: taxable + tax }
}

/** 1800 → "18%", 1250 → "12.5%" */
export function formatRate(bp: number) {
  return `${Number((bp / 100).toFixed(2))}%`
}

/** "18" / "12.5" → basis points; null if invalid or outside 0–100 */
export function parseRate(input: string): number | null {
  const s = input.replace('%', '').trim()
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const bp = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
  return bp <= 10000 ? bp : null
}

/** Percentage change, or null when there is no meaningful baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
