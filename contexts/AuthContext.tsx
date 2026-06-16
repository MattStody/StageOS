'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  ADMIN_SESSION_KEY, USER_SESSION_KEY, checkAdminCredentials,
  findRoleUser, ADMIN_USER, type AppUser,
} from '@/lib/auth'

interface AuthContextValue {
  currentUser: AppUser | null
  isAdmin: boolean
  isAuthLoading: boolean
  login: (email: string, password: string) => boolean
  loginAsRole: (userId: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  isAdmin: false,
  isAuthLoading: true,
  login: () => false,
  loginAsRole: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    try {
      const userId = sessionStorage.getItem(USER_SESSION_KEY)
      if (userId === 'admin' || sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
        setCurrentUser(ADMIN_USER)
      } else if (userId) {
        const roleUser = findRoleUser(userId)
        if (roleUser) setCurrentUser(roleUser)
      }
    } catch {}
    setIsAuthLoading(false)
  }, [])

  function login(email: string, password: string): boolean {
    if (!checkAdminCredentials(email, password)) return false
    try {
      sessionStorage.setItem(USER_SESSION_KEY, 'admin')
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
    } catch {}
    setCurrentUser(ADMIN_USER)
    return true
  }

  function loginAsRole(userId: string) {
    const user = findRoleUser(userId)
    if (!user) return
    try {
      sessionStorage.setItem(USER_SESSION_KEY, userId)
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {}
    setCurrentUser(user)
  }

  function logout() {
    try {
      sessionStorage.removeItem(USER_SESSION_KEY)
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {}
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAdmin: currentUser?.isAdmin ?? false,
      isAuthLoading,
      login,
      loginAsRole,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
