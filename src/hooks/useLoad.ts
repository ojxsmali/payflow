import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { humanError } from '../lib/errors'

// Tiny data-loading hook. After any write, call invalidate() and every mounted
// useLoad refetches in the background — the previous data stays on screen
// meanwhile, so layouts never jump back to skeletons.

let version = 0
const listeners = new Set<() => void>()
export function invalidate() {
  version++
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const v = useSyncExternalStore(subscribe, () => version)
  const [state, setState] = useState<{ data: T | undefined; error: string | null; loading: boolean }>({
    data: undefined,
    error: null,
    loading: true,
  })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fnRef.current().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (err) => alive && setState((s) => ({ data: s.data, error: humanError(err), loading: false })),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, nonce, ...deps])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
