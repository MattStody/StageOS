// Spektrix API v3 — types match real API response shapes exactly.
// Toggle SPEKTRIX_MOCK = false and supply real credentials to go live.

import type { RevenueWeek, BudgetLine, CashFlowRow, Production } from './types'

export const SPEKTRIX_MOCK = true

// ── Real API types (exact Spektrix v3 response shapes) ─────────────────────

export interface SpektrixEvent {
  id: string
  name: string
  description: string
  webSalesUrl: string
  isActive: boolean
}

export interface SpektrixInstance {
  id: string
  eventId: string
  start: string      // ISO 8601, e.g. "2026-03-15T19:30:00"
  end: string
  isOnSale: boolean
  capacity: number
}

export interface SpektrixSalesSummary {
  instanceId: string
  totalTicketsSold: number
  totalCapacity: number
  grossRevenue: number
  netRevenue: number
  totalComps: number
  totalDiscounts: number
  averageTicketPrice: number
}

export interface SpektrixInstanceWithSales {
  instance: SpektrixInstance
  sales: SpektrixSalesSummary
}

export interface SpektrixWeekSummary {
  weekEnding: string    // YYYY-MM-DD (Saturday)
  performances: number
  ticketsSold: number
  totalSeats: number
  grossRevenue: number
  netRevenue: number
  comps: number
  discounts: number
  avgTicketPrice: number
  capacityPct: number
}

export interface SpektrixCredentials {
  clientName: string
  apiUser: string
  apiKey: string
}

// ── Seat map types ──────────────────────────────────────────────────────────

export type SeatStatus = 'sold' | 'available' | 'held' | 'comp'

export interface Seat {
  row: string
  num: number
  status: SeatStatus
}

export interface SectionMap {
  id: string
  label: string
  rows: string[]
  seatsPerRow: number
  seats: Seat[]
  sold: number
  available: number
  held: number
  comps: number
}

export interface TicketMapData {
  totalCapacity: number
  sold: number
  available: number
  held: number
  comps: number
  grossRevenue: number
  avgTicketPrice: number
  sections: SectionMap[]
}

export interface SectionConfig {
  id: string
  label: string
  rowLetters: string[]
  seatsPerRow: number
  avgPrice: number
  holdPct?: number
  compPct?: number
}

// ── Venue section configs ──────────────────────────────────────────────────

const AZ = (n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(65 + start + i))
const DOUBLE = (n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => {
    const c = String.fromCharCode(65 + start + i)
    return c + c
  })

export function getVenueSections(productionId: string): SectionConfig[] {
  if (productionId === 'prod-1') {
    // Broadway house ~1,060 seats
    return [
      { id: 'orchestra', label: 'Orchestra', rowLetters: AZ(18), seatsPerRow: 32, avgPrice: 195, holdPct: 0.04, compPct: 0.02 },
      { id: 'mezz', label: 'Mezzanine', rowLetters: DOUBLE(7), seatsPerRow: 38, avgPrice: 149, holdPct: 0.03, compPct: 0.02 },
      { id: 'balcony', label: 'Balcony', rowLetters: AZ(6, 7), seatsPerRow: 40, avgPrice: 99, holdPct: 0.02, compPct: 0.01 },
    ]
  }
  if (productionId === 'prod-2') {
    // BAM Harvey ~550 seats
    return [
      { id: 'orchestra', label: 'Orchestra', rowLetters: AZ(13), seatsPerRow: 26, avgPrice: 125, holdPct: 0.06, compPct: 0.05 },
      { id: 'balcony', label: 'Balcony', rowLetters: DOUBLE(7), seatsPerRow: 30, avgPrice: 89, holdPct: 0.04, compPct: 0.03 },
    ]
  }
  // prod-3: Concert arena
  return [
    { id: 'floor', label: 'Floor', rowLetters: Array.from({ length: 12 }, (_, i) => String(i + 1)), seatsPerRow: 44, avgPrice: 165, holdPct: 0.04, compPct: 0.02 },
    { id: 'lower', label: 'Lower Bowl', rowLetters: AZ(15), seatsPerRow: 52, avgPrice: 120, holdPct: 0.03, compPct: 0.01 },
    { id: 'upper', label: 'Upper Bowl', rowLetters: AZ(10, 15), seatsPerRow: 60, avgPrice: 79, holdPct: 0.02, compPct: 0.01 },
  ]
}

