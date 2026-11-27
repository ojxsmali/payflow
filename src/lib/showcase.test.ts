import { describe, expect, it } from 'vitest'
import { EXAMPLE_PAYMENTS, EXAMPLE_TOTALS, LIFECYCLE, PRESS_QUEUE } from './showcase'
import { calcInvoice } from './money'
import { OPEN_STATUSES } from './status'
import { STATUS_ORDER } from './status'

describe('landing-page example invoice', () => {
  it('is priced by the real invoice maths (5% discount, 18% tax)', () => {
    // 48,000 + 6 × 6,000 + 4 × 1,500 = 90,000; −5% = 85,500; +18% = 1,00,890
    expect(EXAMPLE_TOTALS.subtotal).toBe(9_000_000)
    expect(EXAMPLE_TOTALS.discount).toBe(450_000)
    expect(EXAMPLE_TOTALS.tax).toBe(1_539_000)
    expect(EXAMPLE_TOTALS.total).toBe(10_089_000)
  })

  it('has payments that settle the total exactly', () => {
    expect(EXAMPLE_PAYMENTS.reduce((a, p) => a + p.amount, 0)).toBe(EXAMPLE_TOTALS.total)
  })

  it('walks the statuses in the app’s own order and only ever increases what is paid', () => {
    const order = LIFECYCLE.map((s) => STATUS_ORDER.indexOf(s.status))
    expect(order.every((v, i) => i === 0 || v > order[i - 1])).toBe(true)
    expect(LIFECYCLE.at(-1)?.status).toBe('paid')
    expect(LIFECYCLE.at(-1)?.paid).toBe(EXAMPLE_TOTALS.total)
    expect(LIFECYCLE.every((s, i) => i === 0 || s.paid >= LIFECYCLE[i - 1].paid)).toBe(true)
  })
})

describe('landing-page press queue', () => {
  it('prices every example invoice with the real maths and only queues money still owed', () => {
    expect(PRESS_QUEUE[0].total).toBe(EXAMPLE_TOTALS.total)
    for (const inv of PRESS_QUEUE.slice(1)) {
      expect(inv.total).toBe(calcInvoice({ items: inv.items, discountType: 'percent', discountValue: 0, taxRateBp: 1800 }).total)
      expect(inv.total).toBeGreaterThan(0)
    }
    expect(PRESS_QUEUE.every((i) => OPEN_STATUSES.includes(i.status))).toBe(true)
    expect(new Set(PRESS_QUEUE.map((i) => i.no)).size).toBe(PRESS_QUEUE.length)
  })
})
