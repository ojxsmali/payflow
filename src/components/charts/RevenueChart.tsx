import { useId, useMemo, useState } from 'react'
import type { MonthPoint } from '../../lib/analytics'
import { formatMoney } from '../../lib/money'
import { monthLabel } from '../../lib/dates'

/**
 * Monthly bars: money collected (solid) against money invoiced (outline).
 * Hand-built SVG — two series, one axis, no library needed. Hover or focus a
 * month for exact values; a visually-hidden table carries the same data for
 * screen readers.
 */
export function RevenueChart({ data, currency, height = 220 }: { data: MonthPoint[]; currency: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null)
  const titleId = useId()
  const max = useMemo(() => niceMax(Math.max(1, ...data.flatMap((d) => [d.collected, d.invoiced]))), [data])
  const empty = data.every((d) => d.collected === 0 && d.invoiced === 0)

  const W = 640
  const H = height
  const padL = 4
  const padB = 24
  const padT = 8
  const plotH = H - padB - padT
  const slot = (W - padL) / data.length
  const barW = Math.min(22, slot * 0.28)
  const ticks = [0, max / 2, max]
  const y = (v: number) => padT + plotH - (v / max) * plotH
  const shown = active ?? data.length - 1
  const point = data[shown]

  return (
    <figure className="m-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div aria-live="polite">
          <p className="text-xs text-muted">{point ? monthLabel(point.month, true) : ''}</p>
          <p className="num mt-0.5 text-lg font-semibold">{formatMoney(point?.collected ?? 0, currency)} <span className="text-sm font-normal text-muted">collected</span></p>
          <p className="num text-sm text-ink-2">{formatMoney(point?.invoiced ?? 0, currency)} invoiced</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted" aria-hidden>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-accent" />Collected</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] border border-ink-2/50" />Invoiced</span>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-labelledby={titleId} preserveAspectRatio="none" style={{ height }}>
          <title id={titleId}>Collected and invoiced by month</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : '2 4'} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + slot * i + slot / 2
            const isActive = i === shown
            return (
              <g key={d.month} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
                <rect x={padL + slot * i} y={padT} width={slot} height={plotH + padB} fill={isActive && active !== null ? 'var(--color-sunken)' : 'transparent'} opacity={0.6} />
                <rect
                  className="animate-grow" style={{ animationDelay: `${i * 30}ms` }}
                  x={cx - barW - 1.5} y={y(d.invoiced)} width={barW} height={Math.max(0, plotH + padT - y(d.invoiced))}
                  fill="none" stroke="var(--color-ink-2)" strokeOpacity={0.45} vectorEffect="non-scaling-stroke" rx={1.5}
                />
                <rect
                  className="animate-grow" style={{ animationDelay: `${i * 30}ms` }}
                  x={cx + 1.5} y={y(d.collected)} width={barW} height={Math.max(0, plotH + padT - y(d.collected))}
                  fill="var(--color-accent)" opacity={isActive ? 1 : 0.82} rx={1.5}
                />
              </g>
            )
          })}
        </svg>
        {/* axis labels as HTML so they don't stretch with the SVG */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex" style={{ paddingLeft: `${(padL / W) * 100}%` }} aria-hidden>
          {data.map((d, i) => (
            <span key={d.month} className={`flex-1 text-center text-2xs ${i === shown ? 'text-ink' : 'text-muted'}`}>{monthLabel(d.month)}</span>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 text-2xs text-muted" aria-hidden>{formatMoney(max, currency, { compact: true })}</div>
        {empty && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">No payments or invoices in this period.</p>}
      </div>
      {/* keyboard access to exact values */}
      <div className="mt-3 flex flex-wrap gap-1 sm:hidden" role="group" aria-label="Choose month">
        {data.map((d, i) => (
          <button key={d.month} onClick={() => setActive(i)} className={`rounded px-1.5 py-0.5 text-2xs ${i === shown ? 'bg-ink text-surface' : 'text-muted'}`}>{monthLabel(d.month)}</button>
        ))}
      </div>
      <table className="sr-only">
        <caption>Collected and invoiced by month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Collected</th><th scope="col">Invoiced</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.month}><th scope="row">{monthLabel(d.month, true)}</th><td>{formatMoney(d.collected, currency)}</td><td>{formatMoney(d.invoiced, currency)}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

function niceMax(v: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / exp
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * exp
}
