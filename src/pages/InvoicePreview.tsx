import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useProfile } from '../auth/AuthProvider'
import { clientService, invoiceService } from '../services'
import { useLoad } from '../hooks/useLoad'
import { Button, ErrorNotice, Skeleton } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { InvoiceDocument } from '../components/invoices/InvoiceDocument'
import { toDocumentData } from '../components/invoices/document'
import { logoUrl } from '../lib/supabase'

/** Full-width document view — what the client sees, plus PDF download and print. */
export function InvoicePreviewPage() {
  const { id = '' } = useParams()
  const profile = useProfile()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const { data, error } = useLoad(async () => {
    const [invoice, items] = await Promise.all([invoiceService.get(id), invoiceService.items(id)])
    return { invoice, items, client: await clientService.get(invoice.client_id) }
  }, [id])

  if (error) return <ErrorNotice message={error} />
  if (!data) return <Skeleton className="mx-auto h-[800px] max-w-3xl" />
  const doc = toDocumentData(data.invoice, data.items, profile, data.client)
  const logo = logoUrl(profile.logo_path)

  async function download() {
    setBusy(true)
    try {
      const { renderInvoicePdf } = await import('../components/invoices/pdf')
      const url = URL.createObjectURL(await renderInvoicePdf(doc, logo))
      const a = Object.assign(document.createElement('a'), { href: url, download: `${doc.invoice_number}.pdf` })
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      toast('The PDF couldn’t be generated. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/invoices/${id}`} className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Back to {doc.invoice_number}</Link>
        <div className="flex gap-2">
          <Button size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>Print</Button>
          <Button size="sm" variant="primary" icon={<Download className="size-4" />} loading={busy} onClick={download}>Download PDF</Button>
        </div>
      </div>
      <InvoiceDocument data={doc} logoUrl={logo} />
    </div>
  )
}
