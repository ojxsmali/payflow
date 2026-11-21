import { Link } from 'react-router-dom'
import type { ClientRevenue } from '../../lib/analytics'
import { formatMoney } from '../../lib/money'

/** Ranked list with proportional bars — readable values, no legend to decode. */
export function ClientBars({ rows, currency, limit = 5 }: { rows: ClientRevenue[]; currency: string; limit?: number }) {
  const top = rows.filter((r) => r.collected > 0 || r.outstanding > 0).slice(0, limit)
  const max = Math.max(1, ...top.map((r) => r.collected + r.outstanding))
  const total = rows.reduce((a, r) => a + r.collected, 0)
  if (!top.length) return <p className="py-6 text-sm text-muted">Client totals appear once invoices are paid.</p>
  return (
    <ol className="space-y-3.5">
      {top.map((r) => (
        <li key={r.clientId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <Link to={`/clients/${r.clientId}`} className="truncate text-ink hover:underline">{r.name}</Link>
            <span className="num shrink-0 font-medium">{formatMoney(r.collected, currency)}</span>
          </div>
          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <div className="h-full bg-accent" style={{ width: `${(r.collected / max) * 100}%` }} />
            <div className="h-full bg-warning/45" style={{ width: `${(r.outstanding / max) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {total > 0 ? `${Math.round((r.collected / total) * 100)}% of collected` : '—'}
            {r.outstanding > 0 && ` · ${formatMoney(r.outstanding, currency)} outstanding`}
          </p>
        </li>
      ))}
    </ol>
  )
}
