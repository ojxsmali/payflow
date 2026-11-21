import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { InvoiceRow } from '../../types'
import { formatMoney } from '../../lib/money'
import { dueLabel, formatDate } from '../../lib/dates'
import { SampleTag, StatusBadge, cx } from '../ui'

export type SortKey = 'invoice_number' | 'client_name' | 'issue_date' | 'due_date' | 'total' | 'status'
export interface Sort { key: SortKey; dir: 'asc' | 'desc' }

const COLUMNS: { key: SortKey; label: string; className?: string; numeric?: boolean }[] = [
  { key: 'invoice_number', label: 'Invoice' },
  { key: 'client_name', label: 'Client' },
  { key: 'issue_date', label: 'Issued', className: 'hidden md:table-cell' },
  { key: 'due_date', label: 'Due' },
  { key: 'total', label: 'Amount', numeric: true },
  { key: 'status', label: 'Status' },
]

function dueCell(inv: InvoiceRow) {
  const open = ['sent', 'viewed', 'partially_paid', 'overdue'].includes(inv.status)
  if (!open) return <span className="text-ink-2">{formatDate(inv.due_date)}</span>
  return (
    <span className={cx(inv.status === 'overdue' ? 'text-danger' : inv.days_until_due <= 7 ? 'text-warning' : 'text-ink-2')} title={formatDate(inv.due_date)}>
      {dueLabel(inv.days_until_due)}
    </span>
  )
}

/**
 * Accessible table on wide screens (sortable headers, whole-row click with a
 * real link for keyboards); a stacked list on phones.
 */
export function InvoiceTable({ invoices, sort, onSort, showClient = true }: {
  invoices: InvoiceRow[]
  sort?: Sort
  onSort?: (s: Sort) => void
  showClient?: boolean
}) {
  const navigate = useNavigate()
  const cols = COLUMNS.filter((c) => showClient || c.key !== 'client_name')

  return (
    <>
      <table className="hidden w-full border-collapse text-base sm:table">
        <thead>
          <tr className="border-b border-line text-left">
            {cols.map((c) => {
              const active = sort?.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cx('py-2.5 pr-4 text-xs font-medium text-muted last:pr-0', c.numeric && 'text-right', c.className)}
                >
                  {onSort ? (
                    <button
                      onClick={() => onSort({ key: c.key, dir: active && sort!.dir === 'desc' ? 'asc' : 'desc' })}
                      className={cx('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}
                    >
                      {c.label}
                      {active && (sort!.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                    </button>
                  ) : c.label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a,button')) return
                navigate(`/invoices/${inv.id}`)
              }}
              className="cursor-pointer border-b border-line transition-colors duration-[var(--duration-fast)] hover:bg-surface"
            >
              <td className="py-3 pr-4">
                <span className="flex items-center gap-2">
                  <Link to={`/invoices/${inv.id}`} className="font-mono text-sm text-ink hover:underline">{inv.invoice_number}</Link>
                  {inv.is_sample && <SampleTag />}
                </span>
              </td>
              {showClient && <td className="max-w-56 truncate py-3 pr-4 text-ink" title={inv.client_name}>{inv.client_name}</td>}
              <td className="hidden py-3 pr-4 text-ink-2 md:table-cell">{formatDate(inv.issue_date)}</td>
              <td className="py-3 pr-4 text-sm">{dueCell(inv)}</td>
              <td className="num py-3 pr-4 text-right">
                {formatMoney(inv.total, inv.currency)}
                {inv.amount_paid > 0 && inv.status !== 'paid' && (
                  <div className="text-xs text-muted">{formatMoney(inv.balance_due, inv.currency)} due</div>
                )}
              </td>
              <td className="py-3"><StatusBadge status={inv.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line border-y border-line sm:hidden">
        {invoices.map((inv) => (
          <li key={inv.id}>
            <Link to={`/invoices/${inv.id}`} className="flex items-start justify-between gap-3 py-3.5 active:bg-surface">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{showClient ? inv.client_name : inv.invoice_number}</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                  {showClient && <span className="font-mono text-xs">{inv.invoice_number}</span>}
                  <span>{dueCell(inv)}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="num font-medium">{formatMoney(inv.status === 'paid' ? inv.total : inv.balance_due, inv.currency)}</span>
                <StatusBadge status={inv.status} className="text-xs" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export function sortInvoices(rows: InvoiceRow[], sort: Sort) {
  const order = ['overdue', 'partially_paid', 'viewed', 'sent', 'draft', 'paid', 'cancelled']
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    let c = 0
    switch (sort.key) {
      case 'total': c = a.total - b.total; break
      case 'status': c = order.indexOf(a.status) - order.indexOf(b.status); break
      case 'client_name': c = a.client_name.localeCompare(b.client_name); break
      case 'invoice_number': c = a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true }); break
      default: c = a[sort.key].localeCompare(b[sort.key])
    }
    return c * dir || b.invoice_number.localeCompare(a.invoice_number, undefined, { numeric: true })
  })
}
