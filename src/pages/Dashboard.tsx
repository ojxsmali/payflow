import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { spotlight } from '../lib/effects'
import { ArrowRight, FilePlus2, UserPlus } from 'lucide-react'
import { useProfile } from '../auth/AuthProvider'
import { useBusinessData } from '../hooks/useBusinessData'
import { monthlySeries, revenueByClient, summarize, type Summary } from '../lib/analytics'
import { dueLabel, lastMonths, monthLabel, todayIn } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { Button, ErrorNotice, PageHeader, Section, Segmented, Skeleton, StatusBadge, TableSkeleton, cx } from '../components/ui'
import { InvoiceTable } from '../components/invoices/InvoiceTable'
import { RevenueChart } from '../components/charts/RevenueChart'
import { ClientBars } from '../components/charts/ClientBars'
import { sampleService } from '../services'
import { invalidate } from '../hooks/useLoad'
import { useToast } from '../components/ui/Toast'
import { humanError } from '../lib/errors'
import type { InvoiceRow } from '../types'

export function DashboardPage() {
  const profile = useProfile()
  const { data, error, reload } = useBusinessData()
  const [range, setRange] = useState<'6' | '12'>('6')
  const today = todayIn(profile.timezone)
  const currency = profile.default_currency

  const view = useMemo(() => {
    if (!data) return null
    const { invoices, payments } = data
    const summary = summarize(invoices, payments, currency, today)
    const series = monthlySeries(invoices, payments, currency, lastMonths(today, Number(range)))
    const clients = revenueByClient(invoices, payments, currency)
    const attention = invoices
      .filter((i) => i.status === 'overdue' || (['sent', 'viewed', 'partially_paid'].includes(i.status) && i.days_until_due <= 7))
      .sort((a, b) => a.days_until_due - b.days_until_due)
    const drafts = invoices.filter((i) => i.status === 'draft')
    return { summary, series, clients, attention, drafts, recent: invoices.slice(0, 6), empty: invoices.length === 0 }
  }, [data, currency, today, range])

  if (error && !data) return <ErrorNotice message={error} onRetry={reload} />

  if (view?.empty) return <FirstRun name={profile.full_name} hasClient={data!.hasClient} />

  const s = view?.summary
  const month = monthLabel(today.slice(0, 7))
  const lastMonth = monthLabel(lastMonths(today, 2)[0])

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: profile.timezone }).format(new Date())}
        title="Overview"
        meta={s ? headline(s, currency) : <Skeleton className="h-4 w-72" />}
        actions={<Button variant="primary" to="/invoices/new" icon={<FilePlus2 className="size-4" />}>New invoice</Button>}
      />

      {/* Ledger strip: four numbers that answer "where do I stand?" — each opens the invoices behind it */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure
          label={`Collected in ${month}`}
          value={s && formatMoney(s.collectedThisMonth, currency)}
          sub={s && (s.monthChange === null
            ? s.collectedLastMonth === 0 ? `Nothing collected in ${lastMonth}` : ''
            : <span className={s.monthChange >= 0 ? 'text-success' : 'text-danger'}>{s.monthChange >= 0 ? '+' : '−'}{Math.abs(s.monthChange).toFixed(1)}% vs {lastMonth}</span>)}
          to="/analytics"
          hero
        />
        <Figure label="Outstanding" value={s && formatMoney(s.outstanding, currency)} sub={s && plural(s.outstandingCount, 'open invoice')} to="/invoices?status=open" />
        <Figure label="Overdue" tone={s && s.overdue > 0 ? 'danger' : undefined} value={s && formatMoney(s.overdue, currency)} sub={s && (s.overdueCount ? plural(s.overdueCount, 'invoice') : 'Nothing overdue')} to="/invoices?status=overdue" />
        <Figure label="Due in the next 7 days" value={s && formatMoney(s.dueSoon, currency)} sub={s && plural(s.dueSoonCount, 'invoice')} to="/invoices?status=due_soon" />
      </div>
      {s && s.otherCurrencies.length > 0 && (
        <p className="mt-2 text-xs text-muted">Figures are in {currency}. Invoices in {s.otherCurrencies.join(', ')} are tracked separately on the Analytics page.</p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Section title="Needs attention" action={view && view.attention.length > 0 ? <Link to="/invoices?status=open" className="link text-xs">All open</Link> : undefined}>
          {!view ? <TableSkeleton rows={3} /> : <AttentionList items={view.attention} drafts={view.drafts} />}
        </Section>

        <Section
          title="Revenue"
          action={<Segmented size="sm" label="Chart range" value={range} onChange={setRange} options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }]} />}
        >
          {!view ? <Skeleton className="h-64" /> : <RevenueChart data={view.series} currency={currency} />}
        </Section>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Section title="Recent invoices" action={<Link to="/invoices" className="link text-xs">View all</Link>}>
          {!view ? <TableSkeleton /> : <InvoiceTable invoices={view.recent} />}
        </Section>
        <Section title="Top clients" action={<Link to="/analytics" className="link text-xs">Analytics</Link>}>
          {!view ? <TableSkeleton rows={3} /> : <ClientBars rows={view.clients} currency={currency} />}
        </Section>
      </div>
    </>
  )
}

