import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, Bell, FileText, Home, LogOut, Plus, Settings, Users } from 'lucide-react'
import { Logo, LogoMark } from './Logo'
import { useAuth } from '../../auth/AuthProvider'
import { cx } from '../ui'
import { ActivityFeed } from './ActivityFeed'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: Home },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function AppShell() {
  const { profile, signOut } = useAuth()
  const [activityOpen, setActivityOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setActivityOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const displayName = profile?.business_name || profile?.full_name || profile?.email || ''

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-4 py-5 lg:flex">
        <Link to="/dashboard" className="mb-7 px-2"><Logo /></Link>
        <Link
          to="/invoices/new"
          className="mb-6 flex h-9 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-surface transition-colors hover:bg-accent-hover"
        >
          <Plus className="size-4" /> New invoice
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-base transition-colors',
                  isActive ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]' : 'text-ink-2 hover:bg-sunken hover:text-ink',
                )
              }
            >
              <Icon className="size-4 text-muted" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
          <button
            onClick={() => setActivityOpen((v) => !v)}
            aria-expanded={activityOpen}
            className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-base text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <Bell className="size-4 text-muted" aria-hidden /> Activity
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) => cx('flex h-9 items-center gap-2.5 rounded-md px-2.5 text-base', isActive ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]' : 'text-ink-2 hover:bg-sunken hover:text-ink')}
          >
            <Settings className="size-4 text-muted" aria-hidden /> Settings
          </NavLink>
          <div className="mt-3 flex items-center justify-between gap-2 px-2.5">
            <span className="truncate text-sm text-muted" title={displayName}>{displayName}</span>
            <button onClick={signOut} aria-label="Log out" title="Log out" className="rounded p-1 text-muted hover:bg-sunken hover:text-ink">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm lg:hidden">
        <Link to="/dashboard" aria-label="PayFlow home" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-[15px] font-semibold">PayFlow</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setActivityOpen((v) => !v)} aria-label="Activity" aria-expanded={activityOpen} className="rounded-md p-2 text-ink-2 hover:bg-sunken">
            <Bell className="size-5" />
          </button>
          <Link to="/settings" aria-label="Settings" className="rounded-md p-2 text-ink-2 hover:bg-sunken">
            <Settings className="size-5" />
          </Link>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="min-w-0 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mx-auto max-w-[1120px]">
          <Outlet />
        </div>
      </main>

      {activityOpen && <ActivityFeed onClose={() => setActivityOpen(false)} />}

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        {NAV.slice(0, 2).map((n) => <BottomLink key={n.to} {...n} />)}
        <Link to="/invoices/new" aria-label="New invoice" className="flex flex-col items-center justify-center py-2">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-surface"><Plus className="size-5" /></span>
        </Link>
        {NAV.slice(2).map((n) => <BottomLink key={n.to} {...n} />)}
      </nav>
    </div>
  )
}

function BottomLink({ to, label, icon: Icon }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cx('flex flex-col items-center justify-center gap-0.5 py-2 text-2xs font-medium', isActive ? 'text-accent' : 'text-muted')}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </NavLink>
  )
}
