import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api'

export interface User {
  id: number
  username: string
  created_at: string
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(!!getToken())

  const loadMe = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return }
    try {
      const me = await api.get<User>('/api/auth/me')
      setUser(me)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMe() }, [loadMe])

  useEffect(() => {
    const onUnauth = () => { setUser(null) }
    window.addEventListener('schemamind:unauthorized', onUnauth)
    return () => window.removeEventListener('schemamind:unauthorized', onUnauth)
  }, [])

  const login = async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; token_type: string }>('/api/auth/login', { username, password })
    setToken(res.access_token)
    await loadMe()
  }

  const register = async (username: string, password: string) => {
    await api.post<User>('/api/auth/register', { username, password })
    await login(username, password)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
