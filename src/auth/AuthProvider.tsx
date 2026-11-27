import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { profileService } from '../services'
import type { Profile } from '../types'
import { invalidate } from '../hooks/useLoad'
import { endGuest, isGuest, startGuest as openGuest } from '../guest/store'

interface AuthState {
  session: Session | null
  profile: Profile | null
  ready: boolean
  recovering: boolean
  /** Guest mode: the full app on an in-tab sample workspace; nothing is saved. */
  guest: boolean
  startGuest: () => void
  refreshProfile: () => Promise<void>
  setProfile: (p: Profile) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [guest, setGuest] = useState(() => isGuest())

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await profileService.get())
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      if (data.session && isGuest()) {
        // a real account always wins over a leftover guest tab
        endGuest()
        setGuest(false)
      }
      setSession(data.session)
      if (data.session || isGuest()) await refreshProfile()
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setRecovering(false)
      }
      setSession(s)
      if (event === 'SIGNED_IN' && isGuest()) {
        endGuest()
        setGuest(false)
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // defer: supabase-js warns against awaiting inside this callback
        setTimeout(() => {
          refreshProfile()
          invalidate()
        }, 0)
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [refreshProfile])

  const startGuest = useCallback(() => {
    setProfile(openGuest())
    setGuest(true)
    invalidate()
  }, [])

  const signOut = useCallback(async () => {
    if (isGuest()) {
      endGuest()
      setGuest(false)
      setProfile(null)
      invalidate()
      return
    }
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, ready, recovering, guest, startGuest, refreshProfile, setProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

/** For pages inside the authenticated shell, where a profile always exists. */
export function useProfile(): Profile {
  const { profile } = useAuth()
  if (!profile) throw new Error('Profile not loaded')
  return profile
}
