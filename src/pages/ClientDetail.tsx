import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, FilePlus2, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import { useProfile } from '../auth/AuthProvider'
import { clientService, invoiceService, paymentService } from '../services'
import { useLoad, invalidate } from '../hooks/useLoad'
import { Button, EmptyState, ErrorNotice, PageHeader, SampleTag, Section, Skeleton, cx } from '../components/ui'
import { InvoiceTable } from '../components/invoices/InvoiceTable'
import { ClientFormDialog } from '../components/clients/ClientFormDialog'
import { useToast } from '../components/ui/Toast'
import { Dialog } from '../components/ui/Dialog'
import { formatMoney } from '../lib/money'
import { formatDate } from '../lib/dates'
import { ISSUED_STATUSES, OPEN_STATUSES, PAYMENT_METHODS } from '../lib/status'
import { humanError } from '../lib/errors'

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const profile = useProfile()
  const toast = useToast()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, error, reload } = useLoad(async () => {
    const [client, invoices, payments] = await Promise.all([clientService.get(id), invoiceService.listForClient(id), paymentService.listAll()])
    const ids = new Set(invoices.map((i) => i.id))
    return { client, invoices, payments: payments.filter((p) => ids.has(p.invoice_id) && !p.voided_at) }
  }, [id])

  // totals per currency — a client might be billed in more than one
  const totals = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { billed: number; paid: number; outstanding: number; overdue: number }>()
    for (const i of data.invoices) {
      if (!ISSUED_STATUSES.includes(i.status)) continue
      const t = map.get(i.currency) ?? { billed: 0, paid: 0, outstanding: 0, overdue: 0 }
      t.billed += i.total
      t.paid += i.amount_paid
      if (OPEN_STATUSES.includes(i.status)) t.outstanding += i.balance_due
      if (i.status === 'overdue') t.overdue += i.balance_due
      map.set(i.currency, t)
    }
    if (!map.size) map.set(profile.default_currency, { billed: 0, paid: 0, outstanding: 0, overdue: 0 })
    return [...map.entries()]
  }, [data, profile.default_currency])

  if (error && !data) return <ErrorNotice message={error} onRetry={reload} />
  if (!data) return <div className="space-y-6"><Skeleton className="h-9 w-64" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>

  const { client, invoices, payments } = data
  const archived = !!client.archived_at
  const invoiceNumber = new Map(invoices.map((i) => [i.id, i]))

  async function toggleArchive() {
    try {
      await clientService.setArchived(client.id, !archived)
      invalidate()
      toast(archived ? `${client.name} restored.` : `${client.name} archived. Their invoices are kept.`)
    } catch (e) {
      toast(humanError(e), 'error')
    }
  }
  async function remove() {
    try {
      await clientService.remove(client.id)
      invalidate()
      toast(`${client.name} deleted.`)
      navigate('/clients', { replace: true })
    } catch (e) {
      toast(humanError(e), 'error')
      setConfirmDelete(false)
    }
  }

  const contact = [
    client.email && { icon: Mail, text: client.email, href: `mailto:${client.email}` },
    client.phone && { icon: Phone, text: client.phone, href: `tel:${client.phone}` },
  ].filter(Boolean) as { icon: typeof Mail; text: string; href: string }[]

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/clients" className="hover:text-ink">Clients</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{client.name}{client.is_sample && <SampleTag />}{archived && <span className="rounded-sm border border-line-strong px-1.5 py-px font-sans text-xs text-muted">Archived</span>}</span>}
        meta={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {client.company_name && client.company_name !== client.name && <span>{client.company_name}</span>}
            {contact.map((c) => <a key={c.text} href={c.href} className="flex items-center gap-1.5 hover:text-ink"><c.icon className="size-3.5" />{c.text}</a>)}
            {[client.city, client.country].filter(Boolean).join(', ')}
          </span>
        }
        actions={
          <>
            {!archived && <Button variant="primary" icon={<FilePlus2 className="size-4" />} to={`/invoices/new?client=${client.id}`}>New invoice</Button>}
            <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Edit</Button>
            {invoices.length === 0 ? (
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>Delete</Button>
            ) : (
              <Button variant="ghost" icon={archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />} onClick={toggleArchive}>{archived ? 'Restore' : 'Archive'}</Button>
            )}
          </>
        }
      />

      {totals.map(([cur, t]) => (
        <dl key={cur} className="mb-10 grid grid-cols-3 border-y border-line">
          {[
            { label: `Total billed${totals.length > 1 ? ` (${cur})` : ''}`, value: t.billed },
            { label: 'Paid', value: t.paid, cls: 'text-success' },
            { label: 'Outstanding', value: t.outstanding, cls: t.overdue ? 'text-danger' : undefined, sub: t.overdue ? `${formatMoney(t.overdue, cur)} overdue` : undefined },
          ].map((f, i) => (
            <div key={f.label} className={cx('py-4', i > 0 && 'border-l border-line pl-4 sm:pl-6')}>
              <dt className="label">{f.label}</dt>
              <dd className={cx('num mt-1.5 text-lg font-semibold sm:text-xl', f.cls)}>{formatMoney(f.value, cur)}</dd>
              {f.sub && <dd className="text-xs text-danger">{f.sub}</dd>}
            </div>
          ))}
        </dl>
      ))}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Section title="Invoice history">
          {invoices.length === 0 ? (
            <EmptyState title="No invoices yet" body={archived ? 'This client is archived.' : `Create the first invoice for ${client.name}.`} actions={!archived && <Button variant="primary" to={`/invoices/new?client=${client.id}`}>Create invoice</Button>} />
          ) : (
            <InvoiceTable invoices={invoices} showClient={false} />
          )}
        </Section>
        <div className="flex flex-col gap-10">
          <Section title="Recent payments">
            {payments.length === 0 ? (
              <p className="text-sm text-muted">Payments will appear here once {client.name} starts paying.</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.slice(0, 8).map((p) => {
                  const inv = invoiceNumber.get(p.invoice_id)!
                  return (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                      <div>
                        <p className="num font-medium">{formatMoney(p.amount, inv.currency)}</p>
                        <p className="text-xs text-muted">{formatDate(p.paid_on)} · {PAYMENT_METHODS[p.method]}</p>
                      </div>
                      <Link to={`/invoices/${inv.id}`} className="font-mono text-xs text-ink-2 hover:underline">{inv.invoice_number}</Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
          {(client.address || client.tax_id || client.notes) && (
            <Section title="Details">
              <dl className="space-y-3 text-sm">
                {client.address && <div><dt className="label">Address</dt><dd className="mt-0.5 whitespace-pre-line text-ink-2">{client.address}</dd></div>}
                {client.tax_id && <div><dt className="label">Tax ID</dt><dd className="mt-0.5 font-mono text-xs text-ink-2">{client.tax_id}</dd></div>}
                {client.notes && <div><dt className="label">Private notes</dt><dd className="mt-0.5 whitespace-pre-line text-ink-2">{client.notes}</dd></div>}
              </dl>
            </Section>
          )}
        </div>
      </div>

      <ClientFormDialog open={editing} client={client} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); invalidate(); toast('Client updated.') }} />
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${client.name}?`}
        description="This client has no invoices, so it can be removed completely. This can’t be undone."
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep client</Button><Button variant="danger" onClick={remove}>Delete client</Button></>}
      >
        <p className="text-sm text-ink-2">Clients with invoices can only be archived, so your financial history stays complete.</p>
      </Dialog>
    </>
  )
}
