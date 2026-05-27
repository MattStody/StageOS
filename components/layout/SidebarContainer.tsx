'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/cn'

export function SidebarContainer() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-stone-950 border-b border-white/10 h-14 px-4 flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-stone-400 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span className="text-white font-semibold text-sm tracking-tight">StageOps</span>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static in flow on desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
          'lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>
    </>
  )
}
