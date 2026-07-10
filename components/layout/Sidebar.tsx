'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Film, DollarSign, TrendingUp, FileText,
  ArrowRightLeft, CalendarDays, FileBarChart, FolderOpen, Settings,
  Megaphone, FlaskConical, Landmark, CheckSquare, Workflow,
  Users, Home, Wallet, ClipboardCheck, ScrollText, Shirt,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDemo } from '@/contexts/DemoContext'
import { useAuth } from '@/contexts/AuthContext'
import { EDITION, EDITION_LABEL, editionAllows, SHOW_MONEY } from '@/lib/edition'
import type { SectionId } from '@/lib/auth'

type NavItem = { label: string; href: string; icon: React.ElementType }
type NavSection = {
  id: SectionId
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
      { label: 'Wardrobe', href: '/company/wardrobe', icon: Shirt },
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
  const { currentUser } = useAuth()

  const orgName = isDemo && config?.org ? config.org : 'Adam Blanshay Prods.'
  const userName = isDemo && config?.user ? config.user : (currentUser?.name ?? 'Leon Kay')
  const userTitle = isDemo && config?.title ? config.title : (currentUser?.title ?? 'General Manager')
  const accentColor = isDemo && config?.color ? config.color : null
  const navColor = isDemo && config?.navColor ? config.navColor : null
  const logoUrl = isDemo && config?.logoUrl ? config.logoUrl : null

  const allowedSections = currentUser?.sections ?? sections.map((s) => s.id)
  const visibleSections = sections
    .filter((s) => editionAllows(s.id) && (isDemo || allowedSections.includes(s.id)))
    .map((s) => ({
      ...s,
      // Reports are financial documents — hidden when money is hidden
      items: s.items?.filter((i) => SHOW_MONEY || i.href !== '/reports'),
    }))
  const editionBadge = EDITION_LABEL[EDITION]

  const userInitials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const orgInitials = orgName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  // Role users (not admin, not demo) get the expanded labeled sidebar
  const useExpandedNav = !currentUser?.isAdmin && !isDemo

  if (useExpandedNav) {
    return (
      <aside
        className="w-52 shrink-0 bg-stone-950 min-h-screen flex flex-col z-40"
        style={navColor ? { backgroundColor: navColor } : undefined}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-white font-semibold text-sm tracking-tight truncate">{orgName}</p>
          <p className="text-stone-400 text-xs mt-0.5 truncate">{userTitle}</p>
          {editionBadge && (
            <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-widest text-white/50 border border-white/15 rounded px-1.5 py-0.5">
              {editionBadge} Edition
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {visibleSections.map((section) => {
            if (section.href) {
              const active = isSectionActive(section, pathname)
              const Icon = section.icon
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
                    active ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/10',
                  )}
                  style={active ? { backgroundColor: accentColor ?? '#292524' } : undefined}
                >
                  <Icon size={15} />
                  {section.label}
                </Link>
              )
            }
            return (
              <div key={section.id}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items?.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
                          active ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/10',
                        )}
                        style={active ? { backgroundColor: accentColor ?? '#292524' } : undefined}
                      >
                        <Icon size={15} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-5 py-4 border-t border-white/10">
          <a
            href="/login"
            className="flex items-center gap-3 -mx-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
            title="Switch user or version"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
              style={{ backgroundColor: '#44403c', color: '#d6d3d1' }}
            >
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-stone-300 font-medium truncate">{userName}</p>
              <p className="text-xs text-stone-500 truncate">{userTitle}</p>
            </div>
          </a>
        </div>
      </aside>
    )
  }

  // Admin / demo: icon rail with hover flyouts
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
        {visibleSections.map((section) => {
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
        {editionBadge && (
          <span
            className="text-[9px] font-bold text-white/40 [writing-mode:vertical-rl] tracking-widest uppercase"
            title={`${editionBadge} Edition`}
          >
            {editionBadge}
          </span>
        )}
        {isDemo && (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: accentColor ?? '#6366f1' }}
            title="Demo mode"
          />
        )}
        <a
          href="/login"
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium hover:ring-2 hover:ring-white/20 transition-shadow"
          title={`${userName} — ${userTitle} · Switch user or version`}
          style={
            accentColor
              ? { backgroundColor: `${accentColor}33`, color: accentColor }
              : { backgroundColor: '#44403c', color: '#d6d3d1' }
          }
        >
          {userInitials}
        </a>
      </div>
    </aside>
  )
}
