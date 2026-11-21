import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useProfile } from '../auth/AuthProvider'
import { clientService, profileService } from '../services'
import { Button, ErrorNotice, Field, Input, Select, cx } from '../components/ui'
import { Logo } from '../components/layout/Logo'
import { CURRENCIES, CURRENCY_CODES, parseRate, type CurrencyCode } from '../lib/money'
import { humanError } from '../lib/errors'
import { invalidate } from '../hooks/useLoad'

const STEPS = ['You', 'Invoicing', 'First client']

/** Three short steps after sign-up; every step after the first can be skipped. */
export function OnboardingPage() {
  const profile = useProfile()
  const { setProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(profile.full_name)
  const [business, setBusiness] = useState(profile.business_name)
  const [currency, setCurrency] = useState<CurrencyCode>(profile.default_currency)
  const [taxLabel, setTaxLabel] = useState(profile.default_tax_label)
  const [taxRate, setTaxRate] = useState(String(profile.default_tax_rate_bp / 100))
  const [dueDays, setDueDays] = useState(String(profile.default_due_days))
  const [client, setClient] = useState({ name: '', email: '' })
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function finish(withClient: boolean) {
    setBusy(true)
    setError(null)
    try {
      if (withClient && client.name.trim()) {
        if (client.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client.email.trim())) {
          setFieldError('Enter a valid email, or leave it empty.')
          setBusy(false)
          return
        }
        await clientService.create({ name: client.name.trim(), email: client.email.trim(), company_name: '', phone: '', address: '', city: '', country: '', tax_id: '', notes: '' })
      }
      setProfile(await profileService.update(profile.id, { onboarded_at: new Date().toISOString() }))
      invalidate()
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(humanError(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveStep(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    if (step === 0) {
      if (!name.trim()) return setFieldError('Add your name — it appears on invoices.')
      setBusy(true)
      try {
        setProfile(await profileService.update(profile.id, { full_name: name.trim(), business_name: business.trim() }))
        setStep(1)
      } catch (err) {
        setError(humanError(err))
      } finally {
        setBusy(false)
      }
    } else if (step === 1) {
      const bp = parseRate(taxRate || '0')
      const days = Number(dueDays)
      if (bp === null) return setFieldError('Tax rate must be between 0 and 100.')
      if (!/^\d+$/.test(dueDays) || days > 365) return setFieldError('Due days must be a whole number from 0 to 365.')
      setBusy(true)
      try {
        setProfile(await profileService.update(profile.id, { default_currency: currency, default_tax_label: taxLabel.trim() || 'Tax', default_tax_rate_bp: bp, default_due_days: days }))
        setStep(2)
      } catch (err) {
        setError(humanError(err))
      } finally {
        setBusy(false)
      }
    } else {
      finish(true)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Logo />
      <main className="mx-auto my-auto w-full max-w-md py-10">
        <ol className="mb-8 flex gap-2" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <div className={cx('h-0.5 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-line')} />
              <p className={cx('mt-2 text-xs', i === step ? 'font-medium text-ink' : 'text-muted')}>{s}</p>
            </li>
          ))}
        </ol>

        <form onSubmit={saveStep} noValidate className="flex flex-col gap-4 animate-rise" key={step}>
          {step === 0 && (
            <>
              <h1 className="display text-2xl">What goes on your invoices?</h1>
              <p className="-mt-2 text-sm text-muted">You can add an address, tax ID and logo later in Settings.</p>
              <Field label="Your name" error={fieldError}>{({ id, invalid }) => <Input id={id} autoFocus invalid={invalid} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
              <Field label="Business or trading name" optional hint="Leave empty to invoice under your own name.">{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={business} onChange={(e) => setBusiness(e.target.value)} />}</Field>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="display text-2xl">How do you usually bill?</h1>
              <p className="-mt-2 text-sm text-muted">Defaults for new invoices. Each invoice can override them.</p>
              <Field label="Currency">{({ id }) => <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{CURRENCY_CODES.map((c) => <option key={c} value={c}>{c} — {CURRENCIES[c].label}</option>)}</Select>}</Field>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <Field label="Tax name">{({ id }) => <Input id={id} value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} />}</Field>
                <Field label="Rate (%)">{({ id }) => <Input id={id} inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />}</Field>
              </div>
              <Field label="Payment due after (days)" error={fieldError}>{({ id, invalid }) => <Input id={id} inputMode="numeric" invalid={invalid} value={dueDays} onChange={(e) => setDueDays(e.target.value)} />}</Field>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="display text-2xl">Who will you bill first?</h1>
              <p className="-mt-2 text-sm text-muted">Optional. You can add clients any time.</p>
              <Field label="Client name">{({ id }) => <Input id={id} autoFocus value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />}</Field>
              <Field label="Client email" optional error={fieldError}>{({ id, invalid }) => <Input id={id} type="email" invalid={invalid} value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />}</Field>
            </>
          )}
          {error && <ErrorNotice message={error} />}
          <div className="mt-2 flex items-center justify-between gap-3">
            {step > 0 ? <Button type="button" variant="ghost" onClick={() => (step === 2 ? finish(false) : setStep(2))}>Skip</Button> : <span />}
            <Button variant="primary" type="submit" loading={busy}>{step === 2 ? (client.name.trim() ? 'Add client and finish' : 'Finish') : 'Continue'}</Button>
          </div>
        </form>
      </main>
    </div>
  )
}
