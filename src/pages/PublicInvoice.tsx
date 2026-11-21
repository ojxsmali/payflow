import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { invoiceService } from '../services'
import { InvoiceDocument } from '../components/invoices/InvoiceDocument'
import { Button, Skeleton } from '../components/ui'
import { formatMoney } from '../lib/money'
import { formatDate } from '../lib/dates'
import { logoUrl } from '../lib/supabase'
import { humanError } from '../lib/errors'
import type { InvoiceDocumentData } from '../types'
import { LogoMark } from '../components/layout/Logo'

/**
 * What a client sees at /i/:token — no account needed. The 48-character random
 * token is the only key; the database function returns just this invoice and
 * records the first view.
 */
export function PublicInvoicePage() {
  const { token = '' } = useParams()
  const [data, setData] = useState<InvoiceDocumentData | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    invoiceService.getPublic(token).then(setData, (e) => setError(humanError(e)))
  }, [token])

  useEffect(() => {
    if (data) document.title = `Invoice ${data.invoice_number} — ${data.from.business_name || data.from.name}`
  }, [data])

  const logo = data ? logoUrl(data.from.logo_path) : null

  async function download() {
    if (!data) return
    setBusy(true)
    try {
      const { renderInvoicePdf } = await import('../components/invoices/pdf')
      const url = URL.createObjectURL(await renderInvoicePdf(data, logo))
      Object.assign(document.createElement('a'), { href: url, download: `${data.invoice_number}.pdf` }).click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      setError('The PDF couldn’t be generated. Try again, or print this page.')
    } finally {
      setBusy(false)
    }
  }

  const balance = data ? data.total - data.amount_paid : 0
  const open = data && !['paid', 'cancelled'].includes(data.status)

  return (
    <div className="min-h-dvh px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        {data === undefined && !error && <Skeleton className="h-[720px]" />}
        {(data === null || (error && !data)) && (
          <div className="py-24 text-center">
            <h1 className="display text-2xl">Invoice not found</h1>
            <p className="mt-2 text-sm text-muted">{error ?? 'This link is invalid or the invoice is no longer available. Contact the sender for a new link.'}</p>
          </div>
        )}
        {data && (
          <>
            <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-muted">{data.from.business_name || data.from.name} sent you an invoice</p>
                {data.status === 'paid' ? (
                  <p className="mt-1 text-lg font-semibold text-success">Paid in full — thank you.</p>
                ) : data.status === 'cancelled' ? (
                  <p className="mt-1 text-lg font-semibold text-muted">This invoice was cancelled. Nothing is due.</p>
                ) : (
                  <p className="mt-1 text-lg"><span className="num font-semibold">{formatMoney(balance, data.currency, { cents: true })}</span> due {formatDate(data.due_date)}{data.status === 'overdue' && <span className="ml-2 text-sm text-danger">Overdue</span>}</p>
                )}
              </div>
              <Button variant="primary" icon={<Download className="size-4" />} onClick={download} loading={busy}>Download PDF</Button>
            </div>
            {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
            <InvoiceDocument data={data} logoUrl={logo} />
            {open && !data.from.payment_instructions && (
              <p className="mt-4 text-sm text-muted">To pay, contact {data.from.email ? <a className="link" href={`mailto:${data.from.email}`}>{data.from.email}</a> : 'the sender'} for payment details.</p>
            )}
            <p className="no-print mt-10 flex items-center justify-center gap-2 text-xs text-muted">
              <LogoMark className="size-4" /> Sent with PayFlow. Payments go directly to the sender — PayFlow never handles your money.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
