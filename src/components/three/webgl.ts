import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

let webgl: boolean | null = null
/** True when the browser can create a WebGL context. Cached. */
export function canUseWebGL() {
  if (webgl !== null) return webgl
  try {
    const c = document.createElement('canvas')
    webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    webgl = false
  }
  return webgl
}

function media(query: string) {
  const subscribe = (cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const mq = window.matchMedia(query)
    mq.addEventListener?.('change', cb)
    return () => mq.removeEventListener?.('change', cb)
  }
  const read = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  return { subscribe, read }
}

const compactQ = media('(max-width: 767px), (pointer: coarse)')
/** Phones and touch tablets: fewer sheets, lower pixel ratio, no pointer parallax. */
export function useCompact3D() {
  return useSyncExternalStore(compactQ.subscribe, compactQ.read, () => false)
}

const reducedQ = media('(prefers-reduced-motion: reduce)')
export function useReducedMotion3D() {
  return useSyncExternalStore(reducedQ.subscribe, reducedQ.read, () => false)
}

/** Whether the element is (nearly) on screen — the canvas stops rendering when it isn't. */
export function useOnScreen(ref: RefObject<Element | null>, margin = '120px') {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return visible
}
