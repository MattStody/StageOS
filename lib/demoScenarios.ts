import type { DemoScenario, DemoProductionOverride, DemoExtraProduction } from './demo'
import type {
  Production, BudgetLine, RevenueWeek, Contract,
  CashFlowRow, Deadline, Document, MarketingBudgetLine, MarketingCampaign, CustomEvent, PerformanceDate,
} from './types'
import {
  PRODUCTIONS, BUDGET_LINES, REVENUE_WEEKS, CONTRACTS,
  CASH_FLOW_ROWS, DEADLINES, DOCUMENTS, MARKETING_BUDGET_LINES, MARKETING_CAMPAIGNS, CUSTOM_EVENTS, PERFORMANCE_DATES,
} from './mockData'

export interface ScenarioData {
  productions: Production[]
  budgetLines: BudgetLine[]
  revenueWeeks: RevenueWeek[]
  contracts: Contract[]
  cashFlowRows: CashFlowRow[]
  deadlines: Deadline[]
  documents: Document[]
  marketingBudgetLines: MarketingBudgetLine[]
  marketingCampaigns: MarketingCampaign[]
  customEvents: CustomEvent[]
  performanceDates: PerformanceDate[]
}

const SCENARIO_PROD_IDS: Record<DemoScenario, string[]> = {
  broadway: ['prod-1'],
  nonprofit: ['prod-2'],
  tour: ['prod-3'],
  mixed: ['prod-1', 'prod-2', 'prod-3'],
}

export function getScenarioData(scenario: DemoScenario): ScenarioData {
  const ids = SCENARIO_PROD_IDS[scenario]
  return {
    productions: PRODUCTIONS.filter((p) => ids.includes(p.id)),
    budgetLines: BUDGET_LINES.filter((b) => ids.includes(b.productionId)),
    revenueWeeks: REVENUE_WEEKS.filter((r) => ids.includes(r.productionId)),
    contracts: CONTRACTS.filter((c) => ids.includes(c.productionId)),
    cashFlowRows: CASH_FLOW_ROWS.filter((r) => ids.includes(r.productionId)),
    deadlines: DEADLINES.filter((d) => ids.includes(d.productionId)),
    documents: DOCUMENTS.filter((d) => ids.includes(d.productionId)),
    marketingBudgetLines: MARKETING_BUDGET_LINES.filter((m) => ids.includes(m.productionId)),
    marketingCampaigns: MARKETING_CAMPAIGNS.filter((m) => ids.includes(m.productionId)),
    customEvents: CUSTOM_EVENTS.filter((e) => ids.includes(e.productionId)),
    performanceDates: PERFORMANCE_DATES.filter((p) => ids.includes(p.productionId)),
  }
}

function addDays(base: string, days: number): string {
  const d = new Date(base || new Date().toISOString().split('T')[0])
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function toNextSunday(dateStr: string): string {
  const d = new Date(dateStr || new Date().toISOString().split('T')[0])
  const day = d.getUTCDay()
  if (day !== 0) d.setUTCDate(d.getUTCDate() + (7 - day))
  return d.toISOString().split('T')[0]
}

function prevSunday(dateStr: string, weeksBack: number): string {
  const base = dateStr || new Date().toISOString().split('T')[0]
  const d = new Date(base)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 0 : day) - weeksBack * 7)
  return d.toISOString().split('T')[0]
}

const CAST_LEADS = [
  'Marcus Webb', 'Olivia Trent', 'Carmen Reyes', 'Simone Laurent',
  'Ezra Calloway', 'Diana Castillo', 'Nathan Briggs', 'Priya Mehta',
]
const CAST_SUPPORTING = [
  'Jordan Alcott', 'Helena Byrne', 'Darius Flynn', 'Mia Sorensen',
  'Kwame Asante', 'Luz Torres', 'Felix Hartmann', 'Nadia Okonkwo',
]
const DIRECTORS = [
  'Eleanor Marsh', 'Theodore Vance', 'Fiona Walsh', 'Samuel Okafor',
  'Ingrid Solberg', 'Rafael Pinto', 'Cassandra Wu', 'Mikhail Stein',
]
const STAGE_MANAGERS = [
  'Patricia Huang', 'Robert Finch', 'Aarav Singh', 'Monique Descartes',
  'Chloe Blackwood', 'James Osei', 'Yuna Park', 'Trevor Mills',
]
const MARKETING_AGENCIES = [
  'Serino Coyne', 'SpotCo Creative', 'AKA NYC', 'Allied Live Marketing',
  'Broadway Media Group', 'Hudson Arts Agency', 'Harbor Creative Group', 'Platinum PR',
]
const SCENIC_VENDORS = [
  'Hudson Scenic Studio', 'Showman Fabricators', 'Feller Scenery Studios',
  'Adirondack Studios', 'PRG Scenic Technologies', 'Global Scenic Services',
]
const LIGHTING_VENDORS = [
  'Lightswitch, Inc.', 'PRG Production Resources', 'VER Technologies',
  'Upstaging Inc.', 'Christie Lites', 'Bandit Lites',
]
const SOUND_VENDORS = [
  'Sound Associates', 'Masque Sound', 'ProComm Audio',
  'Full Flood Inc.', 'Clair Global', 'Eighth Day Sound',
]
const RIGHTS_HOLDERS = [
  'Dramatists Play Service', 'Music Theatre International',
  'Theatrical Rights Worldwide', 'R&H Theatricals',
  'Samuel French', 'Concord Theatricals',
]
const INVESTOR_GROUPS = [
  'Apex Capital Partners LLC', 'Meridian Arts Fund', 'Broadway Ventures Group',
  'Stonehaven Investors LLC', 'Griffin Road Productions', 'Harbor Peak Capital',
]

