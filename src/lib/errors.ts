// Turn whatever went wrong into one sentence a person can act on.
// Messages raised deliberately by our database functions (errcode 22023 / P0002)
// are already written for people and are passed through unchanged.

interface MaybePgError {
  message?: string
  code?: string
  status?: number
  name?: string
}

export function humanError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback
  const e = err as MaybePgError
  const msg = e.message ?? String(err)

  if (e.code === '22023' || e.code === 'P0002') return msg
  if (e.name === 'TypeError' && /fetch/i.test(msg)) return "Can't reach the server. Check your connection and try again."
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Can't reach the server. Check your connection and try again."
  if (/Invalid login credentials/i.test(msg)) return 'That email and password don’t match an account.'
  if (/Email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link.'
  if (/User already registered/i.test(msg)) return 'An account with this email already exists. Try logging in.'
  if (/Password should be/i.test(msg)) return 'Use a password of at least 8 characters.'
  if (/rate limit/i.test(msg)) return 'Too many attempts. Wait a minute and try again.'
  if (/JWT|session/i.test(msg) && e.status === 401) return 'Your session expired. Log in again.'
  if (e.code === '23505') return 'That already exists. Use a different value.'
  if (e.code === '23503') return 'This is still used by an invoice, so it can’t be removed. Archive it instead.'
  if (e.code === '23514') return 'Some values are outside the allowed range. Check the highlighted fields.'
  if (e.code === '42501') return 'You don’t have access to that.'
  if (e.code === 'PGRST116') return 'Not found. It may have been removed.'
  return fallback
}
