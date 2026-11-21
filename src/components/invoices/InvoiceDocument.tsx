import type { InvoiceDocumentData } from '../../types'
import { formatMoney, formatQuantity } from '../../lib/money'
import { formatDate } from '../../lib/dates'
import { discountLabel, fromLines, taxLine, toLines } from './document'
import { cx } from '../ui'

/** The invoice as the client sees it. Same content and order as the PDF. */
export function InvoiceDocument({ data, logoUrl, className }: { data: InvoiceDocumentData; logoUrl?: string | null; className?: string }) {
  const m = (v: number) => formatMoney(v, data.currency, { cents: true })
  const sender = data.from.business_name || data.from.name
  const balance = data.total - data.amount_paid
  const paid = data.status === 'paid'
  const cancelled = data.status === 'cancelled'

  return (
    <article
      aria-label={`Invoice ${data.invoice_number}`}
      className={cx('relative rounded-md border border-line bg-surface px-5 py-7 text-ink shadow-[var(--shadow-doc)] sm:px-12 sm:py-12', className)}
    >
      <header className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {logoUrl ? <img src={logoUrl} alt={sender} className="mb-3 max-h-12 max-w-44 object-contain object-left" /> : null}
          <p className="text-md font-semibold break-words">{sender}</p>
        </div>
        <div className="sm:text-right">
          <h2 className="display text-3xl leading-none">Invoice</h2>
          <p className="mt-2 font-mono text-sm text-ink-2">{data.invoice_number}</p>
        </div>
      </header>

      {(paid || cancelled) && (
        <p className={cx('mt-6 inline-block rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-widest', paid ? 'border-success/40 text-success' : 'border-line-strong text-muted')}>
          {paid ? 'Paid' : 'Cancelled'}
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-3">
        <div><dt className="label">Issued</dt><dd className="mt-1 text-sm">{formatDate(data.issue_date)}</dd></div>
        <div><dt className="label">Due</dt><dd className="mt-1 text-sm">{formatDate(data.due_date)}</dd></div>
        <div className="col-span-2 sm:col-span-1 sm:text-right">
          <dt className="label">{paid ? 'Total paid' : 'Amount due'}</dt>
          <dd className="num mt-1 text-lg font-semibold">{m(paid ? data.total : balance)}</dd>
        </div>
      </dl>

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="eyebrow">From</p>
          <p className="mt-2 text-sm font-medium break-words">{sender}</p>
          {fromLines(data.from).map((l, i) => <p key={i} className="text-sm text-ink-2 break-words whitespace-pre-line">{l}</p>)}
        </div>
        <div className="min-w-0">
          <p className="eyebrow">Bill to</p>
          <p className="mt-2 text-sm font-medium break-words">{data.to.name}</p>
          {toLines(data.to).map((l, i) => <p key={i} className="text-sm text-ink-2 break-words whitespace-pre-line">{l}</p>)}
        </div>
      </div>

      {/* Items: table on wider screens, stacked on phones */}
      <table className="mt-9 hidden w-full border-collapse text-sm sm:table">
        <caption className="sr-only">Line items</caption>
        <thead>
          <tr className="border-b border-ink/80 text-left">
            <th scope="col" className="pb-2 font-medium">Description</th>
            <th scope="col" className="w-16 pb-2 text-right font-medium">Qty</th>
            <th scope="col" className="w-32 pb-2 text-right font-medium">Rate</th>
            <th scope="col" className="w-36 pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i} className="border-b border-line align-top">
              <td className="py-3 pr-4 break-words whitespace-pre-line">{it.description}</td>
              <td className="num py-3 text-right text-ink-2">{formatQuantity(it.quantity)}</td>
              <td className="num py-3 text-right text-ink-2">{m(it.unit_price)}</td>
              <td className="num py-3 text-right">{m(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-8 divide-y divide-line border-y border-line sm:hidden">
        {data.items.map((it, i) => (
          <li key={i} className="py-3">
            <p className="text-sm break-words whitespace-pre-line">{it.description}</p>
            <div className="num mt-1 flex justify-between text-sm">
              <span className="text-ink-2">{formatQuantity(it.quantity)} × {m(it.unit_price)}</span>
              <span>{m(it.amount)}</span>
            </div>
          </li>
        ))}
      </ul>

      <dl className="num ml-auto mt-5 w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd>{m(data.subtotal)}</dd></div>
        {data.discount_amount > 0 && (
          <div className="flex justify-between"><dt className="text-ink-2">{discountLabel(data)}</dt><dd>−{m(data.discount_amount)}</dd></div>
        )}
        {data.tax_rate_bp > 0 && <div className="flex justify-between"><dt className="text-ink-2">{taxLine(data)}</dt><dd>{m(data.tax_amount)}</dd></div>}
        <div className="flex justify-between border-t border-ink/80 pt-2 text-md font-semibold"><dt>Total</dt><dd>{m(data.total)}</dd></div>
        {data.amount_paid > 0 && (
          <>
            <div className="flex justify-between text-ink-2"><dt>Paid</dt><dd>−{m(data.amount_paid)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{m(balance)}</dd></div>
          </>
        )}
      </dl>

      {(data.payment_terms || data.from.payment_instructions || data.notes) && (
        <div className="mt-10 grid gap-6 border-t border-line pt-6 text-sm sm:grid-cols-2">
          {data.from.payment_instructions && (
            <div><p className="eyebrow">How to pay</p><p className="mt-2 whitespace-pre-line text-ink-2">{data.from.payment_instructions}</p></div>
          )}
          {data.payment_terms && (
            <div><p className="eyebrow">Payment terms</p><p className="mt-2 whitespace-pre-line text-ink-2">{data.payment_terms}</p></div>
          )}
          {data.notes && (
            <div className="sm:col-span-2"><p className="eyebrow">Notes</p><p className="mt-2 whitespace-pre-line text-ink-2">{data.notes}</p></div>
          )}
        </div>
      )}
    </article>
  )
}
