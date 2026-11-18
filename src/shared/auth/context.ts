import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Access } from './access'

export type AuthState = {
  status: 'loading' | 'ready' | 'anonymous' | 'error' | 'unconfigured' | 'preview'
  user: User | null
  access: Access | null
  error: string
}
export type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  canAccess: (moduleId: string) => boolean
}
export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
