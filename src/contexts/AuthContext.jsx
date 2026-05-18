import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const CACHE_KEY = (userId) => `pl_profile_${userId}`

function readCache(userId) {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY(userId))) } catch { return null }
}
function writeCache(userId, data) {
  try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(data)) } catch {}
}
function clearCache(userId) {
  try { if (userId) localStorage.removeItem(CACHE_KEY(userId)) } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileLoaded = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearCache(user?.id)
          profileLoaded.current = false
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return

        if (!session?.user) {
          setLoading(false)
          return
        }

        // Profil déjà chargé pour cette session
        if (profileLoaded.current) {
          setLoading(false)
          return
        }

        setUser(session.user)

        // Lire le cache localStorage en premier — instantané
        const cached = readCache(session.user.id)
        if (cached) {
          setProfile(cached)
          profileLoaded.current = true
          setLoading(false)
          return
        }

        // Pas de cache → fetch Supabase une seule fois
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

    if (error) console.error('[Auth] fetchProfile error', error)

    if (data) {
      writeCache(userId, data)
      profileLoaded.current = true
    }

    setProfile(data ?? null)
    setLoading(false)
  }

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    clearCache(user?.id)
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

  // Appelé explicitement après onboarding ou mise à jour du profil
  async function fetchProfile_force(userId) {
    clearCache(userId)
    profileLoaded.current = false
    await fetchProfile(userId)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signOut, sendPasswordReset, updatePassword,
      fetchProfile: fetchProfile_force,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
