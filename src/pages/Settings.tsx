import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ImagePlus, LogOut, Trash2 } from 'lucide-react'
import { useAuth, useProfile } from '../auth/AuthProvider'
import { profileService, sampleService } from '../services'
import { invalidate } from '../hooks/useLoad'
import { Button, Field, Input, PageHeader, Select, Textarea, cx } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { CURRENCIES, CURRENCY_CODES, parseRate, type CurrencyCode } from '../lib/money'
import { humanError } from '../lib/errors'
import { prepareLogo } from '../lib/logo'
import { logoUrl, supabase } from '../lib/supabase'
import type { Profile } from '../types'

const SECTIONS = [
  { id: 'business', label: 'Business profile' },
  { id: 'invoicing', label: 'Invoice defaults' },
  { id: 'payment', label: 'Payment details' },
  { id: 'email', label: 'Email' },
  { id: 'data', label: 'Sample data' },
  { id: 'account', label: 'Account' },
]

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" meta="These details appear on your invoices and in emails to clients." />
      <div className="grid gap-10 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-10 space-y-0.5 text-sm">
            {SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`} className="pf-press block rounded-full px-3 py-1.5 font-semibold text-ink-2 transition-colors hover:bg-lime hover:text-ink">{s.label}</a></li>)}
          </ul>
        </nav>
        <div className="flex max-w-2xl flex-col gap-14">
          <BusinessSection />
          <InvoicingSection />
          <PaymentSection />
          <EmailSection />
          <SampleSection />
          <AccountSection />
        </div>
      </div>
    </>
  )
}

function SettingsSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <h2 id={`${id}-h`} className="text-md font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Small helper: a section form that saves a patch of the profile. */
function useProfileForm<T extends Record<string, string | number | boolean>>(pick: (p: Profile) => T) {
  const profile = useProfile()
  const { setProfile } = useAuth()
  const toast = useToast()
  const [values, setValues] = useState<T>(() => pick(profile))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof T, v: T[keyof T]) => setValues((s) => ({ ...s, [k]: v }))
  async function save(patch: Partial<Profile>, message = 'Saved.') {
    setBusy(true)
    setError(null)
    try {
      setProfile(await profileService.update(profile.id, patch))
      toast(message)
    } catch (e) {
      setError(humanError(e))
    } finally {
      setBusy(false)
    }
  }
  return { profile, values, set, save, busy, error }
}

const trimAll = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) as T

function BusinessSection() {
  const f = useProfileForm((p) => ({ full_name: p.full_name, business_name: p.business_name, email: p.email, phone: p.phone, address: p.address, city: p.city, country: p.country, website: p.website, tax_id: p.tax_id }))
  const [emailError, setEmailError] = useState<string | null>(null)
  const bind = (k: keyof typeof f.values) => ({ value: f.values[k], onChange: (e: { target: { value: string } }) => f.set(k, e.target.value) })
  function submit(e: FormEvent) {
    e.preventDefault()
    if (f.values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.values.email.trim())) return setEmailError('Enter a valid email address.')
    setEmailError(null)
    f.save(trimAll(f.values), 'Business profile saved.')
  }
  return (
    <SettingsSection id="business" title="Business profile" description="Who the invoice is from.">
      <LogoField />
      <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
        {f.error && <p role="alert" className="text-sm text-danger sm:col-span-2">{f.error}</p>}
        <Field label="Your name">{({ id }) => <Input id={id} autoComplete="name" maxLength={120} {...bind('full_name')} />}</Field>
        <Field label="Business name" optional hint="Shown instead of your name when set.">{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} maxLength={160} {...bind('business_name')} />}</Field>
        <Field label="Email on invoices" error={emailError} hint="Clients reply to this address.">{({ id, describedBy, invalid }) => <Input id={id} type="email" aria-describedby={describedBy} invalid={invalid} {...bind('email')} />}</Field>
        <Field label="Phone" optional>{({ id }) => <Input id={id} type="tel" maxLength={40} {...bind('phone')} />}</Field>
        <Field label="Address" optional className="sm:col-span-2">{({ id }) => <Input id={id} maxLength={400} {...bind('address')} />}</Field>
        <Field label="City" optional>{({ id }) => <Input id={id} maxLength={120} {...bind('city')} />}</Field>
        <Field label="Country" optional>{({ id }) => <Input id={id} maxLength={120} {...bind('country')} />}</Field>
        <Field label="Website" optional>{({ id }) => <Input id={id} maxLength={200} placeholder="yourstudio.com" {...bind('website')} />}</Field>
        <Field label="Tax ID" optional hint="GSTIN, VAT or PAN — printed on invoices.">{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} maxLength={40} {...bind('tax_id')} />}</Field>
        <div className="sm:col-span-2"><Button variant="primary" type="submit" loading={f.busy}>Save profile</Button></div>
      </form>
    </SettingsSection>
  )
}

function LogoField() {
  const profile = useProfile()
  const { setProfile } = useAuth()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = logoUrl(profile.logo_path)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const png = await prepareLogo(file)
      const path = await profileService.uploadLogo(profile.id, png)
      const old = profile.logo_path
      setProfile(await profileService.update(profile.id, { logo_path: path }))
      if (old) profileService.removeLogo(old)
      toast('Logo updated.')
    } catch (e) {
      setError(e instanceof Error && !('code' in e) && !('statusCode' in e) ? e.message : humanError(e, 'The logo couldn’t be uploaded. Try again.'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  async function remove() {
    if (!profile.logo_path) return
    setBusy(true)
    try {
      const old = profile.logo_path
      setProfile(await profileService.update(profile.id, { logo_path: null }))
      await profileService.removeLogo(old)
    } catch (e) {
      setError(humanError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className={cx('flex h-16 w-40 items-center justify-center rounded-md border bg-surface', url ? 'border-line' : 'border-dashed border-line-strong')}>
        {url ? <img src={url} alt="Your logo" className="max-h-12 max-w-36 object-contain" /> : <span className="text-xs text-muted">No logo</span>}
      </div>
      <div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" id="logo-input" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <div className="flex gap-2">
          <Button size="sm" icon={<ImagePlus className="size-4" />} loading={busy} onClick={() => input.current?.click()}>{url ? 'Replace logo' : 'Upload logo'}</Button>
          {url && <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={remove} disabled={busy}>Remove</Button>}
        </div>
        <p className="mt-1.5 text-xs text-muted">PNG, JPG, WebP or SVG up to 5 MB. Resized to fit 600×240.</p>
        {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
  )
}

function InvoicingSection() {
  const f = useProfileForm((p) => ({
    default_currency: p.default_currency as string, tax_label: p.default_tax_label, tax_rate: String(p.default_tax_rate_bp / 100),
    due_days: String(p.default_due_days), terms: p.default_payment_terms, notes: p.default_notes, prefix: p.invoice_prefix, next: String(p.next_invoice_seq), timezone: p.timezone,
  }))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const v = f.values
  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['Asia/Kolkata', 'UTC']

  function submit(e: FormEvent) {
    e.preventDefault()
    const e2: Record<string, string> = {}
    const rate = parseRate(v.tax_rate || '0')
    if (rate === null) e2.tax_rate = 'Use a percentage between 0 and 100.'
    const days = Number(v.due_days)
    if (!/^\d+$/.test(v.due_days) || days > 365) e2.due_days = 'Use a whole number of days, 0–365.'
    if (!/^[A-Za-z0-9/_-]{0,10}$/.test(v.prefix)) e2.prefix = 'Up to 10 letters, numbers, - / or _.'
    const next = Number(v.next)
    if (!/^\d+$/.test(v.next) || next < f.profile.next_invoice_seq || next > 999999) e2.next = `Must be ${f.profile.next_invoice_seq} or higher, so numbers are never reused.`
    setErrs(e2)
    if (Object.keys(e2).length) return
    f.save({
      default_currency: v.default_currency as CurrencyCode, default_tax_label: v.tax_label.trim() || 'Tax', default_tax_rate_bp: rate!, default_due_days: days,
      default_payment_terms: v.terms.trim(), default_notes: v.notes.trim(), invoice_prefix: v.prefix, next_invoice_seq: next, timezone: v.timezone,
    }, 'Invoice defaults saved.')
  }
  const preview = `${v.prefix}${String(Number(v.next) || f.profile.next_invoice_seq).padStart(4, '0')}`

  return (
    <SettingsSection id="invoicing" title="Invoice defaults" description="Pre-filled on every new invoice. You can change them per invoice.">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {f.error && <p role="alert" className="text-sm text-danger sm:col-span-2">{f.error}</p>}
        <Field label="Currency">
          {({ id }) => <Select id={id} value={v.default_currency} onChange={(e) => f.set('default_currency', e.target.value)}>{CURRENCY_CODES.map((c) => <option key={c} value={c}>{c} — {CURRENCIES[c].label}</option>)}</Select>}
        </Field>
        <Field label="Payment due after (days)" error={errs.due_days}>{({ id, invalid }) => <Input id={id} inputMode="numeric" invalid={invalid} value={v.due_days} onChange={(e) => f.set('due_days', e.target.value)} />}</Field>
        <Field label="Tax name">{({ id }) => <Input id={id} maxLength={20} value={v.tax_label} onChange={(e) => f.set('tax_label', e.target.value)} />}</Field>
        <Field label="Tax rate (%)" error={errs.tax_rate} hint="Use 0 if you don’t charge tax.">{({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={v.tax_rate} onChange={(e) => f.set('tax_rate', e.target.value)} />}</Field>
        <Field label="Invoice number prefix" error={errs.prefix}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={v.prefix} onChange={(e) => f.set('prefix', e.target.value)} />}</Field>
        <Field label="Next invoice number" error={errs.next} hint={`Next invoice: ${preview}`}>{({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" aria-describedby={describedBy} invalid={invalid} value={v.next} onChange={(e) => f.set('next', e.target.value)} />}</Field>
        <Field label="Payment terms" optional className="sm:col-span-2">{({ id }) => <Textarea id={id} rows={2} maxLength={1000} value={v.terms} onChange={(e) => f.set('terms', e.target.value)} placeholder="e.g. Payment due within 15 days by bank transfer or UPI." />}</Field>
        <Field label="Notes" optional className="sm:col-span-2">{({ id }) => <Textarea id={id} rows={2} maxLength={1000} value={v.notes} onChange={(e) => f.set('notes', e.target.value)} placeholder="e.g. Thank you for your business." />}</Field>
        <Field label="Time zone" hint="Decides when an invoice becomes overdue." className="sm:col-span-2">
          {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={v.timezone} onChange={(e) => f.set('timezone', e.target.value)}>{zones.map((z) => <option key={z}>{z}</option>)}</Select>}
        </Field>
        <div className="sm:col-span-2"><Button variant="primary" type="submit" loading={f.busy}>Save defaults</Button></div>
      </form>
    </SettingsSection>
  )
}

function PaymentSection() {
  const f = useProfileForm((p) => ({ payment_instructions: p.payment_instructions }))
  return (
    <SettingsSection id="payment" title="Payment details" description="How clients pay you. Printed on every invoice and shown on the client link. PayFlow doesn’t process payments — your client pays you directly, and you record it here.">
      <form onSubmit={(e) => { e.preventDefault(); f.save({ payment_instructions: f.values.payment_instructions.trim() }, 'Payment details saved.') }} className="grid gap-4">
        {f.error && <p role="alert" className="text-sm text-danger">{f.error}</p>}
        <Field label="Payment instructions" optional>
          {({ id }) => <Textarea id={id} rows={4} maxLength={1000} value={f.values.payment_instructions} onChange={(e) => f.set('payment_instructions', e.target.value)} placeholder={'UPI: yourname@bank\nBank: Account name · A/c number · IFSC'} />}
        </Field>
        <div><Button variant="primary" type="submit" loading={f.busy}>Save payment details</Button></div>
      </form>
    </SettingsSection>
  )
}

function EmailSection() {
  const f = useProfileForm((p) => ({ email_copy_to_self: p.email_copy_to_self }))
  return (
    <SettingsSection id="email" title="Email" description="When email delivery is configured, invoices are sent from PayFlow’s address with replies going to your email.">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
          checked={f.values.email_copy_to_self}
          onChange={(e) => {
            f.set('email_copy_to_self', e.target.checked)
            f.save({ email_copy_to_self: e.target.checked }, e.target.checked ? 'You’ll get a copy of each invoice email.' : 'Copies turned off.')
          }}
        />
        <span>Send me a copy (BCC) of every invoice email<span className="block text-muted">Useful as your own record of what was sent.</span></span>
      </label>
    </SettingsSection>
  )
}

function SampleSection() {
  const toast = useToast()
  const [busy, setBusy] = useState<null | 'load' | 'remove'>(null)
  async function run(kind: 'load' | 'remove') {
    if (kind === 'remove' && !window.confirm('Remove all sample clients, invoices and payments? Your own data is not touched.')) return
    setBusy(kind)
    try {
      await (kind === 'load' ? sampleService.load() : sampleService.remove())
      invalidate()
      toast(kind === 'load' ? 'Sample data loaded.' : 'Sample data removed.')
    } catch (e) {
      toast(humanError(e), 'error')
    } finally {
      setBusy(null)
    }
  }
  return (
    <SettingsSection id="data" title="Sample data" description="Four made-up clients and a few months of invoices, each tagged “Sample”, for trying PayFlow out. They are fictional and only visible to you.">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run('load')} loading={busy === 'load'} disabled={!!busy}>Load sample data</Button>
        <Button variant="danger" onClick={() => run('remove')} loading={busy === 'remove'} disabled={!!busy}>Remove sample data</Button>
      </div>
    </SettingsSection>
  )
}

function AccountSection() {
  const { session, signOut } = useAuth()
  const toast = useToast()
  const [sent, setSent] = useState(false)
  async function resetPassword() {
    const email = session?.user.email
    if (!email) return
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/update-password` })
    if (error) toast(humanError(error), 'error')
    else setSent(true)
  }
  return (
    <SettingsSection id="account" title="Account">
      <dl className="text-sm"><dt className="label">Signed in as</dt><dd className="mt-0.5">{session?.user.email}</dd></dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={resetPassword} disabled={sent}>{sent ? 'Reset link sent — check your email' : 'Change password'}</Button>
        <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={signOut}>Log out</Button>
      </div>
    </SettingsSection>
  )
}
