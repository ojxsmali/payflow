import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, FileText, Hand, Link2, Lock, Mail, Receipt, ShieldCheck, Wallet } from 'lucide-react'
import { LogoMark } from '../components/layout/Logo'
import { StatusBadge } from '../components/ui'
import { formatMoney } from '../lib/money'
import { EXAMPLE_ITEMS, EXAMPLE_TOTALS, LIFECYCLE } from '../lib/showcase'
import { PAYMENT_METHODS, STATUS_META } from '../lib/status'
import { ripple, spotlight } from '../lib/effects'

const GITHUB = 'https://github.com/ojxsmali/payflow'
const AUTHOR_URL = 'https://github.com/ojxsmali'
const inr = (minor: number) => formatMoney(minor, 'INR')
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const

const SHOTS = [
  { id: 'overview', label: 'Overview', src: '/showcase/app-overview.jpg', alt: 'PayFlow overview: collected this month, outstanding, overdue and due soon, a needs-attention list, revenue by month and recent invoices.' },
  { id: 'invoices', label: 'Invoices', src: '/showcase/app-invoices.jpg', alt: 'Invoices list with status tabs, search, client and date filters, balances and status pills.' },
  { id: 'editor', label: 'Editor', src: '/showcase/app-editor.jpg', alt: 'New invoice editor with client, dates and due-date presets, line items, discount and tax, and a live summary.' },
] as const

const FEATURES = [
  { icon: FileText, title: 'Real PDF invoices', body: 'Text-based A4 PDFs with embedded fonts. Rows never split across pages.', span: 'md:col-span-3' },
  { icon: Mail, title: 'Send by email', body: 'The PDF goes out attached through Resend — or copy a link and send it yourself.', span: 'md:col-span-3' },
  { icon: Link2, title: 'A private client link', body: 'Clients open the invoice without an account. You see the moment they first view it.', span: 'md:col-span-2' },
  { icon: Wallet, title: 'Partial payments', body: 'UPI, bank transfer, card and more. Balances and status update on their own.', span: 'md:col-span-2' },
  { icon: Receipt, title: 'Money the database owns', body: 'Numbers and totals are computed server-side. The browser can’t set a total.', span: 'md:col-span-2' },
  { icon: BarChart3, title: 'Analytics that explain themselves', body: 'Collection rate, days to pay, revenue by month and by client — every metric defined on the page.', span: 'md:col-span-6' },
] as const

const SECURITY = ['Row-level security on every table', 'Writes only through validated database functions', 'Client links use 192-bit random tokens', 'No service-role key anywhere in the app']

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-night text-white">
      <Hero />
      <Methods />
      <Lifecycle />
      <Showcase />
      <Features />
      <Security />
      <Closing />
    </div>
  )
}

