import { useAuth } from '@/contexts/AuthContext'
import { useDemo } from '@/contexts/DemoContext'

export function useAccess() {
  const { isAdmin } = useAuth()
  const { isDemo } = useDemo()
  return { canEdit: isAdmin || isDemo, isAdmin, isDemo }
}
