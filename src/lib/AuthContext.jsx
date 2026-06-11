import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user)
      } else {
        setIsLoadingAuth(false)
        setIsAuthenticated(false)
      }
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile(session.user)
      } else {
        setUser(null)
        setIsAuthenticated(false)
        setIsLoadingAuth(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (authUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) throw error

      setUser({ ...profile, email: authUser.email, id: authUser.id })
      setIsAuthenticated(true)
      setAuthError(null)
    } catch {
      setAuthError({ type: 'unknown', message: 'Erreur lors du chargement du profil' })
    } finally {
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
