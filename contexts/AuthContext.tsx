'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ADMIN_SESSION_KEY, checkAdminCredentials } from '@/lib/auth'

interface AuthContextValue {
  isAdmin: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  isAdmin: false,
  login: () => false,
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    try {
      setIsAdmin(sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true')
    } catch {}
  }, [])

  function login(email: string, password: string): boolean {
    if (!checkAdminCredentials(email, password)) return false
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
    } catch {}
    setIsAdmin(true)
    return true
  }

  function logout() {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {}
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