function pick<T>(arr: T[], idx: number): T { return arr[idx % arr.length] }

// Standard 8-show/week schedule anchored to Tuesday of each week
const SHOW_SCHEDULE: Array<{ dayOffset: number; time: string }> = [
  { dayOffset: 0, time: '19:30' }, // Tuesday evening
  { dayOffset: 1, time: '14:00' }, // Wednesday matinee
  { dayOffset: 1, time: '19:30' }, // Wednesday evening
  { dayOffset: 2, time: '19:30' }, // Thursday evening
  { dayOffset: 3, time: '20:00' }, // Friday evening
  { dayOffset: 4, time: '14:00' }, // Saturday matinee
  { dayOffset: 4, time: '20:00' }, // Saturday evening
  { dayOffset: 5, time: '14:00' }, // Sunday matinee
]

function generatePerformanceDates(prodId: string, openingDate: string, closingDate: string): PerformanceDate[] {
  if (!openingDate || !closingDate) return []
  const opening = new Date(openingDate + 'T12:00:00Z')
  const closing = new Date(closingDate + 'T12:00:00Z')
  const today   = new Date()
  if (opening > closing) return []

  // Find first Tuesday on or after opening
  const firstTuesday = new Date(opening)
  const dow = firstTuesday.getUTCDay()
  firstTuesday.setUTCDate(firstTuesday.getUTCDate() + (dow <= 2 ? 2 - dow : 9 - dow))

  const results: PerformanceDate[] = []
  let weekStart = new Date(firstTuesday)
  let idx = 0

  while (weekStart <= closing) {
    for (const { dayOffset, time } of SHOW_SCHEDULE) {
      const d = new Date(weekStart)
      d.setUTCDate(d.getUTCDate() + dayOffset)
      if (d < opening || d > closing) continue
      results.push({
        id: `${prodId}-p-${idx++}`,
        productionId: prodId,
        date: d.toISOString().split('T')[0],
        time,
        notes: '',
        status: d < today ? 'completed' : 'scheduled',
      })
    }
    weekStart.setUTCDate(weekStart.getUTCDate() + 7)
  }

  return results
}

