import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BarChart3, Bell, FileText, Home, LogOut, Plus, Settings, Users } from 'lucide-react'
import { LogoMark, Wordmark } from './Logo'
import { useAuth } from '../../auth/AuthProvider'
import { cx } from '../ui'
import { ripple } from '../../lib/effects'
import { ActivityFeed } from './ActivityFeed'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: Home },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

const PILL = { type: 'spring', stiffness: 520, damping: 38 } as const

export function AppShell() {
  const { profile, signOut, guest } = useAuth()
  const navigate = useNavigate()
  const leave = async () => {
    await signOut()
    if (guest) navigate('/', { replace: true })
  }
  const [activityOpen, setActivityOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setActivityOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const displayName = profile?.business_name || profile?.full_name || profile?.email || ''
  const initial = (displayName.trim()[0] ?? 'P').toUpperCase()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar — the night rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-hidden bg-night px-4 py-5 text-white/80 lg:flex">
        <Link to="/home" aria-label="PayFlow home page" className="group relative mb-8 flex items-center gap-2.5 px-2">
          <motion.span whileHover={{ rotate: -12, scale: 1.08 }} whileTap={{ scale: 0.85 }} transition={PILL} className="inline-flex">
            <LogoMark className="size-8" />
          </motion.span>
          <Wordmark className="text-white" />
        </Link>
        <Link
          to="/invoices/new"
          onPointerDown={ripple}
          className="pf-press group relative isolate mb-7 flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-accent text-sm font-bold text-white shadow-[var(--shadow-violet)] transition-[background-color,transform] duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:bg-accent-hover"
        >
          <Plus className="size-4 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:rotate-90" /> New invoice
        </Link>
        <p className="pf-label relative mb-2 px-2.5 !text-white/50">Workspace</p>
        <nav aria-label="Main" className="relative flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <SideLink key={to} to={to} label={label} icon={Icon} />
          ))}
        </nav>
        <div className="relative mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <button
            onClick={() => setActivityOpen((v) => !v)}
            aria-expanded={activityOpen}
            className="pf-press flex h-10 items-center gap-2.5 rounded-full px-3.5 text-base font-semibold text-white/65 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Bell className="size-4" aria-hidden /> Activity
          </button>
          <SideLink to="/settings" label="Settings" icon={Settings} />
          <div className="mt-3 flex items-center gap-2.5 rounded-md bg-white/[0.04] p-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-sm font-extrabold text-ink" aria-hidden>
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/80" title={displayName}>{displayName}</span>
            <button onClick={leave} aria-label={guest ? 'Leave guest mode' : 'Log out'} title={guest ? 'Leave guest mode' : 'Log out'} className="rounded p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md lg:hidden">
        <Link to="/home" aria-label="PayFlow home page" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <Wordmark className="text-[15px]" />
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setActivityOpen((v) => !v)} aria-label="Activity" aria-expanded={activityOpen} className="pf-press rounded-md p-2 text-ink-2 hover:bg-sunken">
            <Bell className="size-5" />
          </button>
          <Link to="/settings" aria-label="Settings" className="pf-press rounded-md p-2 text-ink-2 hover:bg-sunken">
            <Settings className="size-5" />
          </Link>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="min-w-0 px-4 pb-32 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        {guest && <GuestBanner onLeave={leave} />}
        <div key={location.pathname} className="pf-page mx-auto max-w-[1120px]">
          <Outlet />
        </div>
      </main>

      {activityOpen && <ActivityFeed onClose={() => setActivityOpen(false)} />}

      {/* Mobile bottom navigation — a floating pill */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 items-center rounded-[22px] bg-night p-1.5 shadow-[0_20px_40px_-12px_rgb(13_13_13/0.5)] pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:hidden">
        {NAV.slice(0, 2).map((n) => <BottomLink key={n.to} {...n} />)}
        <Link to="/invoices/new" aria-label="New invoice" className="flex items-center justify-center">
          <motion.span whileTap={{ scale: 0.85, rotate: 90 }} whileHover={{ scale: 1.06 }} className="flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-violet)] ring-4 ring-night">
            <Plus className="size-5" />
          </motion.span>
        </Link>
        {NAV.slice(2).map((n) => <BottomLink key={n.to} {...n} />)}
      </nav>
    </div>
  )
}

function SideLink({ to, label, icon: Icon }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx('pf-press group relative isolate flex h-10 items-center gap-2.5 rounded-full px-3.5 text-base font-semibold transition-colors', isActive ? 'text-ink' : 'text-white/65 hover:text-white')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId="pf-side-pill" transition={PILL} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-lime" />
          )}
          <Icon className="size-4 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-6" aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  )
}

function BottomLink({ to, label, icon: Icon }: (typeof NAV)[number]) {
  return (
    <NavLink to={to} className={({ isActive }) => cx('relative isolate flex h-13 flex-col items-center justify-center gap-0.5 rounded-[14px] text-2xs font-bold transition-colors', isActive ? 'text-ink' : 'text-white/60')}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="pf-tab-blob" transition={PILL} aria-hidden className="absolute inset-0 -z-10 rounded-[14px] bg-lime" />}
          <Icon className="size-5" aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  )
}

/** Shown on every app screen in guest mode. */
function GuestBanner({ onLeave }: { onLeave: () => void }) {
  return (
    <div role="status" className="sticky top-14 z-20 -mx-4 -mt-6 mb-6 border-b-2 border-ink bg-lime text-ink sm:-mx-6 lg:top-0 lg:-mx-10 lg:-mt-10 lg:mb-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <p className="text-sm font-semibold">
          <span className="font-extrabold">Guest mode</span> — nothing is saved. Create an account to keep your work.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onLeave} className="pf-press rounded-full px-3 py-1.5 text-sm font-semibold underline-offset-4 hover:underline">
            Leave
          </button>
          <Link to="/signup" onPointerDown={ripple} className="pf-press relative isolate inline-flex h-9 items-center overflow-hidden rounded-full bg-ink px-4 text-sm font-bold text-white">
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
