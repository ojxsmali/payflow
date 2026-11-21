import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, FileText, Link2, Lock, Mail, Receipt, ShieldCheck, Wallet } from 'lucide-react'
import { LogoMark } from '../components/layout/Logo'
import { StatusBadge } from '../components/ui'
import { formatMoney } from '../lib/money'
import { EXAMPLE_ITEMS, EXAMPLE_TOTALS, LIFECYCLE } from '../lib/showcase'
import { STATUS_META } from '../lib/status'

const GITHUB = 'https://github.com/ojxsmali/payflow'
const AUTHOR_URL = 'https://github.com/ojxsmali'
const inr = (minor: number) => formatMoney(minor, 'INR')

const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const SHOTS = [
  { id: 'overview', label: 'Overview', src: '/showcase/overview-desktop.jpg', alt: 'PayFlow overview: collected this month, outstanding, overdue and due soon, a needs-attention list, revenue by month and recent invoices.' },
  { id: 'invoices', label: 'Invoices', src: '/showcase/invoices-desktop.jpg', alt: 'Invoices list with status filters, search, balances and due dates.' },
  { id: 'invoice', label: 'Invoice & payments', src: '/showcase/invoice-detail-desktop.jpg', alt: 'An invoice with its document preview, payment progress, recorded payments and activity timeline.' },
  { id: 'editor', label: 'Editor', src: '/showcase/invoice-editor-desktop.jpg', alt: 'Invoice editor with line items, discount, tax and live totals.' },
  { id: 'analytics', label: 'Analytics', src: '/showcase/analytics-desktop.jpg', alt: 'Analytics: collection rate, average days to pay, revenue by month and by client.' },
] as const

const FEATURES = [
  { icon: FileText, title: 'Real PDF invoices', body: 'Text-based A4 PDFs with embedded fonts. Rows never split across pages.' },
  { icon: Mail, title: 'Send by email', body: 'The PDF goes out attached through Resend, or copy a link and send it yourself.' },
  { icon: Link2, title: 'A private client link', body: 'Clients open the invoice without an account, and you see when they first viewed it.' },
  { icon: Wallet, title: 'Partial payments', body: 'Record UPI, bank transfer, card and more. Balances and status update on their own.' },
  { icon: Receipt, title: 'Money the database owns', body: 'Invoice numbers and every total are computed server-side. The browser can’t set a total.' },
  { icon: BarChart3, title: 'Analytics that explain themselves', body: 'Collection rate, days to pay, revenue by month and client, with every metric defined.' },
] as const

const SECURITY = [
  'Row-level security on every table',
  'Writes only through validated database functions',
  'Client links use 192-bit random tokens',
  'No service-role key anywhere in the app',
]

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <Hero />
      <Lifecycle />
      <Showcase />
      <Features />
      <Security />
      <Closing />
    </div>
  )
}

