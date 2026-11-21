import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Copy, FileText, Mail, Paperclip } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button, Field, Input, Select, Textarea } from '../ui'
import { useToast } from '../ui/Toast'
import { emailService, invoiceService, paymentService } from '../../services'
import { invalidate } from '../../hooks/useLoad'
import { formatMoney, minorToInput, parseMoney } from '../../lib/money'
import { formatDate, todayIn } from '../../lib/dates'
import { humanError } from '../../lib/errors'
import { PAYMENT_METHODS } from '../../lib/status'
import { defaultMessage, defaultSubject } from '../../lib/email-template'
import type { InvoiceDocumentData, InvoiceRow, Payment, PaymentMethod, Profile } from '../../types'

// ── Record payment ──────────────────────────────────────────────────────────
export function PaymentDialog({ open, onClose, invoice, timezone }: { open: boolean; onClose: () => void; invoice: InvoiceRow; timezone: string }) {
  const toast = useToast()
  const today = todayIn(timezone)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; date?: string }>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount(minorToInput(invoice.balance_due))
      setDate(today)
      setReference('')
      setNotes('')
      setError(null)
      setFieldErrors({})
    }
  }, [open, invoice.balance_due, today])

  const minor = parseMoney(amount)
  const remaining = minor === null ? null : invoice.balance_due - minor

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (minor === null || minor <= 0) errs.amount = 'Enter an amount above zero.'
    else if (minor > invoice.balance_due) errs.amount = `That’s more than the ${formatMoney(invoice.balance_due, invoice.currency)} still due.`
    if (!date) errs.date = 'Pick the date you received it.'
    else if (date > today) errs.date = 'The payment date can’t be in the future.'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setError(null)
    try {
      await paymentService.record({ invoiceId: invoice.id, amount: minor!, paidOn: date, method, reference: reference.trim(), notes: notes.trim() })
      invalidate()
      toast(minor === invoice.balance_due ? `${invoice.invoice_number} is now paid in full.` : `Payment of ${formatMoney(minor!, invoice.currency)} recorded.`)
      onClose()
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record a payment"
      description={<>PayFlow doesn’t move money — record payments your client made by bank transfer, UPI, cash or any other way.</>}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="payment-form" loading={busy}>Record payment</Button></>}
    >
      <form id="payment-form" onSubmit={submit} noValidate className="grid gap-4">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-between rounded-md bg-paper px-3 py-2.5 text-sm">
          <span className="text-ink-2">Balance due on {invoice.invoice_number}</span>
          <span className="num font-semibold">{formatMoney(invoice.balance_due, invoice.currency, { cents: true })}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Amount (${invoice.currency})`} error={fieldErrors.amount} hint={remaining !== null && remaining > 0 && remaining < invoice.balance_due ? `${formatMoney(remaining, invoice.currency, { cents: true })} will remain — marked partially paid.` : undefined}>
            {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={amount} onChange={(e) => { setAmount(e.target.value); setFieldErrors((f) => ({ ...f, amount: undefined })) }} className="num" />}
          </Field>
          <Field label="Date received" error={fieldErrors.date}>
            {({ id, invalid }) => <Input id={id} type="date" invalid={invalid} max={today} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Method">
            {({ id }) => (
              <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Reference" optional>{({ id }) => <Input id={id} maxLength={120} placeholder="UTR, cheque no…" value={reference} onChange={(e) => setReference(e.target.value)} />}</Field>
        </div>
        <Field label="Note" optional>{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        <p className="text-xs text-muted">Recorded payments can’t be edited. If one is wrong, void it with a reason and record it again.</p>
      </form>
    </Dialog>
  )
}

// ── Void payment ────────────────────────────────────────────────────────────
export function VoidPaymentDialog({ payment, currency, onClose }: { payment: Payment | null; currency: string; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setReason('')
    setError(null)
  }, [payment])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return setError('Give a reason. It stays in the invoice history.')
    setBusy(true)
    try {
      await paymentService.void(payment!.id, reason.trim())
      invalidate()
      toast('Payment voided.')
      onClose()
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={!!payment}
      onClose={onClose}
      title="Void this payment?"
      description={payment && <>The {formatMoney(payment.amount, currency)} payment from {formatDate(payment.paid_on)} will stop counting toward this invoice. It stays in the history, marked void.</>}
      footer={<><Button variant="ghost" onClick={onClose}>Keep payment</Button><Button variant="danger" type="submit" form="void-form" loading={busy}>Void payment</Button></>}
    >
      <form id="void-form" onSubmit={submit} noValidate>
        <Field label="Reason" error={error}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} autoFocus maxLength={300} placeholder="e.g. Recorded on the wrong invoice" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  )
}

// ── Cancel invoice ──────────────────────────────────────────────────────────
export function CancelInvoiceDialog({ open, invoice, onClose }: { open: boolean; invoice: InvoiceRow; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function confirm() {
    setBusy(true)
    try {
      await invoiceService.cancel(invoice.id, reason.trim())
      invalidate()
      toast(`${invoice.invoice_number} cancelled.`)
      onClose()
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Cancel ${invoice.invoice_number}?`}
      description="The invoice is kept for your records but no longer counts as money owed. Its public link will show it as cancelled. This can’t be undone."
      footer={<><Button variant="ghost" onClick={onClose}>Keep invoice</Button><Button variant="danger" onClick={confirm} loading={busy}>Cancel invoice</Button></>}
    >
      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      <Field label="Reason" optional>{({ id }) => <Input id={id} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Project cancelled by client" />}</Field>
    </Dialog>
  )
}

