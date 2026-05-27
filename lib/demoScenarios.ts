import type { DemoScenario, DemoProductionOverride, DemoExtraProduction } from './demo'
import type {
  Production, BudgetLine, RevenueWeek, Contract,
  CashFlowRow, Deadline, Document, MarketingBudgetLine, MarketingCampaign, CustomEvent,
} from './types'
import {
  PRODUCTIONS, BUDGET_LINES, REVENUE_WEEKS, CONTRACTS,
  CASH_FLOW_ROWS, DEADLINES, DOCUMENTS, MARKETING_BUDGET_LINES, MARKETING_CAMPAIGNS, CUSTOM_EVENTS,
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
  }
}

function boilerplate(prodId: string, e: DemoExtraProduction, i: number): {
  production: Production
  budgetLines: BudgetLine[]
  revenueWeeks: RevenueWeek[]
  contracts: Contract[]
  cashFlowRows: CashFlowRow[]
} {
  const seed = i + 1
  const budget = 480000 + seed * 55000
  const actual = Math.round(budget * (e.status === 'pre_production' ? 0.18 : e.status === 'in_rehearsal' ? 0.52 : 0.88))
  const weeklyGross = 165000 + seed * 12000
  const weeksPlayed = e.status === 'pre_production' ? 0 : e.status === 'in_rehearsal' ? 0 : e.status === 'in_performance' ? 3 : e.status === 'closing' ? 8 : 12
  const currentGross = weeklyGross * weeksPlayed
  const projectedGross = weeklyGross * 16
  const cashOnHand = 95000 + seed * 18000

  const production: Production = {
    id: prodId,
    name: e.name || 'Untitled Production',
    subtitle: e.subtitle || '',
    status: e.status,
    venue: e.venue || '',
    openingDate: e.openingDate || '',
    closingDate: e.closingDate || '',
    totalBudget: budget,
    totalActual: actual,
    cashOnHand,
    projectedGross,
    currentGross,
    color: e.color || '#6366f1',
  }

  const budgetLines: BudgetLine[] = [
    { id: `${prodId}-bl-1`, productionId: prodId, category: 'Pre-Production', lineItem: 'Development & Pre-Production', budgeted: Math.round(budget * 0.04), committed: Math.round(budget * 0.04), actual: Math.round(budget * 0.038), notes: '' },
    { id: `${prodId}-bl-2`, productionId: prodId, category: 'Physical Production', lineItem: 'Scenic Design & Construction', budgeted: Math.round(budget * 0.16), committed: Math.round(budget * 0.16), actual: Math.round(budget * 0.155), notes: '' },
    { id: `${prodId}-bl-3`, productionId: prodId, category: 'Physical Production', lineItem: 'Costume Design & Construction', budgeted: Math.round(budget * 0.09), committed: Math.round(budget * 0.09), actual: Math.round(budget * 0.085), notes: '' },
    { id: `${prodId}-bl-4`, productionId: prodId, category: 'Physical Production', lineItem: 'Lighting & Sound', budgeted: Math.round(budget * 0.07), committed: Math.round(budget * 0.07), actual: Math.round(budget * 0.068), notes: '' },
    { id: `${prodId}-bl-5`, productionId: prodId, category: 'Running Costs', lineItem: 'Cast & Crew Payroll', budgeted: Math.round(budget * 0.22), committed: Math.round(budget * 0.22), actual: Math.round(budget * 0.21), notes: '' },
    { id: `${prodId}-bl-6`, productionId: prodId, category: 'Running Costs', lineItem: 'Venue Rental', budgeted: Math.round(budget * 0.18), committed: Math.round(budget * 0.18), actual: Math.round(budget * 0.178), notes: '' },
    { id: `${prodId}-bl-7`, productionId: prodId, category: 'Marketing', lineItem: 'Marketing & Advertising', budgeted: Math.round(budget * 0.12), committed: Math.round(budget * 0.12), actual: Math.round(budget * 0.11), notes: '' },
    { id: `${prodId}-bl-8`, productionId: prodId, category: 'General & Administrative', lineItem: 'General Management', budgeted: Math.round(budget * 0.06), committed: Math.round(budget * 0.06), actual: Math.round(budget * 0.058), notes: '' },
    { id: `${prodId}-bl-9`, productionId: prodId, category: 'General & Administrative', lineItem: 'Contingency Reserve', budgeted: Math.round(budget * 0.06), committed: 0, actual: Math.round(budget * 0.014), notes: '' },
  ]

  const revenueWeeks: RevenueWeek[] = weeksPlayed > 0 ? Array.from({ length: Math.min(weeksPlayed, 4) }, (_, w) => {
    const capacity = 0.78 + w * 0.04 + seed * 0.01
    const totalSeats = 900 + seed * 50
    const sold = Math.round(totalSeats * Math.min(capacity, 0.98))
    const avg = 78 + seed * 4 + w * 2
    const gross = sold * avg
    return {
      id: `${prodId}-rw-${w}`,
      productionId: prodId,
      weekEnding: '',
      performances: 8,
      ticketsSold: sold,
      grossRevenue: gross,
      avgTicketPrice: avg,
      capacityPct: Math.round((sold / totalSeats) * 100),
      comps: Math.round(sold * 0.03),
      discounts: Math.round(gross * 0.06),
      netRevenue: Math.round(gross * 0.91),
      totalSeats,
    }
  }) : []

  const contracts: Contract[] = [
    { id: `${prodId}-ct-1`, productionId: prodId, partyName: 'Creative Director', contractType: 'creative', status: 'signed', dueDate: '', fee: 28000 + seed * 2000, keyObligations: 'Direction of production', notes: '', hasFile: true },
    { id: `${prodId}-ct-2`, productionId: prodId, partyName: e.venue || 'Venue Partner', contractType: 'venue', status: 'signed', dueDate: '', fee: Math.round(budget * 0.18), keyObligations: 'Exclusive venue use per agreed schedule', notes: '', hasFile: true },
    { id: `${prodId}-ct-3`, productionId: prodId, partyName: 'Lead Cast Member', contractType: 'cast', status: 'signed', dueDate: '', fee: 4200 * Math.max(weeksPlayed, 8), keyObligations: 'Lead role, 8 performances per week', notes: '', hasFile: false },
    { id: `${prodId}-ct-4`, productionId: prodId, partyName: 'Marketing Agency', contractType: 'vendor', status: weeksPlayed > 0 ? 'signed' : 'sent', dueDate: '', fee: Math.round(budget * 0.05), keyObligations: 'Full campaign management', notes: '', hasFile: false },
  ]

  const cashFlowRows: CashFlowRow[] = weeksPlayed > 0 ? Array.from({ length: Math.min(weeksPlayed, 4) }, (_, w) => {
    const rev = revenueWeeks[w]?.grossRevenue ?? weeklyGross
    const start = cashOnHand + (w === 0 ? 0 : rev * w * 0.3)
    return {
      id: `${prodId}-cf-${w}`,
      productionId: prodId,
      weekOf: '',
      startingCash: Math.round(start),
      ticketRevenue: rev,
      otherInflows: Math.round(rev * 0.04),
      payroll: Math.round(budget * 0.22 / 16),
      venueCosts: Math.round(budget * 0.18 / 16),
      marketing: Math.round(budget * 0.12 / 16),
      royalties: Math.round(rev * 0.06),
      vendorPayments: Math.round(budget * 0.05 / 16),
      otherOutflows: Math.round(rev * 0.02),
      closingCash: Math.round(start + rev * 0.3),
    }
  }) : []

  return { production, budgetLines, revenueWeeks, contracts, cashFlowRows }
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
    const { production, budgetLines, revenueWeeks, contracts, cashFlowRows } = boilerplate(prodId, e, i)
    result.productions = [...result.productions, production]
    result.budgetLines = [...result.budgetLines, ...budgetLines]
    result.revenueWeeks = [...result.revenueWeeks, ...revenueWeeks]
    result.contracts = [...result.contracts, ...contracts]
    result.cashFlowRows = [...result.cashFlowRows, ...cashFlowRows]
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
      }
    }),
  }
}
