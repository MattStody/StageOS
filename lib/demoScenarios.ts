import type { DemoScenario, DemoProductionOverride } from './demo'
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
      }
    }),
  }
}
