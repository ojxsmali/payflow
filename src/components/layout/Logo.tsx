import { MARK_PATHS } from '../../lib/brandMark'

type Variant = 'tile' | 'ink' | 'stamp' | 'paper'

/**
 * The stamp mark. `tile` = violet app tile (default), `ink` = black tile,
 * `stamp` = violet impression on paper, `paper` = white impression for dark grounds.
 */
export function LogoMark({ className = 'size-6', variant = 'tile' }: { className?: string; variant?: Variant }) {
  const bg = variant === 'tile' ? 'var(--color-accent)' : variant === 'ink' ? 'var(--color-ink)' : null
  const fg = variant === 'stamp' ? 'var(--color-accent)' : variant === 'paper' ? '#fff' : 'var(--color-paper)'
  const dot = variant === 'stamp' ? 'var(--color-accent)' : 'var(--color-lime)'
  const solid = variant === 'stamp' || variant === 'paper'
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      {bg && <path d={MARK_PATHS.tile} fill={bg} />}
      <path d={MARK_PATHS.ring} fill={fg} fillRule="evenodd" opacity={solid ? 1 : 0.55} />
      <path d={MARK_PATHS.p} fill={fg} fillRule="evenodd" />
      <path d={MARK_PATHS.dot} fill={dot} />
    </svg>
  )
}

/** Mark + wordmark. The wordmark is set in Archivo Expanded. */
export function Logo({ className, variant = 'tile', dark = false }: { className?: string; variant?: Variant; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark className="size-8" variant={variant} />
      <Wordmark className={dark ? 'text-white' : 'text-ink'} />
    </span>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`pf-wordmark text-[17px] leading-none ${className}`}>PayFlow</span>
}