// ── Send invoice ────────────────────────────────────────────────────────────
// Email goes through api/send-invoice (Resend) when the deployment has it
// configured. When it doesn't, the dialog says so plainly and offers the honest
// alternatives: copy the link, open the user's own mail app, or mark as sent.
export function SendDialog({ open, onClose, invoice, doc, profile, publicUrl, logo }: {
  open: boolean
  onClose: () => void
  invoice: InvoiceRow
  doc: InvoiceDocumentData
  profile: Profile
  publicUrl: string
  logo: string | null
}) {
  const toast = useToast()
  const senderName = profile.business_name || profile.full_name || 'Your business'
  const amount = formatMoney(invoice.balance_due, invoice.currency)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [emailReady, setEmailReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<null | 'email' | 'manual'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSubject(defaultSubject({ invoiceNumber: invoice.invoice_number, senderName }))
    setError(null)
    emailService.status().then((s) => {
      setEmailReady(s.configured)
      setMessage(defaultMessage({ clientName: invoice.client_name, invoiceNumber: invoice.invoice_number, amount, dueDate: formatDate(invoice.due_date), senderName, attached: s.configured }))
    })
  }, [open, invoice, senderName, amount])

  const noEmail = !invoice.client_email
  const firstSend = invoice.state === 'draft'

  async function sendEmail() {
    if (!subject.trim() || !message.trim()) return setError('Add a subject and a message.')
    setBusy('email')
    setError(null)
    try {
      const { renderInvoicePdf, blobToBase64 } = await import('./pdf')
      let pdfBase64: string
      try {
        pdfBase64 = await blobToBase64(await renderInvoicePdf(doc, logo))
      } catch {
        throw new Error('The PDF could not be generated, so nothing was sent. Try again.')
      }
      const res = await emailService.send({ invoiceId: invoice.id, subject: subject.trim(), message: message.trim(), pdfBase64 })
      invalidate()
      toast(`Email accepted for delivery to ${res.to}.`)
      onClose()
    } catch (err) {
      setError(err instanceof Error && !('code' in err) ? err.message : humanError(err, 'The email could not be sent. Nothing was delivered.'))
    } finally {
      setBusy(null)
    }
  }

  async function markSent() {
    setBusy('manual')
    try {
      await invoiceService.markSent(invoice.id, 'manual')
      invalidate()
      toast(`${invoice.invoice_number} marked as sent.`)
      onClose()
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(null)
    }
  }

  const mailto = `mailto:${encodeURIComponent(invoice.client_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${message}\n\nView invoice: ${publicUrl}`)}`

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={firstSend ? `Send ${invoice.invoice_number}` : `Resend ${invoice.invoice_number}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {firstSend && <Button onClick={markSent} loading={busy === 'manual'} disabled={!!busy} title="Use this if you sent it yourself">I sent it myself</Button>}
          {emailReady && <Button variant="primary" icon={<Mail className="size-4" />} onClick={sendEmail} loading={busy === 'email'} disabled={!!busy || noEmail}>Send email</Button>}
        </>
      }
    >
      <div className="grid gap-4">
        {error && <p role="alert" className="rounded-md bg-danger-soft/60 px-3 py-2 text-sm text-danger">{error}</p>}
        {emailReady === false && (
          <div className="rounded-md border border-line bg-paper px-3.5 py-3 text-sm text-ink-2">
            <p className="font-medium text-ink">Email delivery isn’t set up on this deployment.</p>
            <p className="mt-1">Nothing will be emailed from PayFlow. Send the link below from your own email or chat, or open your mail app with this message filled in — then mark the invoice as sent.</p>
          </div>
        )}
        <Field label="To">
          {({ id }) => (
            <div id={id} className="flex h-9.5 items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 text-base">
              <span className={noEmail ? 'text-danger' : ''}>{invoice.client_email || 'This client has no email address'}</span>
              <Link to={`/clients/${invoice.client_id}`} className="link text-xs">Edit client</Link>
            </div>
          )}
        </Field>
        <Field label="Subject">{({ id }) => <Input id={id} maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />}</Field>
        <Field label="Message" hint="A summary with the amount, due date and a “View invoice” button is added below your message.">
          {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={8} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-ink-2"><Paperclip className="size-3.5" aria-hidden />{invoice.invoice_number}.pdf{emailReady ? ' attached' : ''}</span>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="link flex items-center gap-1"><FileText className="size-3.5" aria-hidden />Open client view</a>
          <button
            type="button"
            className="link flex items-center gap-1"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicUrl)
                toast('Link copied.')
              } catch {
                toast('Couldn’t copy. Select the link and copy it manually.', 'error')
              }
            }}
          >
            <Copy className="size-3.5" aria-hidden />Copy link
          </button>
          {emailReady === false && !noEmail && <a href={mailto} className="link flex items-center gap-1"><Mail className="size-3.5" aria-hidden />Open in mail app</a>}
        </div>
      </div>
    </Dialog>
  )
}
