import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// When a refresh token is invalid (expired session, Supabase project reset, etc.)
// Supabase emits SIGNED_OUT. Catch it here and redirect to login cleanly
// instead of leaving the user stuck on a broken page.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    localStorage.clear()
    window.location.href = '/login'
  }
})