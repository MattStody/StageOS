'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, Document, MarketingBudgetLine, MarketingCampaign, CustomEvent, ContractObligation, PerformanceDate, Grant } from './types'
import {
  PRODUCTIONS,
  BUDGET_LINES,
  REVENUE_WEEKS,
  CONTRACTS,
  CASH_FLOW_ROWS,
  DEADLINES,
  DOCUMENTS,
  MARKETING_BUDGET_LINES,
  MARKETING_CAMPAIGNS,
  CUSTOM_EVENTS,
  OBLIGATIONS,
  PERFORMANCE_DATES,
  GRANTS,
} from './mockData'
import type { ScenarioData } from './demoScenarios'

interface StageOpsState {
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

  addBudgetLine: (line: BudgetLine) => void
  updateBudgetLine: (line: BudgetLine) => void
  deleteBudgetLine: (id: string) => void

  addRevenueWeek: (week: RevenueWeek) => void
  updateRevenueWeek: (week: RevenueWeek) => void
  deleteRevenueWeek: (id: string) => void

  addContract: (contract: Contract) => void
  updateContract: (contract: Contract) => void
  deleteContract: (id: string) => void

  addCashFlowRow: (row: CashFlowRow) => void
  updateCashFlowRow: (row: CashFlowRow) => void
  deleteCashFlowRow: (id: string) => void

  addDeadline: (deadline: Deadline) => void
  updateDeadline: (deadline: Deadline) => void
  deleteDeadline: (id: string) => void

  addProduction: (production: Production) => void
  updateProduction: (production: Production) => void

  addMarketingBudgetLine: (line: MarketingBudgetLine) => void
  updateMarketingBudgetLine: (line: MarketingBudgetLine) => void
  deleteMarketingBudgetLine: (id: string) => void

  addMarketingCampaign: (campaign: MarketingCampaign) => void
  updateMarketingCampaign: (campaign: MarketingCampaign) => void
  deleteMarketingCampaign: (id: string) => void

  addCustomEvent: (event: CustomEvent) => void
  updateCustomEvent: (event: CustomEvent) => void
  deleteCustomEvent: (id: string) => void

  obligations: ContractObligation[]
  addObligation: (obl: ContractObligation) => void
  updateObligation: (obl: ContractObligation) => void
  deleteObligation: (id: string) => void

  performanceDates: PerformanceDate[]
  addPerformanceDate: (perf: PerformanceDate) => void
  updatePerformanceDate: (perf: PerformanceDate) => void
  deletePerformanceDate: (id: string) => void

  grants: Grant[]
  addGrant: (grant: Grant) => void
  updateGrant: (grant: Grant) => void
  deleteGrant: (id: string) => void

  spektrixBaseUrl: string
  setSpektrixBaseUrl: (url: string) => void

  loadScenario: (data: ScenarioData) => void
  resetToDefaults: () => void
}

