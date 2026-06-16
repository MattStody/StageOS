import { useAuth } from '@/contexts/AuthContext'
import { useDemo } from '@/contexts/DemoContext'
import type { SectionId } from '@/lib/auth'

export function useAccess() {
  const { currentUser, isAdmin } = useAuth()
  const { isDemo } = useDemo()

  function canSee(section: SectionId): boolean {
    if (isDemo) return true
    if (!currentUser) return false
    return currentUser.sections.includes(section)
  }

  return { canEdit: !!(currentUser || isDemo), isAdmin, isDemo, canSee }
}