function boilerplate(prodId: string, e: DemoExtraProduction, i: number): {
  production: Production
  budgetLines: BudgetLine[]
  revenueWeeks: RevenueWeek[]
  contracts: Contract[]
  cashFlowRows: CashFlowRow[]
  deadlines: Deadline[]
  marketingBudgetLines: MarketingBudgetLine[]
  marketingCampaigns: MarketingCampaign[]
  documents: Document[]
  customEvents: CustomEvent[]
  performanceDates: PerformanceDate[]
} {
  const seed = i + 1
  const budget = 480000 + seed * 55000
  const actual = Math.round(budget * (e.status === 'pre_production' ? 0.18 : e.status === 'in_rehearsal' ? 0.52 : 0.88))
  const weeklyGross = 165000 + seed * 12000
  const weeksPlayed = e.status === 'pre_production' ? 0 : e.status === 'in_rehearsal' ? 0 : e.status === 'in_performance' ? 3 : e.status === 'closing' ? 8 : 12
  const currentGross = weeklyGross * weeksPlayed
  const projectedGross = weeklyGross * 16
  const cashOnHand = 95000 + seed * 18000
  const mktgBudget = Math.round(budget * 0.12)
  const totalSeats = 900 + seed * 50

  const castLead = pick(CAST_LEADS, i)
  const castSupport = pick(CAST_SUPPORTING, i + 1)
  const director = pick(DIRECTORS, i)
  const stageManager = pick(STAGE_MANAGERS, i)
  const marketingAgency = pick(MARKETING_AGENCIES, i)
  const scenicVendor = pick(SCENIC_VENDORS, i)
  const lightingVendor = pick(LIGHTING_VENDORS, i)
  const soundVendor = pick(SOUND_VENDORS, i + 1)
  const rightsHolder = pick(RIGHTS_HOLDERS, i)
  const investorGroup = pick(INVESTOR_GROUPS, i)

  const production: Production = {
    id: prodId,
    name: e.name || 'Untitled Production',
    subtitle: e.subtitle || '',
    status: e.status,
    venue: e.venue || '',
    onSaleDate: '2026-06-08',
    openingDate: e.openingDate || '',
    closingDate: e.closingDate || '',
    totalBudget: budget,
    totalActual: actual,
    cashOnHand,
    projectedGross,
    currentGross,
    color: e.color || '#6366f1',
    ...(e.imageUrl && { imageUrl: e.imageUrl }),
  }

  const budgetLines: BudgetLine[] = [
    { id: `${prodId}-bl-1`, productionId: prodId, category: 'Pre-Production', lineItem: 'Development & Pre-Production', budgeted: Math.round(budget * 0.04), committed: Math.round(budget * 0.04), actual: Math.round(budget * 0.038), notes: '' },
    { id: `${prodId}-bl-2`, productionId: prodId, category: 'Physical Production', lineItem: 'Scenic Design & Construction', budgeted: Math.round(budget * 0.16), committed: Math.round(budget * 0.16), actual: Math.round(budget * 0.155), notes: `${scenicVendor}` },
    { id: `${prodId}-bl-3`, productionId: prodId, category: 'Physical Production', lineItem: 'Costume Design & Construction', budgeted: Math.round(budget * 0.09), committed: Math.round(budget * 0.09), actual: Math.round(budget * 0.085), notes: '' },
    { id: `${prodId}-bl-4`, productionId: prodId, category: 'Physical Production', lineItem: 'Lighting & Sound', budgeted: Math.round(budget * 0.07), committed: Math.round(budget * 0.07), actual: Math.round(budget * 0.068), notes: `${lightingVendor} / ${soundVendor}` },
    { id: `${prodId}-bl-5`, productionId: prodId, category: 'Running Costs', lineItem: 'Cast & Crew Payroll', budgeted: Math.round(budget * 0.22), committed: Math.round(budget * 0.22), actual: Math.round(budget * 0.21), notes: '' },
    { id: `${prodId}-bl-6`, productionId: prodId, category: 'Running Costs', lineItem: 'Venue Rental', budgeted: Math.round(budget * 0.18), committed: Math.round(budget * 0.18), actual: Math.round(budget * 0.178), notes: '' },
    { id: `${prodId}-bl-7`, productionId: prodId, category: 'Marketing', lineItem: 'Marketing & Advertising', budgeted: mktgBudget, committed: mktgBudget, actual: Math.round(mktgBudget * 0.92), notes: `${marketingAgency}` },
    { id: `${prodId}-bl-8`, productionId: prodId, category: 'General & Administrative', lineItem: 'General Management', budgeted: Math.round(budget * 0.06), committed: Math.round(budget * 0.06), actual: Math.round(budget * 0.058), notes: '' },
    { id: `${prodId}-bl-9`, productionId: prodId, category: 'General & Administrative', lineItem: 'Contingency Reserve', budgeted: Math.round(budget * 0.06), committed: 0, actual: Math.round(budget * 0.014), notes: '' },
    { id: `${prodId}-bl-10`, productionId: prodId, category: 'Running Costs', lineItem: 'Royalties', budgeted: Math.round(budget * 0.08), committed: Math.round(budget * 0.08), actual: Math.round(budget * 0.076), notes: '' },
    { id: `${prodId}-bl-11`, productionId: prodId, category: 'General & Administrative', lineItem: 'Legal & Insurance', budgeted: Math.round(budget * 0.03), committed: Math.round(budget * 0.03), actual: Math.round(budget * 0.028), notes: '' },
  ]

  // Full revenue curve: on-sale Jun 8 → closing date
  // Generates one row per week (Sunday week-endings) with realistic S-curve advance
  // sales leading to opening, then per-week performance grosses through closing.
  const DEMO_ON_SALE = '2026-06-08'
  const openingDateStr = e.openingDate || new Date().toISOString().split('T')[0]
  const closingDateStr = e.closingDate || addDays(openingDateStr, 84)
  const baseATP = 82 + seed * 3

  const onSaleD  = new Date(DEMO_ON_SALE + 'T12:00:00Z')
  const openingD = new Date(openingDateStr + 'T12:00:00Z')
  const closingD = new Date(closingDateStr + 'T12:00:00Z')

  // First Sunday on or after on-sale date
  const firstSun = new Date(onSaleD)
  if (firstSun.getUTCDay() !== 0) firstSun.setUTCDate(firstSun.getUTCDate() + (7 - firstSun.getUTCDay()))

  // Count pre-opening weeks to calibrate the S-curve
  const preOpeningWeeks = Math.max(1, Math.round((openingD.getTime() - firstSun.getTime()) / (7 * 86_400_000)))
  const totalPerfWeeks  = Math.max(1, Math.round((closingD.getTime() - openingD.getTime()) / (7 * 86_400_000)))

  const revenueWeeks: RevenueWeek[] = []
  const cur = new Date(firstSun)
  let idx = 0

  while (cur <= closingD) {
    const weekEndStr = cur.toISOString().split('T')[0]
    const isPerf = cur > openingD

    if (!isPerf) {
      // Advance / pre-opening week — S-curve from slow to fast
      const progress = idx / preOpeningWeeks // 0 → 1
      // Accelerating curve: near-zero at first, picks up in final 6 weeks
      const rawRate = Math.pow(progress, 1.8) * 0.18
      const sold  = Math.round(totalSeats * rawRate)
      const atp   = Math.round(baseATP * (0.88 + progress * 0.14))
      const gross = sold * atp
      revenueWeeks.push({
        id: `${prodId}-rw-pre-${idx}`,
        productionId: prodId,
        weekEnding: weekEndStr,
        performances: 0,
        ticketsSold: sold,
        grossRevenue: gross,
        avgTicketPrice: atp,
        capacityPct: Math.round(rawRate * 100),
        comps: 0,
        discounts: Math.round(gross * 0.04),
        netRevenue: Math.round(gross * 0.96),
        totalSeats,
      })
    } else {
      // Performance week
      const weeksIn  = Math.round((cur.getTime() - openingD.getTime()) / (7 * 86_400_000))
      const progress = weeksIn / totalPerfWeeks
      // Capacity arc: ramps up in first quarter, holds, slight fade at end
      let cap: number
      if      (progress < 0.15) cap = 0.72 + progress / 0.15 * 0.23      // 72→95% over first 15%
      else if (progress < 0.70) cap = 0.95 + Math.sin(progress * Math.PI) * 0.03
      else                      cap = 0.95 - (progress - 0.70) / 0.30 * 0.18
      cap = Math.min(0.99, Math.max(0.55, cap + (seed % 5) * 0.01))
      const sold  = Math.round(totalSeats * cap)
      const atp   = Math.round(baseATP * (1.00 + Math.sin(weeksIn * 0.4) * 0.05 + (seed % 3) * 0.01))
      const gross = sold * atp
      revenueWeeks.push({
        id: `${prodId}-rw-${idx}`,
        productionId: prodId,
        weekEnding: weekEndStr,
        performances: 8,
        ticketsSold: sold,
        grossRevenue: gross,
        avgTicketPrice: atp,
        capacityPct: Math.round(cap * 100),
        comps: Math.round(sold * 0.03),
        discounts: Math.round(gross * 0.06),
        netRevenue: Math.round(gross * 0.91),
        totalSeats,
      })
    }

    idx++
    cur.setUTCDate(cur.getUTCDate() + 7)
  }

  const contracts: Contract[] = [
    { id: `${prodId}-ct-1`, productionId: prodId, partyName: `${director} (Director)`, contractType: 'creative', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -80), fee: 28000 + seed * 2000, keyObligations: 'Direction of production, approval rights over design elements', notes: '', hasFile: true },
    { id: `${prodId}-ct-2`, productionId: prodId, partyName: e.venue || 'Venue Partner', contractType: 'venue', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -75), fee: Math.round(budget * 0.18), keyObligations: 'Exclusive venue use per agreed schedule', notes: '', hasFile: true },
    { id: `${prodId}-ct-3`, productionId: prodId, partyName: `${castLead} (Lead)`, contractType: 'cast', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -60), fee: 4200 * Math.max(weeksPlayed, 8), keyObligations: 'Lead role, 8 performances per week', notes: '', hasFile: true },
    { id: `${prodId}-ct-4`, productionId: prodId, partyName: `${castSupport} (Supporting Lead)`, contractType: 'cast', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -60), fee: 3100 * Math.max(weeksPlayed, 8), keyObligations: 'Supporting lead role', notes: '', hasFile: true },
    { id: `${prodId}-ct-5`, productionId: prodId, partyName: marketingAgency, contractType: 'vendor', status: weeksPlayed > 0 ? 'signed' : 'sent', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -45), fee: Math.round(budget * 0.05), keyObligations: 'Full campaign management and media buying', notes: '', hasFile: false },
    { id: `${prodId}-ct-6`, productionId: prodId, partyName: rightsHolder, contractType: 'rights', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -90), fee: Math.round(budget * 0.08), keyObligations: 'Royalty-bearing license for production run', notes: '', hasFile: true },
    { id: `${prodId}-ct-7`, productionId: prodId, partyName: `${stageManager} (Stage Manager)`, contractType: 'employment', status: weeksPlayed > 0 ? 'signed' : 'sent', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -55), fee: 3200 * Math.max(weeksPlayed, 8), keyObligations: 'Full run stage management', notes: '', hasFile: false },
    { id: `${prodId}-ct-8`, productionId: prodId, partyName: scenicVendor, contractType: 'vendor', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -70), fee: Math.round(budget * 0.16), keyObligations: 'Scenic construction and delivery by load-in', notes: '', hasFile: true },
    { id: `${prodId}-ct-9`, productionId: prodId, partyName: investorGroup, contractType: 'investor', status: 'signed', dueDate: addDays(e.openingDate || new Date().toISOString().split('T')[0], -120), fee: Math.round(budget * 0.45), keyObligations: 'Capitalization agreement, recoupment at 110%', notes: '', hasFile: true },
  ]

  // Cash flow: pre-opening expense weeks + performance weeks
  const preOpeningCfWeeks = e.status === 'pre_production' ? 2 : e.status === 'in_rehearsal' ? 4 : 0
  const preCfRows: CashFlowRow[] = Array.from({ length: preOpeningCfWeeks }, (_, w) => {
    const weeksOut = preOpeningCfWeeks - w
    const weekStart = addDays(e.openingDate || new Date().toISOString().split('T')[0], -(weeksOut * 7))
    const advRev = revenueWeeks.filter(r => r.performances === 0)[w]?.grossRevenue ?? 0
    const startCash = cashOnHand - (preOpeningCfWeeks - w) * 18000
    return {
      id: `${prodId}-cf-pre-${w}`,
      productionId: prodId,
      weekOf: weekStart,
      startingCash: Math.max(startCash, 20000),
      ticketRevenue: advRev,
      otherInflows: 0,
      payroll: Math.round(budget * 0.22 / 20),
      venueCosts: 0,
      marketing: Math.round(mktgBudget / 12),
      royalties: 0,
      vendorPayments: Math.round(budget * 0.05 / 10),
      otherOutflows: Math.round(budget * 0.01 / 10),
      closingCash: Math.max(startCash + advRev - Math.round(budget * 0.22 / 20) - Math.round(mktgBudget / 12) - Math.round(budget * 0.05 / 10), 15000),
    }
  })

  const perfCfRows: CashFlowRow[] = weeksPlayed > 0 ? Array.from({ length: Math.min(weeksPlayed, 4) }, (_, w) => {
    const rev = revenueWeeks.filter(r => r.performances > 0)[w]?.grossRevenue ?? weeklyGross
    const start = cashOnHand + (w === 0 ? 0 : rev * w * 0.3)
    return {
      id: `${prodId}-cf-${w}`,
      productionId: prodId,
      weekOf: addDays(e.openingDate || new Date().toISOString().split('T')[0], w * 7),
      startingCash: Math.round(start),
      ticketRevenue: rev,
      otherInflows: Math.round(rev * 0.04),
      payroll: Math.round(budget * 0.22 / 16),
      venueCosts: Math.round(budget * 0.18 / 16),
      marketing: Math.round(mktgBudget / 16),
      royalties: Math.round(rev * 0.06),
      vendorPayments: Math.round(budget * 0.05 / 16),
      otherOutflows: Math.round(rev * 0.02),
      closingCash: Math.round(start + rev * 0.3),
    }
  }) : []

  const cashFlowRows: CashFlowRow[] = [...preCfRows, ...perfCfRows]

  const base = e.openingDate || new Date().toISOString().split('T')[0]
  const deadlines: Deadline[] = [
    { id: `${prodId}-dl-1`, productionId: prodId, title: 'All Contracts Signed', date: addDays(base, -60), type: 'contract', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: 'All key production contracts executed', assignedTo: 'GM' },
    { id: `${prodId}-dl-2`, productionId: prodId, title: 'First Day of Rehearsal', date: addDays(base, -42), type: 'rehearsal', status: weeksPlayed > 0 || e.status === 'in_rehearsal' ? 'completed' : 'upcoming', notes: '', assignedTo: 'Stage Management' },
    { id: `${prodId}-dl-3`, productionId: prodId, title: 'Scenic Delivery & Load-In', date: addDays(base, -14), type: 'tech', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: `${scenicVendor} delivery`, assignedTo: 'Production' },
    { id: `${prodId}-dl-4`, productionId: prodId, title: 'Tech Rehearsal Begins', date: addDays(base, -12), type: 'tech', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: '', assignedTo: 'Stage Management' },
    { id: `${prodId}-dl-5`, productionId: prodId, title: 'First Preview Performance', date: addDays(base, -7), type: 'preview', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: '', assignedTo: 'Production' },
    { id: `${prodId}-dl-6`, productionId: prodId, title: 'Opening Night', date: base, type: 'opening', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: '', assignedTo: 'Production' },
    { id: `${prodId}-dl-7`, productionId: prodId, title: 'Press Night', date: addDays(base, 3), type: 'press', status: weeksPlayed >= 1 ? 'completed' : 'upcoming', notes: '', assignedTo: 'Marketing' },
    { id: `${prodId}-dl-8`, productionId: prodId, title: 'First Weekly Payroll', date: addDays(base, 7), type: 'payroll', status: weeksPlayed >= 2 ? 'completed' : 'upcoming', notes: 'Cast & crew payroll run', assignedTo: 'Finance' },
    { id: `${prodId}-dl-9`, productionId: prodId, title: 'Marketing Performance Review', date: addDays(base, 14), type: 'marketing', status: weeksPlayed >= 3 ? 'completed' : 'upcoming', notes: `Review with ${marketingAgency}`, assignedTo: 'Marketing' },
    { id: `${prodId}-dl-10`, productionId: prodId, title: 'Month-1 Royalty Settlement', date: addDays(base, 28), type: 'royalty', status: weeksPlayed >= 5 ? 'completed' : 'upcoming', notes: `Monthly royalty to ${rightsHolder}`, assignedTo: 'Finance' },
    { id: `${prodId}-dl-11`, productionId: prodId, title: 'Closing Night', date: e.closingDate || addDays(base, 120), type: 'closing', status: e.status === 'closed' ? 'completed' : 'upcoming', notes: '', assignedTo: 'Production' },
    { id: `${prodId}-dl-12`, productionId: prodId, title: 'Final Settlement', date: addDays(e.closingDate || addDays(base, 120), 14), type: 'settlement', status: e.status === 'closed' ? 'completed' : 'upcoming', notes: 'Final production cost settlement', assignedTo: 'Finance' },
  ]

  const marketingBudgetLines: MarketingBudgetLine[] = [
    { id: `${prodId}-mb-1`, productionId: prodId, channel: 'digital_social', lineItem: 'Social Media & Digital Ads', budgeted: Math.round(mktgBudget * 0.30), actual: Math.round(mktgBudget * 0.28), notes: '' },
    { id: `${prodId}-mb-2`, productionId: prodId, channel: 'print', lineItem: 'Print & Outdoor Advertising', budgeted: Math.round(mktgBudget * 0.20), actual: Math.round(mktgBudget * 0.19), notes: '' },
    { id: `${prodId}-mb-3`, productionId: prodId, channel: 'paid_search', lineItem: 'Google & Search Ads', budgeted: Math.round(mktgBudget * 0.15), actual: Math.round(mktgBudget * 0.14), notes: '' },
    { id: `${prodId}-mb-4`, productionId: prodId, channel: 'pr_press', lineItem: 'PR & Press Agency Fees', budgeted: Math.round(mktgBudget * 0.20), actual: Math.round(mktgBudget * 0.20), notes: '' },
    { id: `${prodId}-mb-5`, productionId: prodId, channel: 'email', lineItem: 'Email Campaigns', budgeted: Math.round(mktgBudget * 0.05), actual: Math.round(mktgBudget * 0.04), notes: '' },
    { id: `${prodId}-mb-6`, productionId: prodId, channel: 'agency_fees', lineItem: `${marketingAgency} Retainer`, budgeted: Math.round(mktgBudget * 0.10), actual: Math.round(mktgBudget * 0.10), notes: '' },
  ]

  const marketingCampaigns: MarketingCampaign[] = [
    { id: `${prodId}-mc-1`, productionId: prodId, title: 'On-Sale Announcement', channel: 'digital_social', startDate: addDays(base, -60), endDate: addDays(base, -53), status: 'completed', budget: Math.round(mktgBudget * 0.08), notes: 'Initial on-sale push across all channels' },
    { id: `${prodId}-mc-2`, productionId: prodId, title: 'Pre-Opening Subscriber Drive', channel: 'email', startDate: addDays(base, -30), endDate: addDays(base, -1), status: weeksPlayed > 0 ? 'completed' : 'active', budget: Math.round(mktgBudget * 0.06), notes: 'Email campaign to existing subscriber base' },
    { id: `${prodId}-mc-3`, productionId: prodId, title: 'Opening Week Launch', channel: 'digital_social', startDate: addDays(base, -14), endDate: addDays(base, 7), status: weeksPlayed >= 2 ? 'completed' : weeksPlayed >= 1 ? 'active' : 'planned', budget: Math.round(mktgBudget * 0.25), notes: 'Opening week promotional push' },
    { id: `${prodId}-mc-4`, productionId: prodId, title: 'Press Night Coverage', channel: 'pr_press', startDate: addDays(base, 1), endDate: addDays(base, 10), status: weeksPlayed >= 2 ? 'completed' : 'planned', budget: Math.round(mktgBudget * 0.12), notes: 'Press night coverage and critic outreach' },
    { id: `${prodId}-mc-5`, productionId: prodId, title: 'Season Run Search Campaign', channel: 'paid_search', startDate: addDays(base, 7), endDate: addDays(e.closingDate || addDays(base, 120), -14), status: weeksPlayed >= 3 ? 'active' : 'planned', budget: Math.round(mktgBudget * 0.15), notes: 'Ongoing paid search for ticket sales' },
  ]

  const documents: Document[] = [
    { id: `${prodId}-doc-1`, productionId: prodId, name: `${e.name || 'Production'} — Production Budget`, category: 'budgets', uploadedAt: addDays(base, -90), size: '48 KB', type: 'xlsx' },
    { id: `${prodId}-doc-2`, productionId: prodId, name: `${e.name || 'Production'} — Venue License Agreement`, category: 'contracts', uploadedAt: addDays(base, -80), size: '312 KB', type: 'pdf' },
    { id: `${prodId}-doc-3`, productionId: prodId, name: `${e.name || 'Production'} — Certificate of Insurance`, category: 'insurance', uploadedAt: addDays(base, -75), size: '156 KB', type: 'pdf' },
    { id: `${prodId}-doc-4`, productionId: prodId, name: `${e.name || 'Production'} — Marketing Plan`, category: 'marketing', uploadedAt: addDays(base, -60), size: '2.1 MB', type: 'pdf' },
    { id: `${prodId}-doc-5`, productionId: prodId, name: `${e.name || 'Production'} — Cast Contracts Summary`, category: 'contracts', uploadedAt: addDays(base, -55), size: '89 KB', type: 'pdf' },
    { id: `${prodId}-doc-6`, productionId: prodId, name: `${e.name || 'Production'} — Rights & Licensing Agreement`, category: 'legal', uploadedAt: addDays(base, -85), size: '420 KB', type: 'pdf' },
    { id: `${prodId}-doc-7`, productionId: prodId, name: `${e.name || 'Production'} — Weekly Report (Opening Week)`, category: 'reports', uploadedAt: addDays(base, 7), size: '195 KB', type: 'pdf' },
    { id: `${prodId}-doc-8`, productionId: prodId, name: `${e.name || 'Production'} — Monthly P&L Summary`, category: 'reports', uploadedAt: addDays(base, 35), size: '210 KB', type: 'pdf' },
  ]

  // Custom events for production calendar
  const customEvents: CustomEvent[] = e.status === 'pre_production' ? [
    { id: `${prodId}-ce-1`, productionId: prodId, title: 'Investor Presentation', date: addDays(base, -120), color: e.color || '#6366f1', category: 'Investor Relations', notes: 'Capitalization pitch to prospective investors' },
    { id: `${prodId}-ce-2`, productionId: prodId, title: 'Creative Team First Meeting', date: addDays(base, -90), color: e.color || '#6366f1', category: 'Creative', notes: `Director ${director} leads initial creative session` },
    { id: `${prodId}-ce-3`, productionId: prodId, title: 'Design Presentations', date: addDays(base, -70), color: e.color || '#6366f1', category: 'Creative', notes: 'Scenic, costume, and lighting designs presented' },
    { id: `${prodId}-ce-4`, productionId: prodId, title: 'Rights Agreement Signing', date: addDays(base, -85), color: '#7c3aed', category: 'Legal', notes: `Executed with ${rightsHolder}` },
    { id: `${prodId}-ce-5`, productionId: prodId, title: 'Marketing Strategy Kick-Off', date: addDays(base, -75), color: '#0891b2', category: 'Marketing', notes: `Campaign planning with ${marketingAgency}` },
  ] : e.status === 'in_rehearsal' ? [
    { id: `${prodId}-ce-1`, productionId: prodId, title: 'First Day of Rehearsal', date: addDays(base, -42), color: e.color || '#6366f1', category: 'Rehearsal', notes: `Company meet & greet, read-through` },
    { id: `${prodId}-ce-2`, productionId: prodId, title: 'Designer Run-Through', date: addDays(base, -21), color: e.color || '#6366f1', category: 'Rehearsal', notes: 'Creative team observes first full run' },
    { id: `${prodId}-ce-3`, productionId: prodId, title: 'Sitzprobe', date: addDays(base, -14), color: '#7c3aed', category: 'Music', notes: 'First rehearsal with full orchestra' },
    { id: `${prodId}-ce-4`, productionId: prodId, title: 'Invited Dress Rehearsal', date: addDays(base, -8), color: '#0891b2', category: 'Rehearsal', notes: 'Friends & family invited dress' },
    { id: `${prodId}-ce-5`, productionId: prodId, title: 'Production Photography', date: addDays(base, -5), color: '#0891b2', category: 'Marketing', notes: `Full company call — production photos for ${marketingAgency}` },
    { id: `${prodId}-ce-6`, productionId: prodId, title: 'Opening Night Celebration', date: base, color: '#d97706', category: 'Special Event', notes: 'Cast party and investor reception' },
  ] : [
    { id: `${prodId}-ce-1`, productionId: prodId, title: 'Opening Night Celebration', date: base, color: '#d97706', category: 'Special Event', notes: 'Cast party, investor reception' },
    { id: `${prodId}-ce-2`, productionId: prodId, title: 'Production Photography', date: addDays(base, 2), color: '#0891b2', category: 'Marketing', notes: 'Full company press photos' },
    { id: `${prodId}-ce-3`, productionId: prodId, title: 'Investor Night', date: addDays(base, 21), color: e.color || '#6366f1', category: 'Investor Relations', notes: `Post-show reception with ${investorGroup}` },
    { id: `${prodId}-ce-4`, productionId: prodId, title: 'Group Sales Evening', date: addDays(base, 28), color: '#059669', category: 'Sales', notes: 'Group buyers networking event' },
    { id: `${prodId}-ce-5`, productionId: prodId, title: 'Cast Recording Session', date: addDays(base, 35), color: '#7c3aed', category: 'Recording', notes: 'Cast album recording — 2 days' },
    { id: `${prodId}-ce-6`, productionId: prodId, title: 'Donor Cultivation Evening', date: addDays(base, 42), color: '#e11d48', category: 'Development', notes: 'Major donor post-show reception' },
  ]

  const perfClosing = e.closingDate || addDays(base, 84)
  const performanceDates = generatePerformanceDates(prodId, base, perfClosing)

  return { production, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, marketingBudgetLines, marketingCampaigns, documents, customEvents, performanceDates }
}

