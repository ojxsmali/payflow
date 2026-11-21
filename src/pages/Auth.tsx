import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { Button, ErrorNotice, Field, Input } from '../components/ui'
import { Logo } from '../components/layout/Logo'
import { useAuth } from '../auth/AuthProvider'

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="hidden flex-col justify-between border-r border-line px-12 py-10 lg:flex">
        <Logo />
        <div className="max-w-md">
          <p className="display text-3xl leading-[1.1] text-ink">Create invoices. Track payments. Know what’s outstanding.</p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-6 text-sm">
            <div><dt className="label">Draft</dt><dd className="mt-1 text-ink-2">Build the invoice, preview the PDF.</dd></div>
            <div><dt className="label">Send</dt><dd className="mt-1 text-ink-2">Email it or share a private link.</dd></div>
            <div><dt className="label">Get paid</dt><dd className="mt-1 text-ink-2">Record payments, see what’s still due.</dd></div>
          </dl>
        </div>
        <p className="text-xs text-muted">For freelancers and independent professionals.</p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="my-auto w-full max-w-sm self-center py-10">
          <h1 className="display text-2xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-5 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) return setError(humanError(error))
    navigate((location.state as { from?: string })?.from ?? '/dashboard', { replace: true })
  }

  return (
    <AuthLayout title="Log in" subtitle="Welcome back." footer={<>New to PayFlow? <Link to="/signup" className="link">Create an account</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <ErrorNotice message={error} />}
        <Field label="Email">{({ id }) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password">{({ id }) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <div className="-mt-1 text-right"><Link to="/reset-password" className="link text-sm">Forgot password?</Link></div>
        <Button variant="primary" type="submit" loading={busy} disabled={!email || !password}>Log in</Button>
      </form>
    </AuthLayout>
  )
}

export function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use a password of at least 8 characters.')
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/welcome` },
    })
    setBusy(false)
    if (error) return setError(humanError(error))
    if (data.session) navigate('/welcome', { replace: true })
    else setSentTo(email.trim())
  }

  if (sentTo)
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${sentTo}. Open it to finish creating your account.`}>
        <Link to="/login" className="link text-sm">Back to log in</Link>
      </AuthLayout>
    )

  return (
    <AuthLayout title="Create your account" subtitle="Takes a minute. No card required." footer={<>Already have an account? <Link to="/login" className="link">Log in</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <ErrorNotice message={error} />}
        <Field label="Your name">{({ id }) => <Input id={id} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Email">{({ id }) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password" hint="At least 8 characters.">
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button variant="primary" type="submit" loading={busy} disabled={!email || !password || !name}>Create account</Button>
      </form>
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/update-password` })
    setBusy(false)
    if (error) return setError(humanError(error))
    setSent(true)
  }

  return (
    <AuthLayout title="Reset your password" subtitle={sent ? undefined : 'We’ll email you a link to choose a new one.'} footer={<Link to="/login" className="link">Back to log in</Link>}>
      {sent ? (
        <p className="text-sm text-ink-2">If an account exists for {email}, a reset link is on its way. It expires in an hour.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error && <ErrorNotice message={error} />}
          <Field label="Email">{({ id }) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Button variant="primary" type="submit" loading={busy} disabled={!email}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  )
}

export function UpdatePasswordPage() {
  const { session, ready } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use a password of at least 8 characters.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(humanError(error))
    navigate('/dashboard', { replace: true })
  }

  if (ready && !session)
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is no longer valid.">
        <Link to="/reset-password" className="link text-sm">Request a new link</Link>
      </AuthLayout>
    )

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <ErrorNotice message={error} />}
        <Field label="New password" hint="At least 8 characters.">
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button variant="primary" type="submit" loading={busy} disabled={!password}>Save password</Button>
      </form>
    </AuthLayout>
  )
}

export function SetupNeeded() {
  return (
    <div className="mx-auto max-w-lg px-5 py-20">
      <Logo />
      <h1 className="display mt-10 text-2xl">Connect a database to start</h1>
      <p className="mt-3 text-sm text-ink-2">
        PayFlow needs a Supabase project. Copy <code className="font-mono text-xs">.env.example</code> to{' '}
        <code className="font-mono text-xs">.env.local</code>, add <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
        <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>, apply the migrations in <code className="font-mono text-xs">supabase/migrations</code>, then restart the dev server.
      </p>
    </div>
  )
}
