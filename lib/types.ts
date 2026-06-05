export type ProductionStatus = 'pre_production' | 'in_rehearsal' | 'in_performance' | 'closing' | 'closed'
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'expired' | 'needs_review'
export type ContractType = 'cast' | 'creative' | 'vendor' | 'venue' | 'rights' | 'investor' | 'employment'
export type DeadlineType = 'contract' | 'rehearsal' | 'tech' | 'preview' | 'opening' | 'press' | 'payroll' | 'royalty' | 'marketing' | 'settlement' | 'closing' | 'general'
export type DeadlineStatus = 'upcoming' | 'completed' | 'overdue' | 'at_risk'

export interface Production {
  id: string
  name: string
  subtitle: string
  status: ProductionStatus
  venue: string
  openingDate: string
  closingDate: string
  totalBudget: number
  totalActual: number
  cashOnHand: number
  projectedGross: number
  currentGross: number
  color: string
  imageUrl?: string
}

export interface BudgetLine {
  id: string
  productionId: string
  category: string
  lineItem: string
  budgeted: number
  committed: number
  actual: number
  notes: string
}

export interface RevenueWeek {
  id: string
  productionId: string
  weekEnding: string
  performances: number
  ticketsSold: number
  grossRevenue: number
  avgTicketPrice: number
  capacityPct: number
  comps: number
  discounts: number
  netRevenue: number
  totalSeats: number
}

export interface Contract {
  id: string
  productionId: string
  partyName: string
  contractType: ContractType
  status: ContractStatus
  dueDate: string
  fee: number
  keyObligations: string
  notes: string
  hasFile: boolean
}

export interface CashFlowRow {
  id: string
  productionId: string
  weekOf: string
  startingCash: number
  ticketRevenue: number
  otherInflows: number
  payroll: number
  venueCosts: number
  marketing: number
  royalties: number
  vendorPayments: number
  otherOutflows: number
  closingCash: number
}

export interface Deadline {
  id: string
  productionId: string
  title: string
  date: string
  type: DeadlineType
  status: DeadlineStatus
  notes: string
  assignedTo: string
}

export type MarketingChannel =
  | 'digital_social'
  | 'paid_search'
  | 'print'
  | 'radio'
  | 'ooh'
  | 'tv'
  | 'email'
  | 'pr_press'
  | 'agency_fees'
  | 'photography_video'
  | 'other'

export type CampaignStatus = 'planned' | 'active' | 'completed' | 'paused'

export interface MarketingBudgetLine {
  id: string
  productionId: string
  channel: MarketingChannel
  lineItem: string
  budgeted: number
  actual: number
  notes: string
}

export interface MarketingCampaign {
  id: string
  productionId: string
  title: string
  channel: MarketingChannel
  startDate: string
  endDate: string
  status: CampaignStatus
  budget: number
  notes: string
}

export interface CustomEvent {
  id: string
  productionId: string
  title: string
  date: string
  color: string
  category: string
  notes: string
}

export interface Document {
  id: string
  productionId: string
  name: string
  category: 'contracts' | 'budgets' | 'reports' | 'marketing' | 'legal' | 'insurance' | 'production'
  uploadedAt: string
  size: string
  type: string
}

// ── Performance Schedule ────────────────────────────────────────────────────

export type PerformanceStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed'

export interface PerformanceDate {
  id: string
  productionId: string
  date: string
  time: string
  notes: string
  status: PerformanceStatus
}

// ── Contract Obligations ────────────────────────────────────────────────────

export type ObligationType =
  | 'signature_required' | 'payment_due' | 'royalty_payment' | 'royalty_statement'
  | 'report_due' | 'insurance_required' | 'approval_required' | 'deliverable_due'
  | 'renewal_deadline' | 'option_deadline' | 'expiry_date' | 'termination_notice'
  | 'reimbursement_due' | 'tax_form_required' | 'rights_restriction'
  | 'publicity_credit' | 'confidentiality' | 'compliance' | 'other'

export type ObligationStatus =
  | 'not_started' | 'in_progress' | 'waiting_on_party' | 'completed' | 'overdue' | 'waived' | 'not_applicable'

export type ObligationRisk = 'low' | 'medium' | 'high' | 'critical'

export type ObligationSource = 'ai_extracted' | 'manual'

export interface ContractObligation {
  id: string
  productionId: string
  contractId: string
  partyName: string
  type: ObligationType
  description: string
  dueDate: string
  amount?: number
  status: ObligationStatus
  owner: string
  risk: ObligationRisk
  source: ObligationSource
  notes: string
  syncedToCalendar: boolean
  syncedToCashFlow: boolean
  confidence?: 'high' | 'medium' | 'low'
  createdAt: string
}
