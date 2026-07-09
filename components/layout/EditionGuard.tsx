'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EDITION, EDITION_HOME, editionAllows, sectionForPath } from '@/lib/edition'

// Redirects any route belonging to a section this edition doesn't include.
export function EditionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const section = sectionForPath(pathname)
  const blocked = section !== null && !editionAllows(section)

  useEffect(() => {
    if (blocked) router.replace(EDITION_HOME[EDITION])
  }, [blocked, router])

  if (blocked) return null
  return <>{children}</>
}
