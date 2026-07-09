// Edition system — one codebase, three deploy targets.
//
//   full        everything (default; the admin/all-in-one version)
//   finance     financial modules only
//   production  operational modules only — NO financial information anywhere
//
// Set at build/dev time via NEXT_PUBLIC_STAGEOS_EDITION (see package.json
// scripts: dev:finance, dev:production, build:finance, build:production).

import type { SectionId } from './auth'

export type Edition = 'full' | 'finance' | 'production'

const raw = process.env.NEXT_PUBLIC_STAGEOS_EDITION
export const EDITION: Edition = raw === 'finance' || raw === 'production' ? raw : 'full'

export const IS_FINANCE_EDITION = EDITION === 'finance'
export const IS_PRODUCTION_EDITION = EDITION === 'production'

/** Whether dollar amounts may be rendered anywhere in the UI or exports. */
export const SHOW_MONEY = !IS_PRODUCTION_EDITION

/** Placeholder shown wherever a masked dollar amount would appear. */
export const MASKED_MONEY = '•••'

export const EDITION_SECTIONS: Record<Edition, SectionId[]> = {
  full: ['dashboard', 'production', 'company', 'finance', 'workspace'],
  finance: ['dashboard', 'finance', 'workspace'],
  production: ['dashboard', 'production', 'company', 'workspace'],
}

export const EDITION_LABEL: Record<Edition, string> = {
  full: '',
  finance: 'Finance',
  production: 'Production',
}

export function editionAllows(section: SectionId): boolean {
  return EDITION_SECTIONS[EDITION].includes(section)
}

/** Maps a pathname to the nav section it belongs to (for route guarding). */
export function sectionForPath(pathname: string): SectionId | null {
  const first = '/' + (pathname.split('/')[1] ?? '')
  const map: Record<string, SectionId> = {
    '/dashboard': 'dashboard',
    '/productions': 'production',
    '/tasks': 'production',
    '/calendar': 'production',
    '/contracts': 'production',
    '/workflows': 'production',
    '/onboarding': 'production',
    '/company': 'company',
    '/budget': 'finance',
    '/revenue': 'finance',
    '/cashflow': 'finance',
    '/grants': 'finance',
    '/marketing': 'finance',
    '/whatif': 'finance',
    '/reports': 'workspace',
    '/documents': 'workspace',
    '/settings': 'workspace',
  }
  return map[first] ?? null
}

/** Where to send someone who lands on a section this edition doesn't have. */
export const EDITION_HOME: Record<Edition, string> = {
  full: '/dashboard',
  finance: '/dashboard',
  production: '/dashboard',
}
