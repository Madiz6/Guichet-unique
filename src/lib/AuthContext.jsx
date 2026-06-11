import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // Start loading — stays true until the first auth event resolves
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Use onAuthStateChange exclusively.
    // In Supabase v2 it fires INITIAL_SESSION immediately on subscribe, so we
    // do NOT also call getSession() — that double-call is the race condition that
    // sets isLoadingAuth=false before user.role is populated.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadProfile(session.user)
        } else {
          setUser(null)
          setIsAuthenticated(false)
          setIsLoadingAuth(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (authUser) => {
    try {
      // Read the profile row — DO NOT insert/upsert; the DB trigger creates it.
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, company_id, onboarding_completed')
        .eq('id', authUser.id)
        .single()

      if (error) throw error

      // Merge auth fields (email) with profile fields (role, full_name, …)
      setUser({
        id: authUser.id,
        email: authUser.email,
        role: profile.role,
        full_name: profile.full_name,
        company_id: profile.company_id,
        onboarding_completed: profile.onboarding_completed,
      })
      setIsAuthenticated(true)
      setAuthError(null)
    } catch (err) {
      console.error('[AuthContext] loadProfile error:', err?.message)
      setAuthError({ type: 'unknown', message: 'Erreur lors du chargement du profil' })
    } finally {
      // Always clear the loading flag — routing effect checks this
      setIsLoadingAuth(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
