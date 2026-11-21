import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../auth/AuthProvider'
import { useBusinessData } from '../hooks/useBusinessData'
import { METRIC_DEFINITIONS, monthlySeries, revenueByClient, summarize } from '../lib/analytics'
import { lastMonths, monthLabel, todayIn } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { STATUS_META, STATUS_ORDER } from '../lib/status'
import { EmptyState, ErrorNotice, PageHeader, Section, Segmented, Select, Skeleton, Button, cx } from '../components/ui'
import { RevenueChart } from '../components/charts/RevenueChart'

export function AnalyticsPage() {
  const profile = useProfile()
  const { data, error, reload } = useBusinessData()
  const [range, setRange] = useState<'6' | '12' | '24'>('12')
  const [currencyChoice, setCurrency] = useState<string>('')
  const today = todayIn(profile.timezone)

  const currencies = useMemo(() => {
    const set = new Set([profile.default_currency, ...(data?.invoices.map((i) => i.currency) ?? [])])
    return [...set]
  }, [data, profile.default_currency])
  const currency = currencyChoice || profile.default_currency

  const view = useMemo(() => {
    if (!data) return null
    const s = summarize(data.invoices, data.payments, currency, today)
    const months = lastMonths(today, Number(range))
    const series = monthlySeries(data.invoices, data.payments, currency, months)
    const clients = revenueByClient(data.invoices, data.payments, currency)
    const own = data.invoices.filter((i) => i.currency === currency)
    const byStatus = STATUS_ORDER.map((st) => {
      const rows = own.filter((i) => i.status === st)
      return { status: st, count: rows.length, amount: rows.reduce((a, i) => a + (st === 'paid' || st === 'draft' || st === 'cancelled' ? i.total : i.balance_due), 0) }
    })
    const periodCollected = series.reduce((a, p) => a + p.collected, 0)
    const periodInvoiced = series.reduce((a, p) => a + p.invoiced, 0)
    return { s, series, clients, byStatus, periodCollected, periodInvoiced, hasData: own.some((i) => i.status !== 'draft') }
  }, [data, currency, today, range])

  if (error && !data) return <ErrorNotice message={error} onRetry={reload} />

  const m = (v: number) => formatMoney(v, currency)
  const s = view?.s

  return (
    <>
      <PageHeader
        title="Analytics"
        meta="Collected is money received; invoiced is what you billed. Definitions at the bottom of the page."
        actions={currencies.length > 1 && (
          <Select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-auto">
            {currencies.map((c) => <option key={c}>{c}</option>)}
          </Select>
        )}
      />

      {view && !view.hasData ? (
        <EmptyState title="Nothing to analyse yet" body="Send an invoice and record a payment — revenue, collection rate and client totals will appear here." actions={<Button variant="primary" to="/invoices/new">Create invoice</Button>} />
      ) : (
        <>
          <dl className="grid grid-cols-2 border-y border-line md:grid-cols-4">
            {[
              { label: 'Collected, all time', v: s && m(s.collectedAllTime), def: METRIC_DEFINITIONS.collected },
              { label: 'Invoiced', v: s && m(s.invoicedTotal), def: METRIC_DEFINITIONS.invoiced, sub: s && `${s.issuedCount} invoice${s.issuedCount === 1 ? '' : 's'}` },
              { label: 'Outstanding', v: s && m(s.outstanding), def: METRIC_DEFINITIONS.outstanding },
              { label: 'Overdue', v: s && m(s.overdue), def: METRIC_DEFINITIONS.overdue, danger: !!s?.overdue },
              { label: 'Collection rate', v: s && (s.collectionRate === null ? '—' : `${s.collectionRate.toFixed(1)}%`), def: METRIC_DEFINITIONS.collectionRate },
              { label: 'Average invoice', v: s && (s.averageInvoice === null ? '—' : m(s.averageInvoice)), def: METRIC_DEFINITIONS.averageInvoice },
              { label: 'Average days to pay', v: s && (s.averageDaysToPay === null ? '—' : `${s.averageDaysToPay} days`), def: METRIC_DEFINITIONS.daysToPay },
              { label: 'Due in 7 days', v: s && m(s.dueSoon), def: METRIC_DEFINITIONS.dueSoon },
            ].map((f, i) => (
              <div key={f.label} className={cx('border-line py-4 pr-3', i % 2 === 1 && 'border-l pl-4', i >= 2 && 'border-t', 'md:border-l md:pl-5 md:[&:nth-child(4n+1)]:border-l-0 md:[&:nth-child(4n+1)]:pl-0', i < 4 ? 'md:border-t-0' : 'md:border-t')}>
                <dt className="label" title={f.def}>{f.label}</dt>
                <dd className={cx('num mt-1.5 text-lg font-semibold sm:text-xl', f.danger && 'text-danger')}>{f.v ?? <Skeleton className="h-6 w-24" />}</dd>
                {f.sub && <dd className="text-xs text-muted">{f.sub}</dd>}
              </div>
            ))}
          </dl>

          <Section
            className="mt-12"
            title="Revenue by month"
            action={<Segmented size="sm" label="Range" value={range} onChange={setRange} options={[{ value: '6', label: '6M' }, { value: '12', label: '12M' }, { value: '24', label: '24M' }]} />}
          >
            {!view ? <Skeleton className="h-72" /> : (
              <>
                <RevenueChart data={view.series} currency={currency} height={260} />
                <p className="mt-4 text-sm text-ink-2">
                  Last {range} months: <span className="num font-medium text-ink">{m(view.periodCollected)}</span> collected against <span className="num font-medium text-ink">{m(view.periodInvoiced)}</span> invoiced.
                </p>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted hover:text-ink">Show as table</summary>
                  <table className="mt-3 w-full max-w-lg text-sm">
                    <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2 font-medium">Month</th><th className="py-2 text-right font-medium">Invoiced</th><th className="py-2 text-right font-medium">Collected</th></tr></thead>
                    <tbody>{[...view.series].reverse().map((p) => <tr key={p.month} className="border-b border-line"><td className="py-2">{monthLabel(p.month, true)}</td><td className="num py-2 text-right">{m(p.invoiced)}</td><td className="num py-2 text-right">{m(p.collected)}</td></tr>)}</tbody>
                  </table>
                </details>
              </>
            )}
          </Section>

          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Section title="Revenue by client">
              {!view ? <Skeleton className="h-48" /> : view.clients.length === 0 ? <p className="text-sm text-muted">No issued invoices yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted">
                        <th scope="col" className="py-2 pr-3 font-medium">Client</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Invoiced</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Collected</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Outstanding</th>
                        <th scope="col" className="py-2 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.clients.map((c) => (
                        <tr key={c.clientId} className="border-b border-line">
                          <td className="max-w-44 truncate py-2.5 pr-3"><Link to={`/clients/${c.clientId}`} className="hover:underline">{c.name}</Link></td>
                          <td className="num py-2.5 pr-3 text-right text-ink-2">{m(c.invoiced)}</td>
                          <td className="num py-2.5 pr-3 text-right font-medium">{m(c.collected)}</td>
                          <td className={cx('num py-2.5 pr-3 text-right', c.outstanding ? 'text-ink' : 'text-muted')}>{m(c.outstanding)}</td>
                          <td className="py-2.5 text-right">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-sunken" aria-hidden><span className="block h-full bg-accent" style={{ width: `${s!.collectedAllTime ? (c.collected / s!.collectedAllTime) * 100 : 0}%` }} /></span>
                              <span className="num w-9 text-xs text-ink-2">{s!.collectedAllTime ? Math.round((c.collected / s!.collectedAllTime) * 100) : 0}%</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Invoices by status">
              {!view ? <Skeleton className="h-48" /> : (
                <ul className="divide-y divide-line text-sm">
                  {view.byStatus.filter((b) => b.count > 0).map((b) => (
                    <li key={b.status}>
                      <Link to={`/invoices?status=${b.status}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface">
                        <span className="flex items-center gap-2">{STATUS_META[b.status].label}<span className="num text-xs text-muted">{b.count}</span></span>
                        <span className="num">{m(b.amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted">Open statuses show the balance still due; paid, draft and cancelled show invoice totals.</p>
            </Section>
          </div>

          <section className="mt-14 border-t border-line pt-6" aria-labelledby="defs">
            <h2 id="defs" className="text-sm font-semibold">How these numbers are calculated</h2>
            <dl className="mt-4 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
              {Object.entries({
                Collected: METRIC_DEFINITIONS.collected,
                Invoiced: METRIC_DEFINITIONS.invoiced,
                Outstanding: METRIC_DEFINITIONS.outstanding,
                Overdue: METRIC_DEFINITIONS.overdue,
                'Collection rate': METRIC_DEFINITIONS.collectionRate,
                'Average invoice': METRIC_DEFINITIONS.averageInvoice,
                'Average days to pay': METRIC_DEFINITIONS.daysToPay,
                'Month-over-month': 'This month’s collected vs last month’s. Not shown when last month had nothing to compare against.',
              }).map(([k, v]) => (
                <div key={k}><dt className="font-medium">{k}</dt><dd className="mt-0.5 text-ink-2">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted">All figures are for {currency} invoices. Currencies are never mixed or converted.</p>
          </section>
        </>
      )}
    </>
  )
}
