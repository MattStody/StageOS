'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Film, DollarSign, TrendingUp, FileText,
  ArrowRightLeft, CalendarDays, FileBarChart, FolderOpen, Settings,
  Megaphone, FlaskConical, Landmark, CheckSquare, Workflow,
  Users, Home, Wallet, ClipboardCheck, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDemo } from '@/contexts/DemoContext'

type NavItem = { label: string; href: string; icon: React.ElementType }
type NavSection = {
  id: string
  icon: React.ElementType
  label: string
  href?: string
  items?: NavItem[]
}

const sections: NavSection[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    id: 'production',
    icon: Film,
    label: 'Production',
    items: [
      { label: 'Productions', href: '/productions', icon: Film },
      { label: 'Tasks', href: '/tasks', icon: CheckSquare },
      { label: 'Calendar', href: '/calendar', icon: CalendarDays },
      { label: 'Contracts', href: '/contracts', icon: FileText },
      { label: 'Workflows', href: '/workflows', icon: Workflow },
    ],
  },
  {
    id: 'company',
    icon: Users,
    label: 'Company',
    items: [
      { label: 'Roster', href: '/company/roster', icon: Users },
      { label: 'Housing & Travel', href: '/company/housing', icon: Home },
      { label: 'Per Diems', href: '/company/perdiems', icon: Wallet },
      { label: 'CAEA Reports', href: '/company/caea', icon: ScrollText },
      { label: 'Onboarding', href: '/company/onboarding', icon: ClipboardCheck },
    ],
  },
  {
    id: 'finance',
    icon: DollarSign,
    label: 'Finance',
    items: [
      { label: 'Budget', href: '/budget', icon: DollarSign },
      { label: 'Revenue', href: '/revenue', icon: TrendingUp },
      { label: 'Cash Flow', href: '/cashflow', icon: ArrowRightLeft },
      { label: 'Grants', href: '/grants', icon: Landmark },
      { label: 'Marketing', href: '/marketing', icon: Megaphone },
      { label: 'What If', href: '/whatif', icon: FlaskConical },
    ],
  },
  {
    id: 'workspace',
    icon: FolderOpen,
    label: 'Workspace',
    items: [
      { label: 'Reports', href: '/reports', icon: FileBarChart },
      { label: 'Documents', href: '/documents', icon: FolderOpen },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

function isSectionActive(section: NavSection, pathname: string): boolean {
  if (section.href) return pathname === section.href || pathname.startsWith(section.href + '/')
  return section.items?.some(i => pathname === i.href || pathname.startsWith(i.href + '/')) ?? false
}

export function Sidebar() {
  const pathname = usePathname()
  const { isDemo, config } = useDemo()

  const orgName = isDemo && config?.org ? config.org : 'Adam Blanshay Prods.'
  const userName = isDemo && config?.user ? config.user : 'Leon Kay'
  const userTitle = isDemo && config?.title ? config.title : 'General Manager'
  const accentColor = isDemo && config?.color ? config.color : null
  const navColor = isDemo && config?.navColor ? config.navColor : null
  const logoUrl = isDemo && config?.logoUrl ? config.logoUrl : null

  const userInitials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const orgInitials = orgName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside
      className="w-14 shrink-0 bg-stone-950 min-h-screen flex flex-col items-center z-40 relative"
      style={navColor ? { backgroundColor: navColor } : undefined}
    >
      {/* Logo mark */}
      <div className="w-full flex items-center justify-center py-4 border-b border-white/10">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={orgName}
            className="h-6 w-6 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold text-white"
            style={{ backgroundColor: accentColor ?? '#44403c' }}
            title={orgName}
          >
            {orgInitials}
          </div>
        )}
      </div>

      {/* Nav rail */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-0.5 w-full">
        {sections.map((section) => {
          const active = isSectionActive(section, pathname)
          const Icon = section.icon

          const iconBtn = (
            <div
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded transition-colors',
                active ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/10',
              )}
              style={active ? { backgroundColor: accentColor ?? '#292524' } : undefined}
            >
              <Icon size={18} />
            </div>
          )

          if (section.href) {
            return (
              <div key={section.id} className="relative group w-full flex justify-center">
                <Link href={section.href}>{iconBtn}</Link>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50 pointer-events-none">
                  <div className="bg-stone-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {section.label}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={section.id} className="relative group w-full flex justify-center">
              <div className="cursor-default">{iconBtn}</div>
              {/* Flyout */}
              <div className="absolute left-full top-0 hidden group-hover:block z-50" style={{ paddingLeft: 6 }}>
                <div className="bg-stone-900 border border-white/10 rounded-lg shadow-2xl py-2 min-w-[168px]">
                  <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    {section.label}
                  </p>
                  {section.items?.map((item) => {
                    const itemActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const ItemIcon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors',
                          itemActive ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10',
                        )}
                        style={itemActive ? { backgroundColor: accentColor ? `${accentColor}33` : '#292524' } : undefined}
                      >
                        <ItemIcon size={13} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* User avatar */}
      <div className="pb-4 flex flex-col items-center gap-2">
        {isDemo && (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: accentColor ?? '#6366f1' }}
            title="Demo mode"
          />
        )}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium cursor-default"
          title={`${userName} — ${userTitle}`}
          style={
            accentColor
              ? { backgroundColor: `${accentColor}33`, color: accentColor }
              : { backgroundColor: '#44403c', color: '#d6d3d1' }
          }
        >
          {userInitials}
        </div>
      </div>
    </aside>
  )
}
