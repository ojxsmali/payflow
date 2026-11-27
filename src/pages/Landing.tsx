import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useDragControls, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowUpRight, MousePointerClick } from 'lucide-react'
import { LogoMark, Wordmark } from '../components/layout/Logo'
import { StatusBadge } from '../components/ui'
import { PullCard, Reveal, Word } from '../components/motion'
import { Press3D } from '../components/three/Scene3D'
import { EntryActions } from '../components/EntryActions'
import { useAuth } from '../auth/AuthProvider'
import { FlatPress } from '../components/brand/FlatPress'
import { formatMoney } from '../lib/money'
import { EXAMPLE_ITEMS, EXAMPLE_TOTALS, LIFECYCLE, type PressInvoice } from '../lib/showcase'
import { PAYMENT_METHODS, STATUS_META } from '../lib/status'
import { ripple } from '../lib/effects'

const GITHUB = 'https://github.com/ojxsmali/payflow'
const AUTHOR_URL = 'https://github.com/ojxsmali'
const inr = (minor: number) => formatMoney(minor, 'INR')
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const

/** Page frame shared by every landing section. */
const FRAME = 'mx-auto w-full max-w-[1400px] px-[clamp(16px,3vw,40px)]'

const SHOTS = [
  { id: 'overview', label: 'Overview', src: '/showcase/app-overview-2400.webp', srcSet: '/showcase/app-overview-1280.webp 1280w, /showcase/app-overview-2400.webp 2400w', alt: 'PayFlow overview: collected this month, outstanding, overdue and due soon, a needs-attention list, revenue by month and recent invoices.' },
  { id: 'invoices', label: 'Invoices', src: '/showcase/app-invoices-2400.webp', srcSet: '/showcase/app-invoices-1280.webp 1280w, /showcase/app-invoices-2400.webp 2400w', alt: 'Invoices list with status tabs, search, client and date filters, balances and status pills.' },
  { id: 'editor', label: 'Editor', src: '/showcase/app-editor-2400.webp', srcSet: '/showcase/app-editor-1280.webp 1280w, /showcase/app-editor-2400.webp 2400w', alt: 'New invoice editor with client, dates and due-date presets, line items, discount and tax, and a live summary.' },
] as const

const FEATURES = [
  { title: 'Real PDF invoices', body: 'Text-based A4 PDFs with embedded fonts. Rows never split across pages.', tag: 'PDF' },
  { title: 'Send by email', body: 'The PDF goes out attached through Resend — or copy a link and send it yourself.', tag: 'Email' },
  { title: 'A private client link', body: 'Clients open the invoice without an account. You see the moment they first view it.', tag: 'Link' },
  { title: 'Partial payments', body: 'UPI, bank transfer, card and more. Balances and status update on their own.', tag: 'Payments' },
  { title: 'Money the database owns', body: 'Numbers and totals are computed server-side. The browser can’t set a total.', tag: 'Postgres' },
  { title: 'Analytics that explain themselves', body: 'Collection rate, days to pay, revenue by month and by client — every metric defined on the page.', tag: 'Analytics' },
] as const

const SECURITY = ['Row-level security on every table', 'Writes only through validated database functions', 'Client links use 192-bit random tokens', 'No service-role key anywhere in the app']

