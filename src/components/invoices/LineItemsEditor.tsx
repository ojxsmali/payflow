import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button, Input, cx } from '../ui'
import { formatMoney } from '../../lib/money'

export interface ItemRow {
  key: string
  description: string
  quantity: string
  rate: string
}
export type ItemErrors = Record<string, Partial<Record<'description' | 'quantity' | 'rate', string>>>

let seq = 0
export const newItem = (p: Partial<ItemRow> = {}): ItemRow => ({ key: `i${++seq}`, description: '', quantity: '1', rate: '', ...p })

/**
 * Line items. Desktop: a compact grid with column headers. Phone: each item is
 * a stacked block with full-width inputs — no sideways scrolling.
 */
export function LineItemsEditor({ items, onChange, amounts, currency, errors }: {
  items: ItemRow[]
  onChange: (items: ItemRow[]) => void
  amounts: (number | null)[]
  currency: string
  errors: ItemErrors
}) {
  const listRef = useRef<HTMLOListElement>(null)
  const update = (key: string, patch: Partial<ItemRow>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const remove = (key: string) => onChange(items.filter((i) => i.key !== key))
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items]
    ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
    onChange(next)
  }
  const focusKey = useRef<string | null>(null)
  useEffect(() => {
    if (!focusKey.current) return
    document.getElementById(`${focusKey.current}-d`)?.focus()
    focusKey.current = null
  }, [items])
  const add = () => {
    const item = newItem()
    focusKey.current = item.key
    onChange([...items, item])
  }

  return (
    <div className="@container">
      <div className="hidden grid-cols-[1fr_5rem_8.5rem_8.5rem_4.5rem] gap-3 border-b border-line pb-2 text-xs font-medium text-muted @2xl:grid" aria-hidden>
        <span>Description</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span><span />
      </div>
      <ol ref={listRef} className="divide-y divide-line" aria-label="Line items">
        {items.map((it, idx) => {
          const e = errors[it.key] ?? {}
          const n = idx + 1
          return (
            <li key={it.key} className="grid grid-cols-2 gap-x-3 gap-y-2 py-3 @2xl:grid-cols-[1fr_5rem_8.5rem_8.5rem_4.5rem] @2xl:items-start">
              <div className="col-span-2 @2xl:col-span-1">
                <label htmlFor={`${it.key}-d`} className="label mb-1 block @2xl:sr-only">Item {n} description</label>
                <textarea
                  id={`${it.key}-d`}
                  data-desc
                  rows={1}
                  value={it.description}
                  placeholder="What you did or delivered"
                  aria-invalid={!!e.description || undefined}
                  aria-describedby={e.description ? `${it.key}-de` : undefined}
                  onChange={(ev) => {
                    update(it.key, { description: ev.target.value })
                    ev.target.style.height = 'auto'
                    ev.target.style.height = `${ev.target.scrollHeight + 2}px`
                  }}
                  className="min-h-9.5 w-full resize-none rounded-md border border-line-strong bg-surface px-3 py-2 text-base leading-snug placeholder:text-muted/70 hover:border-ink-2/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 aria-[invalid=true]:border-danger"
                />
                {e.description && <p id={`${it.key}-de`} className="mt-1 text-xs text-danger">{e.description}</p>}
              </div>
              <div>
                <label htmlFor={`${it.key}-q`} className="label mb-1 block @2xl:sr-only">Item {n} quantity</label>
                <Input id={`${it.key}-q`} inputMode="decimal" value={it.quantity} invalid={!!e.quantity} aria-describedby={e.quantity ? `${it.key}-qe` : undefined} onChange={(ev) => update(it.key, { quantity: ev.target.value })} className="num text-right" />
                {e.quantity && <p id={`${it.key}-qe`} className="mt-1 text-xs text-danger">{e.quantity}</p>}
              </div>
              <div>
                <label htmlFor={`${it.key}-r`} className="label mb-1 block @2xl:sr-only">Item {n} rate</label>
                <Input id={`${it.key}-r`} inputMode="decimal" placeholder="0.00" value={it.rate} invalid={!!e.rate} aria-describedby={e.rate ? `${it.key}-re` : undefined} onChange={(ev) => update(it.key, { rate: ev.target.value })} className="num text-right" />
                {e.rate && <p id={`${it.key}-re`} className="mt-1 text-xs text-danger">{e.rate}</p>}
              </div>
              <div className="num flex h-9.5 items-center text-sm text-muted @2xl:justify-end @2xl:text-base @2xl:text-ink">
                <span className="@2xl:hidden">Amount&nbsp;</span>
                <output aria-label={`Item ${n} amount`} className={cx(amounts[idx] === null && 'text-muted')}>{amounts[idx] === null ? '—' : formatMoney(amounts[idx]!, currency, { cents: true })}</output>
              </div>
              <div className="flex h-9.5 items-center justify-end gap-0.5">
                <IconBtn label={`Move item ${n} up`} disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="size-3.5" /></IconBtn>
                <IconBtn label={`Move item ${n} down`} disabled={idx === items.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="size-3.5" /></IconBtn>
                <IconBtn label={`Remove item ${n}`} disabled={items.length === 1} onClick={() => remove(it.key)} danger><Trash2 className="size-3.5" /></IconBtn>
              </div>
            </li>
          )
        })}
      </ol>
      <Button type="button" variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={add} className="mt-1 -ml-2" disabled={items.length >= 200}>
        Add line item
      </Button>
    </div>
  )
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx('rounded p-1.5 text-muted transition-colors hover:bg-sunken disabled:opacity-30 disabled:hover:bg-transparent', danger ? 'hover:text-danger' : 'hover:text-ink')}
    >
      {children}
    </button>
  )
}
