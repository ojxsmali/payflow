# PayFlow design system — violet and mint

A crisp, light app for the books, with a night stage around it: the sidebar, the landing page and the sign-in screens. Electric violet is for actions; signal mint is the "money arrived" colour.

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#F5F4FA` |
| Tables, documents, dialogs | `surface` | `#FFFFFF` |
| Text | `ink` / `ink-2` / `muted` | `#14121F` / `#46435A` / `#6C6880` (5.2:1) |
| Actions, links, focus | `accent` (electric violet) | `#5B3DF5` (white text 6.4:1) |
| Signal | `brass` token, now mint | `#2EE6A6` |
| Night stage | `night` | `#0D0B1A` |
| Paid / partial / overdue | `success` / `warning` / `danger` | `#0D8A5C` / `#A8620C` / `#CC3B2E` |

## Type

**Sora** for display (page titles, headline figures, landing), **Figtree** for the interface, **Geist Mono** for invoice numbers and references. PDF invoices keep their embedded IBM Plex fonts.

## Interaction (`motion` library + `src/lib/effects.ts`)

| Pattern | Where |
|---|---|
| Draggable example invoice that springs back; collects payments on its own; mint burst when paid | landing hero |
| Lifecycle stepper with a spring-sliding pill | landing hero |
| Payment chips flying in as payments are recorded | landing hero |
| Scroll-filled lifecycle line, scroll-linked product reveal | landing |
| Magnetic CTAs, press squash + ripple on every button | everywhere |
| Sliding active pill in the night sidebar and phone nav; spinning + button | app shell |
| Spring-lift dashboard cards with cursor spotlight | dashboard |
| Status pills with a live pulse for open invoices | everywhere |

Everything respects `prefers-reduced-motion` via `<MotionConfig reducedMotion="user">` and CSS.

## Layout

Checked at 1440, 1280, 768, 390, 375 and 320 px with no horizontal overflow. Phones get a floating bottom nav, stacked line items and bottom-sheet dialogs.
