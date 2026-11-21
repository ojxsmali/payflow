import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import type { InvoiceStatus } from '../../types'
import { STATUS_META } from '../../lib/status'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

// ── Button ──────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-surface hover:bg-accent-hover border border-accent',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-2/50 hover:bg-white',
  ghost: 'text-ink-2 hover:text-ink hover:bg-sunken border border-transparent',
  danger: 'bg-surface text-danger border border-line-strong hover:border-danger/60 hover:bg-danger-soft/50',
}
const sizes = { sm: 'h-8 px-3 text-sm gap-1.5', md: 'h-9.5 px-4 text-base gap-2' }

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof sizes
  loading?: boolean
  icon?: ReactNode
  to?: string
}
export function Button({ variant = 'secondary', size = 'md', loading, icon, to, className, children, disabled, ...rest }: ButtonProps) {
  const cls = cx(
    'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] active:translate-y-px',
    'disabled:opacity-50 disabled:pointer-events-none',
    variants[variant], sizes[size], className,
  )
  const inner = (
    <>
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {inner}
    </button>
  )
}

// ── Form fields ─────────────────────────────────────────────────────────────
/** Inputs fill their container unless a width class is passed in. */
const width = (className?: string) => (/(^|\s)(w-|min-w-|flex-1)/.test(className ?? '') ? '' : 'w-full')
const control =
  'rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-muted/70 ' +
  'transition-colors duration-[var(--duration-fast)] hover:border-ink-2/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 ' +
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
      <label htmlFor={id} className="label flex justify-between">
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
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(control, width(className), 'h-9.5', className)} {...rest} />
})

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cx(control, width(className), 'py-2 min-h-20 resize-y leading-relaxed', className)} {...rest} />
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(control, width(className), 'h-9.5 appearance-none pr-8 bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20fill%3D%27none%27%20stroke%3D%27%236f6d66%27%20stroke-width%3D%271.5%27%3E%3Cpath%20d%3D%27m3%204.5%203%203%203-3%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat', className)}
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
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line-strong bg-surface p-0.5">
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
            'rounded-[5px] font-medium transition-colors duration-[var(--duration-fast)]',
            size === 'sm' ? 'px-2.5 h-7 text-xs' : 'px-3 h-8 text-sm',
            value === o.value ? 'bg-ink text-surface' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Status ──────────────────────────────────────────────────────────────────
const toneText = { muted: 'text-muted', accent: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger' }
const toneDot = { muted: 'bg-muted/60', accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }
export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap', toneText[m.tone], className)} title={m.help}>
      <span aria-hidden className={cx('size-1.5 rounded-full', toneDot[m.tone], status === 'viewed' && 'ring-2 ring-accent/25')} />
      <span className={status === 'cancelled' ? 'line-through decoration-muted/50' : undefined}>{m.label}</span>
    </span>
  )
}

export function SampleTag() {
  return (
    <span className="rounded-sm border border-line-strong px-1 py-px text-2xs font-medium uppercase tracking-wider text-muted" title="Created by “Load sample data”. Remove it in Settings.">
      Sample
    </span>
  )
}

// ── Layout helpers ──────────────────────────────────────────────────────────
export function PageHeader({ title, eyebrow, meta, actions }: { title: ReactNode; eyebrow?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-2xl leading-tight text-ink break-words">{title}</h1>
        {meta && <div className="mt-2 text-sm text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </header>
  )
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ title, body, actions, icon }: { title: string; body: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong px-6 py-10 sm:items-center sm:text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="display text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {actions && <div className="mt-1 flex flex-wrap gap-2">{actions}</div>}
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
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft/50 px-4 py-3 text-sm text-danger">
      <span>{message}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
