'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, Document, MarketingBudgetLine, MarketingCampaign } from './types'
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
} from './mockData'

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
    }),
    { name: 'stageops-store' }
  )
)
