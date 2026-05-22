'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, Document } from './types'
import {
  PRODUCTIONS,
  BUDGET_LINES,
  REVENUE_WEEKS,
  CONTRACTS,
  CASH_FLOW_ROWS,
  DEADLINES,
  DOCUMENTS,
} from './mockData'

interface StageOpsState {
  productions: Production[]
  budgetLines: BudgetLine[]
  revenueWeeks: RevenueWeek[]
  contracts: Contract[]
  cashFlowRows: CashFlowRow[]
  deadlines: Deadline[]
  documents: Document[]

  // Mutations
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
    }),
    { name: 'stageops-store' }
  )
)
