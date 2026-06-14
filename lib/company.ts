// Shared selectors and alert logic for the Company Management module.

import type {
  Person, HousingAssignment, TravelLeg, PerDiemEntry,
  CAEAWeeklyReport, OnboardingChecklist, UnionAffiliation,
} from './types'
import { checklistProgress } from './onboarding'

export const UNION_LABELS: Record<UnionAffiliation, string> = {
  CAEA: 'CAEA',
  ACTRA: 'ACTRA',
  AFM: 'AFM Local 149',
  IATSE: 'IATSE',
  CUPE: 'CUPE',
  'Non-union': 'Non-union',
  Other: 'Other',
}

export const UNION_BADGE: Record<UnionAffiliation, string> = {
  CAEA: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  ACTRA: 'text-purple-700 bg-purple-50 border-purple-200',
  AFM: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  IATSE: 'text-amber-700 bg-amber-50 border-amber-200',
  CUPE: 'text-sky-700 bg-sky-50 border-sky-200',
  'Non-union': 'text-stone-600 bg-stone-100 border-stone-200',
  Other: 'text-stone-600 bg-stone-100 border-stone-200',
}

export const ROLE_BADGE: Record<string, string> = {
  Principal: 'text-rose-700 bg-rose-50 border-rose-200',
  Ensemble: 'text-pink-700 bg-pink-50 border-pink-200',
  Creative: 'text-violet-700 bg-violet-50 border-violet-200',
  'Production Staff': 'text-sky-700 bg-sky-50 border-sky-200',
  Vendor: 'text-stone-600 bg-stone-100 border-stone-200',
  Crew: 'text-amber-700 bg-amber-50 border-amber-200',
}

export const HOUSING_BADGE: Record<HousingAssignment['status'], string> = {
  Searching: 'text-amber-700 bg-amber-50 border-amber-200',
  Confirmed: 'text-sky-700 bg-sky-50 border-sky-200',
  'Checked In': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Checked Out': 'text-stone-500 bg-stone-100 border-stone-200',
}

export const TRAVEL_BADGE: Record<TravelLeg['status'], string> = {
  'Not Booked': 'text-red-700 bg-red-50 border-red-200',
  Booked: 'text-amber-700 bg-amber-50 border-amber-200',
  Confirmed: 'text-sky-700 bg-sky-50 border-sky-200',
  Completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
}

export function personName(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? 'Unknown'
}

export function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#dc2626', '#0d9488']
export function avatarColor(id: string): string {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function daysFromNow(dateStr?: string, today = new Date()): number {
  if (!dateStr) return Infinity
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''))
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Housing alert: not yet confirmed and lease/needed date is within 30 days
export function housingNeedsAttention(h: HousingAssignment, today = new Date()): boolean {
  if (h.status === 'Confirmed' || h.status === 'Checked In' || h.status === 'Checked Out') return false
  const d = daysFromNow(h.leaseStart, today)
  return d <= 30
}

export function housingUnconfirmed(h: HousingAssignment): boolean {
  return h.status === 'Searching'
}

// Travel alert: not booked within 14 days of travel date
export function travelNeedsAttention(t: TravelLeg, today = new Date()): boolean {
  if (t.status !== 'Not Booked') return false
  return daysFromNow(t.date, today) <= 14
}

export function perDiemOutstanding(e: PerDiemEntry): number {
  return Math.max(0, e.totalOwed - e.totalPaid)
}

// Per diem overdue: balance outstanding and the pay period has already started
export function perDiemOverdue(e: PerDiemEntry, today = new Date()): boolean {
  if (perDiemOutstanding(e) <= 0) return false
  return daysFromNow(e.periodStart, today) < 0
}

export function onboardingIncomplete(c: OnboardingChecklist): boolean {
  return !c.completedAt
}

export function onboardingOverdueItems(c: OnboardingChecklist, today = new Date()): number {
  return c.items.filter((i) => !i.completedAt && i.dueDate && daysFromNow(i.dueDate, today) < 0).length
}

// ISO week key (YYYY-Www) for matching "current week"
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export type CAEAReportStatus = 'submitted' | 'draft' | 'not_started'

export function caeaCurrentWeekStatus(reports: CAEAWeeklyReport[], today = new Date()): CAEAReportStatus {
  const key = isoWeekKey(today)
  const thisWeek = reports.filter((r) => isoWeekKey(new Date(r.weekEnding + 'T12:00:00')) === key)
  if (thisWeek.length === 0) return 'not_started'
  return thisWeek.every((r) => r.submittedAt) ? 'submitted' : 'draft'
}

export interface CompanySummary {
  incompleteOnboarding: number
  unconfirmedHousing: number
  overduePerDiems: number
  perDiemOutstandingTotal: number
  caeaStatus: CAEAReportStatus
}

export function companySummary(
  onboarding: OnboardingChecklist[],
  housing: HousingAssignment[],
  perDiems: PerDiemEntry[],
  caea: CAEAWeeklyReport[],
  today = new Date(),
): CompanySummary {
  return {
    incompleteOnboarding: onboarding.filter(onboardingIncomplete).length,
    unconfirmedHousing: housing.filter(housingUnconfirmed).length,
    overduePerDiems: perDiems.filter((e) => perDiemOverdue(e, today)).length,
    perDiemOutstandingTotal: perDiems.reduce((sum, e) => sum + perDiemOutstanding(e), 0),
    caeaStatus: caeaCurrentWeekStatus(caea, today),
  }
}

// Convert a value array to a CSV string and trigger a browser download.
export function downloadCSV(filename: string, rows: (string | number)[][]): void {
  const escape = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
