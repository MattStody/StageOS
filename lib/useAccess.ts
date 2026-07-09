import { useAuth } from '@/contexts/AuthContext'
import { useDemo } from '@/contexts/DemoContext'
import { editionAllows, SHOW_MONEY } from '@/lib/edition'
import type { SectionId } from '@/lib/auth'

export function useAccess() {
  const { currentUser, isAdmin } = useAuth()
  const { isDemo } = useDemo()

  function canSee(section: SectionId): boolean {
    if (!editionAllows(section)) return false
    if (isDemo) return true
    if (!currentUser) return false
    return currentUser.sections.includes(section)
  }

  return { canEdit: !!(currentUser || isDemo), isAdmin, isDemo, canSee, showMoney: SHOW_MONEY }
}
