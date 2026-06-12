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
  onSaleDate?: string
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
  startDate?: string
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
  spektrixInstanceId?: string
  ticketsSold?: number
  grossRevenue?: number
  capacityPct?: number
  totalSeats?: number
  avgTicketPrice?: number
  spektrixSyncedAt?: string
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

export type ObligationSource = 'ai_extracted' | 'manual' | 'union_template'
export type ObligationAnchor = 'contract_start' | 'opening_date' | 'closing_date'

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

// ── Grants & Subsidies ───────────────────────────────────────────────────────

export type GrantStatus =
  | 'identified' | 'drafting' | 'submitted' | 'under_review'
  | 'awarded' | 'declined' | 'report_due' | 'report_submitted' | 'complete'

export type GrantType = 'operating' | 'project' | 'touring' | 'capital' | 'commissioning' | 'emergency' | 'other'

export interface Grant {
  id: string
  funder: string
  programName: string
  grantType: GrantType
  status: GrantStatus
  amountRequested: number
  amountAwarded?: number
  applicationDeadline: string
  awardedDate?: string
  reportDeadline?: string
  year: string
  productionId?: string
  notes: string
}

// ── Union Agreement Templates ────────────────────────────────────────────────

export interface ObligationTemplate {
  id: string
  type: ObligationType
  description: string
  plainEnglish: string
  anchor: ObligationAnchor
  offsetDays: number
  risk: ObligationRisk
  defaultOwner: string
  clauseRef: string
  enabledByDefault: boolean
}

export interface UnionAgreementTemplate {
  id: string
  name: string
  shortName: string
  union: string
  country: string
  region?: string
  applicableTypes: ContractType[]
  description: string
  effectiveDate: string
  expiryDate?: string
  obligations: ObligationTemplate[]
}

// ── Workflows ─────────────────────────────────────────────────────────────────

export type WorkflowFieldType =
  | 'text' | 'email' | 'date' | 'number' | 'currency' | 'select' | 'textarea' | 'checkbox_group'

export interface WorkflowField {
  id: string
  label: string
  type: WorkflowFieldType
  required?: boolean
  placeholder?: string
  options?: string[]
}

export interface WorkflowStep {
  id: string
  title: string
  description?: string
  fields: WorkflowField[]
}

export interface WorkflowAutoTask {
  title: string
  description: string
  department: string
  priority: TaskPriority
}

export type WorkflowSource = 'built_in' | 'ai_imported' | 'custom'

export interface WorkflowTemplate {
  id: string
  name: string
  department: string
  description: string
  source: WorkflowSource
  /** Field whose value labels the run (e.g. a person's name) — appended to task titles */
  labelFieldId?: string
  steps: WorkflowStep[]
  autoTasks: WorkflowAutoTask[]
  createdAt: string
}

export interface WorkflowRun {
  id: string
  templateId: string
  templateName: string
  productionId: string
  label: string
  values: Record<string, string | string[]>
  tasksCreated: number
  createdAt: string
}

// ── Actor Profiles ────────────────────────────────────────────────────────────

export interface ActorMeasurements {
  height: string
  weight: string
  chestBust: string
  waist: string
  hips: string
  inseam: string
  dressSuitSize: string
  shoeSize: string
  hatSize: string
  wardrobeNotes: string
}

export type PaymentScheduleItem = 'deposit_on_signing' | 'weekly' | 'closing_night_bonus'

export interface ActorProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  measurements: ActorMeasurements
  createdAt: string
  updatedAt: string
}

export interface ActorEngagement {
  id: string
  actorProfileId: string
  productionId: string
  productionName: string
  role: string
  startDate: string
  endDate: string
  weeklyRate: number
  paymentSchedule: PaymentScheduleItem[]
  notes: string
  tasksCreated: number
  createdAt: string
}

// ── Production Tasks ──────────────────────────────────────────────────────────

export type TaskPhase = 'pre_production' | 'rehearsal' | 'tech' | 'run' | 'closeout'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface ProductionTask {
  id: string
  productionId: string
  title: string
  description: string
  phase: TaskPhase
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  dueDate: string
  notes: string
}
