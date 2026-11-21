import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CircleCheck, CircleAlert, X } from 'lucide-react'
import { cx } from '.'

type Tone = 'success' | 'error' | 'info'
interface Toast { id: number; tone: Tone; message: string }

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, tone, message }])
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-sm animate-rise items-start gap-2.5 rounded-md bg-ink px-3.5 py-2.5 text-sm text-surface shadow-[var(--shadow-pop)]"
          >
            {t.tone === 'error' ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#f0a89c]" /> : <CircleCheck className={cx('mt-0.5 size-4 shrink-0', 'text-[#9fd1b4]')} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded p-0.5 text-surface/60 hover:text-surface">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
