'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Film, DollarSign, TrendingUp, FileText,
  ArrowRightLeft, CalendarDays, FileBarChart, FolderOpen, Settings, ChevronRight, Megaphone, Wand2, FlaskConical, Plug2, Upload, Landmark, CheckSquare, UserPlus, Workflow,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import { useDemo } from '@/contexts/DemoContext'

type NavItem = { label: string; href: string; icon: React.ElementType; exact: boolean }
type NavGroup = { heading?: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: false },
    ],
  },
  {
    heading: 'Production',
    items: [
      { label: 'Productions', href: '/productions', icon: Film, exact: false },
      { label: 'Tasks', href: '/tasks', icon: CheckSquare, exact: false },
      { label: 'Calendar', href: '/calendar', icon: CalendarDays, exact: false },
      { label: 'Contracts', href: '/contracts', icon: FileText, exact: false },
      { label: 'Onboarding', href: '/onboarding/actor', icon: UserPlus, exact: false },
      { label: 'Workflows', href: '/workflows', icon: Workflow, exact: false },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { label: 'Budget', href: '/budget', icon: DollarSign, exact: false },
      { label: 'Revenue', href: '/revenue', icon: TrendingUp, exact: false },
      { label: 'Cash Flow', href: '/cashflow', icon: ArrowRightLeft, exact: false },
      { label: 'Grants', href: '/grants', icon: Landmark, exact: false },
    ],
  },
  {
    heading: 'Strategy',
    items: [
      { label: 'Marketing', href: '/marketing', icon: Megaphone, exact: false },
      { label: 'What If', href: '/whatif', icon: FlaskConical, exact: false },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      { label: 'Reports', href: '/reports', icon: FileBarChart, exact: false },
      { label: 'Documents', href: '/documents', icon: FolderOpen, exact: false },
      { label: 'Settings', href: '/settings', icon: Settings, exact: true },
      { label: 'Demo Creator', href: '/settings/demos', icon: Wand2, exact: false },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { productions } = useStore()
  const { isDemo, config } = useDemo()

  const orgName = isDemo && config?.org ? config.org : 'Adam Blanshay Prods.'
  const userName = isDemo && config?.user ? config.user : 'Leon Kay'
  const userTitle = isDemo && config?.title ? config.title : 'General Manager'
  const accentColor = isDemo && config?.color ? config.color : null
  const navColor = isDemo && config?.navColor ? config.navColor : null
  const logoUrl = isDemo && config?.logoUrl ? config.logoUrl : null

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className="w-56 shrink-0 bg-stone-950 min-h-screen flex flex-col"
      style={navColor ? { backgroundColor: navColor } : undefined}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={orgName}
            className="h-8 max-w-[140px] object-contain object-left"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <p className="text-white font-semibold text-sm tracking-tight truncate">{userName}</p>
        )}
        <p className="text-stone-400 text-xs mt-0.5 truncate">{orgName}</p>
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
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => {
          const items = group.items.filter(({ href }) => !(isDemo && href === '/settings/demos'))
          if (!items.length) return null
          return (
            <div key={gi}>
              {group.heading && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ label, href, icon: Icon, exact }) => {
                  const active = pathname === href || (!exact && pathname.startsWith(href + '/'))
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
                        active
                          ? 'text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10',
                      )}
                      style={active ? { backgroundColor: accentColor ?? '#292524' } : undefined}
                    >
                      <Icon size={15} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Productions quick list */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <p className="px-3 text-xs text-stone-400 uppercase tracking-wider mb-2">Productions</p>
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
      <div className="px-5 py-4 border-t border-white/10">
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
            <p className="text-xs text-stone-400 truncate">{userTitle}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
