import type { ProductionStatus } from './types'

export type DemoScenario = 'broadway' | 'nonprofit' | 'tour' | 'mixed'

export interface DemoProductionOverride {
  id: string
  name?: string
  venue?: string
  subtitle?: string
  openingDate?: string
  closingDate?: string
}

export interface DemoExtraProduction {
  name: string
  subtitle: string
  venue: string
  status: ProductionStatus
  openingDate: string
  closingDate: string
  color: string
}

export interface DemoConfig {
  v: 1
  org: string
  user: string
  title: string
  color: string
  scenario: DemoScenario
  logoUrl?: string
  navColor?: string
  overrides?: DemoProductionOverride[]
  extraProductions?: DemoExtraProduction[]
}

export const SCENARIO_LABELS: Record<DemoScenario, string> = {
  broadway: 'Broadway Commercial Show',
  nonprofit: 'Regional Nonprofit',
  tour: 'National Concert Tour',
  mixed: 'Full Portfolio (3 Productions)',
}

export const SCENARIO_DESCRIPTIONS: Record<DemoScenario, string> = {
  broadway: 'One commercial Broadway musical currently in performance at capacity',
  nonprofit: 'Nonprofit opera company in rehearsal for a world premiere',
  tour: 'National touring concert production mid-run across 28 cities',
  mixed: 'Full portfolio: Broadway show, nonprofit opera, and national tour',
}

export const NAV_COLORS = [
  { label: 'Obsidian', value: '#0c0a09' },
  { label: 'Navy', value: '#0f172a' },
  { label: 'Charcoal', value: '#1c1917' },
  { label: 'Forest', value: '#052e16' },
  { label: 'Burgundy', value: '#3b0764' },
  { label: 'Midnight', value: '#172554' },
  { label: 'Espresso', value: '#1c0a00' },
]

export const ACCENT_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Teal', value: '#0891b2' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Slate', value: '#475569' },
]

export function encodeDemo(config: DemoConfig): string {
  const json = JSON.stringify(config)
  const b64 = btoa(json)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeDemo(token: string): DemoConfig | null {
  try {
    const pad = token.length % 4
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
    const json = atob(padded)
    const parsed = JSON.parse(json)
    if (parsed.v === 1 && parsed.org && parsed.scenario) return parsed as DemoConfig
    return null
  } catch {
    return null
  }
}

export const DEMO_SESSION_KEY = 'stageops-demo'