export function LandingPage() {
  useEffect(() => {
    document.title = 'PayFlow — get paid for the work you’ve already done'
  }, [])
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <a href="#hero" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <Ticker />
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

function Nav() {
  const { session, guest } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
        <Link to="/" aria-label="PayFlow home" className="group inline-flex items-center gap-2.5 rounded">
          <motion.span whileHover={{ rotate: -12, scale: 1.08 }} whileTap={{ scale: 0.85 }} transition={SPRING} className="inline-flex">
            <LogoMark className="size-8" />
          </motion.span>
          <Wordmark />
        </Link>
        <nav aria-label="Sections" className="flex items-center gap-1 text-sm">
          {[['#how', 'How it works'], ['#product', 'Product'], ['#security', 'Security'], ['/brand', 'Brand']].map(([h, l]) =>
            h.startsWith('/') ? (
              <Link key={h} to={h} className="hidden h-9 items-center rounded px-3 font-medium text-ink-2 transition-colors hover:text-ink lg:inline-flex">
                {l}
              </Link>
            ) : (
              <a key={h} href={h} className="hidden h-9 items-center rounded px-3 font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex">
                {l}
              </a>
            ),
          )}
          {session || guest ? (
            <Link to="/dashboard" onPointerDown={ripple} className="pf-press relative isolate ml-1 inline-flex h-9 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full bg-ink px-4 font-bold text-white transition-transform duration-300 ease-[var(--ease-spring)]">
              {guest ? 'Back to the app' : 'Dashboard'} <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <>
              <Link to="/login" className="inline-flex h-9 items-center whitespace-nowrap rounded px-2 font-semibold text-ink-2 transition-colors hover:text-ink sm:px-3">
                Log in
              </Link>
              <Link to="/signup" onPointerDown={ripple} className="pf-press relative isolate ml-1 inline-flex h-9 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full bg-ink px-4 font-bold text-white transition-transform duration-300 ease-[var(--ease-spring)]">
                <span className="sm:hidden">Sign up</span>
                <span className="max-sm:hidden">Create account</span> <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  const lead = ['Get', 'paid', 'for', 'the', 'work']
  return (
    <section id="hero" aria-labelledby="hero-title" className={`${FRAME} pb-16 pt-8 sm:pt-12`}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-2 border-ink pb-3">
        <p className="pf-label text-ink-2">PayFlow — invoicing for freelancers</p>
        <p className="pf-label flex items-center gap-2 text-ink-2">
          <span className="pf-pulse relative size-1.5 rounded-full bg-accent text-accent" aria-hidden />
          Free account · no card
        </p>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-12 lg:items-end lg:gap-10">
        <h1 id="hero-title" className="pf-display text-[clamp(2.5rem,6.3vw,6.6rem)] lg:col-span-8">
          <span className="sr-only">Get paid for the work you’ve already done.</span>
          <span aria-hidden>
            {lead.map((w, i) => (
              <Word key={i} delay={0.06 + i * 0.05}>
                {w}&nbsp;
              </Word>
            ))}
            <Word delay={0.34}>you’ve&nbsp;</Word>
            <Word delay={0.42}>
              <span className="pf-hl">already&nbsp;done.</span>
            </Word>
          </span>
        </h1>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="lg:col-span-4 lg:pb-3">
          <p className="max-w-md text-lg leading-relaxed text-ink-2">
            Create an invoice, send it as a PDF or a private link, record payments as they arrive — and always know exactly what’s still owed.
          </p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="mt-8">
        <EntryActions />
      </motion.div>

      <PressBed />
    </section>
  )
}

/** Fig. 1 — the 3D press, with a live HUD of what has been stamped. */
function PressBed() {
  const [count, setCount] = useState(0)
  const [collected, setCollected] = useState(0)
  const [last, setLast] = useState<PressInvoice | null>(null)
  return (
    <motion.figure
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 70, damping: 16 }}
      className="relative mt-10 overflow-hidden rounded-[22px] bg-night text-white shadow-[0_40px_80px_-40px_rgb(11_11_15/0.7)] sm:mt-12"
      aria-labelledby="press-caption"
    >
      {/* bed texture: a fine dot grid like a cutting mat */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:22px_22px]" aria-hidden />
      <Press3D
        className="relative h-[clamp(440px,56vw,640px)]"
        fallback={<FlatPress />}
        onStamp={(inv, n) => {
          setCount(n)
          setCollected((c) => c + inv.total)
          setLast(inv)
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6">
        <figcaption id="press-caption" className="pf-label !text-white/70">
          Fig. 1 — The press
          <span className="mt-1 block normal-case tracking-normal text-white/45 max-sm:hidden">Example invoices · totals from PayFlow’s own maths</span>
        </figcaption>
        <div className="text-right" aria-live="polite">
          <p className="pf-label whitespace-nowrap !text-white/55">Stamped paid</p>
          <p className="num pf-wordmark mt-1 text-xl sm:text-4xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={collected} initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0, transition: { duration: 0.12 } }} transition={SPRING} className="inline-block origin-right text-lime">
                {inr(collected)}
              </motion.span>
            </AnimatePresence>
          </p>
          <p className="mt-1 font-mono text-2xs text-white/55 max-sm:hidden">{count} invoice{count === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          <MousePointerClick className="size-4 text-lime" aria-hidden />
          <span className="[@media(pointer:coarse)]:hidden">Click to stamp · drag to spin</span>
          <span className="hidden [@media(pointer:coarse)]:inline">Tap to stamp</span>
        </p>
        <AnimatePresence mode="wait">
          {last && (
            <motion.p key={last.no + count} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={SPRING} className="font-mono text-2xs text-white/70 max-sm:hidden">
              {last.no} · {last.client} → <span className="text-lime">Paid</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.figure>
  )
}

/** A lime band with the lifecycle running across it. */
function Ticker() {
  const words = ['Draft', 'Sent', 'Viewed', 'Partially paid', 'Paid']
  const row = (
    <span className="flex shrink-0 items-center gap-6 pr-6">
      {Array.from({ length: 3 }).flatMap((_, k) =>
        words.map((w, i) => (
          <span key={`${k}-${w}`} className="flex items-center gap-6">
            <span className={`pf-condensed text-[clamp(2.2rem,5vw,4rem)] ${w === 'Paid' ? 'text-accent' : 'text-ink'}`}>{w}</span>
            <span className="font-mono text-lg text-ink/60">{i === words.length - 1 ? '✦' : '→'}</span>
          </span>
        )),
      )}
    </span>
  )
  return (
    <div className="relative -rotate-[1.2deg] overflow-hidden border-y-2 border-ink bg-lime py-3" aria-hidden>
      <div className="pf-marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  )
}

/** Monospaced section marker on a heavy rule, then an oversized heading. */
function SectionHead({ index, label, id, children, aside, dark }: { index: string; label: string; id: string; children: ReactNode; aside?: ReactNode; dark?: boolean }) {
  return (
    <Reveal>
      <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 border-t-2 pt-3 ${dark ? 'border-white/50' : 'border-ink'}`}>
        <p className={`pf-label ${dark ? '!text-white/70' : 'text-ink-2'}`}>
          ({index}) {label}
        </p>
        {aside}
      </div>
      <h2 id={id} className="pf-display mt-7 max-w-[16ch] text-[clamp(2.3rem,5.4vw,5.25rem)]">
        {children}
      </h2>
    </Reveal>
  )
}

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
    <section id="how" aria-labelledby="flow-title" className={`${FRAME} scroll-mt-20 pt-20 sm:pt-28 lg:pt-36`}>
      <SectionHead index="01" label="How it works" id="flow-title">
        From first draft to <span className="pf-hl">paid in full.</span>
      </SectionHead>
      <ol ref={ref} className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        <div className="absolute left-0 right-0 top-0 hidden h-[3px] bg-line md:block" aria-hidden>
          <motion.div style={{ scaleX: fill }} className="h-full origin-left bg-accent" />
        </div>
        {steps.map((s, i) => (
          <li key={s.k} className="relative md:pt-8">
            <Reveal delay={i * 120}>
              <p className="pf-label">
                <span className="text-accent">0{i + 1}</span> · {s.k}
              </p>
              <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] [font-stretch:112%] sm:text-[1.9rem]">{s.t}</h3>
              <p className="mt-2 max-w-sm text-base text-ink-2">{s.d}</p>
            </Reveal>
          </li>
        ))}
      </ol>
      <Reveal className="mt-14">
        <div className="flex flex-col gap-6 rounded-[22px] bg-night p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="pf-label !text-lime">Three ways in</p>
            <p className="pf-display mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">Try it now — or keep your books for real.</p>
          </div>
          <EntryActions dark className="lg:shrink-0" />
        </div>
      </Reveal>
      <div className="mt-16 sm:mt-20">
        <InvoiceStage />
      </div>
    </section>
  )
}

/**
 * Fig. 2: an example invoice on paper. It collects its payments on its own,
 * can be thrown with a mouse (it springs back) or stepped through the ledger —
 * and when the balance reaches zero a PAID stamp lands on it.
 */
function InvoiceStage() {
  const [step, setStep] = useState(() => (reduced() ? LIFECYCLE.length - 1 : 0))
  const [paused, setPaused] = useState(false)
  const controls = useDragControls()
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
          Fig. 2 — One invoice, from draft to paid
        </figcaption>
        <span className="pf-label hidden [@media(pointer:fine)]:sm:inline">Grab it · it springs back</span>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_240px] md:items-start lg:grid-cols-[minmax(0,1fr)_300px]">
        <motion.div
          drag
          dragControls={controls}
          dragListener={false}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') controls.start(e)
          }}
          dragSnapToOrigin
          dragElastic={0.5}
          dragTransition={{ bounceStiffness: 380, bounceDamping: 13 }}
          whileDrag={{ scale: 1.03, cursor: 'grabbing' }}
          style={{ x, rotate, touchAction: 'pan-y' }}
          className="relative mr-2.5 min-w-0 select-none [@media(pointer:fine)]:cursor-grab"
        >
          <div className="pf-sheet relative overflow-hidden rounded-[4px] p-5 text-ink sm:p-9">
            <AnimatePresence>
              {isPaid && (
                <motion.div
                  key="stamp"
                  initial={reduced() ? false : { opacity: 0, scale: 2.4, rotate: 4 }}
                  animate={{ opacity: 0.92, scale: 1, rotate: -11 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 20, mass: 0.8 }}
                  className="pf-stamp pointer-events-none absolute right-6 top-[38%] z-10 px-4 py-2 text-center text-accent sm:right-[12%]"
                  aria-hidden
                >
                  <span className="block text-3xl font-black tracking-[0.08em] sm:text-4xl">PAID</span>
                  <span className="block font-mono text-[10px] font-semibold tracking-[0.14em]">IN FULL · {s.when.toUpperCase()}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="pf-wordmark text-4xl leading-none sm:text-5xl">Invoice</p>
                <p className="mt-3 truncate font-mono text-xs text-muted">INV-0042 · Meridian Design Co.</p>
              </div>
              <AnimatePresence mode="popLayout">
                <motion.div key={s.status} initial={{ opacity: 0, y: -12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.8 }} transition={SPRING}>
                  <StatusBadge status={s.status} className="text-sm" />
                </motion.div>
              </AnimatePresence>
            </div>

            <table className="mt-8 w-full text-sm">
              <caption className="sr-only">Example line items</caption>
              <thead>
                <tr className="border-b-2 border-ink">
                  <th scope="col" className="pf-label pb-2 text-left font-medium">Item</th>
                  <th scope="col" className="pf-label pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ITEMS.map((it, i) => (
                  <tr key={it.description} className="border-b border-line">
                    <td className="py-3 pr-3 text-ink-2">{it.description}</td>
                    <td className="num py-3 text-right font-mono text-[13px] whitespace-nowrap">{inr(EXAMPLE_TOTALS.lineAmounts[i])}</td>
                  </tr>
                ))}
                <tr className="border-b border-line text-muted">
                  <td className="py-2.5">Discount 5% · GST 18%</td>
                  <td className="num py-2.5 text-right font-mono text-[13px]">
                    <span className="whitespace-nowrap">−{inr(EXAMPLE_TOTALS.discount)}</span> <span className="whitespace-nowrap">+{inr(EXAMPLE_TOTALS.tax)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <span className="font-semibold">Total</span>
              <span className="num pf-wordmark text-xl sm:text-3xl">{inr(EXAMPLE_TOTALS.total)}</span>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className="pf-label">Paid</span>
                <span className="num font-semibold">
                  {inr(s.paid)} <span className="font-normal text-muted">· {balance > 0 ? `${inr(balance)} due` : 'settled'}</span>
                </span>
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Share of the total paid">
                <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 16 }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* The lifecycle as a ledger you can step through */}
        <div>
          <ol className="border-t-2 border-ink" aria-label="Lifecycle">
            {LIFECYCLE.map((l, i) => (
              <li key={l.status} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`pf-press relative isolate grid w-full grid-cols-[1.75rem_1fr_auto] items-baseline gap-2 px-2 py-3 text-left text-sm transition-colors ${i === step ? 'text-ink' : i < step ? 'text-ink-2' : 'text-muted hover:text-ink'}`}
                >
                  {i === step && <motion.span layoutId="pf-step" transition={SPRING} className="absolute inset-0 -z-10 bg-lime" />}
                  <span className={`font-mono text-2xs ${i <= step ? 'text-accent' : ''} ${i === step ? '!text-ink' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-semibold">{STATUS_META[l.status].label}</span>
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
          <div className="mt-8 border-t border-line pt-4">
            <p className="pf-label">Payments you can record</p>
            <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {Object.values(PAYMENT_METHODS).map((m) => (
                <li key={m} className="rounded-full border border-line-strong px-2.5 py-1 font-medium text-ink-2">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </figure>
  )
}

function Showcase() {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0])
  return (
    <section id="product" aria-labelledby="product-title" className={`${FRAME} scroll-mt-20 pt-20 sm:pt-28 lg:pt-40`}>
      <SectionHead
        index="02"
        label="The product"
        id="product-title"
        aside={
          <div role="tablist" aria-label="Screens" className="flex gap-1 rounded-full border-2 border-ink p-1">
            {SHOTS.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                id={`tab-${s.id}`}
                aria-selected={i === active}
                aria-controls="shot-panel"
                onClick={() => setActive(i)}
                className={`pf-press relative isolate rounded-full px-3 py-1 font-mono text-2xs uppercase tracking-[0.08em] transition-colors ${i === active ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {i === active && <motion.span layoutId="pf-shot-tab" transition={SPRING} className="absolute inset-0 -z-10 rounded-full bg-lime" />}
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        Every screen, <span className="pf-hl">as it ships.</span>
      </SectionHead>
      <div ref={ref} className="mt-14 [perspective:1600px]">
        <motion.div style={{ scale, rotateX }} className="origin-top">
          <div id="shot-panel" role="tabpanel" aria-labelledby={`tab-${SHOTS[active].id}`} className="overflow-hidden rounded-[18px] bg-night p-2 shadow-[0_50px_90px_-50px_rgb(11_11_15/0.8)] sm:p-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-surface">
              <AnimatePresence initial={false}>
                <motion.img
                  key={SHOTS[active].id}
                  src={SHOTS[active].src}
                  srcSet={SHOTS[active].srcSet}
                  sizes="(min-width: 1400px) 1320px, 100vw"
                  alt={SHOTS[active].alt}
                  width={2400}
                  height={1500}
                  decoding="async"
                  loading="lazy"
                  initial={{ opacity: 0, scale: 1.04, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
        <p className="pf-label mt-3">Fig. 3 — Real screens from the live app, showing a clearly labelled sample workspace</p>
      </div>
    </section>
  )
}

/** Six receipt stubs you can grab and throw (mouse only). */
function Features() {
  return (
    <section aria-labelledby="features-title" className={`${FRAME} pt-20 sm:pt-28 lg:pt-40`}>
      <SectionHead index="03" label="What’s inside" id="features-title" aside={<span className="pf-label hidden [@media(pointer:fine)]:sm:inline">Grab a stub and throw it</span>}>
        Built like the books <span className="pf-hl">depend on it.</span>
      </SectionHead>
      <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <li key={f.title}>
            <Reveal delay={(i % 3) * 90}>
              <PullCard className={i % 3 === 1 ? 'lg:translate-y-8' : ''} tilt={i % 2 ? 9 : -9}>
                <article className="pf-sheet group flex min-h-[230px] flex-col rounded-[6px] p-6">
                  <div className="flex items-center justify-between">
                    <span className="num font-mono text-sm text-muted">№ {String(i + 1).padStart(2, '0')}</span>
                    <span className="rounded-full bg-ink px-2.5 py-0.5 font-mono text-2xs uppercase tracking-[0.08em] text-white transition-colors group-hover:bg-accent">{f.tag}</span>
                  </div>
                  <h3 className="mt-8 text-[1.55rem] font-extrabold leading-[1.05] tracking-[-0.03em] [font-stretch:112%]">{f.title}</h3>
                  <p className="mt-3 text-base text-ink-2">{f.body}</p>
                </article>
              </PullCard>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The inverted band: the press-room floor. */
function Security() {
  return (
    <section id="security" aria-labelledby="security-title" className="mt-36 scroll-mt-16 bg-night text-white lg:mt-48">
      <div className={`${FRAME} grid gap-12 py-20 lg:grid-cols-12 lg:py-28`}>
        <div className="lg:col-span-7">
          <SectionHead index="04" label="Security" id="security-title" dark>
            Your clients’ money, <span className="text-lime">handled with care.</span>
          </SectionHead>
        </div>
        <Reveal delay={120} className="lg:col-span-5 lg:self-end">
          <p className="text-lg leading-relaxed text-white/75">
            Postgres enforces who can see and change what. The app can’t write a total, a status or another person’s data — even if someone tries.
          </p>
          <ul className="mt-8 border-t border-white/20">
            {SECURITY.map((s, i) => (
              <li key={s} className="group flex items-baseline gap-4 border-b border-white/20 py-3.5 text-sm font-semibold">
                <span className="font-mono text-2xs text-lime">{String(i + 1).padStart(2, '0')}</span>
                <span className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-1.5">{s}</span>
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
    <section aria-labelledby="closing-title" className={`${FRAME} pt-20 sm:pt-28 lg:pt-40`}>
      <div className="border-t-2 border-ink pt-3">
        <p className="pf-label text-ink-2">(05) Get started</p>
      </div>
      <div className="relative mt-8 grid gap-10 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-7">
          <h2 id="closing-title" className="pf-display max-w-[14ch] text-[clamp(2.3rem,5.6vw,5.5rem)]">
            Send your first invoice <span className="pf-hl">in a few minutes.</span>
          </h2>
          <EntryActions className="mt-10" />
        </Reveal>
        <div className="flex justify-center lg:col-span-5" aria-hidden>
          <motion.div
            initial={{ opacity: 0, scale: 2.6, rotate: 8 }}
            whileInView={{ opacity: 1, scale: 1, rotate: -9 }}
            viewport={{ once: true, margin: '0px 0px -20% 0px' }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, mass: 0.9 }}
            whileHover={{ rotate: -4, scale: 1.04 }}
            className="pf-stamp px-6 py-3 text-center text-accent sm:px-10 sm:py-5"
          >
            <span className="block text-[clamp(4rem,12vw,9.5rem)] font-black leading-[0.9] tracking-[0.04em]">PAID</span>
            <span className="block font-mono text-xs font-semibold tracking-[0.2em] sm:text-sm">IN FULL · ON TIME</span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function Colophon() {
  return (
    <footer className="mt-32 bg-night text-white">
      <div className={`${FRAME} grid gap-10 py-14 md:grid-cols-12`}>
        <div className="md:col-span-5">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <Wordmark className="text-white" />
          </span>
          <p className="mt-4 max-w-sm text-sm text-white/65">Invoicing and payment tracking for freelancers and independent professionals.</p>
          <p className="mt-6 text-sm text-white/65">
            Designed &amp; built by{' '}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-lime decoration-2 underline-offset-4">
              Ojas Mali
            </a>{' '}
            ·{' '}
            <a href={GITHUB} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
              Source on GitHub
            </a>{' '}
            ·{' '}
            <Link to="/brand" className="hover:text-white hover:underline">
              Brand kit
            </Link>
          </p>
        </div>
        <div className="md:col-span-4">
          <p className="pf-label !text-white/50">Built with</p>
          <ul className="mt-3 grid gap-1 font-mono text-xs text-white/75">
            {['React 19', 'TypeScript', 'three.js · react-three-fiber', 'Supabase · Postgres RLS', '@react-pdf/renderer', 'Resend', 'motion'].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="pf-label !text-white/50">Set in</p>
          <ul className="mt-3 grid gap-1 text-sm text-white/75">
            <li className="pf-wordmark text-base">Archivo Expanded</li>
            <li>Archivo</li>
            <li className="font-mono text-xs">IBM Plex Mono</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
