# PayFlow design system — "Ultraviolet Press"

Invoices are paper; getting paid is a stamp. Cool paper, blue-black ink, ultraviolet stamp ink for actions, focus and the moment an invoice is paid, and a lime highlighter that marks the one thing on a screen worth looking at. The signature object is a real rubber stamp — in 3D on the landing page, as the logo, and as the PAID/VOID impression on invoices.

The brand kit lives in the app at [`/brand`](https://payflow-xi-one.vercel.app/brand).

## Mark

`src/lib/brandMark.ts` holds the only copy of the logo geometry (32-unit grid): a rounded-square stamp **ring**, a heavy **P** whose bowl is a ledger tab (r = 5 around 17, 13) and a lime **dot** — the full stop, "done". The same shapes are used for:

- `<LogoMark>` in the app (`tile`, `ink`, `stamp`, `paper` variants)
- the 3D stamp's rubber face (extruded and mirrored, like a real stamp) and the embossed hub on the turntable
- `public/favicon.svg`, `icon-192.png`, `icon-512.png` (maskable), `apple-touch-icon.png`, `manifest.webmanifest`
- `public/og.png` (1200×630) and `docs/social-preview.png` (1280×640), screenshots of `/brand?card=og|social`

Regenerate them all with `npm run dev` and then `npm run brand` (needs `puppeteer-core` via `PUPPETEER_CORE` and a Chromium browser via `BROWSER`).

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#F1F1EE` |
| Sheets, tables, dialogs | `surface` | `#FFFFFF` |
| Text | `ink` / `ink-2` / `muted` | `#0B0B0F` / `#34343C` / `#5F5F69` (5.6:1) |
| Hairlines | `line` / `line-strong` | `#D9D9D3` / `#B9B9B2` |
| Stamp ink | `accent` | `#5B3DF5` (white text 6.4:1) |
| Highlighter | `lime` | `#D4FF3A` — only ever under ink text (16.6:1) |
| Violet on ink | `brass` (token name kept) | `#B3A6FF` |
| Press bed | `night` | `#0B0B0F` — sidebar, 3D stage, auth panel, security band, footer |
| Paid / partial / overdue | `success` / `warning` / `danger` | `#0B8457` / `#A35D06` / `#D23A2C` |

## Type

- **Archivo Expanded** (`.pf-display`, `.pf-wordmark`: 800, width 125%, −0.045em) — headlines, money figures, the wordmark.
- **Archivo** (width 100%) — interface and body.
- **Archivo Condensed** (`.pf-condensed`, width 62%, 900, caps) — the lifecycle ticker.
- **IBM Plex Mono** — invoice numbers, labels and section markers (`.pf-label`).
- `.pf-hl` — the lime highlighter swipe under one phrase per heading.

PDF invoices keep their embedded IBM Plex fonts.

## Surfaces

- `.pf-sheet` — a white card with two sheets of paper peeking out underneath (`--shadow-stack`). Used for KPI cards, receipts, summaries.
- Buttons are pills with 2px borders; primary is violet with a violet glow. Active navigation, tabs and selected chips are **lime pills that slide** (`layoutId`).
- Headings sit on a 2px ink rule.

## The press (3D)

`src/components/three/Press.tsx` (three.js + react-three-fiber + drei), loaded lazily through `Scene3D.tsx`:

- **Carousel** (landing hero, share cards): a turntable of example invoices — canvas textures with totals from `calcInvoice()` (`PRESS_QUEUE` in `src/lib/showcase.ts`, tested). Click/tap/Enter stamps the front invoice PAID: the stamp swings over, slams down with a squash, ink flecks fly, the table turns to the next invoice and the HUD counter adds the total. Mouse drag (or arrow keys) spins the table; touch never drags, so the page always scrolls.
- **Single** (`/brand`, log-in panel, 404): one invoice and the stamp, pressing on its own.
- Phones and coarse pointers: 5 sheets instead of 8, DPR ≤ 1.4, no antialias, no lime point light, no pointer parallax.
- `frameloop="never"` when off screen (IntersectionObserver).
- Reduced motion: no autoplay, no bobbing or parallax; a press still works, without springs.
- No WebGL, or a lost context: `FlatPress` — the same scene as flat HTML.

## Interaction (`motion` library, `src/components/motion.tsx`, `src/lib/effects.ts`)

| Pattern | Where |
|---|---|
| Stamp landings (spring + overshoot) | PAID on the example invoice and on paid documents, closing CTA, empty states, toasts |
| Grab-and-throw cards (mouse only, spring home) | dashboard figures (still open on click), feature receipts, brand-kit marks, Fig. 2 invoice |
| Sliding lime pills | sidebar, phone tab bar, invoice status tabs, segmented controls, landing tabs |
| Magnetic CTAs, press squash + ripple | everywhere |
| Masked word rise, highlighter swipe, scroll-filled lifecycle rule, tilting product screens, lime marquee | landing |
| Thumping stamp | full-page loading |

Everything respects `prefers-reduced-motion` through `<MotionConfig reducedMotion="user">` and CSS. Data never waits on an animation to become visible. Light theme only.

## Layout

Landing and brand kit: 1400px frame, `clamp(16px, 3vw, 40px)` gutter. App: 248px ink sidebar on desktop, floating ink tab bar on phones. Checked at 1440, 768 and 375 px with no horizontal overflow.
