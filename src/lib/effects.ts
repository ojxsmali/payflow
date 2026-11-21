import type { PointerEvent } from 'react'

/** Ink ripple from the pointer position. Pure DOM, skipped for reduced motion. */
export function ripple(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const r = el.getBoundingClientRect()
  const size = Math.max(r.width, r.height) * 2.2
  const dot = document.createElement('span')
  dot.className = 'pf-ripple'
  dot.style.width = dot.style.height = `${size}px`
  dot.style.left = `${e.clientX - r.left - size / 2}px`
  dot.style.top = `${e.clientY - r.top - size / 2}px`
  el.appendChild(dot)
  dot.addEventListener('animationend', () => dot.remove())
}

/** Pointer position → --mx/--my, for the .pf-spot spotlight. */
export function spotlight(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}