# PayFlow design system — "Ledger paper"

The invoice as a printed document: near-white paper, near-black ink, hairline rules instead of shadows and one violet "stamp ink" accent. Violet is spent on actions, focus and the moment an invoice is paid; everything else is ink on paper.

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#F5F5F5` |
| Tables, documents, dialogs | `surface` | `#FFFFFF` |
| Text | `ink` / `ink-2` / `muted` | `#0D0D0D` / `#3D3D3D` / `#666666` (5.3:1) |
| Hairlines | `line` / `line-strong` | `#E0E0E0` / `#C4C4C4` |
| Accent — stamp ink | `accent` | `#5B3DF5` (white text 6.4:1) |
| Accent on black | `brass` (token name kept) | `#A99BFF` (7.6:1 on night) |
| Inverted surfaces | `night` | `#0D0D0D` — sidebar, landing security band, sign-in panel |
| Paid / partial / overdue | `success` / `warning` / `danger` | `#0D8A5C` / `#A8620C` / `#CC3B2E` |

## Type

- **Geist** — headlines (`.pf-display`: 600, −0.058em, 0.9 line-height), interface and figures.
- **Newsreader italic** (`.pf-serif`) — one editorial phrase per headline, and the word "Invoice" on the example document.
- **Geist Mono** — section markers like `(02) The product`, figure captions, invoice numbers (`.pf-label`).

PDF invoices keep their embedded IBM Plex fonts.

## Signature visual

The landing hero's "Fig. 1": an example invoice on paper whose totals come from the real `calcInvoice()` (`src/lib/showcase.ts`). It steps from draft to paid on its own, pauses on hover, can be stepped from the numbered lifecycle ledger beside it, and can be dragged (it springs back). When the balance reaches zero a violet PAID stamp lands on it.

## Interaction (`motion` library + `src/lib/effects.ts`)

| Pattern | Where |
|---|---|
| PAID stamp landing on a spring; lifecycle ledger with sliding highlight; drag-and-release invoice | landing hero |
| Word-by-word masked headline rise, blur-rise reveals, scroll-filled lifecycle rule, scroll-linked product reveal | landing |
| Magnetic CTAs, press squash + ripple on every button | everywhere |
| Sliding active pill in the black sidebar and phone nav; spinning + button | app shell |
| Spring-lift dashboard figures | dashboard |

Everything respects `prefers-reduced-motion` via `<MotionConfig reducedMotion="user">` and CSS. Light theme only.

## Layout

Landing: 1360px frame, fluid `clamp(16px, 3vw, 40px)` gutter, 12-column hero. Checked at 1440, 375 and 320 px with no horizontal overflow.