function Hero() {
  const headline = 'Get paid for the work you’ve already done.'
  return (
    <section className="pf-hero relative overflow-hidden text-[#EEF1F6]">
      <FlowLines />
      <header className="relative mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <span className="inline-flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="text-[16px] font-semibold tracking-[-0.01em]">PayFlow</span>
        </span>
        <nav aria-label="Account" className="flex items-center gap-1 text-sm">
          <a href={GITHUB} target="_blank" rel="noreferrer" className="hidden rounded-md px-3 py-2 font-medium text-[#C3CCDA] hover:bg-white/5 hover:text-white sm:inline-block">
            GitHub
          </a>
          <Link to="/login" className="rounded-md px-3 py-2 font-medium text-[#C3CCDA] hover:bg-white/5 hover:text-white">
            Log in
          </Link>
          <Link to="/signup" className="ml-1 inline-flex h-9 items-center whitespace-nowrap rounded-md bg-brass px-3 font-medium text-[#14213A] transition-colors hover:bg-[#d6b97f] sm:px-3.5">
            <span className="sm:hidden">Sign up</span>
            <span className="max-sm:hidden">Create account</span>
          </Link>
        </nav>
      </header>

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:pb-28 lg:pt-16">
        <div>
          <p className="pf-in inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-[#C3CCDA]">
            <span className="size-1.5 rounded-full bg-brass" aria-hidden />
            Invoicing and payment tracking for freelancers
          </p>
          <h1 className="display mt-6 text-[2.7rem] leading-[1.04] text-white sm:text-[3.9rem]">
            <span className="sr-only">{headline}</span>
            <span aria-hidden="true">
              {headline.split(' ').map((w, i, a) => (
                <Fragment key={i}>
                  <span className="pf-mask">
                    <span className="pf-word" style={{ animationDelay: `${100 + i * 60}ms` }}>{w}</span>
                  </span>
                  {i < a.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </span>
          </h1>
          <p className="pf-in mt-6 max-w-lg text-md leading-relaxed text-[#C3CCDA] [animation-delay:520ms]">
            Create an invoice, send it as a PDF or a private link, record payments as they arrive — and always know exactly what’s still owed.
          </p>
          <div className="pf-in mt-9 flex flex-col gap-3 [animation-delay:620ms] sm:flex-row">
            <Link to="/signup" className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 font-medium text-[#14213A] transition-colors hover:bg-[#F3EFE6]">
              Start invoicing — free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a href="#product" className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 px-5 font-medium text-white transition-colors hover:bg-white/5">
              See the product
            </a>
          </div>
          <p className="pf-in mt-5 text-sm text-[#93A0B5] [animation-delay:700ms]">No card. Your data is isolated by Postgres row-level security.</p>
        </div>
        <InvoiceCard />
      </div>
    </section>
  )
}

/** Slow payment "flows" behind the hero — the brand idea, drawn in two strokes. */
function FlowLines() {
  return (
    <svg className="pf-flow pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="pf-g1" x1="0" x2="1">
          <stop offset="0" stopColor="#C9A86A" stopOpacity="0" />
          <stop offset=".5" stopColor="#C9A86A" stopOpacity=".55" />
          <stop offset="1" stopColor="#C9A86A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pf-g2" x1="0" x2="1">
          <stop offset="0" stopColor="#7FA2D6" stopOpacity="0" />
          <stop offset=".5" stopColor="#7FA2D6" stopOpacity=".4" />
          <stop offset="1" stopColor="#7FA2D6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M-50 ${520 - i * 34} C 300 ${420 - i * 40}, 520 ${640 - i * 28}, 820 ${360 - i * 30} S 1150 ${250 - i * 20}, 1260 ${300 - i * 26}`}
          fill="none"
          stroke={i % 2 ? 'url(#pf-g2)' : 'url(#pf-g1)'}
          strokeWidth={i % 2 ? 1 : 1.4}
          className="pf-flow-line"
          style={{ animationDelay: `${i * -1.7}s` } as CSSProperties}
        />
      ))}
    </svg>
  )
}

/** An example invoice that walks through the real status lifecycle; hover to tilt, click a step to jump. */
function InvoiceCard() {
  const [step, setStep] = useState(() => (reduced() ? LIFECYCLE.length - 2 : 0))
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paused || reduced()) return
    const t = window.setTimeout(() => setStep((s) => (s + 1) % LIFECYCLE.length), step === LIFECYCLE.length - 1 ? 3600 : 2200)
    return () => window.clearTimeout(t)
  }, [step, paused])

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced() || e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`)
    ref.current.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`)
  }
  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }

  const s = LIFECYCLE[step]
  const pct = Math.round((s.paid / EXAMPLE_TOTALS.total) * 100)
  const balance = EXAMPLE_TOTALS.total - s.paid

  return (
    <figure
      className="pf-in relative [animation-delay:300ms]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false)
        reset()
      }}
      aria-label="Example invoice moving from draft to paid"
    >
      <div className="absolute -inset-6 -z-0 rounded-[28px] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(201,168,106,0.22),transparent_70%)] blur-2xl" aria-hidden />
      <div ref={ref} onPointerMove={tilt} className="pf-tilt relative rounded-xl border border-white/10 bg-surface p-5 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="display text-2xl leading-none">Invoice</p>
            <p className="mt-1.5 font-mono text-xs text-muted">INV-0042 · Meridian Design Co.</p>
          </div>
          <div key={s.status} className="pf-pop rounded-full border border-line bg-paper px-2.5 py-1">
            <StatusBadge status={s.status} />
          </div>
        </div>

        <table className="mt-5 w-full text-sm">
          <caption className="sr-only">Example line items</caption>
          <tbody>
            {EXAMPLE_ITEMS.map((it, i) => (
              <tr key={it.description} className="border-t border-line">
                <td className="py-2 pr-3 text-ink-2">{it.description}</td>
                <td className="num py-2 text-right whitespace-nowrap">{inr(EXAMPLE_TOTALS.lineAmounts[i])}</td>
              </tr>
            ))}
            <tr className="border-t border-line text-muted">
              <td className="py-1.5">Discount 5% · GST 18%</td>
              <td className="num py-1.5 text-right whitespace-nowrap">−{inr(EXAMPLE_TOTALS.discount)} · +{inr(EXAMPLE_TOTALS.tax)}</td>
            </tr>
            <tr className="border-t border-ink/80 font-semibold">
              <td className="py-2">Total</td>
              <td className="num py-2 text-right">{inr(EXAMPLE_TOTALS.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 rounded-lg bg-paper p-3.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Paid</span>
            <span className="num font-medium">
              {inr(s.paid)} <span className="text-muted">· {balance > 0 ? `${inr(balance)} due` : 'settled'}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Share of the total paid">
            <div className={`h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)] ${pct === 100 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Lifecycle">
          {LIFECYCLE.map((l, i) => (
            <li key={l.status}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                className={`flex min-h-9 w-full items-center justify-center rounded-md px-1 py-1 text-center text-[10px] font-medium leading-tight transition-colors sm:text-[10.5px] ${
                  i === step ? 'bg-accent text-surface' : i < step ? 'bg-accent-soft text-accent' : 'bg-sunken text-muted hover:text-ink'
                }`}
              >
                {STATUS_META[l.status].label}
              </button>
            </li>
          ))}
        </ol>
        <p key={step} className="pf-pop mt-3 flex items-center justify-between gap-3 text-xs" aria-live="polite">
          <span className="text-ink-2">{s.event}</span>
          <span className="font-mono text-muted">{s.when}</span>
        </p>
      </div>
      <figcaption className="mt-3 text-center text-xs text-[#93A0B5]">Example invoice · totals computed by PayFlow’s own invoice maths</figcaption>
    </figure>
  )
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window) || reduced())
  useEffect(() => {
    if (seen || !ref.current) return
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        setSeen(true)
        io.disconnect()
      }
    }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen] as const
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} data-seen={seen} className={`pf-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function Lifecycle() {
  const steps = [
    { k: 'Draft', t: 'Build the invoice', d: 'Clients, line items, discount and tax with live totals and a client-view preview.' },
    { k: 'Send', t: 'Email it or share a link', d: 'A real PDF attached, or a private link that tells you when it’s opened.' },
    { k: 'Get paid', t: 'Record what arrives', d: 'Full or partial payments. Overdue and balances are derived, never typed in.' },
  ]
  return (
    <section aria-labelledby="flow-title" className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <p className="eyebrow">How it works</p>
        <h2 id="flow-title" className="display mt-3 max-w-2xl text-3xl leading-[1.1] sm:text-[2.6rem]">From first draft to paid in full — every step on the record.</h2>
      </Reveal>
      <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.k} className="bg-surface">
            <Reveal delay={i * 90} className="h-full p-6 sm:p-8">
              <span className="num font-mono text-xs text-muted">0{i + 1}</span>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.08em] text-accent">{s.k}</p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.01em]">{s.t}</h3>
              <p className="mt-2 text-base text-ink-2">{s.d}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Showcase() {
  const [active, setActive] = useState(0)
  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-6 border-y border-line bg-[#EEEBE4]/60 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">The product</p>
            <h2 id="product-title" className="display mt-3 text-3xl leading-[1.1] sm:text-[2.6rem]">Every screen, as it ships.</h2>
          </div>
          <div role="tablist" aria-label="Screens" className="flex flex-wrap gap-1.5">
            {SHOTS.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                id={`tab-${s.id}`}
                aria-selected={i === active}
                aria-controls="shot-panel"
                onClick={() => setActive(i)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  i === active ? 'border-accent bg-accent text-surface' : 'border-line-strong bg-surface text-ink-2 hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div id="shot-panel" role="tabpanel" aria-labelledby={`tab-${SHOTS[active].id}`} className="mt-10 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_40px_90px_-45px_rgba(27,47,75,0.45)]">
            <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-3 py-2" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="ml-3 hidden rounded-sm bg-surface px-2 py-0.5 font-mono text-2xs text-muted sm:inline">payflow-xi-one.vercel.app</span>
            </div>
            <div className="relative aspect-[16/10]">
              {SHOTS.map((s, i) => (
                <img
                  key={s.id}
                  src={s.src}
                  alt={i === active ? s.alt : ''}
                  aria-hidden={i !== active}
                  width={1600}
                  height={1000}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover object-top transition-[opacity,transform] duration-500 ease-[var(--ease-out)] ${i === active ? 'opacity-100' : 'scale-[1.01] opacity-0'}`}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">Real screens from the live app, showing a clearly labelled sample workspace.</p>
        </Reveal>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section aria-labelledby="features-title" className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <p className="eyebrow">What’s inside</p>
        <h2 id="features-title" className="display mt-3 max-w-2xl text-3xl leading-[1.1] sm:text-[2.6rem]">Built like the books depend on it.</h2>
      </Reveal>
      <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <li key={f.title}>
            <Reveal delay={(i % 3) * 80} className="group">
              <span className="grid size-10 place-items-center rounded-lg border border-line bg-surface text-accent transition-[transform,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:border-brass">
                <f.icon className="size-[18px]" aria-hidden />
              </span>
              <h3 className="mt-4 text-md font-semibold tracking-[-0.01em]">{f.title}</h3>
              <p className="mt-1.5 text-base text-ink-2">{f.body}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Security() {
  return (
    <section aria-labelledby="security-title" className="pf-hero relative overflow-hidden text-[#EEF1F6]">
      <div className="relative mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:py-24">
        <Reveal>
          <span className="grid size-11 place-items-center rounded-lg border border-white/12 bg-white/5 text-brass">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <h2 id="security-title" className="display mt-5 text-3xl leading-[1.1] text-white sm:text-[2.4rem]">Your clients’ money, handled with care.</h2>
          <p className="mt-4 max-w-md text-md text-[#C3CCDA]">
            Postgres enforces who can see and change what. The app can’t write a total, a status or another person’s data — even if someone tries.
          </p>
        </Reveal>
        <ul className="grid content-center gap-3">
          {SECURITY.map((s, i) => (
            <li key={s}>
              <Reveal delay={i * 80} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <Lock className="size-4 shrink-0 text-brass" aria-hidden />
                <span className="text-[#E3E8F0]">{s}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <footer>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-6 px-5 py-20 sm:px-8 md:flex-row md:items-end md:justify-between">
        <Reveal>
          <h2 className="display max-w-xl text-3xl leading-[1.1] sm:text-[2.6rem]">Send your first invoice in a few minutes.</h2>
        </Reveal>
        <div className="flex flex-wrap gap-3">
          <Link to="/signup" className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 font-medium text-surface transition-colors hover:bg-accent-hover">
            Create a free account <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link to="/login" className="inline-flex h-11 items-center rounded-md border border-line-strong bg-surface px-5 font-medium text-ink hover:bg-white">
            Log in
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-8">
          <p>
            Designed &amp; built by{' '}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-medium text-ink-2 hover:text-ink hover:underline">
              Ojas Mali
            </a>{' '}
            ·{' '}
            <a href={GITHUB} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
              Source on GitHub
            </a>
          </p>
          <p>React · TypeScript · Supabase (Postgres RLS) · @react-pdf/renderer · Resend</p>
        </div>
      </div>
    </footer>
  )
}
