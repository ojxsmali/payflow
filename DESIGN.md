# PayFlow design system

A ledger, not a dashboard toy: warm paper inside the app, a deep ink-navy stage with brass light on the public page. Numbers align, statuses are words as well as colours, and money is never decorative.

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#F5F3EE` |
| Tables, documents, dialogs | `surface` | `#FDFCFA` |
| Text | `ink` / `ink-2` / `muted` | `#1A1A18` / `#4A4944` / `#6F6D66` (5.0:1) |
| Actions, links, focus | `accent` (ink navy) | `#1B2F4B` |
| Brand detail | `brass` | `#C9A86A` |
| Paid / partial / overdue | `success` / `warning` / `danger` | `#2B6A4A` / `#8A5A0B` / `#A3382B` |
| Landing stage | `.pf-hero` | `#0F1C30` with brass and blue light |

## Type

IBM Plex Sans for the interface (tabular figures by default), IBM Plex Mono for invoice numbers and references, Newsreader for page titles, the word “Invoice” and landing headlines.

## Public landing page (`src/pages/Landing.tsx`)

1. Hero — word-by-word headline; an example invoice that walks Draft → Sent → Viewed → Partially paid → Paid on its own, pauses on hover, tilts with the pointer and can be stepped by click. Its totals come from the app’s own `calcInvoice()` (`src/lib/showcase.ts`, tested).
2. Slow “payment flow” lines drawn behind the hero (SVG stroke animation).
3. How it works, three steps.
4. Real screens, tabbed with a cross-fade.
5. Features, security band, closing call to action.

## Motion

Word rise 900 ms, sections reveal once on scroll (14 px), status chip pops on change, progress bar eases 700 ms, chart bars grow once inside the app. Everything stops under `prefers-reduced-motion`.

## Layout

Checked at 1440, 1280, 768, 390, 375 and 320 px with no horizontal overflow. Phones get a bottom tab bar in the app and a single-column landing page.
