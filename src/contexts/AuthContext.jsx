import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [loading, setLoading]         = useState(true)   // auth state seulement
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return

        const u = session?.user ?? null
        setUser(u)
        setLoading(false)   // ← l'app peut s'afficher immédiatement

        if (u) {
          // Chargement du profil en arrière-plan, non-bloquant
          setProfileLoading(true)
          supabase
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .single()
            .then(({ data }) => {
              setProfile(data ?? null)
              setProfileLoading(false)
            })
            .catch(() => setProfileLoading(false))
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setProfileLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
    setProfileLoading(false)
  }

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    setProfile(null)
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
      user, profile, profileLoading, loading,
      signIn, signOut, sendPasswordReset, updatePassword, fetchProfile,
      setProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
