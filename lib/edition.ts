// Edition system — one codebase, three versions.
//
//   full        everything (default; the admin/all-in-one version)
//   finance     financial modules only
//   production  operational modules only — NO financial information anywhere
//
// Two ways the edition is decided:
//   1. NEXT_PUBLIC_STAGEOS_EDITION env var — hard lock, baked into the build
//      (dev:finance / dev:production / build:finance / build:production).
//      Use this for real deployments; the login picker is hidden.
//   2. Otherwise, chosen on the login screen and stored per browser tab
//      (sessionStorage), applied on the full page load that follows login.

import type { SectionId } from './auth'

export type Edition = 'full' | 'finance' | 'production'

export const EDITION_STORAGE_KEY = 'stageops-edition'

const raw = process.env.NEXT_PUBLIC_STAGEOS_EDITION

/** True when the edition is pinned by the build and can't be switched. */
export const EDITION_LOCKED = raw === 'finance' || raw === 'production'

function detectEdition(): Edition {
  if (raw === 'finance' || raw === 'production') return raw
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(EDITION_STORAGE_KEY)
      if (stored === 'finance' || stored === 'production') return stored
    } catch {}
  }
  return 'full'
}

export const EDITION: Edition = detectEdition()

/** Persist the tab's edition choice. Takes effect on the next full page load. */
export function setStoredEdition(edition: Edition): void {
  try {
    if (edition === 'full') sessionStorage.removeItem(EDITION_STORAGE_KEY)
    else sessionStorage.setItem(EDITION_STORAGE_KEY, edition)
  } catch {}
}

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
