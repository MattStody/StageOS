'use client'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { SHOW_MONEY } from '@/lib/edition'

// Wraps pages that are inherently financial. In the Production edition the
// content is replaced with a notice instead of rendering masked numbers.
export function FinanceOnly({ children }: { children: React.ReactNode }) {
  if (SHOW_MONEY) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <Lock size={20} className="text-stone-400" />
      </div>
      <h2 className="text-base font-semibold text-stone-800">Not available in the Production edition</h2>
      <p className="text-sm text-stone-500 mt-1 max-w-sm">
        This page contains financial information and is only available in the Finance edition of StageOS.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 text-xs font-medium text-stone-600 border border-stone-200 rounded px-3 py-1.5 hover:bg-stone-50 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