function headline(s: Summary, currency: string) {
  if (s.overdueCount) return `${plural(s.overdueCount, 'invoice')} overdue, totalling ${formatMoney(s.overdue, currency)}.`
  if (s.dueSoonCount) return `${plural(s.dueSoonCount, 'invoice')} due this week. Nothing overdue.`
  if (s.outstandingCount) return `${formatMoney(s.outstanding, currency)} outstanding, none of it late.`
  return 'Everything sent has been paid.'
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function Figure({ label, value, sub, to, tone, hero }: { label: string; value?: string | false | null; sub?: React.ReactNode; to: string; tone?: 'danger'; hero?: boolean }) {
  return (
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 420, damping: 24 }} className={hero ? 'col-span-2 lg:col-span-1' : ''}>
      <Link
        to={to}
        onPointerMove={spotlight}
        className={cx(
          'pf-spot group flex h-full flex-col rounded-lg border p-5 transition-shadow',
          hero
            ? 'overflow-hidden border-transparent bg-night text-white'
            : 'border-line bg-surface',
        )}
      >
        <p className={cx('relative flex items-center justify-between text-xs font-medium', hero ? 'text-white/65' : 'text-muted')}>
          {label}
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
        </p>
        {value ? (
          <p className={cx('num relative mt-4 text-xl font-semibold tracking-[-0.045em] sm:text-[2.1rem]', hero ? 'text-white' : tone === 'danger' ? 'text-danger' : 'text-ink')}>{value}</p>
        ) : (
          <Skeleton className="mt-4 h-8 w-28" />
        )}
        <p className={cx('relative mt-1 min-h-5 text-sm', hero ? 'text-white/60 [&_.text-success]:text-brass [&_.text-danger]:text-[#ff8f80]' : 'text-muted')}>{sub}</p>
      </Link>
    </motion.div>
  )
}
function AttentionList({ items, drafts }: { items: InvoiceRow[]; drafts: InvoiceRow[] }) {
  if (!items.length && !drafts.length)
    return <p className="py-6 text-sm text-muted">Nothing needs you right now. Overdue and soon-due invoices will show up here.</p>
  return (
    <ul className="divide-y divide-line">
      {items.slice(0, 6).map((inv) => (
        <li key={inv.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs text-ink-2">{inv.invoice_number}</span>
              <span className="truncate text-ink">{inv.client_name}</span>
            </p>
            <p className={cx('mt-0.5 text-sm', inv.status === 'overdue' ? 'text-danger' : 'text-warning')}>{dueLabel(inv.days_until_due)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="num text-sm font-medium">{formatMoney(inv.balance_due, inv.currency)}</span>
            <Button size="sm" to={`/invoices/${inv.id}`}>View</Button>
          </div>
        </li>
      ))}
      {drafts.length > 0 && (
        <li className="flex items-center justify-between gap-4 py-3">
          <div className="text-sm">
            <p className="text-ink">{plural(drafts.length, 'draft')} not sent yet</p>
            <p className="mt-0.5 flex items-center gap-2"><StatusBadge status="draft" className="text-xs" /></p>
          </div>
          <Button size="sm" to="/invoices?status=draft">Review</Button>
        </li>
      )}
    </ul>
  )
}

function FirstRun({ name, hasClient }: { name: string; hasClient: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function loadSample() {
    setBusy(true)
    try {
      await sampleService.load()
      invalidate()
      toast('Sample data added. Remove it any time in Settings.')
    } catch (e) {
      toast(humanError(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Overview" title={`Welcome to PayFlow${name ? `, ${name.split(' ')[0]}` : ''}.`} meta="Create your first client and invoice to start tracking your business." />
      <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {[
          { n: 1, title: hasClient ? 'Client added' : 'Add a client', body: hasClient ? 'You can add more any time from Clients.' : 'Who you bill: name, email, and any tax details for the invoice.', action: hasClient ? <Button to="/clients">View clients</Button> : <Button variant="primary" to="/clients?new=1" icon={<UserPlus className="size-4" />}>Add client</Button> },
          { n: 2, title: 'Create an invoice', body: 'Line items, tax and discount. Totals are calculated for you.', action: <Button variant={hasClient ? 'primary' : 'secondary'} to="/invoices/new" icon={<FilePlus2 className="size-4" />}>Create invoice</Button> },
          { n: 3, title: 'Send and track', body: 'Email it or share a link, then record payments as they arrive.', action: null },
        ].map((s) => (
          <li key={s.n} className="flex flex-col gap-2 bg-surface p-6">
            <span className="font-mono text-xs text-muted">0{s.n}</span>
            <h2 className="text-md font-semibold">{s.title}</h2>
            <p className="text-sm text-ink-2">{s.body}</p>
            {s.action && <div className="mt-auto pt-3">{s.action}</div>}
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-2">Just looking around? Load a sample workspace with four made-up clients and a few months of invoices. Everything it adds is labelled <em>Sample</em>.</p>
        <Button onClick={loadSample} loading={busy} className="shrink-0">Load sample data</Button>
      </div>
    </div>
  )
}
