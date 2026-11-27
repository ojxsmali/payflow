import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, Copy, Download } from 'lucide-react'
import { LogoMark, Wordmark } from '../components/layout/Logo'
import { Magnetic, PullCard, Reveal } from '../components/motion'
import { Press3D } from '../components/three/Scene3D'
import { FlatPress } from '../components/brand/FlatPress'
import { BRAND, MARK_PATHS } from '../lib/brandMark'

const FRAME = 'mx-auto w-full max-w-[1400px] px-[clamp(16px,3vw,40px)]'

const COLORS = [
  { name: 'Ultraviolet', token: 'accent', hex: '#5B3DF5', role: 'Stamp ink: actions, focus, “paid”', fg: '#fff', note: 'White text 6.4:1' },
  { name: 'Ink', token: 'ink / night', hex: '#0B0B0F', role: 'Text, the press bed, sidebar', fg: '#fff', note: '18.2:1 on paper' },
  { name: 'Highlighter', token: 'lime', hex: '#D4FF3A', role: 'The one thing to look at', fg: '#0B0B0F', note: 'Only under ink, 16.6:1' },
  { name: 'Paper', token: 'paper', hex: '#F1F1EE', role: 'App background', fg: '#0B0B0F', note: 'Cool, never cream' },
  { name: 'Sheet', token: 'surface', hex: '#FFFFFF', role: 'Invoices, tables, dialogs', fg: '#0B0B0F', note: 'With a paper-stack edge' },
  { name: 'Violet on ink', token: 'brass', hex: '#B3A6FF', role: 'Accent on black', fg: '#0B0B0F', note: '8.4:1 on ink' },
] as const

const STATUS = [
  { name: 'Paid', hex: '#0B8457' },
  { name: 'Partial', hex: '#A35D06' },
  { name: 'Overdue', hex: '#D23A2C' },
]