export const useStore = create<StageOpsState>()(
  persist(
    (set) => ({
      productions: PRODUCTIONS,
      budgetLines: BUDGET_LINES,
      revenueWeeks: REVENUE_WEEKS,
      contracts: CONTRACTS,
      cashFlowRows: CASH_FLOW_ROWS,
      deadlines: DEADLINES,
      documents: DOCUMENTS,
      marketingBudgetLines: MARKETING_BUDGET_LINES,
      marketingCampaigns: MARKETING_CAMPAIGNS,
      customEvents: CUSTOM_EVENTS,
      obligations: OBLIGATIONS,
      performanceDates: PERFORMANCE_DATES,
      grants: GRANTS,
      spektrixBaseUrl: '',

      addBudgetLine: (line) => set((s) => ({ budgetLines: [...s.budgetLines, line] })),
      updateBudgetLine: (line) => set((s) => ({ budgetLines: s.budgetLines.map((l) => (l.id === line.id ? line : l)) })),
      deleteBudgetLine: (id) => set((s) => ({ budgetLines: s.budgetLines.filter((l) => l.id !== id) })),

      addRevenueWeek: (week) => set((s) => ({ revenueWeeks: [...s.revenueWeeks, week] })),
      updateRevenueWeek: (week) => set((s) => ({ revenueWeeks: s.revenueWeeks.map((w) => (w.id === week.id ? week : w)) })),
      deleteRevenueWeek: (id) => set((s) => ({ revenueWeeks: s.revenueWeeks.filter((w) => w.id !== id) })),

      addContract: (contract) => set((s) => ({ contracts: [...s.contracts, contract] })),
      updateContract: (contract) => set((s) => ({ contracts: s.contracts.map((c) => (c.id === contract.id ? contract : c)) })),
      deleteContract: (id) => set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) })),

      addCashFlowRow: (row) => set((s) => ({ cashFlowRows: [...s.cashFlowRows, row] })),
      updateCashFlowRow: (row) => set((s) => ({ cashFlowRows: s.cashFlowRows.map((r) => (r.id === row.id ? row : r)) })),
      deleteCashFlowRow: (id) => set((s) => ({ cashFlowRows: s.cashFlowRows.filter((r) => r.id !== id) })),

      addDeadline: (deadline) => set((s) => ({ deadlines: [...s.deadlines, deadline] })),
      updateDeadline: (deadline) => set((s) => ({ deadlines: s.deadlines.map((d) => (d.id === deadline.id ? deadline : d)) })),
      deleteDeadline: (id) => set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) })),

      addProduction: (production) => set((s) => ({ productions: [...s.productions, production] })),
      updateProduction: (production) => set((s) => ({ productions: s.productions.map((p) => (p.id === production.id ? production : p)) })),

      addMarketingBudgetLine: (line) => set((s) => ({ marketingBudgetLines: [...s.marketingBudgetLines, line] })),
      updateMarketingBudgetLine: (line) => set((s) => ({ marketingBudgetLines: s.marketingBudgetLines.map((l) => (l.id === line.id ? line : l)) })),
      deleteMarketingBudgetLine: (id) => set((s) => ({ marketingBudgetLines: s.marketingBudgetLines.filter((l) => l.id !== id) })),

      addMarketingCampaign: (campaign) => set((s) => ({ marketingCampaigns: [...s.marketingCampaigns, campaign] })),
      updateMarketingCampaign: (campaign) => set((s) => ({ marketingCampaigns: s.marketingCampaigns.map((c) => (c.id === campaign.id ? campaign : c)) })),
      deleteMarketingCampaign: (id) => set((s) => ({ marketingCampaigns: s.marketingCampaigns.filter((c) => c.id !== id) })),

      addCustomEvent: (event) => set((s) => ({ customEvents: [...s.customEvents, event] })),
      updateCustomEvent: (event) => set((s) => ({ customEvents: s.customEvents.map((e) => (e.id === event.id ? event : e)) })),
      deleteCustomEvent: (id) => set((s) => ({ customEvents: s.customEvents.filter((e) => e.id !== id) })),

      addObligation: (obl) => set((s) => ({ obligations: [...s.obligations, obl] })),
      updateObligation: (obl) => set((s) => ({ obligations: s.obligations.map((o) => (o.id === obl.id ? obl : o)) })),
      deleteObligation: (id) => set((s) => ({ obligations: s.obligations.filter((o) => o.id !== id) })),

      addPerformanceDate: (perf) => set((s) => ({ performanceDates: [...s.performanceDates, perf] })),
      updatePerformanceDate: (perf) => set((s) => ({ performanceDates: s.performanceDates.map((p) => (p.id === perf.id ? perf : p)) })),
      deletePerformanceDate: (id) => set((s) => ({ performanceDates: s.performanceDates.filter((p) => p.id !== id) })),

      addGrant: (grant) => set((s) => ({ grants: [...s.grants, grant] })),
      updateGrant: (grant) => set((s) => ({ grants: s.grants.map((g) => (g.id === grant.id ? grant : g)) })),
      deleteGrant: (id) => set((s) => ({ grants: s.grants.filter((g) => g.id !== id) })),

      setSpektrixBaseUrl: (url) => set(() => ({ spektrixBaseUrl: url })),

      loadScenario: (data) => set(() => ({
        productions: data.productions,
        budgetLines: data.budgetLines,
        revenueWeeks: data.revenueWeeks,
        contracts: data.contracts,
        cashFlowRows: data.cashFlowRows,
        deadlines: data.deadlines,
        documents: data.documents,
        marketingBudgetLines: data.marketingBudgetLines,
        marketingCampaigns: data.marketingCampaigns,
        customEvents: data.customEvents,
        obligations: OBLIGATIONS,
        performanceDates: PERFORMANCE_DATES,
        grants: GRANTS,
      })),

      resetToDefaults: () => set(() => ({
        productions: PRODUCTIONS,
        budgetLines: BUDGET_LINES,
        revenueWeeks: REVENUE_WEEKS,
        contracts: CONTRACTS,
        cashFlowRows: CASH_FLOW_ROWS,
        deadlines: DEADLINES,
        documents: DOCUMENTS,
        marketingBudgetLines: MARKETING_BUDGET_LINES,
        marketingCampaigns: MARKETING_CAMPAIGNS,
        customEvents: CUSTOM_EVENTS,
        obligations: OBLIGATIONS,
        performanceDates: PERFORMANCE_DATES,
        grants: GRANTS,
      })),
    }),
    { name: 'stageops-store' }
  )
)
