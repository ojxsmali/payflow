import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { FilePlus2, Search, X } from 'lucide-react'
import { useBusinessData } from '../hooks/useBusinessData'
import { InvoiceTable, sortInvoices, type Sort, type SortKey } from '../components/invoices/InvoiceTable'
import { Button, EmptyState, ErrorNotice, Input, PageHeader, Select, TableSkeleton, cx } from '../components/ui'
import { STATUS_META, OPEN_STATUSES } from '../lib/status'
import { formatMoney, parseMoney } from '../lib/money'
import type { InvoiceRow, InvoiceStatus } from '../types'

type Filter = 'all' | 'open' | 'due_soon' | InvoiceStatus
const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

function matchesStatus(inv: InvoiceRow, f: Filter) {
  if (f === 'all') return true
  if (f === 'open') return OPEN_STATUSES.includes(inv.status)
  if (f === 'due_soon') return OPEN_STATUSES.includes(inv.status) && inv.status !== 'overdue' && inv.days_until_due >= 0 && inv.days_until_due <= 7
  return inv.status === f
}

export function InvoicesPage() {
  const { data, error, loading, reload } = useBusinessData()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as Filter) || 'all'
  const q = params.get('q') ?? ''
  const client = params.get('client') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const min = params.get('min') ?? ''
  const currency = params.get('currency') ?? ''
  const sort: Sort = { key: (params.get('sort') as SortKey) || 'issue_date', dir: params.get('dir') === 'asc' ? 'asc' : 'desc' }

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: true })
  }

  const invoices = data?.invoices ?? []
  const clients = useMemo(() => [...new Map(invoices.map((i) => [i.client_id, i.client_name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [invoices])
  const currencies = useMemo(() => [...new Set(invoices.map((i) => i.currency))], [invoices])
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, invoices.filter((i) => matchesStatus(i, t.value)).length])), [invoices])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const minMinor = min ? parseMoney(min) : null
    const filtered = invoices.filter((i) =>
      matchesStatus(i, status) &&
      (!client || i.client_id === client) &&
      (!currency || i.currency === currency) &&
      (!from || i.issue_date >= from) &&
      (!to || i.issue_date <= to) &&
      (minMinor === null || i.total >= minMinor) &&
      (!needle || [i.invoice_number, i.client_name, i.client_company, i.client_email, STATUS_META[i.status].label].some((f) => f.toLowerCase().includes(needle))),
    )
    return sortInvoices(filtered, sort)
  }, [invoices, status, client, currency, from, to, min, q, sort.key, sort.dir])

  const filtersActive = Boolean(q || client || from || to || min || currency)
  const totals = useMemo(() => {
    const byCur = new Map<string, { total: number; due: number }>()
    for (const r of rows) {
      if (r.status === 'cancelled' || r.status === 'draft') continue
      const t = byCur.get(r.currency) ?? { total: 0, due: 0 }
      t.total += r.total
      t.due += r.balance_due
      byCur.set(r.currency, t)
    }
    return [...byCur.entries()]
  }, [rows])

  return (
    <>
      <PageHeader
        title="Invoices"
        meta={data ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}` : ' '}
        actions={<Button variant="primary" to="/invoices/new" icon={<FilePlus2 className="size-4" />}>New invoice</Button>}
      />

      {/* Status tabs — scroll horizontally on small screens */}
      <div role="tablist" aria-label="Filter by status" className="-mx-4 mb-5 flex gap-1 overflow-x-auto overflow-y-hidden px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-1">
        {(status === 'due_soon' ? [...TABS.slice(0, 2), { value: 'due_soon' as Filter, label: 'Due in 7 days' }, ...TABS.slice(2)] : TABS).map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={status === t.value}
            onClick={() => set({ status: t.value === 'all' ? '' : t.value })}
            className={cx(
              'pf-press relative isolate flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
              status === t.value ? 'text-ink' : 'text-muted hover:bg-sunken hover:text-ink',
            )}
          >
            {status === t.value && <motion.span layoutId="pf-status-tab" transition={{ type: 'spring', stiffness: 500, damping: 36 }} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-lime ring-2 ring-ink" />}
            {t.label}
            {data && <span className={cx('num rounded-full px-1.5 font-mono text-2xs', status === t.value ? 'bg-ink text-lime' : 'bg-sunken text-muted')}>{counts[t.value] ?? rows.length}</span>}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" aria-label="Search invoices" placeholder="Number, client, email or status" value={q} onChange={(e) => set({ q: e.target.value })} className="pl-9" />
        </div>
        <Select aria-label="Client" value={client} onChange={(e) => set({ client: e.target.value })} className="min-w-40 flex-1 sm:w-48 sm:flex-none">
          <option value="">All clients</option>
          {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
        <label className="flex flex-1 items-center gap-2 text-sm text-muted sm:flex-none">
          <span className="sr-only sm:not-sr-only">From</span>
          <Input type="date" aria-label="Issued from" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value })} className="w-36" />
        </label>
        <label className="flex flex-1 items-center gap-2 text-sm text-muted sm:flex-none">
          <span className="sr-only sm:not-sr-only">to</span>
          <Input type="date" aria-label="Issued until" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value })} className="w-36" />
        </label>
        <Input inputMode="decimal" aria-label="Minimum amount" placeholder="Min. amount" value={min} onChange={(e) => set({ min: e.target.value })} className="w-32" />
        {currencies.length > 1 && (
          <Select aria-label="Currency" value={currency} onChange={(e) => set({ currency: e.target.value })} className="w-auto">
            <option value="">All currencies</option>
            {currencies.map((c) => <option key={c}>{c}</option>)}
          </Select>
        )}
        {filtersActive && (
          <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} onClick={() => set({ q: '', client: '', from: '', to: '', min: '', currency: '' })}>
            Clear
          </Button>
        )}
      </div>

      {error && !data && <ErrorNotice message={error} onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={8} />}

      {data && invoices.length === 0 && (
        <EmptyState
          title="No invoices yet"
          body="Create your first invoice and start tracking your revenue."
          actions={<Button variant="primary" to="/invoices/new">Create invoice</Button>}
        />
      )}
      {data && invoices.length > 0 && rows.length === 0 && (
        <EmptyState title="No matching invoices" body="Try a different status, or clear the search and filters." actions={filtersActive || status !== 'all' ? <Button onClick={() => setParams({}, { replace: true })}>Show all invoices</Button> : undefined} />
      )}
      {rows.length > 0 && (
        <>
          <InvoiceTable invoices={rows} sort={sort} onSort={(s) => set({ sort: s.key === 'issue_date' && s.dir === 'desc' ? '' : s.key, dir: s.dir === 'desc' ? '' : 'asc' })} />
          <p className="mt-4 text-right text-sm text-muted">
            {rows.length} shown
            {totals.map(([cur, t]) => (
              <span key={cur}> · <span className="num text-ink">{formatMoney(t.total, cur)}</span> billed, <span className="num text-ink">{formatMoney(t.due, cur)}</span> unpaid</span>
            ))}
          </p>
        </>
      )}
    </>
  )
}
