/**
 * ProfileContext — single global auth + profile load.
 *
 * Wraps the whole app (inside BrowserRouter) so every page can call
 * useProfile() and get the cached result instead of each page doing its
 * own supabase.auth.getUser() + profiles fetch.
 *
 * Exposes: { user, profile, loading }
 *   - loading: true while the initial fetch is in flight
 *   - user:    Supabase auth user object (or null if not signed in)
 *   - profile: row from the profiles table with areas joined (or null)
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
    let cancelled = false

    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (cancelled) return

      if (!authUser) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*, areas(name, color)')
        .eq('id', authUser.id)
        .single()

      if (cancelled) return
      setUser(authUser)
      setProfile(data)
      setLoading(false)
    }

    init()

    // Keep in sync when the user signs out (or signs in via another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
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