/** /brand — the PayFlow brand kit. `?card=og|social` renders a bare share card for the asset script. */
export function BrandPage() {
  const [params] = useSearchParams()
  const card = params.get('card')
  useEffect(() => {
    document.title = 'Brand kit — PayFlow'
  }, [])
  if (card === 'og' || card === 'social') return <ShareCard size={card} />

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
          <Link to="/" aria-label="PayFlow home" className="inline-flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <Wordmark />
          </Link>
          <Link to="/" className="pf-press inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink px-4 text-sm font-bold">
            <ArrowLeft className="size-4" aria-hidden /> Home
          </Link>
        </div>
      </header>

      <main>
        <section className={`${FRAME} pt-10 sm:pt-14`} aria-labelledby="brand-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink pb-3">
            <p className="pf-label text-ink-2">PayFlow — brand kit</p>
            <p className="pf-label">v3 · “Ultraviolet Press”</p>
          </div>
          <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
            <h1 id="brand-title" className="pf-display text-[clamp(2.8rem,8vw,7.5rem)] lg:col-span-7">
              The <span className="pf-hl">stamp.</span>
            </h1>
            <p className="max-w-md text-lg text-ink-2 lg:col-span-5 lg:pb-3">
              Invoices are paper. Getting paid is a stamp. The mark is a rubber-stamp impression around a heavy P, with a lime full stop — <em>done</em>. One geometry drives the logo, the 3D stamp, the favicons and the share cards.
            </p>
          </div>
          <figure className="relative mt-10 overflow-hidden rounded-[22px] bg-night text-white">
            <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:22px_22px]" aria-hidden />
            <Press3D mode="single" className="relative h-[clamp(340px,44vw,520px)]" fallback={<FlatPress single />} />
            <figcaption className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6">
              <span className="pf-label !text-white/70">Fig. 1 — The stamp, in 3D</span>
              <span className="mt-1 block text-xs text-white/50">Its face is the mark, mirrored — press it.</span>
            </figcaption>
          </figure>
        </section>

        <Block index="01" title="The mark" id="mark">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['tile', 'App tile', 'bg-paper'],
                ['ink', 'On ink tile', 'bg-paper'],
                ['stamp', 'Impression', 'bg-surface'],
                ['paper', 'Reversed', 'bg-night'],
              ] as const
            ).map(([v, label, bg]) => (
              <PullCard key={v}>
                <figure className={`pf-sheet flex aspect-square flex-col rounded-[14px] p-5 ${bg === 'bg-night' ? '!bg-night !border-night' : bg}`}>
                  <div className="grid flex-1 place-items-center">
                    <motion.div whileHover={{ rotate: -10, scale: 1.06 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }}>
                      <LogoMark variant={v} className="size-28 sm:size-32" />
                    </motion.div>
                  </div>
                  <figcaption className={`pf-label ${bg === 'bg-night' ? '!text-white/60' : ''}`}>{label}</figcaption>
                </figure>
              </PullCard>
            ))}
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Construction />
            <div className="pf-sheet flex flex-col justify-between gap-8 rounded-[14px] p-6">
              <div>
                <p className="pf-label">Lockup</p>
                <div className="mt-6 flex flex-wrap items-center gap-10">
                  <span className="inline-flex items-center gap-3">
                    <LogoMark className="size-14" />
                    <Wordmark className="text-[34px]" />
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-[10px] bg-night px-4 py-3">
                    <LogoMark className="size-8" />
                    <Wordmark className="text-white" />
                  </span>
                </div>
              </div>
              <dl className="grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-3">
                <div><dt className="pf-label">Clear space</dt><dd className="mt-1.5 text-ink-2">One ring-width (1/12 of the mark) on every side.</dd></div>
                <div><dt className="pf-label">Minimum size</dt><dd className="mt-1.5 text-ink-2">16 px tile; 24 px for the impression.</dd></div>
                <div><dt className="pf-label">Don’t</dt><dd className="mt-1.5 text-ink-2">Recolour the dot, outline the P or set the wordmark in another face.</dd></div>
              </dl>
            </div>
          </div>
        </Block>

        <Block index="02" title="Colour" id="colour">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COLORS.map((c) => (
              <li key={c.hex}>
                <Swatch {...c} />
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="pf-label mr-2">Status only</span>
            {STATUS.map((s) => (
              <span key={s.hex} className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-surface px-3 py-1 text-xs font-bold">
                <span className="size-3 rounded-full" style={{ background: s.hex }} />
                {s.name} <span className="font-mono font-normal text-muted">{s.hex}</span>
              </span>
            ))}
          </div>
        </Block>

        <Block index="03" title="Type" id="type">
          <div className="grid gap-5 lg:grid-cols-3">
            <Specimen name="Archivo Expanded" meta="800 · width 125% · −0.045em" use="Headlines, figures, the wordmark">
              <p className="pf-display text-6xl">Paid.</p>
            </Specimen>
            <Specimen name="Archivo" meta="400–700 · width 100%" use="Interface and body copy">
              <p className="text-2xl font-medium leading-snug tracking-[-0.01em]">Create an invoice, send it, record what arrives.</p>
            </Specimen>
            <Specimen name="IBM Plex Mono" meta="400–500 · uppercase labels" use="Invoice numbers, labels, figure captions">
              <p className="font-mono text-lg">INV-0042 · ₹1,00,890</p>
              <p className="pf-label mt-3">(01) Section marker</p>
            </Specimen>
          </div>
        </Block>

        <Block index="04" title="Motion" id="motion">
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Stamp', 'Things that finish land with a spring and a little squash — the PAID stamp, toasts, empty states.'],
              ['Throw', 'Cards can be grabbed with a mouse and thrown; they spring home. Touch never drags.'],
              ['Highlight', 'The lime marker swipes in under the one phrase that matters.'],
              ['Calm', 'Reduced motion turns it all into fades. The 3D stops when off screen.'],
            ].map(([t, d], i) => (
              <li key={t} className="pf-sheet rounded-[14px] p-5">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="display mt-3 text-xl">{t}</h3>
                <p className="mt-2 text-sm text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </Block>

        <Block index="05" title="Share card & files" id="files">
          <div className="overflow-hidden rounded-[14px] border-2 border-ink">
            <div className="relative aspect-[1200/630] w-full">
              <img src="/og.png" alt="PayFlow share card: the headline beside the 3D press with example invoices." className="absolute inset-0 h-full w-full object-cover" width={1200} height={630} loading="lazy" />
            </div>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {[
              ['/favicon.svg', 'favicon.svg'],
              ['/icon-512.png', 'icon-512.png'],
              ['/apple-touch-icon.png', 'apple-touch-icon.png'],
              ['/og.png', 'og.png (1200×630)'],
            ].map(([href, label]) => (
              <li key={href}>
                <Magnetic>
                  <a href={href} download className="pf-press inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink/15 bg-surface px-4 text-sm font-semibold transition-colors hover:border-ink">
                    <Download className="size-4" aria-hidden /> {label}
                  </a>
                </Magnetic>
              </li>
            ))}
          </ul>
        </Block>
      </main>

      <footer className="mt-28 bg-night text-white">
        <div className={`${FRAME} flex flex-wrap items-center justify-between gap-4 py-10 text-sm text-white/65`}>
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <Wordmark className="text-white" />
          </span>
          <span>
            Designed &amp; built by{' '}
            <a href="https://github.com/ojxsmali" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-lime decoration-2 underline-offset-4">
              Ojas Mali
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}

function Block({ index, title, id, children }: { index: string; title: string; id: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${FRAME} scroll-mt-20 pt-24`}>
      <Reveal>
        <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
          <p className="pf-label text-ink-2">({index})</p>
        </div>
        <h2 id={`${id}-title`} className="pf-display mt-5 text-[clamp(2.2rem,5vw,4.5rem)]">
          {title}
        </h2>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  )
}

/** The mark drawn over its 32-unit grid, with each part outlined. */
function Construction() {
  return (
    <figure className="pf-sheet rounded-[14px] p-5">
      <svg viewBox="-2 -2 36 36" className="mx-auto aspect-square w-full max-w-[360px]" role="img" aria-label="The mark on its 32-unit construction grid: a stamp ring, a P and a square dot.">
        {Array.from({ length: 33 }, (_, i) => (
          <g key={i} stroke={i % 4 === 0 ? '#c9c9c3' : '#e7e7e2'} strokeWidth={0.05}>
            <line x1={i} x2={i} y1={0} y2={32} />
            <line y1={i} y2={i} x1={0} x2={32} />
          </g>
        ))}
        <path d={MARK_PATHS.ring} fill={BRAND.violet} fillRule="evenodd" opacity={0.18} />
        <path d={MARK_PATHS.p} fill={BRAND.violet} fillRule="evenodd" opacity={0.85} />
        <path d={MARK_PATHS.dot} fill={BRAND.lime} stroke={BRAND.ink} strokeWidth={0.12} />
        <path d={MARK_PATHS.ring} fill="none" stroke={BRAND.ink} strokeWidth={0.1} />
        <circle cx={17} cy={13} r={5} fill="none" stroke={BRAND.violet} strokeWidth={0.08} strokeDasharray="0.4 0.3" />
        <circle cx={17} cy={13} r={0.25} fill={BRAND.ink} />
      </svg>
      <figcaption className="pf-label mt-3">Construction · 32-unit grid · bowl r = 5 around (17, 13)</figcaption>
    </figure>
  )
}

function Swatch({ name, token, hex, role, fg, note }: (typeof COLORS)[number]) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      onClick={() => {
        navigator.clipboard?.writeText(hex).then(() => setCopied(true), () => setCopied(true))
      }}
      className="pf-sheet group block w-full overflow-hidden rounded-[14px] text-left"
      aria-label={`Copy ${name} ${hex}`}
    >
      <div className="relative flex h-36 items-end justify-between p-4" style={{ background: hex, color: fg }}>
        <span className="pf-wordmark text-2xl">{name}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'y' : 'n'}
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="inline-flex items-center gap-1 font-mono text-xs"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4 opacity-60 transition-opacity group-hover:opacity-100" />}
            {copied ? 'Copied' : ''}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="grid gap-0.5 p-4 text-sm">
        <span className="flex justify-between gap-2 font-mono text-xs">
          <span className="font-medium text-ink">{hex}</span>
          <span className="text-muted">{token}</span>
        </span>
        <span className="mt-1 text-ink-2">{role}</span>
        <span className="text-xs text-muted">{note}</span>
      </div>
    </motion.button>
  )
}

function Specimen({ name, meta, use, children }: { name: string; meta: string; use: string; children: ReactNode }) {
  return (
    <div className="pf-sheet flex flex-col rounded-[14px] p-6">
      <div className="flex-1">{children}</div>
      <div className="mt-8 border-t border-line pt-3">
        <p className="font-bold">{name}</p>
        <p className="font-mono text-xs text-muted">{meta}</p>
        <p className="mt-1 text-sm text-ink-2">{use}</p>
      </div>
    </div>
  )
}

/**
 * The share card, at its real pixel size. scripts/render-brand.mjs screenshots
 * #share-card for public/og.png (1200×630) and docs/social-preview.png (1280×640).
 */
function ShareCard({ size }: { size: 'og' | 'social' }) {
  const [w, h] = size === 'og' ? [1200, 630] : [1280, 640]
  return (
    <div id="share-card" className="relative overflow-hidden bg-night text-white" style={{ width: w, height: h }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:22px_22px]" aria-hidden />
      <Press3D className="absolute -right-[60px] top-0 h-full w-[700px]" autoplay={false} fallback={<FlatPress />} />
      <div className="relative flex h-full w-[600px] flex-col justify-between p-14">
        <span className="inline-flex items-center gap-3">
          <LogoMark className="size-12" />
          <Wordmark className="text-[30px] text-white" />
        </span>
        <p className="pf-display text-[64px]">
          Get paid for the work you’ve <span className="bg-lime px-2 text-ink [box-decoration-break:clone]">already done.</span>
        </p>
        <p className="font-mono text-[17px] tracking-[0.04em] text-white/70">Invoices · PDF · client links · payments</p>
      </div>
    </div>
  )
}
