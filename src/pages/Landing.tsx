import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, Hand } from 'lucide-react'
import { LogoMark } from '../components/layout/Logo'
import { StatusBadge } from '../components/ui'
import { formatMoney } from '../lib/money'
import { EXAMPLE_ITEMS, EXAMPLE_TOTALS, LIFECYCLE } from '../lib/showcase'
import { PAYMENT_METHODS, STATUS_META } from '../lib/status'
import { ripple } from '../lib/effects'

const GITHUB = 'https://github.com/ojxsmali/payflow'
const AUTHOR_URL = 'https://github.com/ojxsmali'
const inr = (minor: number) => formatMoney(minor, 'INR')
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const

/** Page frame shared by every landing section. */
const FRAME = 'mx-auto w-full max-w-[1360px] px-[clamp(16px,3vw,40px)]'

const SHOTS = [
  { id: 'overview', label: 'Overview', src: '/showcase/app-overview.jpg', alt: 'PayFlow overview: collected this month, outstanding, overdue and due soon, a needs-attention list, revenue by month and recent invoices.' },
  { id: 'invoices', label: 'Invoices', src: '/showcase/app-invoices.jpg', alt: 'Invoices list with status tabs, search, client and date filters, balances and status pills.' },
  { id: 'editor', label: 'Editor', src: '/showcase/app-editor.jpg', alt: 'New invoice editor with client, dates and due-date presets, line items, discount and tax, and a live summary.' },
] as const

const FEATURES = [
  { title: 'Real PDF invoices', body: 'Text-based A4 PDFs with embedded fonts. Rows never split across pages.' },
  { title: 'Send by email', body: 'The PDF goes out attached through Resend — or copy a link and send it yourself.' },
  { title: 'A private client link', body: 'Clients open the invoice without an account. You see the moment they first view it.' },
  { title: 'Partial payments', body: 'UPI, bank transfer, card and more. Balances and status update on their own.' },
  { title: 'Money the database owns', body: 'Numbers and totals are computed server-side. The browser can’t set a total.' },
  { title: 'Analytics that explain themselves', body: 'Collection rate, days to pay, revenue by month and by client — every metric defined on the page.' },
] as const

const SECURITY = ['Row-level security on every table', 'Writes only through validated database functions', 'Client links use 192-bit random tokens', 'No service-role key anywhere in the app']

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <a href="#hero" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <Lifecycle />
        <Showcase />
        <Features />
        <Security />
        <Closing />
      </main>
      <Colophon />
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

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.8, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  )
}

const primaryCta =
  'pf-press group relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-accent px-7 font-semibold text-white transition-[background-color,transform] duration-300 ease-[var(--ease-spring)] hover:bg-accent-hover'
