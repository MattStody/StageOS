'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Film, DollarSign, TrendingUp, FileText,
  ArrowRightLeft, CalendarDays, FileBarChart, FolderOpen, Settings, ChevronRight, Megaphone, Wand2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import { useDemo } from '@/contexts/DemoContext'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Productions', href: '/productions', icon: Film },
  { label: 'Budget', href: '/budget', icon: DollarSign },
  { label: 'Revenue', href: '/revenue', icon: TrendingUp },
  { label: 'Contracts', href: '/contracts', icon: FileText },
  { label: 'Cash Flow', href: '/cashflow', icon: ArrowRightLeft },
  { label: 'Marketing', href: '/marketing', icon: Megaphone },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Demo Creator', href: '/settings/demos', icon: Wand2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { productions } = useStore()
  const { isDemo, config } = useDemo()

  const orgName = isDemo && config?.org ? config.org : 'Adam Blanshay Prods.'
  const userName = isDemo && config?.user ? config.user : 'Leon Kay'
  const userTitle = isDemo && config?.title ? config.title : 'General Manager'
  const accentColor = isDemo && config?.color ? config.color : null

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="w-56 shrink-0 bg-stone-950 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-stone-800">
        <div className="flex items-baseline gap-1">
          <span className="text-white font-semibold text-base tracking-tight">StageOps</span>
          <span className="text-stone-500 text-xs">GM</span>
        </div>
        <p className="text-stone-500 text-xs mt-0.5 truncate">{orgName}</p>
        {isDemo && (
          <span
            className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: accentColor ? `${accentColor}22` : '#6366f122',
              color: accentColor ?? '#6366f1',
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor ?? '#6366f1' }} />
            Demo
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
                active
                  ? 'text-white'
                  : 'text-stone-400 hover:text-white hover:bg-stone-900',
              )}
              style={active ? { backgroundColor: accentColor ?? '#292524' } : undefined}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Productions quick list */}
      <div className="px-3 pb-4 border-t border-stone-800 pt-4">
        <p className="px-3 text-xs text-stone-600 uppercase tracking-wider mb-2">Productions</p>
        {productions.map((p) => (
          <Link
            key={p.id}
            href={`/productions/${p.id}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-stone-400 hover:text-white hover:bg-stone-900 transition-colors group"
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="truncate flex-1">{p.name}</span>
            <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 shrink-0" />
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="px-5 py-4 border-t border-stone-800">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
            style={
              accentColor
                ? { backgroundColor: `${accentColor}33`, color: accentColor }
                : { backgroundColor: '#44403c', color: '#d6d3d1' }
            }
          >
            {initials}
          </div>
          <div>
            <p className="text-xs text-stone-300 font-medium truncate">{userName}</p>
            <p className="text-xs text-stone-500 truncate">{userTitle}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
