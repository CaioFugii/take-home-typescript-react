import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, setAccessToken, setUnauthorizedHandler } from '../services/api'
import type { AuthUser, LoginResponse } from '../types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null)
      setUser(null)
      setStatus('anonymous')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      const refreshed = await refreshSession()
      if (cancelled) {
        return
      }
      if (!refreshed) {
        setStatus('anonymous')
        return
      }
      try {
        const me = await api<AuthUser>('/api/auth/me')
        if (cancelled) {
          return
        }
        setUser(me)
        setStatus('authenticated')
      } catch {
        if (!cancelled) {
          setAccessToken(null)
          setUser(null)
          setStatus('anonymous')
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: async (email: string, password: string) => {
        const session = await api<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setAccessToken(session.accessToken)
        setUser(session.user)
        setStatus('authenticated')
      },
      logout: async () => {
        try {
          await api<void>('/api/auth/logout', { method: 'POST' })
        } finally {
          setAccessToken(null)
          setUser(null)
          setStatus('anonymous')
        }
      },
    }),
    [status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
