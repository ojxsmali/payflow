import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Search, UserPlus } from 'lucide-react'
import { clientService, invoiceService } from '../services'
import { useLoad, invalidate } from '../hooks/useLoad'
import { Button, EmptyState, ErrorNotice, Input, PageHeader, SampleTag, Segmented, TableSkeleton, cx } from '../components/ui'
import { ClientFormDialog } from '../components/clients/ClientFormDialog'
import { useToast } from '../components/ui/Toast'
import { useProfile } from '../auth/AuthProvider'
import { formatMoney } from '../lib/money'
import { ISSUED_STATUSES, OPEN_STATUSES } from '../lib/status'

type SortKey = 'name' | 'invoices' | 'billed' | 'outstanding'

export function ClientsPage() {
  const profile = useProfile()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [show, setShow] = useState<'active' | 'archived'>('active')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const dialogOpen = params.get('new') === '1'

  const { data, error, reload } = useLoad(async () => {
    const [clients, invoices] = await Promise.all([clientService.list(), invoiceService.list()])
    return { clients, invoices }
  })

  const rows = useMemo(() => {
    if (!data) return []
    const cur = profile.default_currency
    const stats = new Map<string, { invoices: number; billed: number; outstanding: number; overdue: boolean }>()
    for (const i of data.invoices) {
      const s = stats.get(i.client_id) ?? { invoices: 0, billed: 0, outstanding: 0, overdue: false }
      s.invoices++
      if (i.currency === cur && ISSUED_STATUSES.includes(i.status)) s.billed += i.total
      if (i.currency === cur && OPEN_STATUSES.includes(i.status)) s.outstanding += i.balance_due
      if (i.status === 'overdue') s.overdue = true
      stats.set(i.client_id, s)
    }
    const needle = q.trim().toLowerCase()
    const dir = sort.dir === 'asc' ? 1 : -1
    return data.clients
      .filter((c) => (show === 'archived' ? !!c.archived_at : !c.archived_at))
      .filter((c) => !needle || [c.name, c.company_name, c.email, c.city].some((f) => f.toLowerCase().includes(needle)))
      .map((c) => ({ ...c, ...(stats.get(c.id) ?? { invoices: 0, billed: 0, outstanding: 0, overdue: false }) }))
      .sort((a, b) => (sort.key === 'name' ? a.name.localeCompare(b.name) : (a[sort.key] as number) - (b[sort.key] as number)) * dir)
  }, [data, q, show, sort, profile.default_currency])

  const archivedCount = data?.clients.filter((c) => c.archived_at).length ?? 0
  const closeDialog = () => setParams({}, { replace: true })
  const head = (key: SortKey, label: string, numeric = false) => {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cx('py-2.5 pr-4 text-xs font-medium text-muted', numeric && 'text-right')}>
        <button className={cx('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')} onClick={() => setSort({ key, dir: active && sort.dir === 'asc' ? 'desc' : active ? 'asc' : key === 'name' ? 'asc' : 'desc' })}>
          {label}{active && (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      </th>
    )
  }

  return (
    <>
      <PageHeader
        title="Clients"
        meta={data ? `${data.clients.length - archivedCount} active${archivedCount ? ` · ${archivedCount} archived` : ''}` : ' '}
        actions={<Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setParams({ new: '1' })}>Add client</Button>}
      />

      {error && !data && <ErrorNotice message={error} onRetry={reload} />}
      {!data && !error && <TableSkeleton rows={6} />}

      {data && data.clients.length === 0 && (
        <EmptyState title="No clients yet" body="Add your first client to start creating invoices." actions={<Button variant="primary" onClick={() => setParams({ new: '1' })}>Add client</Button>} />
      )}

      {data && data.clients.length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input type="search" aria-label="Search clients" placeholder="Name, company, email or city" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            {archivedCount > 0 && <Segmented label="Show" size="sm" value={show} onChange={setShow} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: `Archived (${archivedCount})` }]} />}
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No clients match “{q}”.</p>
          ) : (
            <>
              <table className="hidden w-full border-collapse sm:table">
                <thead>
                  <tr className="border-b border-line text-left">
                    {head('name', 'Client')}
                    <th scope="col" className="hidden py-2.5 pr-4 text-xs font-medium text-muted md:table-cell">Email</th>
                    {head('invoices', 'Invoices', true)}
                    {head('billed', 'Billed', true)}
                    {head('outstanding', 'Outstanding', true)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} onClick={(e) => !(e.target as HTMLElement).closest('a') && navigate(`/clients/${c.id}`)} className="cursor-pointer border-b border-line hover:bg-surface">
                      <td className="max-w-64 py-3 pr-4">
                        <span className="flex items-center gap-2">
                          <Link to={`/clients/${c.id}`} className="truncate font-medium text-ink hover:underline">{c.name}</Link>
                          {c.is_sample && <SampleTag />}
                        </span>
                        {c.company_name && c.company_name !== c.name && <span className="block truncate text-sm text-muted">{c.company_name}</span>}
                      </td>
                      <td className="hidden max-w-56 truncate py-3 pr-4 text-ink-2 md:table-cell">{c.email || <span className="text-muted">—</span>}</td>
                      <td className="num py-3 pr-4 text-right text-ink-2">{c.invoices}</td>
                      <td className="num py-3 pr-4 text-right">{formatMoney(c.billed, profile.default_currency)}</td>
                      <td className={cx('num py-3 pr-4 text-right', c.overdue ? 'text-danger' : c.outstanding ? 'text-ink' : 'text-muted')}>
                        {formatMoney(c.outstanding, profile.default_currency)}
                        {c.overdue && <span className="block text-xs">Overdue</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-line border-y border-line sm:hidden">
                {rows.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clients/${c.id}`} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="truncate text-sm text-muted">{c.invoices} invoice{c.invoices === 1 ? '' : 's'}{c.email && ` · ${c.email}`}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cx('num text-sm font-medium', c.overdue && 'text-danger')}>{formatMoney(c.outstanding, profile.default_currency)}</p>
                        <p className="text-xs text-muted">outstanding</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Amounts in {profile.default_currency}; drafts and cancelled invoices excluded.</p>
            </>
          )}
        </>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSaved={(c) => {
          closeDialog()
          invalidate()
          toast(`${c.name} added.`)
          navigate(`/clients/${c.id}`)
        }}
      />
    </>
  )
}
