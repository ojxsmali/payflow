import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Ban, Copy, Download, Eye, MoreHorizontal, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useProfile } from '../auth/AuthProvider'
import { clientService, invoiceService, paymentService } from '../services'
import { useLoad, invalidate } from '../hooks/useLoad'
import { Button, ErrorNotice, PageHeader, SampleTag, Skeleton, StatusBadge, cx } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { InvoiceDocument } from '../components/invoices/InvoiceDocument'
import { toDocumentData } from '../components/invoices/document'
import { CancelInvoiceDialog, PaymentDialog, SendDialog, VoidPaymentDialog } from '../components/invoices/dialogs'
import { eventText } from '../components/layout/ActivityFeed'
import { formatMoney } from '../lib/money'
import { dueLabel, formatDate, formatDateTime } from '../lib/dates'
import { PAYMENT_METHODS, STATUS_META } from '../lib/status'
import { humanError } from '../lib/errors'
import { logoUrl } from '../lib/supabase'
import type { Payment } from '../types'

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const profile = useProfile()
  const navigate = useNavigate()
  const toast = useToast()

  const { data, error, reload } = useLoad(async () => {
    const [invoice, items, payments, events] = await Promise.all([
      invoiceService.get(id), invoiceService.items(id), paymentService.listForInvoice(id), invoiceService.events(id),
    ])
    const client = await clientService.get(invoice.client_id)
    return { invoice, items, payments, events, client }
  }, [id])

  const [dialog, setDialog] = useState<null | 'pay' | 'send' | 'cancel'>(null)
  const [voiding, setVoiding] = useState<Payment | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    if (params.get('send') === '1' && data) {
      setDialog('send')
      setParams({}, { replace: true })
    }
  }, [params, data, setParams])

  if (error && !data) return <ErrorNotice message={error.includes('Not found') ? 'This invoice doesn’t exist or was deleted.' : error} onRetry={reload} />
  if (!data) return <DetailSkeleton />

  const { invoice: inv, items, payments, events, client } = data
  const doc = toDocumentData(inv, items, profile, client)
  const logo = logoUrl(profile.logo_path)
  const publicUrl = `${window.location.origin}/i/${inv.public_token}`
  const m = (v: number) => formatMoney(v, inv.currency, { cents: true })
  const isDraft = inv.status === 'draft'
  const isCancelled = inv.status === 'cancelled'
  const canPay = ['sent', 'viewed', 'partially_paid', 'overdue'].includes(inv.status)
  const canEdit = !isCancelled && inv.amount_paid === 0
  const livePayments = payments.filter((p) => !p.voided_at)

  async function downloadPdf() {
    setPdfBusy(true)
    try {
      const { renderInvoicePdf } = await import('../components/invoices/pdf')
      const blob = await renderInvoicePdf(doc, logo)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${inv.invoice_number}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      toast('The PDF couldn’t be generated. Try again, or use Preview → Print.', 'error')
    } finally {
      setPdfBusy(false)
    }
  }

  async function duplicate() {
    try {
      const newId = await invoiceService.duplicate(inv.id)
      invalidate()
      toast(`Copied to a new draft.`)
      navigate(`/invoices/${newId}/edit`)
    } catch (e) {
      toast(humanError(e), 'error')
    }
  }

  async function deleteDraft() {
    if (!window.confirm(`Delete draft ${inv.invoice_number}? Drafts were never sent, so nothing else is affected. This can’t be undone.`)) return
    try {
      await invoiceService.deleteDraft(inv.id)
      invalidate()
      toast('Draft deleted.')
      navigate('/invoices', { replace: true })
    } catch (e) {
      toast(humanError(e), 'error')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/invoices" className="hover:text-ink">Invoices</Link>}
        title={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-[0.8em] tracking-tight">{inv.invoice_number}</span>
            <StatusBadge status={inv.status} className="font-sans text-base" />
            {inv.is_sample && <SampleTag />}
          </span>
        }
        meta={<>For <Link to={`/clients/${client.id}`} className="link">{client.name}</Link> · Issued {formatDate(inv.issue_date)}</>}
        actions={
          <>
            {isDraft && <Button variant="primary" icon={<Send className="size-4" />} onClick={() => setDialog('send')}>Send invoice</Button>}
            {canPay && <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDialog('pay')}>Record payment</Button>}
            <Button icon={<Download className="size-4" />} onClick={downloadPdf} loading={pdfBusy}>PDF</Button>
            <MoreMenu
              items={[
                canEdit && { label: 'Edit', icon: Pencil, to: `/invoices/${inv.id}/edit` },
                !isDraft && !isCancelled && { label: 'Resend', icon: Send, onClick: () => setDialog('send') },
                { label: 'Preview', icon: Eye, to: `/invoices/${inv.id}/preview` },
                !isDraft && { label: 'Copy client link', icon: Copy, onClick: async () => { try { await navigator.clipboard.writeText(publicUrl); toast('Link copied.') } catch { toast('Couldn’t copy the link.', 'error') } } },
                { label: 'Duplicate', icon: Copy, onClick: duplicate },
                !isDraft && !isCancelled && { label: 'Cancel invoice', icon: Ban, onClick: () => setDialog('cancel'), danger: true },
                isDraft && { label: 'Delete draft', icon: Trash2, onClick: deleteDraft, danger: true },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 lg:order-1">
          <InvoiceDocument data={doc} logoUrl={logo} />
        </div>

        <aside className="order-1 flex flex-col gap-8 lg:order-2" aria-label="Invoice status">
          {/* Balance */}
          <section className="rounded-lg border border-line bg-surface p-5">
            <p className="label">{inv.status === 'paid' ? 'Paid in full' : isCancelled ? 'Cancelled' : isDraft ? 'Total' : 'Balance due'}</p>
            <p className={cx('num mt-1 text-xl font-semibold', inv.status === 'overdue' && 'text-danger')}>{m(isDraft || inv.status === 'paid' || isCancelled ? inv.total : inv.balance_due)}</p>
            {canPay && <p className={cx('mt-1 text-sm', inv.status === 'overdue' ? 'text-danger' : 'text-muted')}>{dueLabel(inv.days_until_due)} · {formatDate(inv.due_date)}</p>}
            {isDraft && <p className="mt-1 text-sm text-muted">{STATUS_META.draft.help}</p>}
            {inv.total > 0 && !isDraft && !isCancelled && (
              <>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Amount paid" aria-valuemin={0} aria-valuemax={inv.total} aria-valuenow={inv.amount_paid}>
                  <div className="h-full bg-success transition-[width] duration-500" style={{ width: `${(inv.amount_paid / inv.total) * 100}%` }} />
                </div>
                <dl className="num mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted">Total</dt><dd>{m(inv.total)}</dd></div>
                  <div className="text-right"><dt className="text-xs text-muted">Paid</dt><dd>{m(inv.amount_paid)}</dd></div>
                </dl>
              </>
            )}
            {isDraft && <Button variant="primary" className="mt-4 w-full" icon={<Send className="size-4" />} onClick={() => setDialog('send')}>Send invoice</Button>}
            {canPay && <Button className="mt-4 w-full" icon={<Plus className="size-4" />} onClick={() => setDialog('pay')}>Record payment</Button>}
          </section>

          {/* Payments */}
          <section aria-labelledby="payments-h">
            <h2 id="payments-h" className="mb-2 border-b border-line pb-2 text-sm font-semibold">Payments</h2>
            {payments.length === 0 ? (
              <p className="py-2 text-sm text-muted">{isDraft ? 'Payments can be recorded once the invoice is sent.' : 'Payments will appear here once your client starts paying.'}</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className={cx('py-3 text-sm', p.voided_at && 'text-muted')}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cx('num font-medium', p.voided_at && 'line-through')}>{m(p.amount)}</span>
                      <span className="text-xs text-muted">{formatDate(p.paid_on)}</span>
                    </div>
                    <p className="mt-0.5 text-ink-2">{PAYMENT_METHODS[p.method]}{p.reference && <> · <span className="font-mono text-xs">{p.reference}</span></>}</p>
                    {p.notes && <p className="mt-0.5 text-xs text-muted">{p.notes}</p>}
                    {p.voided_at ? (
                      <p className="mt-1 text-xs">Voided — {p.void_reason}</p>
                    ) : (
                      <button onClick={() => setVoiding(p)} className="mt-1 text-xs text-muted underline-offset-2 hover:text-danger hover:underline">Void this payment…</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {livePayments.length > 1 && (
              <p className="num mt-1 flex justify-between border-t border-line pt-2 text-sm"><span className="text-muted">Received</span><span className="font-medium">{m(inv.amount_paid)}</span></p>
            )}
          </section>

          {/* Activity */}
          <section aria-labelledby="activity-h">
            <h2 id="activity-h" className="mb-3 border-b border-line pb-2 text-sm font-semibold">Activity</h2>
            <ol className="relative ml-1 space-y-4 border-l border-line pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span aria-hidden className={cx('absolute -left-[21px] top-1.5 size-2 rounded-full ring-2 ring-paper', e.kind === 'paid' ? 'bg-success' : e.kind === 'cancelled' || e.kind === 'payment_voided' ? 'bg-danger' : 'bg-line-strong')} />
                  <p className="text-ink">{eventText(e, inv.currency)}</p>
                  <p className="text-xs text-muted"><time dateTime={e.created_at}>{formatDateTime(e.created_at, profile.timezone)}</time></p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {canPay && <PaymentDialog open={dialog === 'pay'} onClose={() => setDialog(null)} invoice={inv} timezone={profile.timezone} />}
      <SendDialog open={dialog === 'send'} onClose={() => setDialog(null)} invoice={inv} doc={doc} profile={profile} publicUrl={publicUrl} logo={logo} />
      <CancelInvoiceDialog open={dialog === 'cancel'} invoice={inv} onClose={() => setDialog(null)} />
      <VoidPaymentDialog payment={voiding} currency={inv.currency} onClose={() => setVoiding(null)} />
    </>
  )
}

type MenuItem = { label: string; icon: React.ComponentType<{ className?: string }>; to?: string; onClick?: () => void; danger?: boolean }

function MoreMenu({ items }: { items: (MenuItem | false)[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const list = items.filter(Boolean) as MenuItem[]
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
  }

  return (
    <div ref={ref} className="relative">
      <Button aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="px-2.5"><MoreHorizontal className="size-4" /></Button>
      {open && (
        <div role="menu" onKeyDown={onKeyDown} className="absolute right-0 z-20 mt-1 w-52 animate-rise rounded-md border border-line bg-surface p-1 shadow-[var(--shadow-pop)]">
          {list.map((it) => {
            const cls = cx('flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm outline-none hover:bg-sunken focus:bg-sunken', it.danger ? 'text-danger' : 'text-ink')
            const inner = <><it.icon className="size-4 opacity-70" />{it.label}</>
            return it.to ? (
              <Link key={it.label} role="menuitem" to={it.to} className={cls} onClick={() => setOpen(false)}>{inner}</Link>
            ) : (
              <button key={it.label} role="menuitem" className={cls} onClick={() => { setOpen(false); it.onClick?.() }}>{inner}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-8">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-[560px]" />
        <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-24" /></div>
      </div>
    </div>
  )
}
