/**
 * The three ways into PayFlow — shared by the landing hero, "How it works" and the
 * auth pages, and the same pattern FinTrack and Financial Intelligence use:
 * Create account · Log in · Continue as guest (one click, nothing saved).
 */
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { ripple } from '../lib/effects'
import { Magnetic } from './motion'
import { cx } from './ui'

const base =
  'pf-press group relative isolate inline-flex h-13 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-6 text-[15px] transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-spring)] max-sm:w-full'
const primary = `${base} bg-accent font-bold text-white shadow-[var(--shadow-violet)] hover:bg-accent-hover`
const secondaryLight = `${base} border-2 border-ink font-semibold text-ink hover:bg-ink hover:text-white`
const secondaryDark = `${base} border-2 border-white/60 font-semibold text-white hover:border-white hover:bg-white hover:text-ink`
const guestLight = `${base} bg-lime font-bold text-ink ring-2 ring-ink hover:-translate-y-0.5`
const guestDark = `${base} bg-lime font-bold text-ink hover:-translate-y-0.5`

export function useEnterAsGuest() {
  const { startGuest } = useAuth()
  const navigate = useNavigate()
  return () => {
    startGuest()
    navigate('/dashboard')
  }
}

export function EntryActions({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  const { session, guest } = useAuth()
  const enterAsGuest = useEnterAsGuest()
  const secondary = dark ? secondaryDark : secondaryLight

  if (session)
    return (
      <div className={cx('flex flex-col gap-3 sm:flex-row sm:flex-wrap', className)}>
        <Magnetic className="inline-flex max-sm:w-full">
          <Link to="/dashboard" onPointerDown={ripple} className={primary}>
            <LayoutDashboard className="size-4" aria-hidden /> Open your dashboard
          </Link>
        </Magnetic>
      </div>
    )

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Magnetic className="inline-flex max-sm:w-full">
          <Link to="/signup" onPointerDown={ripple} className={primary}>
            Create account <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Magnetic>
        <Link to="/login" className={secondary}>
          Log in
        </Link>
        <button type="button" onPointerDown={ripple} onClick={enterAsGuest} className={dark ? guestDark : guestLight}>
          <UserRound className="size-4" aria-hidden /> {guest ? 'Back to the guest app' : 'Continue as guest'}
        </button>
      </div>
      <p className={cx('mt-3 text-xs', dark ? 'text-white/55' : 'text-muted')}>Guest opens the full app with sample data. Nothing is saved.</p>
    </div>
  )
}

/** "or continue as guest" for the log-in and sign-up pages. */
export function GuestDivider() {
  const enterAsGuest = useEnterAsGuest()
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line-strong" /> or <span className="h-px flex-1 bg-line-strong" />
      </div>
      <button type="button" onPointerDown={ripple} onClick={enterAsGuest} className={cx(guestLight, 'mt-4 w-full !h-11')}>
        <UserRound className="size-4" aria-hidden /> Continue as guest
      </button>
      <p className="mt-2 text-center text-xs text-muted">The full app with sample data. Nothing is saved.</p>
    </div>
  )
}
