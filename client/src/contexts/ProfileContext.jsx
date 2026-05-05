/**
 * ProfileContext — single global auth + profile load.
 *
 * Uses onAuthStateChange as the sole source of truth so we never call
 * getUser() (which acquires a storage lock and races with React Strict Mode).
 * INITIAL_SESSION fires immediately with the cached local session — no lock,
 * no network round-trip for the initial render.
 *
 * Exposes: { user, profile, loading }
 */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const handleSession = async (session) => {
      if (!session?.user) {
        if (mounted) { setUser(null); setProfile(null); setLoading(false) }
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*, areas(name, color)')
        .eq('id', session.user.id)
        .single()
      if (mounted) { setUser(session.user); setProfile(data); setLoading(false) }
    }

    // onAuthStateChange fires INITIAL_SESSION immediately from local storage —
    // no network lock, safe under React Strict Mode double-invoke.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { handleSession(session) }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <ProfileContext.Provider value={{ user, profile, loading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider')
  return ctx
}
