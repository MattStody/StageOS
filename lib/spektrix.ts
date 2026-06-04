// Spektrix API v3 — types match real API response shapes exactly.
// Toggle SPEKTRIX_MOCK = false and supply real credentials to go live.

import type { RevenueWeek } from './types'

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
        instance: {
          id: instanceId,
          eventId,
          start: d.toISOString().slice(0, 19),
          end: end.toISOString().slice(0, 19),
          isOnSale: true,
          capacity,
        },
        sales: {
          instanceId,
          totalTicketsSold: sold,
          totalCapacity: capacity,
          grossRevenue: gross,
          netRevenue: net,
          totalComps: comps,
          totalDiscounts: Math.round(discounts * 100) / 100,
          averageTicketPrice: Math.round(atp * 100) / 100,
        },
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
//     headers: {
//       Authorization: `SpektrixAPI3 ${creds.apiUser}:${signature}`,
//       Date: date,
//       Accept: 'application/json',
//     },
//   })
//   if (!res.ok) throw new Error(`Spektrix ${res.status}: ${res.statusText}`)
//   return res.json() as Promise<T>
// }

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function fetchSpektrixEvents(creds: SpektrixCredentials): Promise<SpektrixEvent[]> {
  if (SPEKTRIX_MOCK) {
    await delay(700)
    return MOCK_EVENTS
  }
  // return spektrixFetch<SpektrixEvent[]>(creds, '/events')
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
    return all.filter((r) => {
      const t = new Date(r.instance.start).getTime()
      return t >= from && t <= to
    })
  }
  // Real implementation:
  // const instances = await spektrixFetch<SpektrixInstance[]>(creds, `/events/${eventId}/instances`)
  // const filtered = instances.filter((inst) => {
  //   const t = new Date(inst.start).getTime()
  //   return t >= new Date(fromDate).getTime() && t <= new Date(toDate).getTime() + 86400000
  // })
  // const summaries = await Promise.all(
  //   filtered.map((inst) => spektrixFetch<SpektrixSalesSummary>(creds, `/instances/${inst.id}/salesSummary`))
  // )
  // return filtered.map((inst, i) => ({ instance: inst, sales: summaries[i] }))
  return []
}

export async function testSpektrixConnection(creds: SpektrixCredentials): Promise<{ ok: boolean; message: string }> {
  if (SPEKTRIX_MOCK) {
    await delay(900)
    return { ok: true, message: 'Mock connection successful — 3 events available' }
  }
  try {
    // const events = await spektrixFetch<SpektrixEvent[]>(creds, '/events')
    // return { ok: true, message: `Connected — ${events.length} events found` }
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
    const dayOfWeek = d.getDay()          // 0=Sun … 6=Sat
    const daysToSat = dayOfWeek === 6 ? 0 : 6 - dayOfWeek
    const sat = new Date(d)
    sat.setDate(d.getDate() + daysToSat)
    const weekEnding = sat.toISOString().slice(0, 10)

    if (!map.has(weekEnding)) {
      map.set(weekEnding, {
        weekEnding,
        performances: 0,
        ticketsSold: 0,
        totalSeats: 0,
        grossRevenue: 0,
        netRevenue: 0,
        comps: 0,
        discounts: 0,
        avgTicketPrice: 0,
        capacityPct: 0,
      })
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

// Builds RevenueWeek rows with deterministic IDs — re-syncing the same event
// to the same production updates existing rows rather than creating duplicates.
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
