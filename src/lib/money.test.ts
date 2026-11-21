import { describe, expect, it } from 'vitest'
import { calcInvoice, formatMoney, formatRate, lineAmount, parseMoney, parseQuantity, parseRate, percentChange } from './money'

describe('parseMoney', () => {
  it('parses plain and formatted input into minor units', () => {
    expect(parseMoney('1000.50')).toBe(100050)
    expect(parseMoney('₹ 1,00,000')).toBe(10000000)
    expect(parseMoney('0.1')).toBe(10)
    expect(parseMoney('0')).toBe(0)
  })
  it('rejects malformed input', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('1.234')).toBeNull()
    expect(parseMoney('-5')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('1e5')).toBeNull()
  })
  it('never goes through floating point (0.1 + 0.2)', () => {
    expect(parseMoney('0.1')! + parseMoney('0.2')!).toBe(30)
  })
})

describe('quantities and rates', () => {
  it('parses quantities to thousandths', () => {
    expect(parseQuantity('1.5')).toBe(1500)
    expect(parseQuantity('3')).toBe(3000)
    expect(parseQuantity('0')).toBeNull()
    expect(parseQuantity('1.2345')).toBeNull()
  })
  it('parses and formats percentages as basis points', () => {
    expect(parseRate('18')).toBe(1800)
    expect(parseRate('12.5%')).toBe(1250)
    expect(parseRate('101')).toBeNull()
    expect(formatRate(1800)).toBe('18%')
    expect(formatRate(1250)).toBe('12.5%')
  })
})

describe('calcInvoice', () => {
  it('matches the product spec example (₹1,00,300)', () => {
    const r = calcInvoice({
      items: [
        { quantityMilli: 1000, unitPrice: 5000000 },
        { quantityMilli: 1000, unitPrice: 2000000 },
        { quantityMilli: 3000, unitPrice: 500000 },
      ],
      discountType: 'none', discountValue: 0, taxRateBp: 1800,
    })
    expect(r).toMatchObject({ subtotal: 8500000, tax: 1530000, total: 10030000 })
  })
  it('applies percent discount before tax (₹53,100)', () => {
    const r = calcInvoice({ items: [{ quantityMilli: 1000, unitPrice: 5000000 }], discountType: 'percent', discountValue: 1000, taxRateBp: 1800 })
    expect(r).toMatchObject({ subtotal: 5000000, discount: 500000, taxable: 4500000, tax: 810000, total: 5310000 })
  })
  it('caps a fixed discount at the subtotal', () => {
    const r = calcInvoice({ items: [{ quantityMilli: 1000, unitPrice: 1000 }], discountType: 'fixed', discountValue: 5000, taxRateBp: 1800 })
    expect(r.discount).toBe(1000)
    expect(r.total).toBe(0)
  })
  it('rounds half up to the paisa, like Postgres round()', () => {
    expect(lineAmount(1500, 333)).toBe(500) // 499.5 → 500
    expect(lineAmount(333, 1)).toBe(0) // 0.333 → 0
    const r = calcInvoice({ items: [{ quantityMilli: 1000, unitPrice: 1050 }], discountType: 'none', discountValue: 0, taxRateBp: 500 })
    expect(r.tax).toBe(53) // 52.5 → 53
  })
  it('handles zero-value and very large invoices exactly', () => {
    expect(calcInvoice({ items: [{ quantityMilli: 1000, unitPrice: 0 }], discountType: 'none', discountValue: 0, taxRateBp: 1800 }).total).toBe(0)
    const big = calcInvoice({ items: [{ quantityMilli: 999_999_999, unitPrice: 9_999_999 }], discountType: 'none', discountValue: 0, taxRateBp: 1800 })
    expect(big.subtotal).toBe(9_999_998_990_000)
    expect(Number.isSafeInteger(big.total)).toBe(true)
  })
})

describe('formatting', () => {
  it('formats INR with Indian grouping', () => {
    expect(formatMoney(10030000, 'INR')).toBe('₹1,00,300')
    expect(formatMoney(100050, 'INR')).toBe('₹1,000.50')
  })
  it('formats other currencies by their own locale', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
  })
})

describe('percentChange', () => {
  it('returns null when there is no previous value', () => {
    expect(percentChange(500, 0)).toBeNull()
    expect(percentChange(0, 0)).toBeNull()
  })
  it('calculates growth and decline', () => {
    expect(percentChange(118, 100)).toBeCloseTo(18)
    expect(percentChange(50, 100)).toBe(-50)
  })
})