function Magnetic({ children }: { children: ReactNode }) {
  const x = useSpring(0, { stiffness: 300, damping: 20 })
  const y = useSpring(0, { stiffness: 300, damping: 20 })
  return (
    <motion.div
      className="inline-flex"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * 0.3)
        y.set((e.clientY - r.top - r.height / 2) * 0.3)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

function Hero() {
  const words = 'Get paid for the work you’ve already done.'.split(' ')
  const { scrollY } = useScroll()
  const glowY = useTransform(scrollY, [0, 800], [0, 200])
  return (
    <section className="relative overflow-hidden">
      <div className="pf-grid pointer-events-none absolute inset-0" aria-hidden />
      <motion.div style={{ y: glowY }} className="pointer-events-none absolute left-1/2 top-[-280px] size-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(91_61_245/0.45),transparent_60%)] blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-[-200px] size-[520px] rounded-full bg-[radial-gradient(circle,rgb(46_230_166/0.16),transparent_65%)] blur-2xl" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark className="size-8" />
          <span className="font-display text-[17px] font-semibold tracking-[-0.03em]">PayFlow</span>
        </span>
        <nav aria-label="Sections" className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm backdrop-blur md:flex">
          {[['#how', 'How it works'], ['#product', 'Product'], ['#security', 'Security']].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full px-3.5 py-1.5 text-[#c9c5de] transition-colors hover:bg-white/10 hover:text-white">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm">
          <Link to="/login" className="rounded-full px-3 py-2 font-medium text-[#c9c5de] transition-colors hover:text-white">Log in</Link>
          <Link to="/signup" onPointerDown={ripple} className="pf-press relative isolate inline-flex h-9 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full bg-white px-4 font-semibold text-night transition-transform duration-300 ease-[var(--ease-spring)]">
            <span className="sm:hidden">Sign up</span><span className="max-sm:hidden">Create account</span> <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 pb-24 pt-12 text-center sm:px-8 lg:pt-20">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-[#c9c5de]">
          <span className="pf-pulse relative size-1.5 rounded-full bg-brass text-brass" aria-hidden />
          Invoicing and payment tracking for freelancers
        </motion.p>
        <h1 className="mx-auto mt-7 max-w-4xl font-display text-[2.9rem] font-semibold leading-[1] tracking-[-0.055em] sm:text-[5.2rem]">
          <span className="sr-only">Get paid for the work you’ve already done.</span>
          <span aria-hidden>
            {words.map((w, i) => (
              <motion.span
                key={i}
                className={`inline-block ${i >= 5 ? 'pf-shine' : ''}`}
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 120, damping: 16 }}
              >
                {w}&nbsp;
              </motion.span>
            ))}
          </span>
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-[#bdb8d6]">
          Create an invoice, send it as a PDF or a private link, record payments as they arrive — and always know exactly what’s still owed.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Magnetic>
            <Link to="/signup" onPointerDown={ripple} className="pf-press group relative isolate inline-flex h-12 items-center gap-2 overflow-hidden rounded-full bg-accent px-7 font-semibold text-white shadow-[0_14px_40px_-8px_rgb(91_61_245/0.9)] transition-[background-color,transform] duration-300 ease-[var(--ease-spring)] hover:bg-[#6c50ff]">
              Start invoicing — free <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </Magnetic>
          <a href="#product" className="pf-press inline-flex h-12 items-center rounded-full border border-white/15 px-7 font-medium text-white transition-colors hover:bg-white/5">See the product</a>
        </motion.div>

        <InvoiceStage />
      </div>
    </section>
  )
}

/** Example invoice on a stage: it collects payments on its own, can be dragged (and springs back) and stepped by click. */
function InvoiceStage() {
  const [step, setStep] = useState(() => (reduced() ? LIFECYCLE.length - 1 : 0))
  const [paused, setPaused] = useState(false)
  const [burst, setBurst] = useState(0)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])

  useEffect(() => {
    if (paused || reduced()) return
    const t = window.setTimeout(() => setStep((s) => (s + 1) % LIFECYCLE.length), step === LIFECYCLE.length - 1 ? 3800 : 2300)
    return () => window.clearTimeout(t)
  }, [step, paused])
  useEffect(() => {
    if (LIFECYCLE[step].status === 'paid') setBurst((b) => b + 1)
  }, [step])

  const s = LIFECYCLE[step]
  const pct = Math.round((s.paid / EXAMPLE_TOTALS.total) * 100)
  const balance = EXAMPLE_TOTALS.total - s.paid
  const payments = LIFECYCLE.slice(0, step + 1).filter((l, i) => i > 0 && l.paid > LIFECYCLE[i - 1].paid)

  return (
    <div className="relative mx-auto mt-16 max-w-[560px] text-left" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <p className="mb-4 flex items-center justify-center gap-1.5 text-xs text-[#8d88a8]"><Hand className="size-3.5 text-brass" aria-hidden /> Drag the invoice — it springs back. Click a step to jump.</p>

      {/* payment chips flying in */}
      <div className="pointer-events-none absolute -left-4 top-24 z-20 hidden flex-col gap-2 sm:-left-40 sm:flex" aria-hidden>
        <AnimatePresence>
          {payments.map((p) => (
            <motion.div key={p.when} initial={{ opacity: 0, x: -40, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20 }} transition={SPRING}
              className="flex items-center gap-2 rounded-full border border-brass/30 bg-[#12201c]/90 px-3 py-1.5 text-xs text-brass shadow-lg backdrop-blur">
              <CheckCircle2 className="size-3.5" /> {p.event.replace('Payment recorded · ', '')} · {p.when}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.figure
        drag
        dragSnapToOrigin
        dragElastic={0.5}
        dragTransition={{ bounceStiffness: 380, bounceDamping: 13 }}
        whileDrag={{ scale: 1.04, cursor: 'grabbing' }}
        style={{ x, rotate, touchAction: 'pan-y', transformPerspective: 1200 }}
        initial={{ opacity: 0, y: 60, rotateX: 25 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 70, damping: 14 }}
        className="relative cursor-grab select-none"
        aria-label="Example invoice moving from draft to paid"
      >
        <div className="absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_40%,rgb(91_61_245/0.5),transparent_70%)] blur-2xl" aria-hidden />
        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-surface p-6 text-ink shadow-[0_50px_100px_-30px_rgb(0_0_0/0.8)] sm:p-7">
          <Burst key={burst} active={burst > 0 && s.status === 'paid'} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-semibold leading-none tracking-[-0.04em]">Invoice</p>
              <p className="mt-2 font-mono text-xs text-muted">INV-0042 · Meridian Design Co.</p>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div key={s.status} initial={{ opacity: 0, y: -12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.8 }} transition={SPRING}>
                <StatusBadge status={s.status} className="text-sm" />
              </motion.div>
            </AnimatePresence>
          </div>

          <table className="mt-6 w-full text-sm">
            <caption className="sr-only">Example line items</caption>
            <tbody>
              {EXAMPLE_ITEMS.map((it, i) => (
                <tr key={it.description} className="border-t border-line">
                  <td className="py-2.5 pr-3 text-ink-2">{it.description}</td>
                  <td className="num py-2.5 text-right whitespace-nowrap">{inr(EXAMPLE_TOTALS.lineAmounts[i])}</td>
                </tr>
              ))}
              <tr className="border-t border-line text-muted">
                <td className="py-2">Discount 5% · GST 18%</td>
                <td className="num py-2 text-right whitespace-nowrap">−{inr(EXAMPLE_TOTALS.discount)} · +{inr(EXAMPLE_TOTALS.tax)}</td>
              </tr>
              <tr className="border-t-2 border-ink font-semibold">
                <td className="py-2.5">Total</td>
                <td className="num py-2.5 text-right font-display text-lg tracking-[-0.03em]">{inr(EXAMPLE_TOTALS.total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 rounded-xl bg-paper p-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted">Paid</span>
              <span className="num font-semibold">{inr(s.paid)} <span className="font-normal text-muted">· {balance > 0 ? `${inr(balance)} due` : 'settled'}</span></span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Share of the total paid">
              <motion.div className={`h-full rounded-full ${pct === 100 ? 'bg-success' : 'bg-accent'}`} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 16 }} />
            </div>
          </div>

          <ol className="mt-4 grid grid-cols-5 gap-1 rounded-xl bg-sunken p-1" aria-label="Lifecycle">
            {LIFECYCLE.map((l, i) => (
              <li key={l.status}>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setStep(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`relative isolate flex min-h-9 w-full items-center justify-center rounded-lg px-1 py-1 text-center text-[10px] font-semibold leading-tight transition-colors sm:text-[11px] ${i === step ? 'text-white' : i < step ? 'text-accent' : 'text-muted hover:text-ink'}`}
                >
                  {i === step && <motion.span layoutId="pf-step" transition={SPRING} className="absolute inset-0 -z-10 rounded-lg bg-accent shadow-[0_6px_16px_-4px_rgb(91_61_245/0.7)]" />}
                  {STATUS_META[l.status].label}
                </button>
              </li>
            ))}
          </ol>
          <AnimatePresence mode="wait">
            <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-3.5 flex items-center justify-between gap-3 text-xs" aria-live="polite">
              <span className="text-ink-2">{s.event}</span>
              <span className="font-mono text-muted">{s.when}</span>
            </motion.p>
          </AnimatePresence>
        </div>
        <figcaption className="mt-4 text-center text-xs text-[#8d88a8]">Example invoice · totals computed by PayFlow’s own invoice maths</figcaption>
      </motion.figure>
    </div>
  )
}

/** A small mint burst when the example invoice is paid in full. */
function Burst({ active }: { active: boolean }) {
  if (!active || reduced()) return null
  return (
    <div className="pointer-events-none absolute right-12 top-10 z-10" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return (
          <motion.span key={i} className="absolute size-1.5 rounded-full" style={{ background: i % 2 ? '#2ee6a6' : '#5b3df5' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 70, y: Math.sin(a) * 50, opacity: 0, scale: 0.4 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        )
      })}
    </div>
  )
}

function Methods() {
  const items = Object.values(PAYMENT_METHODS)
  return (
    <div className="pf-marquee-wrap overflow-hidden border-y border-white/10 py-5 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" aria-label="Payment methods you can record">
      <div className="pf-marquee gap-12">
        {[...items, ...items, ...items].map((m, i) => (
          <span key={i} className="flex items-center gap-12 whitespace-nowrap font-display text-xl font-medium tracking-[-0.03em] text-[#8d88a8]" aria-hidden={i >= items.length}>
            {m} <span className="size-1.5 rounded-full bg-brass" />
          </span>
        ))}
      </div>
    </div>
  )
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.8, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

/** Three steps joined by a line that fills as you scroll. */
function Lifecycle() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const steps = [
    { k: 'Draft', t: 'Build the invoice', d: 'Clients, line items, discount and tax with live totals and a client-view preview.' },
    { k: 'Send', t: 'Email it or share a link', d: 'A real PDF attached, or a private link that tells you when it’s opened.' },
    { k: 'Get paid', t: 'Record what arrives', d: 'Full or partial payments. Overdue and balances are derived, never typed in.' },
  ]
  return (
    <section id="how" aria-labelledby="flow-title" className="mx-auto w-full max-w-[1200px] scroll-mt-6 px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-semibold text-brass">How it works</p>
        <h2 id="flow-title" className="mt-3 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">From first draft to paid in full.</h2>
      </Reveal>
      <ol ref={ref} className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
        <div className="absolute left-0 right-0 top-5 hidden h-px bg-white/10 md:block" aria-hidden>
          <motion.div style={{ scaleX: fill }} className="h-full origin-left bg-gradient-to-r from-accent to-brass" />
        </div>
        {steps.map((s, i) => (
          <li key={s.k} className="relative">
            <Reveal delay={i * 120}>
              <span className="relative z-10 grid size-10 place-items-center rounded-full border border-white/15 bg-night font-mono text-sm text-white">0{i + 1}</span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-brass">{s.k}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em]">{s.t}</h3>
              <p className="mt-2 text-base text-[#bdb8d6]">{s.d}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Showcase() {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0])
  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-6 bg-paper py-24 text-ink lg:py-32">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">The product</p>
            <h2 id="product-title" className="mt-3 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">Every screen, as it ships.</h2>
          </div>
          <div role="tablist" aria-label="Screens" className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
            {SHOTS.map((s, i) => (
              <button key={s.id} role="tab" type="button" id={`tab-${s.id}`} aria-selected={i === active} aria-controls="shot-panel" onClick={() => setActive(i)}
                className={`relative isolate rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${i === active ? 'text-white' : 'text-ink-2 hover:text-ink'}`}>
                {i === active && <motion.span layoutId="pf-shot-tab" transition={SPRING} className="absolute inset-0 -z-10 rounded-full bg-accent" />}
                {s.label}
              </button>
            ))}
          </div>
        </Reveal>
        <div ref={ref} className="mx-auto mt-12 max-w-[900px] [perspective:1400px]">
          <motion.div style={{ scale, rotateX }} className="origin-top">
            <div id="shot-panel" role="tabpanel" aria-labelledby={`tab-${SHOTS[active].id}`} className="overflow-hidden rounded-[22px] border border-line bg-surface p-1.5 shadow-[0_60px_120px_-50px_rgb(40_24_120/0.55)]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[16px]">
                <AnimatePresence initial={false}>
                  <motion.img key={SHOTS[active].id} src={SHOTS[active].src} alt={SHOTS[active].alt} width={800} height={505} decoding="async"
                    initial={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 h-full w-full object-cover object-top" />
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          <p className="mt-4 text-sm text-muted">Real screens from the live app, showing a clearly labelled sample workspace.</p>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section aria-labelledby="features-title" className="bg-paper pb-24 text-ink lg:pb-32">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <Reveal>
          <p className="text-sm font-semibold text-accent">What’s inside</p>
          <h2 id="features-title" className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">Built like the books depend on it.</h2>
        </Reveal>
        <ul className="mt-12 grid gap-3 md:grid-cols-6">
          {FEATURES.map((f, i) => (
            <li key={f.title} className={f.span}>
              <Reveal delay={(i % 3) * 80} className="h-full">
                <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }} onPointerMove={spotlight}
                  className="pf-spot group h-full rounded-lg border border-line bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-pop)]">
                  <span className="relative grid size-11 place-items-center rounded-xl bg-accent-soft text-accent transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="relative mt-5 font-display text-xl font-semibold tracking-[-0.03em]">{f.title}</h3>
                  <p className="relative mt-2 text-base text-ink-2">{f.body}</p>
                </motion.div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Security() {
  return (
    <section id="security" aria-labelledby="security-title" className="relative scroll-mt-6 overflow-hidden">
      <div className="pointer-events-none absolute left-[-200px] top-0 size-[600px] rounded-full bg-[radial-gradient(circle,rgb(91_61_245/0.3),transparent_60%)] blur-2xl" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32">
        <Reveal>
          <span className="grid size-12 place-items-center rounded-xl border border-white/12 bg-white/5 text-brass"><ShieldCheck className="size-5" aria-hidden /></span>
          <h2 id="security-title" className="mt-6 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">Your clients’ money, handled with care.</h2>
          <p className="mt-5 max-w-md text-lg text-[#bdb8d6]">Postgres enforces who can see and change what. The app can’t write a total, a status or another person’s data — even if someone tries.</p>
        </Reveal>
        <ul className="grid content-center gap-3">
          {SECURITY.map((s, i) => (
            <li key={s}>
              <Reveal delay={i * 90}>
                <motion.div whileHover={{ x: 6 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
                  <span className="grid size-8 place-items-center rounded-lg bg-brass/15 text-brass"><Lock className="size-4" aria-hidden /></span>
                  <span className="text-[#e6e3f2]">{s}</span>
                </motion.div>
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
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-5 py-24 text-center sm:px-8">
        <Reveal>
          <h2 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">Send your first invoice in a <span className="pf-shine">few minutes</span>.</h2>
        </Reveal>
        <div className="flex flex-wrap justify-center gap-3">
          <Magnetic>
            <Link to="/signup" onPointerDown={ripple} className="pf-press relative isolate inline-flex h-12 items-center gap-2 overflow-hidden rounded-full bg-accent px-7 font-semibold text-white shadow-[0_14px_40px_-8px_rgb(91_61_245/0.9)] hover:bg-[#6c50ff]">
              Create a free account <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Magnetic>
          <Link to="/login" className="pf-press inline-flex h-12 items-center rounded-full border border-white/15 px-7 font-medium text-white hover:bg-white/5">Log in</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-6 text-xs text-[#8d88a8] sm:flex-row sm:justify-between sm:px-8">
          <p>
            Designed &amp; built by <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-medium text-[#d9d6ea] hover:text-white hover:underline">Ojas Mali</a> ·{' '}
            <a href={GITHUB} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">Source on GitHub</a>
          </p>
          <p>React · TypeScript · Supabase (Postgres RLS) · @react-pdf/renderer · Resend · motion</p>
        </div>
      </div>
    </footer>
  )
}
