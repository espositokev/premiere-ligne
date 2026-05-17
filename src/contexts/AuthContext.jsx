import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange', event, session?.user?.id ?? 'no user')
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    console.log('[Auth] fetchProfile start', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, structures(name, ville)')
        .eq('id', userId)
        .single()
      console.log('[Auth] fetchProfile result', { data, error })
      setProfile(data)
    } catch (err) {
      console.error('[Auth] fetchProfile exception', err)
    } finally {
      setLoading(false)
      console.log('[Auth] loading = false')
    }
  }

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function sendPasswordReset(email) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  }

  async function updatePassword(newPassword) {
    return await supabase.auth.updateUser({ password: newPassword })
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signOut, sendPasswordReset, updatePassword, fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
