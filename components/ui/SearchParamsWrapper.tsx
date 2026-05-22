'use client'
import { Suspense } from 'react'

export function SearchParamsWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
