import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { activityService } from '../../services'
import { useLoad } from '../../hooks/useLoad'
import { relativeTime } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { PAYMENT_METHODS } from '../../lib/status'
import type { InvoiceEvent, PaymentMethod } from '../../types'
import { Skeleton } from '../ui'

export function eventText(e: InvoiceEvent, currency = 'INR') {
  const d = e.detail as Record<string, string | number | undefined>
  switch (e.kind) {
    case 'created': return d.duplicated_from ? `Created as a copy of ${d.duplicated_from}` : 'Created as a draft'
    case 'edited': return 'Edited after sending'
    case 'sent': return d.channel === 'email' ? `Emailed to ${d.to ?? 'client'}` : 'Marked as sent'
    case 'resent': return d.channel === 'email' ? `Emailed again to ${d.to ?? 'client'}` : 'Marked as sent again'
    case 'viewed': return 'Client opened the invoice link'
    case 'payment_recorded': return d.amount ? `Payment of ${formatMoney(Number(d.amount), currency)} recorded${d.method ? ` · ${PAYMENT_METHODS[d.method as PaymentMethod]}` : ''}` : 'Payment recorded'
    case 'payment_voided': return `Payment of ${formatMoney(Number(d.amount ?? 0), currency)} voided${d.reason ? ` — ${d.reason}` : ''}`
    case 'paid': return 'Paid in full'
    case 'cancelled': return `Cancelled${d.reason ? ` — ${d.reason}` : ''}`
  }
}

/** Recent invoice activity across the account. Notifications without the noise: one feed, no badges. */
export function ActivityFeed({ onClose }: { onClose: () => void }) {
  const { data, loading, error } = useLoad(() => activityService.recent(30))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/10" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label="Recent activity"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm animate-rise flex-col border-l border-line bg-surface shadow-[var(--shadow-pop)] outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-md font-semibold">Activity</h2>
          <button onClick={onClose} aria-label="Close activity" className="rounded p-1 text-muted hover:bg-sunken hover:text-ink"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && !data && <div className="space-y-4 py-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}</div>}
          {error && <p className="py-4 text-sm text-danger">{error}</p>}
          {data && data.length === 0 && <p className="py-6 text-sm text-muted">Nothing yet. Invoice events — sent, viewed, paid — will show up here.</p>}
          <ol className="divide-y divide-line">
            {data?.map((e) => (
              <li key={e.id}>
                <Link to={`/invoices/${e.invoice_id}`} onClick={onClose} className="block py-3 hover:bg-paper/60 -mx-2 px-2 rounded">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs text-ink-2">{e.invoices?.invoice_number}</span>
                    <span className="text-xs text-muted">{relativeTime(e.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink">{eventText(e, e.invoices?.currency)}</p>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  )
}
