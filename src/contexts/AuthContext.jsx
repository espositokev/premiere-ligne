import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileLoaded = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Seuls ces deux événements nécessitent un chargement de profil
        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') {
          // Déconnexion : on remet tout à zéro
          if (event === 'SIGNED_OUT') {
            profileLoaded.current = false
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (!session?.user) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        // Profil déjà chargé pour cet utilisateur → rien à faire
        if (profileLoaded.current) {
          setLoading(false)
          return
        }

        setUser(session.user)
        await fetchProfile(session.user.id)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] fetchProfile error', error)
    }

    setProfile(data ?? null)
    profileLoaded.current = !!data
    setLoading(false)
  }

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    profileLoaded.current = false
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
