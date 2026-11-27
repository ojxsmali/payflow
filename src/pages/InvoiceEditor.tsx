import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Eye, Lock } from 'lucide-react'
import { useProfile } from '../auth/AuthProvider'
import { clientService, invoiceService } from '../services'
import { useLoad, invalidate } from '../hooks/useLoad'
import { Button, ErrorNotice, Field, Input, PageHeader, Segmented, Select, Skeleton, Textarea, cx } from '../components/ui'
import { Dialog } from '../components/ui/Dialog'
import { useToast } from '../components/ui/Toast'
import { LineItemsEditor, newItem, type ItemErrors, type ItemRow } from '../components/invoices/LineItemsEditor'
import { ClientFormDialog } from '../components/clients/ClientFormDialog'
import { InvoiceDocument } from '../components/invoices/InvoiceDocument'
import { CURRENCIES, CURRENCY_CODES, calcInvoice, formatMoney, formatRate, minorToInput, parseMoney, parseQuantity, parseRate, MAX_UNIT_PRICE, type CurrencyCode, type DiscountType } from '../lib/money'
import { addDays, todayIn } from '../lib/dates'
import { humanError } from '../lib/errors'
import { logoUrl } from '../lib/supabase'
import type { Client, InvoiceDraft, InvoiceStatus } from '../types'

interface FormState {
  clientId: string
  issueDate: string
  dueDate: string
  currency: CurrencyCode
  discountType: DiscountType
  discount: string
  taxLabel: string
  taxRate: string
  terms: string
  notes: string
  items: ItemRow[]
}

const DUE_PRESETS = [0, 7, 14, 30, 45, 60]

