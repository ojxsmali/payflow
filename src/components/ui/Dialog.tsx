import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '.'

// Native <dialog> gives focus trapping, Escape to close, inert background and
// correct screen-reader semantics without a library.
export function Dialog({ open, onClose, title, description, children, footer, wide }: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      requestAnimationFrame(() => {
        const first = d.querySelector<HTMLElement>('[data-autofocus], form input:not([type=hidden]):not([readonly]), form textarea, form select')
        first?.focus()
      })
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="dialog-title"
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-hidden rounded-[16px] border-2 border-ink bg-surface p-0 text-ink shadow-[var(--shadow-pop)]',
        'pf-dialog max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id="dialog-title" className="display text-lg">{title}</h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="pf-press -mr-1 rounded-full p-1.5 text-muted transition-transform duration-300 ease-[var(--ease-spring)] hover:rotate-90 hover:bg-sunken hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
