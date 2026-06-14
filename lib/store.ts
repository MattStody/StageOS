'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, Document, MarketingBudgetLine, MarketingCampaign, CustomEvent, ContractObligation, PerformanceDate, Grant, ProductionTask, ActorProfile, ActorEngagement, WorkflowTemplate, WorkflowRun, Person, HousingAssignment, TravelLeg, PerDiemEntry, CAEAWeeklyReport, OnboardingChecklist } from './types'
import { BUILTIN_WORKFLOWS } from './workflowTemplates'
import {
  PEOPLE,
  HOUSING_ASSIGNMENTS,
  TRAVEL_LEGS,
  PER_DIEM_ENTRIES,
  CAEA_WEEKLY_REPORTS,
  ONBOARDING_CHECKLISTS,
} from './companyData'
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
  TASKS,
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

  tasks: ProductionTask[]
  addTask: (task: ProductionTask) => void
  updateTask: (task: ProductionTask) => void
  deleteTask: (id: string) => void

  actorProfiles: ActorProfile[]
  addActorProfile: (profile: ActorProfile) => void
  updateActorProfile: (profile: ActorProfile) => void

  actorEngagements: ActorEngagement[]
  addActorEngagement: (engagement: ActorEngagement) => void

  workflowTemplates: WorkflowTemplate[]
  addWorkflowTemplate: (template: WorkflowTemplate) => void
  deleteWorkflowTemplate: (id: string) => void

  workflowRuns: WorkflowRun[]
  addWorkflowRun: (run: WorkflowRun) => void

  // ── Company Management ──
  people: Person[]
  addPerson: (person: Person) => void
  updatePerson: (person: Person) => void
  deletePerson: (id: string) => void

  housingAssignments: HousingAssignment[]
  addHousingAssignment: (h: HousingAssignment) => void
  updateHousingAssignment: (h: HousingAssignment) => void
  deleteHousingAssignment: (id: string) => void

  travelLegs: TravelLeg[]
  addTravelLeg: (t: TravelLeg) => void
  updateTravelLeg: (t: TravelLeg) => void
  deleteTravelLeg: (id: string) => void

  perDiemEntries: PerDiemEntry[]
  addPerDiemEntry: (p: PerDiemEntry) => void
  updatePerDiemEntry: (p: PerDiemEntry) => void
  deletePerDiemEntry: (id: string) => void

  caeaReports: CAEAWeeklyReport[]
  addCAEAReport: (r: CAEAWeeklyReport) => void
  updateCAEAReport: (r: CAEAWeeklyReport) => void
  deleteCAEAReport: (id: string) => void

  onboardingChecklists: OnboardingChecklist[]
  addOnboardingChecklist: (c: OnboardingChecklist) => void
  updateOnboardingChecklist: (c: OnboardingChecklist) => void
  deleteOnboardingChecklist: (id: string) => void

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
      tasks: TASKS,
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

      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      updateTask: (task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      actorProfiles: [],
      addActorProfile: (profile) => set((s) => ({
        actorProfiles: s.actorProfiles.some((p) => p.id === profile.id)
          ? s.actorProfiles.map((p) => (p.id === profile.id ? profile : p))
          : [...s.actorProfiles, profile],
      })),
      updateActorProfile: (profile) => set((s) => ({
        actorProfiles: s.actorProfiles.map((p) => (p.id === profile.id ? profile : p)),
      })),

      actorEngagements: [],
      addActorEngagement: (engagement) => set((s) => ({ actorEngagements: [...s.actorEngagements, engagement] })),

      workflowTemplates: BUILTIN_WORKFLOWS,
      addWorkflowTemplate: (template) => set((s) => ({ workflowTemplates: [...s.workflowTemplates, template] })),
      deleteWorkflowTemplate: (id) => set((s) => ({ workflowTemplates: s.workflowTemplates.filter((t) => t.id !== id) })),

      workflowRuns: [],
      addWorkflowRun: (run) => set((s) => ({ workflowRuns: [...s.workflowRuns, run] })),

      // ── Company Management ──
      people: PEOPLE,
      addPerson: (person) => set((s) => ({ people: [...s.people, person] })),
      updatePerson: (person) => set((s) => ({ people: s.people.map((p) => (p.id === person.id ? person : p)) })),
      deletePerson: (id) => set((s) => ({ people: s.people.filter((p) => p.id !== id) })),

      housingAssignments: HOUSING_ASSIGNMENTS,
      addHousingAssignment: (h) => set((s) => ({ housingAssignments: [...s.housingAssignments, h] })),
      updateHousingAssignment: (h) => set((s) => ({ housingAssignments: s.housingAssignments.map((x) => (x.id === h.id ? h : x)) })),
      deleteHousingAssignment: (id) => set((s) => ({ housingAssignments: s.housingAssignments.filter((x) => x.id !== id) })),

      travelLegs: TRAVEL_LEGS,
      addTravelLeg: (t) => set((s) => ({ travelLegs: [...s.travelLegs, t] })),
      updateTravelLeg: (t) => set((s) => ({ travelLegs: s.travelLegs.map((x) => (x.id === t.id ? t : x)) })),
      deleteTravelLeg: (id) => set((s) => ({ travelLegs: s.travelLegs.filter((x) => x.id !== id) })),

      perDiemEntries: PER_DIEM_ENTRIES,
      addPerDiemEntry: (p) => set((s) => ({ perDiemEntries: [...s.perDiemEntries, p] })),
      updatePerDiemEntry: (p) => set((s) => ({ perDiemEntries: s.perDiemEntries.map((x) => (x.id === p.id ? p : x)) })),
      deletePerDiemEntry: (id) => set((s) => ({ perDiemEntries: s.perDiemEntries.filter((x) => x.id !== id) })),

      caeaReports: CAEA_WEEKLY_REPORTS,
      addCAEAReport: (r) => set((s) => ({ caeaReports: [...s.caeaReports, r] })),
      updateCAEAReport: (r) => set((s) => ({ caeaReports: s.caeaReports.map((x) => (x.id === r.id ? r : x)) })),
      deleteCAEAReport: (id) => set((s) => ({ caeaReports: s.caeaReports.filter((x) => x.id !== id) })),

      onboardingChecklists: ONBOARDING_CHECKLISTS,
      addOnboardingChecklist: (c) => set((s) => ({ onboardingChecklists: [...s.onboardingChecklists, c] })),
      updateOnboardingChecklist: (c) => set((s) => ({ onboardingChecklists: s.onboardingChecklists.map((x) => (x.id === c.id ? c : x)) })),
      deleteOnboardingChecklist: (id) => set((s) => ({ onboardingChecklists: s.onboardingChecklists.filter((x) => x.id !== id) })),

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
        performanceDates: data.performanceDates ?? PERFORMANCE_DATES,
        grants: GRANTS,
        tasks: TASKS,
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
        tasks: TASKS,
        people: PEOPLE,
        housingAssignments: HOUSING_ASSIGNMENTS,
        travelLegs: TRAVEL_LEGS,
        perDiemEntries: PER_DIEM_ENTRIES,
        caeaReports: CAEA_WEEKLY_REPORTS,
        onboardingChecklists: ONBOARDING_CHECKLISTS,
      })),
    }),
    {
      name: 'stageops-store',
      version: 2,
      // Ensure returning users pick up the new Company Management seed data
      // even if their persisted state predates these arrays.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StageOpsState>
        return {
          ...current,
          ...p,
          people: p.people ?? current.people,
          housingAssignments: p.housingAssignments ?? current.housingAssignments,
          travelLegs: p.travelLegs ?? current.travelLegs,
          perDiemEntries: p.perDiemEntries ?? current.perDiemEntries,
          caeaReports: p.caeaReports ?? current.caeaReports,
          onboardingChecklists: p.onboardingChecklists ?? current.onboardingChecklists,
        }
      },
    }
  )
)