export function stripBaseProductions(data: ScenarioData): ScenarioData {
  return {
    ...data,
    productions: [],
    budgetLines: [],
    revenueWeeks: [],
    contracts: [],
    cashFlowRows: [],
    deadlines: [],
    documents: [],
    marketingBudgetLines: [],
    marketingCampaigns: [],
    customEvents: [],
    performanceDates: [],
  }
}

export function applyExtraProductions(
  data: ScenarioData,
  extras?: DemoExtraProduction[],
): ScenarioData {
  if (!extras || extras.length === 0) return data
  const result = { ...data }
  extras.forEach((e, i) => {
    const prodId = `demo-extra-${i}`
    const { production, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, marketingBudgetLines, marketingCampaigns, documents, customEvents, performanceDates } = boilerplate(prodId, e, i)
    result.productions = [...result.productions, production]
    result.budgetLines = [...result.budgetLines, ...budgetLines]
    result.revenueWeeks = [...result.revenueWeeks, ...revenueWeeks]
    result.contracts = [...result.contracts, ...contracts]
    result.cashFlowRows = [...result.cashFlowRows, ...cashFlowRows]
    result.deadlines = [...result.deadlines, ...deadlines]
    result.marketingBudgetLines = [...result.marketingBudgetLines, ...marketingBudgetLines]
    result.marketingCampaigns = [...result.marketingCampaigns, ...marketingCampaigns]
    result.documents = [...result.documents, ...documents]
    result.customEvents = [...result.customEvents, ...customEvents]
    result.performanceDates = [...result.performanceDates, ...performanceDates]
  })
  return result
}

export function applyProductionOverrides(
  data: ScenarioData,
  overrides?: DemoProductionOverride[],
): ScenarioData {
  if (!overrides || overrides.length === 0) return data
  return {
    ...data,
    productions: data.productions.map((p) => {
      const ov = overrides.find((o) => o.id === p.id)
      if (!ov) return p
      return {
        ...p,
        ...(ov.name !== undefined && { name: ov.name }),
        ...(ov.venue !== undefined && { venue: ov.venue }),
        ...(ov.subtitle !== undefined && { subtitle: ov.subtitle }),
        ...(ov.openingDate !== undefined && { openingDate: ov.openingDate }),
        ...(ov.closingDate !== undefined && { closingDate: ov.closingDate }),
        ...(ov.imageUrl !== undefined && { imageUrl: ov.imageUrl }),
      }
    }),
  }
}
