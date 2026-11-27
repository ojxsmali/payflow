import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { LogoMark } from '../layout/Logo'
import type { InvoiceStatus } from '../../types'
import { STATUS_META } from '../../lib/status'
import { ripple } from '../../lib/effects'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

// ── Button ──────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white border-2 border-accent font-bold hover:bg-accent-hover hover:border-accent-hover shadow-[var(--shadow-violet)] hover:-translate-y-0.5',
  secondary: 'bg-surface text-ink border-2 border-ink/15 font-semibold hover:border-ink hover:-translate-y-0.5',
  ghost: 'text-ink-2 font-semibold hover:text-ink hover:bg-sunken border-2 border-transparent',
  danger: 'bg-surface text-danger border-2 border-danger/30 font-semibold hover:border-danger hover:bg-danger-soft/60',
}
const sizes = { sm: 'h-8 px-3.5 text-sm gap-1.5', md: 'h-10 px-5 text-base gap-2' }

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof sizes
  loading?: boolean
  icon?: ReactNode
  to?: string
}
export function Button({ variant = 'secondary', size = 'md', loading, icon, to, className, children, disabled, ...rest }: ButtonProps) {
  const cls = cx(
    'pf-press relative isolate overflow-hidden inline-flex items-center justify-center rounded-full whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-spring)]',
    'disabled:opacity-45 disabled:shadow-none disabled:pointer-events-none',
    variants[variant], sizes[size], className,
  )
  const inner = (
    <>
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls} onPointerDown={ripple}>{inner}</Link>
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest} onPointerDown={(e) => { ripple(e); rest.onPointerDown?.(e) }}>
      {inner}
    </button>
  )
}

// ── Form fields ─────────────────────────────────────────────────────────────
/** Inputs fill their container unless a width class is passed in. */
const width = (className?: string) => (/(^|\s)(w-|min-w-|flex-1)/.test(className ?? '') ? '' : 'w-full')
const control =
  'rounded-md border-2 border-line bg-surface px-3 text-base text-ink placeholder:text-muted/70 ' +
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-line-strong focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_rgb(91_61_245/0.14)] ' +
  'aria-[invalid=true]:border-danger disabled:bg-sunken disabled:text-muted'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
  optional?: boolean
  className?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="label flex justify-between font-semibold text-ink-2">
        <span>{label}</span>
        {optional && <span className="font-normal text-muted/80">Optional</span>}
      </label>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(' ') || undefined, invalid: !!error })}
      {error ? (
        <p id={errId} className="text-xs text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(control, width(className), 'h-10', className)} {...rest} />
})

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cx(control, width(className), 'py-2 min-h-20 resize-y leading-relaxed', className)} {...rest} />
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(control, width(className), 'h-10 appearance-none pr-8 bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20fill%3D%27none%27%20stroke%3D%27%236f6d66%27%20stroke-width%3D%271.5%27%3E%3Cpath%20d%3D%27m3%204.5%203%203%203-3%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

// ── Segmented control (radio group) ─────────────────────────────────────────
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  size?: 'sm' | 'md'
}) {
  const pill = useId()
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border-2 border-ink/15 bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const i = options.findIndex((x) => x.value === value)
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length]
              onChange(next.value)
              ;(e.currentTarget.parentElement?.querySelectorAll('button')[options.indexOf(next)] as HTMLButtonElement)?.focus()
            }
          }}
          tabIndex={value === o.value ? 0 : -1}
          className={cx(
            'pf-press relative isolate whitespace-nowrap rounded-full font-semibold transition-colors duration-[var(--duration-fast)]',
            size === 'sm' ? 'px-3 h-7 text-xs' : 'px-3.5 h-8 text-sm',
            value === o.value ? 'text-white' : 'text-ink-2 hover:text-ink',
          )}
        >
          {value === o.value && <motion.span layoutId={pill} transition={{ type: 'spring', stiffness: 500, damping: 36 }} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-ink" />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Status ──────────────────────────────────────────────────────────────────
const toneText = { muted: 'text-muted', accent: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger' }
const toneBg = { muted: 'bg-sunken', accent: 'bg-accent-soft', success: 'bg-success-soft', warning: 'bg-warning-soft', danger: 'bg-danger-soft' }
const toneDot = { muted: 'bg-muted/60', accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }
export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-normal whitespace-nowrap', toneText[m.tone], toneBg[m.tone], className)} title={m.help}>
      <span aria-hidden className={cx('pf-dot relative size-1.5 rounded-full', toneDot[m.tone], (status === 'sent' || status === 'viewed' || status === 'overdue') && 'pf-pulse')} />
      <span className={status === 'cancelled' ? 'line-through decoration-muted/50' : undefined}>{m.label}</span>
    </span>
  )
}

export function SampleTag() {
  return (
    <span className="rounded-sm bg-lime px-1 py-px font-mono text-2xs font-medium uppercase tracking-wider text-ink" title="Created by “Load sample data”. Remove it in Settings.">
      Sample
    </span>
  )
}

// ── Layout helpers ──────────────────────────────────────────────────────────
export function PageHeader({ title, eyebrow, meta, actions }: { title: ReactNode; eyebrow?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-4 border-b-2 border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="pf-label mb-3">{eyebrow}</div>}
        <h1 className="pf-display text-[2.1rem] text-ink break-words sm:text-[3.25rem] lg:text-[3.75rem]">{title}</h1>
        {meta && <div className="mt-2 text-sm text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 no-print sm:flex-nowrap">{actions}</div>}
    </header>
  )
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
        <h2 className="text-md font-extrabold tracking-[-0.02em] text-ink [font-stretch:115%]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ title, body, actions, icon }: { title: string; body: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="pf-sheet relative flex flex-col items-start gap-3 overflow-hidden rounded-lg px-6 py-12 sm:items-center sm:text-center">
      <motion.div
        initial={{ scale: 2.2, rotate: 12, opacity: 0 }}
        animate={{ scale: 1, rotate: -10, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.1 }}
        className="relative grid size-16 place-items-center"
        aria-hidden
      >
        <LogoMark variant="stamp" className="size-16 opacity-90" />
        {icon && <span className="absolute -bottom-1 -right-2 grid size-8 place-items-center rounded-full bg-lime text-ink [&_svg]:size-4">{icon}</span>}
      </motion.div>
      <h3 className="display mt-2 text-xl">{title}</h3>
      <p className="max-w-sm text-sm text-ink-2">{body}</p>
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 py-3.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 flex-1 max-w-48" />
          <Skeleton className="ml-auto h-3.5 w-24" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-l-[6px] border-danger/40 border-l-danger bg-danger-soft/60 px-4 py-3 text-sm font-medium text-danger">
      <span className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{message}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