const secondaryCta =
  'pf-press inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-7 font-medium text-ink transition-colors hover:border-ink hover:bg-surface'

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
        <Link to="/" aria-label="PayFlow home" className="inline-flex items-center gap-2.5 rounded">
          <LogoMark className="size-8" />
          <span className="text-[17px] font-semibold tracking-[-0.035em]">PayFlow</span>
        </Link>
        <nav aria-label="Sections" className="flex items-center gap-1 text-sm">
          {[['#how', 'How it works'], ['#product', 'Product'], ['#security', 'Security']].map(([h, l]) => (
            <a key={h} href={h} className="hidden h-9 items-center rounded px-3 font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex">
              {l}
            </a>
          ))}
          <Link to="/login" className="inline-flex h-9 items-center whitespace-nowrap rounded px-2 font-medium sm:px-3 text-ink-2 transition-colors hover:text-ink">
            Log in
          </Link>
          <Link to="/signup" onPointerDown={ripple} className="pf-press relative isolate ml-1 inline-flex h-9 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full bg-ink px-4 font-semibold text-white transition-transform duration-300 ease-[var(--ease-spring)]">
            <span className="sm:hidden">Sign up</span>
            <span className="max-sm:hidden">Create account</span> <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  const lead = 'Get paid for the work'
  const accent = 'you’ve already done.'
  return (
    <section id="hero" aria-labelledby="hero-title" className={`${FRAME} pb-24 pt-10 sm:pt-14 lg:pb-32`}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
        <p className="pf-label">(PayFlow) — invoicing for freelancers</p>
        <p className="pf-label flex items-center gap-2 text-ink-2">
          <span className="pf-pulse relative size-1.5 rounded-full bg-accent text-accent" aria-hidden />
          Free account · no card
        </p>
      </motion.div>

      <h1 id="hero-title" className="pf-display mt-10 text-[clamp(2.9rem,8vw,8.6rem)] sm:mt-14">
        <span className="sr-only">
          {lead} {accent}
        </span>
        <span aria-hidden>
          {lead.split(' ').map((w, i) => (
            <Word key={i} delay={0.08 + i * 0.06}>
              {w}
            </Word>
          ))}
          <br className="hidden sm:block" />
          <span className="pf-serif text-accent">
            {accent.split(' ').map((w, i) => (
              <Word key={i} delay={0.4 + i * 0.07}>
                {w}
              </Word>
            ))}
          </span>
        </span>
      </h1>

      <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="lg:col-span-4">
          <p className="max-w-md text-lg leading-relaxed text-ink-2 sm:text-xl sm:leading-relaxed">
            Create an invoice, send it as a PDF or a private link, record payments as they arrive — and always know exactly what’s still owed.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start 2xl:flex-row">
            <Magnetic>
              <Link to="/signup" onPointerDown={ripple} className={`${primaryCta} w-full sm:w-auto`}>
                Start invoicing — free <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </Magnetic>
            <a href="#product" className={secondaryCta}>
              See the product
            </a>
          </div>
          <div className="mt-12 border-t border-line pt-4">
            <p className="pf-label">Payments you can record</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2">
              {Object.values(PAYMENT_METHODS).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </motion.div>
        <div className="lg:col-span-8 lg:pl-6">
          <InvoiceStage />
        </div>
      </div>
    </section>
  )
}