export function InvoiceEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const profile = useProfile()
  const navigate = useNavigate()
  const toast = useToast()
  const today = todayIn(profile.timezone)

  const clients = useLoad(() => clientService.list())
  const existing = useLoad(async () => (id ? Promise.all([invoiceService.get(id), invoiceService.items(id)]) : null), [id])

  const [form, setForm] = useState<FormState | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState<null | 'draft' | 'send'>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [clientDialog, setClientDialog] = useState(false)
  const [preview, setPreview] = useState(false)
  const [dirty, setDirty] = useState(false)

  // initialise once data is available
  useEffect(() => {
    if (form) return
    if (id) {
      if (!existing.data) return
      const [inv, items] = existing.data
      setForm({
        clientId: inv.client_id,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        currency: inv.currency,
        discountType: inv.discount_type,
        discount: inv.discount_type === 'percent' ? String(inv.discount_value / 100) : inv.discount_type === 'fixed' ? minorToInput(inv.discount_value) : '',
        taxLabel: inv.tax_label,
        taxRate: String(inv.tax_rate_bp / 100),
        terms: inv.payment_terms,
        notes: inv.notes,
        items: items.map((i) => newItem({ description: i.description, quantity: String(Number(i.quantity)), rate: minorToInput(i.unit_price) })),
      })
    } else {
      setForm({
        clientId: params.get('client') ?? '',
        issueDate: today,
        dueDate: addDays(today, profile.default_due_days),
        currency: profile.default_currency,
        discountType: 'none',
        discount: '',
        taxLabel: profile.default_tax_label,
        taxRate: String(profile.default_tax_rate_bp / 100),
        terms: profile.default_payment_terms,
        notes: profile.default_notes,
        items: [newItem()],
      })
    }
  }, [id, existing.data, form, params, profile, today])

  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const patch = (p: Partial<FormState>) => {
    setDirty(true)
    setForm((f) => (f ? { ...f, ...p } : f))
  }

  // ── parse + validate everything on each change; totals are the live preview of what the DB will compute
  const parsed = useMemo(() => {
    if (!form) return null
    const itemErrors: ItemErrors = {}
    const items = form.items.map((it) => {
      const quantityMilli = parseQuantity(it.quantity)
      const unitPrice = parseMoney(it.rate)
      const e: ItemErrors[string] = {}
      if (!it.description.trim()) e.description = 'Describe this item.'
      else if (it.description.length > 500) e.description = 'Keep it under 500 characters.'
      if (quantityMilli === null) e.quantity = 'Use a number above 0 (up to 3 decimals).'
      if (unitPrice === null) e.rate = 'Enter an amount, like 1500 or 1500.50.'
      else if (unitPrice > MAX_UNIT_PRICE) e.rate = 'That amount is too large.'
      if (Object.keys(e).length) itemErrors[it.key] = e
      return { quantityMilli, unitPrice, description: it.description.trim() }
    })
    const taxRateBp = parseRate(form.taxRate || '0')
    let discountValue = 0
    let discountError: string | null = null
    if (form.discountType === 'percent') {
      const bp = parseRate(form.discount || '0')
      if (bp === null) discountError = 'Use a percentage between 0 and 100.'
      else discountValue = bp
    } else if (form.discountType === 'fixed') {
      const v = parseMoney(form.discount || '0')
      if (v === null) discountError = 'Enter an amount, like 500.'
      else discountValue = v
    }
    const calc = calcInvoice({
      items: items.map((i) => ({ quantityMilli: i.quantityMilli ?? 0, unitPrice: i.unitPrice ?? 0 })),
      discountType: form.discountType,
      discountValue,
      taxRateBp: taxRateBp ?? 0,
    })
    if (!discountError && form.discountType === 'fixed' && discountValue > calc.subtotal) discountError = 'The discount is larger than the subtotal.'
    const errors = {
      client: form.clientId ? null : 'Choose who this invoice is for.',
      issueDate: form.issueDate ? null : 'Pick an issue date.',
      dueDate: !form.dueDate ? 'Pick a due date.' : form.dueDate < form.issueDate ? 'The due date can’t be before the issue date.' : null,
      taxRate: taxRateBp === null ? 'Use a percentage between 0 and 100.' : null,
      taxLabel: form.taxLabel.length > 20 ? 'Keep the label short (20 characters).' : null,
      discount: discountError,
      terms: form.terms.length > 1000 ? 'Keep payment terms under 1,000 characters.' : null,
      notes: form.notes.length > 2000 ? 'Keep notes under 2,000 characters.' : null,
    }
    const valid = !Object.values(errors).some(Boolean) && !Object.keys(itemErrors).length
    const amounts = items.map((i, idx) => (i.quantityMilli === null || i.unitPrice === null ? null : calc.lineAmounts[idx]))
    return { items, itemErrors, errors, calc, amounts, valid, taxRateBp: taxRateBp ?? 0, discountValue }
  }, [form])

  if ((id && existing.error) || clients.error) return <ErrorNotice message={(existing.error || clients.error)!} />
  if (!form || !parsed || !clients.data) return <EditorSkeleton />

  const status: InvoiceStatus | undefined = existing.data?.[0].status
  const locked = existing.data && (existing.data[0].amount_paid > 0 || status === 'cancelled')
  if (locked) {
    return (
      <div className="max-w-lg py-10">
        <Lock className="size-5 text-muted" />
        <h1 className="display mt-3 text-2xl">This invoice can’t be edited</h1>
        <p className="mt-2 text-sm text-ink-2">
          {status === 'cancelled' ? 'Cancelled invoices are kept as they were for your records.' : 'It has payments recorded against it, so its amounts are locked to keep your records consistent. Void the payments first if the invoice itself was wrong, or duplicate it to start a new one.'}
        </p>
        <Button className="mt-6" to={`/invoices/${id}`}>Back to invoice</Button>
      </div>
    )
  }

  const activeClients = clients.data.filter((c) => !c.archived_at || c.id === form.clientId)
  const client = clients.data.find((c) => c.id === form.clientId)
  const showErr = (e: string | null) => (submitted ? e : null)
  const m = (v: number) => formatMoney(v, form.currency, { cents: true })
  const editingSent = existing.data && existing.data[0].state !== 'draft'

  async function save(mode: 'draft' | 'send') {
    setSubmitted(true)
    setServerError(null)
    if (!parsed!.valid) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const draft: InvoiceDraft = {
      id,
      client_id: form!.clientId,
      issue_date: form!.issueDate,
      due_date: form!.dueDate,
      currency: form!.currency,
      discount_type: form!.discountType,
      discount_value: parsed!.discountValue,
      tax_label: form!.taxLabel.trim() || 'Tax',
      tax_rate_bp: parsed!.taxRateBp,
      payment_terms: form!.terms.trim(),
      notes: form!.notes.trim(),
      items: parsed!.items.map((i) => ({ description: i.description, quantity: i.quantityMilli! / 1000, unit_price: i.unitPrice! })),
    }
    setSaving(mode)
    try {
      const savedId = await invoiceService.save(draft)
      setDirty(false)
      invalidate()
      toast(id ? 'Invoice updated.' : 'Draft saved.')
      navigate(`/invoices/${savedId}${mode === 'send' ? '?send=1' : ''}`, { replace: !!id })
    } catch (e) {
      setServerError(humanError(e))
    } finally {
      setSaving(null)
    }
  }

  const previewData = client && {
    invoice_number: existing.data?.[0].invoice_number ?? `${profile.invoice_prefix}${String(profile.next_invoice_seq).padStart(4, '0')}`,
    issue_date: form.issueDate, due_date: form.dueDate, currency: form.currency,
    discount_type: form.discountType, discount_value: parsed.discountValue, tax_label: form.taxLabel || 'Tax', tax_rate_bp: parsed.taxRateBp,
    subtotal: parsed.calc.subtotal, discount_amount: parsed.calc.discount, tax_amount: parsed.calc.tax, total: parsed.calc.total, amount_paid: 0,
    status: 'draft' as const, payment_terms: form.terms, notes: form.notes,
    from: { name: profile.full_name, business_name: profile.business_name, email: profile.email, phone: profile.phone, address: profile.address, city: profile.city, country: profile.country, website: profile.website, tax_id: profile.tax_id, logo_path: profile.logo_path, payment_instructions: profile.payment_instructions },
    to: { name: client.name, company_name: client.company_name, email: client.email, address: client.address, city: client.city, country: client.country, tax_id: client.tax_id },
    items: parsed.items.map((i, idx) => ({ description: i.description || '—', quantity: (i.quantityMilli ?? 0) / 1000, unit_price: i.unitPrice ?? 0, amount: parsed.calc.lineAmounts[idx] })),
  }

  return (
    <>
      <PageHeader
        eyebrow={id ? <Link to={`/invoices/${id}`} className="hover:text-ink">{existing.data![0].invoice_number}</Link> : 'Invoices'}
        title={id ? 'Edit invoice' : 'New invoice'}
        meta={id ? (editingSent ? 'This invoice was already sent. Changes are logged in its activity.' : 'Draft — only you can see it.') : `Will be numbered ${profile.invoice_prefix}${String(profile.next_invoice_seq).padStart(4, '0')} when saved.`}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save('draft')
        }}
        noValidate
        className="grid gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-0"
      >
        <div className="flex min-w-0 flex-col gap-10">
          {serverError && <ErrorNotice message={serverError} />}

          <EditorSection n={1} title="Client">
            {clients.data.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-line-strong p-4 text-sm text-ink-2">
                You haven’t added any clients yet.
                <Button type="button" size="sm" variant="primary" onClick={() => setClientDialog(true)}>Add client</Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <Field label="Bill to" error={showErr(parsed.errors.client)}>
                  {({ id: fid, describedBy, invalid }) => (
                    <Select id={fid} aria-describedby={describedBy} invalid={invalid} value={form.clientId} onChange={(e) => patch({ clientId: e.target.value })}>
                      <option value="">Choose a client…</option>
                      {activeClients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company_name && c.company_name !== c.name ? ` — ${c.company_name}` : ''}</option>)}
                    </Select>
                  )}
                </Field>
                <Button type="button" variant="ghost" className="sm:mt-[1.375rem]" onClick={() => setClientDialog(true)}>+ New client</Button>
              </div>
            )}
            {client && (
              <p className="mt-2 text-sm text-muted">{[client.email || 'No email on file', client.city, client.country].filter(Boolean).join(' · ')}</p>
            )}
          </EditorSection>

          <EditorSection n={2} title="Details">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Issue date" error={showErr(parsed.errors.issueDate)}>
                {({ id: fid, invalid }) => <Input id={fid} type="date" invalid={invalid} value={form.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} />}
              </Field>
              <Field label="Due date" error={showErr(parsed.errors.dueDate)}>
                {({ id: fid, describedBy, invalid }) => <Input id={fid} type="date" aria-describedby={describedBy} invalid={invalid} min={form.issueDate} value={form.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />}
              </Field>
              <Field label="Currency">
                {({ id: fid }) => (
                  <Select id={fid} value={form.currency} onChange={(e) => patch({ currency: e.target.value as CurrencyCode })}>
                    {CURRENCY_CODES.map((c) => <option key={c} value={c}>{c} — {CURRENCIES[c].label}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span>Due in</span>
              {DUE_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => patch({ dueDate: addDays(form.issueDate || today, d) })}
                  className={cx('pf-press rounded-full border-2 px-2.5 py-0.5 font-semibold transition-colors', form.dueDate === addDays(form.issueDate || today, d) ? 'border-ink bg-lime text-ink' : 'border-line hover:border-ink hover:text-ink')}
                >
                  {d === 0 ? 'On receipt' : `${d} days`}
                </button>
              ))}
            </div>
          </EditorSection>

          <EditorSection n={3} title="Items">
            <LineItemsEditor
              items={form.items}
              onChange={(items) => patch({ items })}
              amounts={parsed.amounts}
              currency={form.currency}
              errors={submitted ? parsed.itemErrors : {}}
            />
          </EditorSection>

          <EditorSection n={4} title="Discount and tax">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="label" id="disc-label">Discount</span>
                <Segmented
                  label="Discount type"
                  value={form.discountType}
                  onChange={(v) => patch({ discountType: v, discount: '' })}
                  options={[{ value: 'none', label: 'None' }, { value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed amount' }]}
                />
                {form.discountType !== 'none' && (
                  <Field label={form.discountType === 'percent' ? 'Discount (%)' : `Discount (${form.currency})`} error={showErr(parsed.errors.discount)} hint="Applied before tax.">
                    {({ id: fid, describedBy, invalid }) => <Input id={fid} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={form.discount} placeholder="0" onChange={(e) => patch({ discount: e.target.value })} className="num max-w-40" />}
                  </Field>
                )}
              </div>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <Field label="Tax name" error={showErr(parsed.errors.taxLabel)}>
                  {({ id: fid, invalid }) => <Input id={fid} invalid={invalid} value={form.taxLabel} placeholder="GST, VAT…" onChange={(e) => patch({ taxLabel: e.target.value })} />}
                </Field>
                <Field label="Rate (%)" error={showErr(parsed.errors.taxRate)}>
                  {({ id: fid, invalid }) => <Input id={fid} inputMode="decimal" invalid={invalid} value={form.taxRate} onChange={(e) => patch({ taxRate: e.target.value })} className="num" />}
                </Field>
              </div>
            </div>
          </EditorSection>

          <EditorSection n={5} title="Terms and notes">
            <div className="grid gap-4">
              <Field label="Payment terms" optional hint="Shown on the invoice. Your bank or UPI details come from Settings." error={showErr(parsed.errors.terms)}>
                {({ id: fid, describedBy, invalid }) => <Textarea id={fid} aria-describedby={describedBy} invalid={invalid} rows={2} value={form.terms} onChange={(e) => patch({ terms: e.target.value })} placeholder="e.g. Payment due within 15 days by bank transfer." />}
              </Field>
              <Field label="Notes to client" optional error={showErr(parsed.errors.notes)}>
                {({ id: fid, invalid }) => <Textarea id={fid} invalid={invalid} rows={2} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="e.g. Thank you for your business." />}
              </Field>
            </div>
          </EditorSection>
        </div>

        {/* Summary: sticky beside the form on desktop, a bottom bar on phones */}
        <aside className="lg:sticky lg:top-10 lg:self-start" aria-label="Invoice summary">
          <div className="pf-sheet hidden rounded-[14px] p-5 lg:block">
            <p className="eyebrow mb-4">Summary</p>
            <Totals calc={parsed.calc} m={m} discountLabel={form.discountType === 'percent' ? `Discount (${formatRate(parsed.discountValue)})` : 'Discount'} taxLabel={`${form.taxLabel || 'Tax'} (${formatRate(parsed.taxRateBp)})`} />
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="primary" type="button" loading={saving === 'send'} disabled={!!saving} onClick={() => save('send')}>{editingSent ? 'Save and resend' : 'Save and send'}</Button>
              <Button type="submit" loading={saving === 'draft'} disabled={!!saving}>{id ? 'Save changes' : 'Save draft'}</Button>
              <Button type="button" variant="ghost" icon={<Eye className="size-4" />} disabled={!client} onClick={() => setPreview(true)}>Preview</Button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">Totals are calculated by PayFlow’s database when you save — this panel shows the same calculation as you type.</p>
          </div>

          <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/97 px-4 py-3 backdrop-blur-sm lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Total</p>
                <p className="num text-md font-semibold">{m(parsed.calc.total)}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={!client} onClick={() => setPreview(true)} aria-label="Preview"><Eye className="size-4" /></Button>
                <Button type="submit" size="sm" loading={saving === 'draft'} disabled={!!saving}>Save</Button>
                <Button type="button" size="sm" variant="primary" loading={saving === 'send'} disabled={!!saving} onClick={() => save('send')}>Send</Button>
              </div>
            </div>
          </div>
          <div className="lg:hidden">
            <Totals calc={parsed.calc} m={m} discountLabel={form.discountType === 'percent' ? `Discount (${formatRate(parsed.discountValue)})` : 'Discount'} taxLabel={`${form.taxLabel || 'Tax'} (${formatRate(parsed.taxRateBp)})`} />
          </div>
        </aside>
      </form>

      <ClientFormDialog
        open={clientDialog}
        onClose={() => setClientDialog(false)}
        onSaved={(c: Client) => {
          setClientDialog(false)
          clients.reload()
          patch({ clientId: c.id })
          toast(`${c.name} added.`)
        }}
      />

      <Dialog open={preview} onClose={() => setPreview(false)} title="Preview" description="How the client will see it. Nothing is saved or sent." wide>
        {previewData && <InvoiceDocument data={previewData} logoUrl={logoUrl(profile.logo_path)} className="shadow-none" />}
      </Dialog>
    </>
  )
}

function Totals({ calc, m, discountLabel, taxLabel }: { calc: ReturnType<typeof calcInvoice>; m: (v: number) => string; discountLabel: string; taxLabel: string }) {
  return (
    <dl className="num space-y-2 text-sm" aria-live="polite">
      <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd>{m(calc.subtotal)}</dd></div>
      {calc.discount > 0 && <div className="flex justify-between"><dt className="text-ink-2">{discountLabel}</dt><dd>−{m(calc.discount)}</dd></div>}
      {calc.discount > 0 && <div className="flex justify-between text-muted"><dt>Taxable amount</dt><dd>{m(calc.taxable)}</dd></div>}
      <div className="flex justify-between"><dt className="text-ink-2">{taxLabel}</dt><dd>{m(calc.tax)}</dd></div>
      <div className="flex justify-between border-t border-line pt-3 text-md font-semibold"><dt>Total</dt><dd>{m(calc.total)}</dd></div>
    </dl>
  )
}

function EditorSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`sec-${n}`}>
      <h2 id={`sec-${n}`} className="mb-4 flex items-center gap-3 border-b-2 border-ink pb-2 text-md font-extrabold tracking-[-0.02em] [font-stretch:115%]">
        <span className="grid size-6 place-items-center rounded-full bg-lime font-mono text-2xs font-medium text-ink">0{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function EditorSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="hidden h-64 lg:block" />
      </div>
    </div>
  )
}
