// CAEA / PACT weekly payroll calculation engine.
//
// IMPORTANT: These rates are indicative defaults for demonstration. Company
// managers MUST verify every rate and rule against their CURRENT, in-force
// CAEA/PACT agreement before submitting anything to payroll. The standard
// disclaimer is exported below and shown on every report.

import type {
  PACTContractType,
  CAEAWeeklyEntry,
  CAEAPenalty,
  CAEAPenaltyType,
} from './types'

export const CAEA_DISCLAIMER =
  'Verify all rates and rules against your current CAEA/PACT agreement before submitting to payroll. Figures shown are estimates only.'

// Standard CAEA/PACT contract weekly hours by tier (indicative).
// Overtime applies to actual hours worked beyond the weekly straight-time base.
export const PACT_TIERS: Record<PACTContractType, {
  label: string
  weeklyHours: number       // straight-time hours per week
  otMultiplier: number      // overtime multiplier on the hourly equivalent
  description: string
}> = {
  'PACT-A': { label: 'PACT Tier A', weeklyHours: 44, otMultiplier: 1.5, description: 'Largest theatres — highest minimums' },
  'PACT-B': { label: 'PACT Tier B', weeklyHours: 44, otMultiplier: 1.5, description: 'Mid-large theatres' },
  'PACT-C': { label: 'PACT Tier C', weeklyHours: 42, otMultiplier: 1.5, description: 'Mid-size regional theatres' },
  'PACT-D': { label: 'PACT Tier D', weeklyHours: 40, otMultiplier: 1.5, description: 'Smaller theatres' },
  'LOA':    { label: 'Letter of Agreement', weeklyHours: 40, otMultiplier: 1.5, description: 'Negotiated letter of agreement' },
}

// Indicative CAEA contribution / deduction rates — VERIFY against current agreement.
export const CAEA_RATES = {
  pensionPct: 0.08,        // employer pension contribution, % of gross (verify)
  duesCheckoffPct: 0.02,   // CAEA dues check-off, % of gross (verify)
  vacationPayPct: 0.04,    // 4% vacation pay — Canadian employment standards
}

// Default penalty rates per occurrence (CAD) — indicative, verify.
export const PENALTY_RATES: Record<CAEAPenaltyType, number> = {
  MissedBreak: 25,
  RestInvasion: 50,
  MealPenalty: 35,
  Other: 25,
}

export const PENALTY_LABELS: Record<CAEAPenaltyType, string> = {
  MissedBreak: 'Missed break',
  RestInvasion: 'Rest period invasion',
  MealPenalty: 'Meal penalty',
  Other: 'Other',
}

export interface CAEAEntryInput {
  personId: string
  weeklyContractRate: number
  scheduledHours: number
  actualHours: number
  isPartialWeek: boolean
  partialWeekDays?: number
  partialWeekType?: 'rehearsal' | 'performance'
  isTechWeek: boolean
  penalties: CAEAPenalty[]
  sickDays: number
  personalDays: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Compute a full CAEA weekly entry from raw inputs. All money in CAD.
 * Returns a fully-populated CAEAWeeklyEntry with derived fields.
 */
export function computeCAEAEntry(input: CAEAEntryInput, contractType: PACTContractType): CAEAWeeklyEntry {
  const tier = PACT_TIERS[contractType]
  const hourlyEquivalent = input.weeklyContractRate / tier.weeklyHours

  // Base salary — pro-rated for partial weeks (5-day work week assumption)
  let baseSalary = input.weeklyContractRate
  if (input.isPartialWeek && input.partialWeekDays && input.partialWeekDays > 0) {
    baseSalary = round2((input.weeklyContractRate / 5) * input.partialWeekDays)
  }

  // Overtime — actual hours beyond the straight-time weekly base
  const overtimeHours = Math.max(0, input.actualHours - tier.weeklyHours)
  const overtimePay = round2(overtimeHours * hourlyEquivalent * tier.otMultiplier)

  // Penalty total
  const penaltyTotal = round2(input.penalties.reduce((sum, p) => sum + p.total, 0))

  // Tech week added time premium (indicative: 10% of base during tech)
  const addedTimePay = input.isTechWeek ? round2(baseSalary * 0.1) : 0

  // Gross = base + overtime + penalties + added time
  const grossPay = round2(baseSalary + overtimePay + penaltyTotal + addedTimePay)

  // Statutory & union amounts off gross
  const vacationPay = round2(grossPay * CAEA_RATES.vacationPayPct)
  const pensionContribution = round2(grossPay * CAEA_RATES.pensionPct)
  const duesCheckoff = round2(grossPay * CAEA_RATES.duesCheckoffPct)

  // Net to payroll = gross + vacation pay − dues (pension is employer-side, not deducted from net)
  const netToPayroll = round2(grossPay + vacationPay - duesCheckoff)

  return {
    personId: input.personId,
    weeklyContractRate: input.weeklyContractRate,
    scheduledHours: input.scheduledHours,
    actualHours: input.actualHours,
    isPartialWeek: input.isPartialWeek,
    partialWeekDays: input.partialWeekDays,
    partialWeekType: input.partialWeekType,
    isTechWeek: input.isTechWeek,
    penalties: input.penalties,
    sickDays: input.sickDays,
    personalDays: input.personalDays,
    overtimeHours: round2(overtimeHours),
    overtimePay,
    penaltyTotal,
    addedTimePay,
    vacationPay,
    grossPay,
    pensionContribution,
    duesCheckoff,
    netToPayroll,
  }
}

export function makePenalty(type: CAEAPenaltyType, count: number, notes?: string): CAEAPenalty {
  const ratePerOccurrence = PENALTY_RATES[type]
  return {
    type,
    count,
    ratePerOccurrence,
    total: round2(count * ratePerOccurrence),
    notes,
  }
}

// Health of a week, for color coding: clean (green), penalties (yellow), issue (red)
export type CAEAWeekHealth = 'clean' | 'penalties' | 'issue'

export function entryHealth(entry: CAEAWeeklyEntry, contractType: PACTContractType): CAEAWeekHealth {
  const tier = PACT_TIERS[contractType]
  // Compliance issue: rest-period invasion penalties, or large overtime overrun (>10h)
  const hasRestInvasion = entry.penalties.some((p) => p.type === 'RestInvasion' && p.count > 0)
  if (hasRestInvasion || entry.overtimeHours > 10 || entry.actualHours > tier.weeklyHours + 15) {
    return 'issue'
  }
  if (entry.penaltyTotal > 0 || entry.overtimeHours > 0) return 'penalties'
  return 'clean'
}

// Season maximum hours (indicative) — for the "approaching maximum" alert.
export const SEASON_MAX_HOURS = 1200

export function approachingMax(seasonHours: number): boolean {
  return seasonHours >= SEASON_MAX_HOURS * 0.85
}