function Word({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.12em] align-top -mb-[0.12em]">
      <motion.span className="inline-block" initial={{ y: '105%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}>
        {children}&nbsp;
      </motion.span>
    </span>
  )
}

/**
 * The signature visual: an example invoice on paper. It collects its payments on its own,
 * can be dragged (it springs back) or stepped by click — and when the balance reaches zero
 * a violet PAID stamp lands on it.
 */
function InvoiceStage() {
  const [step, setStep] = useState(() => (reduced() ? LIFECYCLE.length - 1 : 0))
  const [paused, setPaused] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-6, 6])

  useEffect(() => {
    if (paused || reduced()) return
    const t = window.setTimeout(() => setStep((s) => (s + 1) % LIFECYCLE.length), step === LIFECYCLE.length - 1 ? 4200 : 2300)
    return () => window.clearTimeout(t)
  }, [step, paused])

  const s = LIFECYCLE[step]
  const pct = Math.round((s.paid / EXAMPLE_TOTALS.total) * 100)
  const balance = EXAMPLE_TOTALS.total - s.paid
  const payments = LIFECYCLE.slice(0, step + 1).filter((l, i) => i > 0 && l.paid > LIFECYCLE[i - 1].paid)
  const isPaid = s.status === 'paid'

  return (
    <figure className="min-w-0" aria-labelledby="stage-caption" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-baseline justify-between gap-4 border-t border-ink pt-3">
        <figcaption id="stage-caption" className="pf-label text-ink-2">
          Fig. 1 — An invoice, from draft to paid
        </figcaption>
        <span className="pf-label hidden items-center gap-1.5 sm:inline-flex">
          <Hand className="size-3.5" aria-hidden /> Drag it · it springs back
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_200px] md:items-start">
        <motion.div
          drag
          dragSnapToOrigin
          dragElastic={0.5}
          dragTransition={{ bounceStiffness: 380, bounceDamping: 13 }}
          whileDrag={{ scale: 1.03, cursor: 'grabbing' }}
          style={{ x, rotate, touchAction: 'pan-y' }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 80, damping: 16 }}
          className="relative cursor-grab select-none"
        >
          <div className="relative overflow-hidden rounded-[4px] border border-line-strong bg-surface p-6 text-ink shadow-[var(--shadow-doc)] sm:p-8">
            <AnimatePresence>
              {isPaid && (
                <motion.div
                  key="stamp"
                  initial={reduced() ? false : { opacity: 0, scale: 2.2, rotate: -2 }}
                  animate={{ opacity: 0.92, scale: 1, rotate: -11 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22, mass: 0.8 }}
                  className="pf-stamp pointer-events-none absolute bottom-[64px] left-5 z-10 scale-75 px-4 py-2 text-center text-accent sm:left-[9%] sm:scale-90 lg:scale-100"
                  aria-hidden
                >
                  <span className="block font-mono text-2xl font-bold tracking-[0.12em] sm:text-3xl">PAID</span>
                  <span className="block font-mono text-[10px] font-semibold tracking-[0.14em]">IN FULL · {s.when.toUpperCase()}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="pf-serif text-4xl leading-none sm:text-5xl">Invoice</p>
                <p className="mt-3 font-mono text-xs text-muted">INV-0042 · Meridian Design Co.</p>
              </div>
              <AnimatePresence mode="popLayout">
                <motion.div key={s.status} initial={{ opacity: 0, y: -12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.8 }} transition={SPRING}>
                  <StatusBadge status={s.status} className="text-sm" />
                </motion.div>
              </AnimatePresence>
            </div>

            <table className="mt-7 w-full text-sm">
              <caption className="sr-only">Example line items</caption>
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="pf-label pb-2 text-left font-medium">Item</th>
                  <th scope="col" className="pf-label pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ITEMS.map((it, i) => (
                  <tr key={it.description} className="border-b border-line">
                    <td className="py-2.5 pr-3 text-ink-2">{it.description}</td>
                    <td className="num py-2.5 text-right font-mono text-[13px] whitespace-nowrap">{inr(EXAMPLE_TOTALS.lineAmounts[i])}</td>
                  </tr>
                ))}
                <tr className="border-b border-line text-muted">
                  <td className="py-2">Discount 5% · GST 18%</td>
                  <td className="num py-2 text-right font-mono text-[13px] whitespace-nowrap">−{inr(EXAMPLE_TOTALS.discount)} · +{inr(EXAMPLE_TOTALS.tax)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="pt-3">Total</td>
                  <td className="num pt-3 text-right text-xl tracking-[-0.03em] sm:text-2xl">{inr(EXAMPLE_TOTALS.total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-6 border-t border-line pt-4">
              <div className="flex items-baseline justify-between text-xs">
                <span className="pf-label">Paid</span>
                <span className="num font-semibold">
                  {inr(s.paid)} <span className="font-normal text-muted">· {balance > 0 ? `${inr(balance)} due` : 'settled'}</span>
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Share of the total paid">
                <motion.div className="h-full bg-accent" animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 16 }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* The lifecycle as a ledger you can step through */}
        <div>
          <ol className="border-t border-line" aria-label="Lifecycle">
            {LIFECYCLE.map((l, i) => (
              <li key={l.status} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`pf-press relative isolate grid w-full grid-cols-[1.75rem_1fr_auto] items-baseline gap-2 px-1 py-2.5 text-left text-sm transition-colors ${i === step ? 'text-ink' : i < step ? 'text-ink-2' : 'text-muted hover:text-ink'}`}
                >
                  {i === step && <motion.span layoutId="pf-step" transition={SPRING} className="absolute inset-0 -z-10 bg-surface" />}
                  <span className={`font-mono text-2xs ${i <= step ? 'text-accent' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-medium">{STATUS_META[l.status].label}</span>
                  <span className="font-mono text-2xs text-muted">{l.when}</span>
                </button>
              </li>
            ))}
          </ol>
          <AnimatePresence mode="wait">
            <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-4 text-sm text-ink-2" aria-live="polite">
              {s.event}
            </motion.p>
          </AnimatePresence>
          <ul className="mt-4 grid gap-1.5" aria-label="Payments received">
            <AnimatePresence>
              {payments.map((p) => (
                <motion.li key={p.when} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={SPRING} className="flex justify-between gap-2 font-mono text-2xs text-ink-2">
                  <span>+ {p.event.replace('Payment recorded · ', '')}</span>
                  <span>{p.when}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
      <p className="pf-label mt-5">Example invoice · totals computed by PayFlow’s own invoice maths</p>
    </figure>
  )
}

/** Monospaced section marker on a hairline, then an oversized heading. */
function SectionHead({ index, label, id, children, aside, dark }: { index: string; label: string; id: string; children: ReactNode; aside?: ReactNode; dark?: boolean }) {
  return (
    <Reveal>
      <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 border-t pt-3 ${dark ? 'border-white/40' : 'border-ink'}`}>
        <p className={`pf-label ${dark ? 'text-white/70' : 'text-ink-2'}`}>
          ({index}) {label}
        </p>
        {aside}
      </div>
      <h2 id={id} className="pf-display mt-8 max-w-[15ch] text-[clamp(2.5rem,6vw,5.75rem)]">
        {children}
      </h2>
    </Reveal>
  )
}

/** Three steps joined by a rule that fills with stamp ink as you scroll. */
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
    <section id="how" aria-labelledby="flow-title" className={`${FRAME} scroll-mt-20 pt-8`}>
      <SectionHead index="01" label="How it works" id="flow-title">
        From first draft <span className="pf-serif">to paid in full.</span>
      </SectionHead>
      <ol ref={ref} className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
        <div className="absolute left-0 right-0 top-0 hidden h-px bg-line md:block" aria-hidden>
          <motion.div style={{ scaleX: fill }} className="h-[2px] origin-left bg-accent" />
        </div>
        {steps.map((s, i) => (
          <li key={s.k} className="relative md:pt-8">
            <Reveal delay={i * 120}>
              <p className="pf-label">
                <span className="text-accent">0{i + 1}</span> · {s.k}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{s.t}</h3>
              <p className="mt-2 max-w-sm text-base text-ink-2">{s.d}</p>
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
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1])
  const rotateX = useTransform(scrollYProgress, [0, 1], [12, 0])
  return (
    <section id="product" aria-labelledby="product-title" className={`${FRAME} scroll-mt-20 pt-32 lg:pt-44`}>
      <SectionHead
        index="02"
        label="The product"
        id="product-title"
        aside={
          <div role="tablist" aria-label="Screens" className="flex gap-1">
            {SHOTS.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                id={`tab-${s.id}`}
                aria-selected={i === active}
                aria-controls="shot-panel"
                onClick={() => setActive(i)}
                className={`pf-press relative isolate rounded-full px-3 py-1 font-mono text-2xs uppercase tracking-[0.08em] transition-colors ${i === active ? 'text-white' : 'text-muted hover:text-ink'}`}
              >
                {i === active && <motion.span layoutId="pf-shot-tab" transition={SPRING} className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        Every screen, <span className="pf-serif">as it ships.</span>
      </SectionHead>
      <div ref={ref} className="mt-14 [perspective:1600px]">
        <motion.div style={{ scale, rotateX }} className="origin-top">
          <div id="shot-panel" role="tabpanel" aria-labelledby={`tab-${SHOTS[active].id}`} className="overflow-hidden rounded-lg border border-line-strong bg-surface p-1.5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[8px]">
              <AnimatePresence initial={false}>
                <motion.img
                  key={SHOTS[active].id}
                  src={SHOTS[active].src}
                  alt={SHOTS[active].alt}
                  width={800}
                  height={505}
                  decoding="async"
                  loading="lazy"
                  initial={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
        <p className="pf-label mt-3">Fig. 2 — Real screens from the live app, showing a clearly labelled sample workspace</p>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section aria-labelledby="features-title" className={`${FRAME} pt-32 lg:pt-44`}>
      <SectionHead index="03" label="What’s inside" id="features-title" aside={<span className="pf-label hidden sm:inline">{FEATURES.length} entries</span>}>
        Built like the books <span className="pf-serif">depend on it.</span>
      </SectionHead>
      <ol className="mt-16 grid border-t border-line md:grid-cols-2">
        {FEATURES.map((f, i) => (
          <li key={f.title} className="group border-b border-line md:odd:border-r md:odd:pr-10 md:even:pl-10">
            <Reveal delay={(i % 2) * 80}>
              <div className="grid grid-cols-[2.5rem_1fr] gap-4 py-8 md:py-10">
                <span className="num pt-1.5 font-mono text-sm text-muted transition-colors group-hover:text-accent">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.035em] transition-transform duration-500 ease-[var(--ease-reveal)] group-hover:translate-x-1.5 sm:text-[1.75rem]">{f.title}</h3>
                  <p className="mt-2 max-w-md text-base text-ink-2">{f.body}</p>
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The one inverted band: black paper, white ink. */
function Security() {
  return (
    <section id="security" aria-labelledby="security-title" className="mt-32 scroll-mt-16 bg-night text-white lg:mt-44">
      <div className={`${FRAME} grid gap-12 py-20 lg:grid-cols-12 lg:py-28`}>
        <div className="lg:col-span-7">
          <SectionHead index="04" label="Security" id="security-title" dark>
            Your clients’ money, <span className="pf-serif text-brass">handled with care.</span>
          </SectionHead>
        </div>
        <Reveal delay={120} className="lg:col-span-5 lg:self-end">
          <p className="text-lg leading-relaxed text-white/75">
            Postgres enforces who can see and change what. The app can’t write a total, a status or another person’s data — even if someone tries.
          </p>
          <ul className="mt-8 border-t border-white/20">
            {SECURITY.map((s, i) => (
              <li key={s} className="flex items-baseline gap-4 border-b border-white/20 py-3 text-sm font-medium">
                <span className="font-mono text-2xs text-brass">{String(i + 1).padStart(2, '0')}</span>
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section aria-labelledby="closing-title" className={`${FRAME} pt-32 lg:pt-44`}>
      <Reveal>
        <div className="border-t border-ink pt-3">
          <p className="pf-label text-ink-2">(05) Get started</p>
        </div>
        <h2 id="closing-title" className="pf-display mt-8 max-w-[16ch] text-[clamp(2.5rem,6.5vw,6.25rem)]">
          Send your first invoice <span className="pf-serif text-accent">in a few minutes.</span>
        </h2>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Magnetic>
            <Link to="/signup" onPointerDown={ripple} className={`${primaryCta} w-full sm:w-auto`}>
              Create a free account <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </Magnetic>
          <Link to="/login" className={secondaryCta}>
            Log in
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function Colophon() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className={`${FRAME} grid gap-10 py-12 md:grid-cols-12`}>
        <div className="md:col-span-5">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <span className="text-[16px] font-semibold tracking-[-0.035em]">PayFlow</span>
          </span>
          <p className="mt-4 max-w-sm text-sm text-muted">Invoicing and payment tracking for freelancers and independent professionals.</p>
          <p className="mt-6 text-sm text-muted">
            Designed &amp; built by{' '}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
              Ojas Mali
            </a>{' '}
            ·{' '}
            <a href={GITHUB} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
              Source on GitHub
            </a>
          </p>
        </div>
        <div className="md:col-span-4">
          <p className="pf-label">Built with</p>
          <ul className="mt-3 grid gap-1 font-mono text-xs text-ink-2">
            {['React 19', 'TypeScript', 'Supabase · Postgres RLS', '@react-pdf/renderer', 'Resend', 'motion'].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="pf-label">Set in</p>
          <ul className="mt-3 grid gap-1 text-sm text-ink-2">
            <li>Geist</li>
            <li className="pf-serif text-base">Newsreader</li>
            <li className="font-mono text-xs">Geist Mono</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
