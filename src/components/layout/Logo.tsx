export function LogoMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--color-accent)" />
      <path d="M11 23V9h6.25a4.75 4.75 0 0 1 0 9.5H11" fill="none" stroke="var(--color-paper)" strokeWidth="2.6" strokeLinecap="square" />
      <path d="M11 23h10" stroke="var(--color-brass)" strokeWidth="2.6" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">PayFlow</span>
    </span>
  )
}
