// Calendar dates are stored as plain 'YYYY-MM-DD' strings (Postgres `date`), so
// they never shift across time zones. "Today" is computed in the user's own
// time zone (profile.timezone), the same rule the database uses for overdue.

export function todayIn(timeZone = 'Asia/Kolkata'): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function toUTC(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUTC(toIso).getTime() - toUTC(fromIso).getTime()) / 86_400_000)
}

const longFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** '2026-11-18' → '18 Nov 2026' */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return longFmt.format(toUTC(iso))
}
/** '2026-11-18' → '18 Nov' */
export function formatDateShort(iso: string) {
  return shortFmt.format(toUTC(iso))
}

/** Timestamp → '18 Nov 2026, 14:05' in the user's zone */
export function formatDateTime(ts: string, timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone,
  }).format(new Date(ts))
}

/** Human description of a due date relative to today. */
export function dueLabel(daysUntilDue: number) {
  if (daysUntilDue === 0) return 'Due today'
  if (daysUntilDue === 1) return 'Due tomorrow'
  if (daysUntilDue > 1) return `Due in ${daysUntilDue} days`
  if (daysUntilDue === -1) return 'Due yesterday'
  return `Due ${-daysUntilDue} days ago`
}

/** 'YYYY-MM' keys for the last n months, oldest first, ending with today's month. */
export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    out.push(d.toISOString().slice(0, 7))
  }
  return out
}

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const monthYearFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export function monthLabel(ym: string, withYear = false) {
  return (withYear ? monthYearFmt : monthFmt).format(toUTC(`${ym}-01`))
}

export function relativeTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days} d ago`
  return formatDate(new Date(ts).toISOString().slice(0, 10))
}
