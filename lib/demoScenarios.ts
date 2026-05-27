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

function addDays(base: string, days: number): string {
  const d = new Date(base || new Date().toISOString().split('T')[0])
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
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
    { id: `${prodId}-bl-7`, productionId: prodId, category: 'Marketing', lineItem: 'Marketing & Advertising', budgeted: mktgBudget, committed: mktgBudget, actual: Math.round(mktgBudget * 0.92), notes: '' },
    { id: `${prodId}-bl-8`, productionId: prodId, category: 'General & Administrative', lineItem: 'General Management', budgeted: Math.round(budget * 0.06), committed: Math.round(budget * 0.06), actual: Math.round(budget * 0.058), notes: '' },
    { id: `${prodId}-bl-9`, productionId: prodId, category: 'General & Administrative', lineItem: 'Contingency Reserve', budgeted: Math.round(budget * 0.06), committed: 0, actual: Math.round(budget * 0.014), notes: '' },
    { id: `${prodId}-bl-10`, productionId: prodId, category: 'Running Costs', lineItem: 'Royalties', budgeted: Math.round(budget * 0.08), committed: Math.round(budget * 0.08), actual: Math.round(budget * 0.076), notes: '' },
    { id: `${prodId}-bl-11`, productionId: prodId, category: 'General & Administrative', lineItem: 'Legal & Insurance', budgeted: Math.round(budget * 0.03), committed: Math.round(budget * 0.03), actual: Math.round(budget * 0.028), notes: '' },
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
      weekEnding: addDays(e.openingDate, (w + 1) * 7),
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
    { id: `${prodId}-ct-1`, productionId: prodId, partyName: 'Creative Director', contractType: 'creative', status: 'signed', dueDate: addDays(e.openingDate, -80), fee: 28000 + seed * 2000, keyObligations: 'Direction of production', notes: '', hasFile: true },
    { id: `${prodId}-ct-2`, productionId: prodId, partyName: e.venue || 'Venue Partner', contractType: 'venue', status: 'signed', dueDate: addDays(e.openingDate, -75), fee: Math.round(budget * 0.18), keyObligations: 'Exclusive venue use per agreed schedule', notes: '', hasFile: true },
    { id: `${prodId}-ct-3`, productionId: prodId, partyName: 'Lead Cast Member', contractType: 'cast', status: 'signed', dueDate: addDays(e.openingDate, -60), fee: 4200 * Math.max(weeksPlayed, 8), keyObligations: 'Lead role, 8 performances per week', notes: '', hasFile: false },
    { id: `${prodId}-ct-4`, productionId: prodId, partyName: 'Marketing Agency', contractType: 'vendor', status: weeksPlayed > 0 ? 'signed' : 'sent', dueDate: addDays(e.openingDate, -45), fee: Math.round(budget * 0.05), keyObligations: 'Full campaign management', notes: '', hasFile: false },
    { id: `${prodId}-ct-5`, productionId: prodId, partyName: 'Rights Holder', contractType: 'rights', status: 'signed', dueDate: addDays(e.openingDate, -90), fee: Math.round(budget * 0.08), keyObligations: 'Royalty-bearing license for production run', notes: '', hasFile: true },
    { id: `${prodId}-ct-6`, productionId: prodId, partyName: 'Stage Manager', contractType: 'employment', status: weeksPlayed > 0 ? 'signed' : 'sent', dueDate: addDays(e.openingDate, -55), fee: 3200 * Math.max(weeksPlayed, 8), keyObligations: 'Full run stage management', notes: '', hasFile: false },
  ]

  const cashFlowRows: CashFlowRow[] = weeksPlayed > 0 ? Array.from({ length: Math.min(weeksPlayed, 4) }, (_, w) => {
    const rev = revenueWeeks[w]?.grossRevenue ?? weeklyGross
    const start = cashOnHand + (w === 0 ? 0 : rev * w * 0.3)
    return {
      id: `${prodId}-cf-${w}`,
      productionId: prodId,
      weekOf: addDays(e.openingDate, w * 7),
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

  const deadlines: Deadline[] = [
    { id: `${prodId}-dl-1`, productionId: prodId, title: 'All Contracts Signed', date: addDays(e.openingDate, -60), type: 'contract', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: 'All key production contracts executed', assignedTo: '' },
    { id: `${prodId}-dl-2`, productionId: prodId, title: 'First Day of Rehearsal', date: addDays(e.openingDate, -42), type: 'rehearsal', status: weeksPlayed > 0 || e.status === 'in_rehearsal' ? 'completed' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-3`, productionId: prodId, title: 'Tech Rehearsal Begins', date: addDays(e.openingDate, -14), type: 'tech', status: weeksPlayed > 0 ? 'completed' : e.status === 'in_rehearsal' ? 'upcoming' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-4`, productionId: prodId, title: 'First Preview Performance', date: addDays(e.openingDate, -7), type: 'preview', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-5`, productionId: prodId, title: 'Opening Night', date: e.openingDate || addDays(new Date().toISOString().split('T')[0], 30), type: 'opening', status: weeksPlayed > 0 ? 'completed' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-6`, productionId: prodId, title: 'Press Night', date: addDays(e.openingDate, 3), type: 'press', status: weeksPlayed >= 1 ? 'completed' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-7`, productionId: prodId, title: 'First Weekly Payroll', date: addDays(e.openingDate, 7), type: 'payroll', status: weeksPlayed >= 2 ? 'completed' : 'upcoming', notes: 'Cast & crew payroll run', assignedTo: '' },
    { id: `${prodId}-dl-8`, productionId: prodId, title: 'Marketing Performance Report', date: addDays(e.openingDate, 14), type: 'marketing', status: weeksPlayed >= 3 ? 'completed' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-9`, productionId: prodId, title: 'Month-1 Royalty Settlement', date: addDays(e.openingDate, 28), type: 'royalty', status: weeksPlayed >= 5 ? 'completed' : 'upcoming', notes: 'Monthly royalty payment to rights holders', assignedTo: '' },
    { id: `${prodId}-dl-10`, productionId: prodId, title: 'Closing Night', date: e.closingDate || addDays(e.openingDate, 120), type: 'closing', status: e.status === 'closed' ? 'completed' : 'upcoming', notes: '', assignedTo: '' },
    { id: `${prodId}-dl-11`, productionId: prodId, title: 'Final Settlement', date: addDays(e.closingDate || addDays(e.openingDate, 120), 14), type: 'settlement', status: e.status === 'closed' ? 'completed' : 'upcoming', notes: 'Final production cost settlement', assignedTo: '' },
  ]

  const marketingBudgetLines: MarketingBudgetLine[] = [
    { id: `${prodId}-mb-1`, productionId: prodId, channel: 'digital_social', lineItem: 'Social Media & Digital Ads', budgeted: Math.round(mktgBudget * 0.30), actual: Math.round(mktgBudget * 0.28), notes: '' },
    { id: `${prodId}-mb-2`, productionId: prodId, channel: 'print', lineItem: 'Print & Outdoor Advertising', budgeted: Math.round(mktgBudget * 0.20), actual: Math.round(mktgBudget * 0.19), notes: '' },
    { id: `${prodId}-mb-3`, productionId: prodId, channel: 'paid_search', lineItem: 'Google & Search Ads', budgeted: Math.round(mktgBudget * 0.15), actual: Math.round(mktgBudget * 0.14), notes: '' },
    { id: `${prodId}-mb-4`, productionId: prodId, channel: 'pr_press', lineItem: 'PR & Press Agency Fees', budgeted: Math.round(mktgBudget * 0.20), actual: Math.round(mktgBudget * 0.20), notes: '' },
    { id: `${prodId}-mb-5`, productionId: prodId, channel: 'email', lineItem: 'Email Campaigns', budgeted: Math.round(mktgBudget * 0.05), actual: Math.round(mktgBudget * 0.04), notes: '' },
    { id: `${prodId}-mb-6`, productionId: prodId, channel: 'agency_fees', lineItem: 'Marketing Agency Retainer', budgeted: Math.round(mktgBudget * 0.10), actual: Math.round(mktgBudget * 0.10), notes: '' },
  ]

  const marketingCampaigns: MarketingCampaign[] = [
    { id: `${prodId}-mc-1`, productionId: prodId, title: 'Opening Week Launch', channel: 'digital_social', startDate: addDays(e.openingDate, -14), endDate: addDays(e.openingDate, 7), status: weeksPlayed >= 2 ? 'completed' : weeksPlayed >= 1 ? 'active' : 'planned', budget: Math.round(mktgBudget * 0.25), notes: 'Opening week promotional push across social channels' },
    { id: `${prodId}-mc-2`, productionId: prodId, title: 'Press Night Media Push', channel: 'pr_press', startDate: addDays(e.openingDate, 1), endDate: addDays(e.openingDate, 10), status: weeksPlayed >= 2 ? 'completed' : 'planned', budget: Math.round(mktgBudget * 0.12), notes: 'Press night coverage and critic outreach' },
    { id: `${prodId}-mc-3`, productionId: prodId, title: 'Pre-Opening Subscriber Drive', channel: 'email', startDate: addDays(e.openingDate, -30), endDate: addDays(e.openingDate, -1), status: weeksPlayed > 0 ? 'completed' : 'active', budget: Math.round(mktgBudget * 0.06), notes: 'Email campaign to existing subscriber base' },
    { id: `${prodId}-mc-4`, productionId: prodId, title: 'Season Run Search Campaign', channel: 'paid_search', startDate: addDays(e.openingDate, 7), endDate: addDays(e.closingDate || addDays(e.openingDate, 120), -14), status: weeksPlayed >= 3 ? 'active' : 'planned', budget: Math.round(mktgBudget * 0.15), notes: 'Ongoing paid search for ticket sales' },
  ]

  const documents: Document[] = [
    { id: `${prodId}-doc-1`, productionId: prodId, name: `${e.name || 'Production'} — Production Budget`, category: 'budgets', uploadedAt: addDays(e.openingDate, -90), size: '48 KB', type: 'xlsx' },
    { id: `${prodId}-doc-2`, productionId: prodId, name: `${e.name || 'Production'} — Venue Contract`, category: 'contracts', uploadedAt: addDays(e.openingDate, -80), size: '312 KB', type: 'pdf' },
    { id: `${prodId}-doc-3`, productionId: prodId, name: `${e.name || 'Production'} — Certificate of Insurance`, category: 'insurance', uploadedAt: addDays(e.openingDate, -75), size: '156 KB', type: 'pdf' },
    { id: `${prodId}-doc-4`, productionId: prodId, name: `${e.name || 'Production'} — Marketing Plan`, category: 'marketing', uploadedAt: addDays(e.openingDate, -60), size: '2.1 MB', type: 'pdf' },
    { id: `${prodId}-doc-5`, productionId: prodId, name: `${e.name || 'Production'} — Cast Contracts Summary`, category: 'contracts', uploadedAt: addDays(e.openingDate, -45), size: '89 KB', type: 'pdf' },
    { id: `${prodId}-doc-6`, productionId: prodId, name: `${e.name || 'Production'} — Rights & Licensing Agreement`, category: 'legal', uploadedAt: addDays(e.openingDate, -85), size: '420 KB', type: 'pdf' },
  ]

  return { production, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, marketingBudgetLines, marketingCampaigns, documents }
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
    const { production, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, marketingBudgetLines, marketingCampaigns, documents } = boilerplate(prodId, e, i)
    result.productions = [...result.productions, production]
    result.budgetLines = [...result.budgetLines, ...budgetLines]
    result.revenueWeeks = [...result.revenueWeeks, ...revenueWeeks]
    result.contracts = [...result.contracts, ...contracts]
    result.cashFlowRows = [...result.cashFlowRows, ...cashFlowRows]
    result.deadlines = [...result.deadlines, ...deadlines]
    result.marketingBudgetLines = [...result.marketingBudgetLines, ...marketingBudgetLines]
    result.marketingCampaigns = [...result.marketingCampaigns, ...marketingCampaigns]
    result.documents = [...result.documents, ...documents]
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
