/**
 * Lazy entry point for the 3D press. three.js loads only when a press is on the
 * page, and only if the browser can do WebGL; otherwise the caller's flat
 * fallback stays put. If WebGL dies mid-session the Guard swaps the fallback in.
 */
import { Component, lazy, Suspense, useRef, type ReactNode } from 'react'
import { canUseWebGL, useCompact3D, useOnScreen, useReducedMotion3D } from './webgl'
import type { PressInvoice } from '../../lib/showcase'

const LazyStage = lazy(() => import('./Press').then((m) => ({ default: m.PressStage })))

class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function Press3D({
  mode = 'carousel',
  className = '',
  fallback,
  autoplay = true,
  onStamp,
}: {
  mode?: 'carousel' | 'single'
  className?: string
  fallback: ReactNode
  autoplay?: boolean
  onStamp?: (inv: PressInvoice, count: number) => void
}) {
  const compact = useCompact3D()
  const reduced = useReducedMotion3D()
  const box = useRef<HTMLDivElement>(null)
  const visible = useOnScreen(box)
  const webgl = typeof window !== 'undefined' && canUseWebGL()
  return (
    <div ref={box} className={className}>
      {webgl ? (
        <Guard fallback={fallback}>
          <Suspense fallback={fallback}>
            <LazyStage mode={mode} compact={compact} reduced={reduced} visible={visible} autoplay={autoplay} onStamp={onStamp} />
          </Suspense>
        </Guard>
      ) : (
        fallback
      )}
    </div>
  )
}