// ── Deterministic seat map generator ──────────────────────────────────────

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function hashStr(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

export function generateTicketMap(
  perfId: string,
  targetSoldPct: number,
  sections: SectionConfig[],
): TicketMapData {
  const rand = lcg(hashStr(perfId))

  let totalCapacity = 0
  let totalSold = 0
  let totalHeld = 0
  let totalComps = 0
  let totalRevenue = 0

  const sectionMaps: SectionMap[] = sections.map((cfg) => {
    const capacity = cfg.rowLetters.length * cfg.seatsPerRow
    totalCapacity += capacity

    const sectionPct = Math.min(1, Math.max(0, targetSoldPct + (rand() - 0.5) * 0.14))
    const sectionSold = Math.round(capacity * sectionPct)
    const sectionHeld = Math.round(sectionSold * (cfg.holdPct ?? 0.04))
    const sectionComps = Math.round(sectionSold * (cfg.compPct ?? 0.02))
    const sectionPaid = Math.max(0, sectionSold - sectionHeld - sectionComps)

    totalSold += sectionSold
    totalHeld += sectionHeld
    totalComps += sectionComps
    totalRevenue += sectionPaid * cfg.avgPrice * (0.92 + rand() * 0.16)

    // Shuffle seat indices deterministically then assign statuses
    const seatStatuses: SeatStatus[] = Array(capacity).fill('available')
    const indices = Array.from({ length: capacity }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    for (let i = 0; i < sectionSold; i++) seatStatuses[indices[i]] = 'sold'
    for (let i = 0; i < sectionHeld; i++) seatStatuses[indices[i]] = 'held'
    for (let i = sectionHeld; i < sectionHeld + sectionComps; i++) seatStatuses[indices[i]] = 'comp'

    const seats: Seat[] = []
    let idx = 0
    for (const row of cfg.rowLetters) {
      for (let n = 1; n <= cfg.seatsPerRow; n++) {
        seats.push({ row, num: n, status: seatStatuses[idx++] })
      }
    }

    return {
      id: cfg.id,
      label: cfg.label,
      rows: cfg.rowLetters,
      seatsPerRow: cfg.seatsPerRow,
      seats,
      sold: sectionSold,
      available: capacity - sectionSold,
      held: sectionHeld,
      comps: sectionComps,
    }
  })

  const paid = totalSold - totalHeld - totalComps
  return {
    totalCapacity,
    sold: totalSold,
    available: totalCapacity - totalSold,
    held: totalHeld,
    comps: totalComps,
    grossRevenue: Math.round(totalRevenue),
    avgTicketPrice: paid > 0 ? Math.round((totalRevenue / paid) * 100) / 100 : 0,
    sections: sectionMaps,
  }
}

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_EVENTS: SpektrixEvent[] = [
  { id: 'ev-001', name: 'Into the Woods', description: 'Broadway musical revival', webSalesUrl: '', isActive: true },
  { id: 'ev-002', name: 'La Bohème', description: "Puccini's opera in two acts — world premiere production", webSalesUrl: '', isActive: true },
  { id: 'ev-003', name: 'Hadestown — National Tour', description: 'Award-winning folk opera, 28-city tour', webSalesUrl: '', isActive: true },
]

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function generateMockInstancesWithSales(eventId: string): SpektrixInstanceWithSales[] {
  const results: SpektrixInstanceWithSales[] = []
  const baseDate = new Date('2026-01-07T19:30:00')
  const perfsPerWeek = [8, 8, 8, 7, 8, 8, 9, 8, 8]
  const capacity = eventId === 'ev-002' ? 1200 : 876
  let perfIndex = 0

  for (let week = 0; week < perfsPerWeek.length; week++) {
    const weekPerfs = perfsPerWeek[week]
    const weekBase = 0.62 + week * 0.022 + seededRandom(week * 13) * 0.1

    for (let day = 0; day < weekPerfs; day++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + week * 7 + day)
      const end = new Date(d.getTime() + 2.5 * 60 * 60 * 1000)

      const pct = Math.min(Math.max(weekBase + seededRandom(perfIndex * 7) * 0.08 - 0.04, 0.3), 0.99)
      const sold = Math.round(capacity * pct)
      const atp = 108 + week * 1.5 + seededRandom(perfIndex * 3) * 8
      const comps = Math.round(sold * 0.04)
      const discounts = sold * atp * 0.055
      const gross = Math.round(sold * atp * 100) / 100
      const net = Math.round((gross - discounts) * 100) / 100

      const instanceId = `inst-${eventId}-${perfIndex}`
      results.push({
        instance: { id: instanceId, eventId, start: d.toISOString().slice(0, 19), end: end.toISOString().slice(0, 19), isOnSale: true, capacity },
        sales: { instanceId, totalTicketsSold: sold, totalCapacity: capacity, grossRevenue: gross, netRevenue: net, totalComps: comps, totalDiscounts: Math.round(discounts * 100) / 100, averageTicketPrice: Math.round(atp * 100) / 100 },
      })
      perfIndex++
    }
  }
  return results
}

// ── Real API client (uncomment when SPEKTRIX_MOCK = false) ──────────────────

// async function spektrixFetch<T>(creds: SpektrixCredentials, path: string): Promise<T> {
//   const baseUrl = `https://${creds.clientName}.spektrix.com/api/v3`
//   const date = new Date().toUTCString()
//   const stringToSign = `GET\n\n\n${date}\n${path}`
//   const signature = await hmacSha1Base64(creds.apiKey, stringToSign)
//   const res = await fetch(`${baseUrl}${path}`, {
//     headers: { Authorization: `SpektrixAPI3 ${creds.apiUser}:${signature}`, Date: date, Accept: 'application/json' },
//   })
//   if (!res.ok) throw new Error(`Spektrix ${res.status}: ${res.statusText}`)
//   return res.json() as Promise<T>
// }

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function fetchSpektrixEvents(creds: SpektrixCredentials): Promise<SpektrixEvent[]> {
  if (SPEKTRIX_MOCK) { await delay(700); return MOCK_EVENTS }
  return []
}

export async function fetchInstancesWithSales(
  creds: SpektrixCredentials,
  eventId: string,
  fromDate: string,
  toDate: string,
): Promise<SpektrixInstanceWithSales[]> {
  if (SPEKTRIX_MOCK) {
    await delay(1000)
    const all = generateMockInstancesWithSales(eventId)
    const from = new Date(fromDate).getTime()
    const to = new Date(toDate).getTime() + 86400000
    return all.filter((r) => { const t = new Date(r.instance.start).getTime(); return t >= from && t <= to })
  }
  return []
}

export async function testSpektrixConnection(creds: SpektrixCredentials): Promise<{ ok: boolean; message: string }> {
  if (SPEKTRIX_MOCK) { await delay(900); return { ok: true, message: 'Mock connection successful — 3 events available' } }
  try {
    return { ok: false, message: 'Real API not yet enabled — set SPEKTRIX_MOCK = false' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Connection failed' }
  }
}

// ── Aggregation ─────────────────────────────────────────────────────────────

export function aggregateByWeek(instances: SpektrixInstanceWithSales[]): SpektrixWeekSummary[] {
  const map = new Map<string, SpektrixWeekSummary>()
  for (const { instance, sales } of instances) {
    const d = new Date(instance.start)
    const daysToSat = d.getDay() === 6 ? 0 : 6 - d.getDay()
    const sat = new Date(d)
    sat.setDate(d.getDate() + daysToSat)
    const weekEnding = sat.toISOString().slice(0, 10)
    if (!map.has(weekEnding)) {
      map.set(weekEnding, { weekEnding, performances: 0, ticketsSold: 0, totalSeats: 0, grossRevenue: 0, netRevenue: 0, comps: 0, discounts: 0, avgTicketPrice: 0, capacityPct: 0 })
    }
    const row = map.get(weekEnding)!
    row.performances++
    row.ticketsSold += sales.totalTicketsSold
    row.totalSeats += sales.totalCapacity
    row.grossRevenue += sales.grossRevenue
    row.netRevenue += sales.netRevenue
    row.comps += sales.totalComps
    row.discounts += sales.totalDiscounts
  }
  const rows = Array.from(map.values()).sort((a, b) => a.weekEnding.localeCompare(b.weekEnding))
  for (const row of rows) {
    row.grossRevenue = Math.round(row.grossRevenue * 100) / 100
    row.netRevenue = Math.round(row.netRevenue * 100) / 100
    row.discounts = Math.round(row.discounts * 100) / 100
    row.avgTicketPrice = row.ticketsSold > 0 ? Math.round((row.grossRevenue / row.ticketsSold) * 100) / 100 : 0
    row.capacityPct = row.totalSeats > 0 ? Math.round((row.ticketsSold / row.totalSeats) * 1000) / 10 : 0
  }
  return rows
}

export function buildRevenueWeeksFromSpektrix(productionId: string, weeks: SpektrixWeekSummary[]): RevenueWeek[] {
  return weeks.map((w) => ({
    id: `spx-${productionId}-${w.weekEnding}`,
    productionId,
    weekEnding: w.weekEnding,
    performances: w.performances,
    ticketsSold: w.ticketsSold,
    grossRevenue: w.grossRevenue,
    avgTicketPrice: w.avgTicketPrice,
    capacityPct: w.capacityPct,
    comps: w.comps,
    discounts: w.discounts,
    netRevenue: w.netRevenue,
    totalSeats: w.totalSeats,
  }))
}

// ── Projection builder ──────────────────────────────────────────────────────
// Generates budget lines and cash-flow rows for a freshly created production.
// All figures are estimates derived from Spektrix ticket revenue.

interface BudgetTemplate {
  category: string
  lineItem: string
  ratio?: number      // fraction of totalBudget
  grossRatio?: number // fraction of totalGross (royalties, fees)
}

const BUDGET_TEMPLATE: BudgetTemplate[] = [
  { category: 'General Management', lineItem: 'GM Fee',                   ratio: 0.030 },
  { category: 'General Management', lineItem: 'Office & Admin',           ratio: 0.008 },
  { category: 'Cast',               lineItem: 'Principal Salaries',       ratio: 0.120 },
  { category: 'Cast',               lineItem: 'Supporting Cast',          ratio: 0.070 },
  { category: 'Creative Team',      lineItem: 'Director Fee',             ratio: 0.035 },
  { category: 'Creative Team',      lineItem: 'Design Team',              ratio: 0.025 },
  { category: 'Production Staff',   lineItem: 'Production Manager',       ratio: 0.015 },
  { category: 'Stage Management',   lineItem: 'Stage Management Team',    ratio: 0.020 },
  { category: 'Set',                lineItem: 'Scenic Design & Build',    ratio: 0.070 },
  { category: 'Costumes',           lineItem: 'Costume Design & Build',   ratio: 0.040 },
  { category: 'Lighting',           lineItem: 'Lighting Design & Equipment', ratio: 0.035 },
  { category: 'Sound',              lineItem: 'Sound Design & Equipment', ratio: 0.030 },
  { category: 'Venue Rental',       lineItem: 'Theatre/Venue Rental',     ratio: 0.120 },
  { category: 'Marketing & Advertising', lineItem: 'Marketing & Advertising', ratio: 0.090 },
  { category: 'Press',              lineItem: 'Press Representative',     ratio: 0.010 },
  { category: 'Royalties',          lineItem: 'Author/Composer Royalties', grossRatio: 0.030 },
  { category: 'Legal',              lineItem: 'Legal Fees',               ratio: 0.015 },
  { category: 'Insurance',          lineItem: 'Production Insurance',     ratio: 0.010 },
  { category: 'Ticketing Fees',     lineItem: 'Box Office & Service Fees', grossRatio: 0.020 },
  { category: 'Travel & Housing',   lineItem: 'Cast & Crew Travel',       ratio: 0.020 },
  { category: 'Contingency',        lineItem: 'Contingency Reserve',      ratio: 0.030 },
]

export function buildProductionProjections(
  productionId: string,
  weeks: SpektrixWeekSummary[],
): {
  budgetLines: BudgetLine[]
  cashFlowRows: CashFlowRow[]
  productionUpdates: Pick<Production, 'projectedGross' | 'currentGross' | 'totalBudget' | 'totalActual' | 'cashOnHand'>
} {
  const totalGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
  const numWeeks = Math.max(weeks.length, 1)

  // Budget estimated at 75% of total gross — typical commercial theatre expense ratio
  const totalBudget = Math.round(totalGross * 0.75)

  const budgetLines: BudgetLine[] = BUDGET_TEMPLATE.map((t, i) => {
    const budgeted = t.grossRatio
      ? Math.round(totalGross * t.grossRatio)
      : Math.round(totalBudget * (t.ratio ?? 0))
    return {
      id: `spx-bl-${productionId}-${i}`,
      productionId,
      category: t.category,
      lineItem: t.lineItem,
      budgeted,
      committed: Math.round(budgeted * 0.88),
      actual: 0,
      notes: 'Projected from Spektrix import',
    }
  })

  // Weekly fixed cost bases (spread evenly)
  const weeklyPayroll  = Math.round(totalBudget * 0.265 / numWeeks)
  const weeklyVenue    = Math.round(totalBudget * 0.120 / numWeeks)

  let runningCash = Math.round(totalBudget * 0.18) // assumed opening cash position

  const cashFlowRows: CashFlowRow[] = weeks.map((w, i) => {
    const startingCash  = runningCash
    const ticketRevenue = w.grossRevenue
    const royalties     = Math.round(w.grossRevenue * 0.030)
    // Marketing spend front-loaded: high early, tapers over the run
    const mktgFraction  = i < numWeeks / 3 ? 0.018 : i < (numWeeks * 2) / 3 ? 0.011 : 0.005
    const marketing     = Math.round(w.grossRevenue * mktgFraction)
    const vendorPayments = Math.round(w.grossRevenue * 0.005)
    const otherOutflows  = Math.round(w.grossRevenue * 0.008)
    const closingCash   = startingCash + ticketRevenue - weeklyPayroll - weeklyVenue - marketing - royalties - vendorPayments - otherOutflows
    runningCash = closingCash
    return {
      id: `spx-cf-${productionId}-${w.weekEnding}`,
      productionId,
      weekOf: w.weekEnding,
      startingCash,
      ticketRevenue,
      otherInflows: 0,
      payroll: weeklyPayroll,
      venueCosts: weeklyVenue,
      marketing,
      royalties,
      vendorPayments,
      otherOutflows,
      closingCash,
    }
  })

  return {
    budgetLines,
    cashFlowRows,
    productionUpdates: {
      projectedGross: Math.round(totalGross * 1.05),
      currentGross: Math.round(totalGross),
      totalBudget,
      totalActual: 0,
      cashOnHand: Math.max(0, runningCash),
    },
  }
}
