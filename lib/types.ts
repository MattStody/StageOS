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

// ── Company Management ──────────────────────────────────────────────────────────

export type UnionAffiliation = 'CAEA' | 'ACTRA' | 'AFM' | 'IATSE' | 'CUPE' | 'Non-union' | 'Other'
export type PersonRoleType = 'Principal' | 'Ensemble' | 'Creative' | 'Production Staff' | 'Vendor' | 'Crew'

export interface PersonMeasurements {
  height?: string
  weight?: string
  chest?: string
  waist?: string
  hips?: string
  inseam?: string
  dressSuitSize?: string
  shoeSize?: string
  hatSize?: string
  notes?: string
  lastUpdated: string
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface ProductionCredit {
  productionId: string
  productionName: string
  role: string
  contractId?: string
  startDate: string
  endDate?: string
  fee?: number // CAD
}

export interface PersonDocument {
  id: string
  name: string
  category: 'headshot' | 'resume' | 'sin' | 'td1' | 'other'
  uploadedAt: string
  size: string
  type: string
  url?: string
}

export interface BankingInfo {
  bankName?: string
  transitNumber?: string
  institutionNumber?: string
  accountNumber?: string
}

export interface Person {
  id: string
  name: string
  pronouns?: string
  headshotUrl?: string
  roleType: PersonRoleType
  email: string
  phone?: string
  emergencyContact?: EmergencyContact
  unionAffiliation: UnionAffiliation
  unionMemberNumber?: string
  agentName?: string
  agentEmail?: string
  agentPhone?: string
  sinNumber?: string
  bankingInfo?: BankingInfo
  measurements?: PersonMeasurements
  dietaryRestrictions?: string
  accessibilityNeeds?: string
  city?: string
  province?: string
  productionHistory: ProductionCredit[]
  documents: PersonDocument[]
  createdAt: string
  updatedAt: string
}

// ── Housing & Travel ────────────────────────────────────────────────────────────

export type HousingStatus = 'Searching' | 'Confirmed' | 'Checked In' | 'Checked Out'

export interface HousingAssignment {
  id: string
  personId: string
  productionId: string
  address?: string
  unit?: string
  landlordContact?: string
  leaseStart?: string
  leaseEnd?: string
  monthlyCost?: number // CAD
  status: HousingStatus
  notes?: string
}

export type TravelDirection = 'Inbound' | 'Outbound'
export type TravelStatus = 'Not Booked' | 'Booked' | 'Confirmed' | 'Completed'

export interface TravelLeg {
  id: string
  personId: string
  productionId: string
  direction: TravelDirection
  date: string
  carrier?: string // Air Canada, WestJet, VIA Rail, etc.
  flightTrainNumber?: string
  departureCity: string
  arrivalCity: string
  bookedBy: 'Company' | 'Self'
  status: TravelStatus
  cost?: number // CAD
  reimbursementAmount?: number // CAD
  reimbursementDate?: string
}

// ── Per Diem ────────────────────────────────────────────────────────────────────

export interface PerDiemPayment {
  id: string
  date: string
  amount: number // CAD
  method: string
  notes?: string
}

export interface PerDiemEntry {
  id: string
  personId: string
  productionId: string
  dailyRate: number // CAD
  periodStart: string
  periodEnd: string
  totalOwed: number // CAD
  totalPaid: number // CAD
  payments: PerDiemPayment[]
}

// ── CAEA Weekly Reports ─────────────────────────────────────────────────────────

export type PACTContractType = 'PACT-A' | 'PACT-B' | 'PACT-C' | 'PACT-D' | 'LOA'
export type CAEAPenaltyType = 'MissedBreak' | 'RestInvasion' | 'MealPenalty' | 'Other'

export interface CAEAPenalty {
  type: CAEAPenaltyType
  count: number
  ratePerOccurrence: number // CAD
  total: number // CAD
  notes?: string
}

export interface CAEAWeeklyEntry {
  personId: string
  weeklyContractRate: number // CAD
  scheduledHours: number
  actualHours: number
  isPartialWeek: boolean
  partialWeekDays?: number
  partialWeekType?: 'rehearsal' | 'performance'
  isTechWeek: boolean
  penalties: CAEAPenalty[]
  sickDays: number
  personalDays: number
  overtimeHours: number
  overtimePay: number // CAD
  penaltyTotal: number // CAD
  addedTimePay: number // CAD
  vacationPay: number // CAD — 4% of gross per Canadian employment standards
  grossPay: number // CAD
  pensionContribution: number // CAD
  duesCheckoff: number // CAD
  netToPayroll: number // CAD
}

export interface CAEAWeeklyReport {
  id: string
  productionId: string
  weekEnding: string
  contractType: PACTContractType
  entries: CAEAWeeklyEntry[]
  submittedAt?: string
  exportedAt?: string
}

// ── Onboarding ──────────────────────────────────────────────────────────────────

export type OnboardingCategory = 'Legal' | 'Finance' | 'Housing' | 'Travel' | 'Production' | 'Communication'

export interface OnboardingItem {
  id: string
  label: string
  assignedTo?: string
  dueDate?: string
  completedAt?: string
  completedBy?: string
  required: boolean
  category: OnboardingCategory
}

export interface OnboardingChecklist {
  id: string
  personId: string
  productionId: string
  contractId: string
  items: OnboardingItem[]
  completedAt?: string
  createdAt: string
}

// ── Wardrobe: Run of Show ───────────────────────────────────────────────────────
// Models a wardrobe backstage running list — the document a Head of Wardrobe and
// dressers actually run a performance from. Structure mirrors industry practice:
// scene bands, musical numbers and transitions interleaved with wardrobe cues.

/** Where backstage a cue happens. */
export type StageLocation = 'SR' | 'SL' | 'X-OVER' | 'DRS RM' | 'ONSTAGE' | 'OTHER'

export const STAGE_LOCATION_LABELS: Record<StageLocation, string> = {
  SR: 'SR — Stage Right',
  SL: 'SL — Stage Left',
  'X-OVER': 'X-OVER — Crossover',
  'DRS RM': 'DRS RM — Dressing Room',
  ONSTAGE: 'Onstage',
  OTHER: 'Other',
}

/** Row kinds in a running list. */
export type RunItemType = 'scene' | 'number' | 'scene_change' | 'cue'

/** What the wardrobe crew physically does at a cue. */
export type CueType =
  | 'quick_change' // QC — garments OFF then ON against the clock
  | 'preset'       // place an item somewhere before it is needed
  | 'standby'      // crew ready and waiting
  | 'clear'        // strike items out of a wing or crossover
  | 'reset'        // return a look to storage for later reuse
  | 'receive'      // take a garment from a performer coming offstage
  | 'note'         // free-form instruction

export const CUE_TYPE_LABELS: Record<CueType, string> = {
  quick_change: 'Quick Change',
  preset: 'Preset',
  standby: 'Standby',
  clear: 'Clear',
  reset: 'Reset',
  receive: 'Receive',
  note: 'Note',
}

/**
 * A performance track — one role as costumed. The trackNumber is the prefix of
 * every look number for the track (track 14 → looks 1401, 1402 …), which is how
 * wardrobe departments conventionally number a costume plot.
 * Two performerIds means an alternating cast (commonly child roles).
 */
export interface CastTrack {
  id: string
  productionId: string
  trackNumber: number
  roleName: string
  /** Person ids from the roster; more than one = alternating cast. */
  performerIds: string[]
  /** Free text when the performer is not yet in the roster. */
  performerLabel?: string
  isChildTrack?: boolean
}

/** One costume look belonging to a track. */
export interface CostumeLook {
  id: string
  productionId: string
  trackId: string
  /** Wardrobe number, e.g. "101", "1403". */
  number: string
  /** Short description, e.g. "tux", "victorian caroller". */
  name: string
  pieces?: string[]
  /** Where it lives when not worn, e.g. "dressing room 6B". */
  storageLocation?: string
  notes?: string
}

export interface RunOfShowItem {
  id: string
  act: number
  sequence: number
  type: RunItemType

  // — scene rows —
  sceneNumber?: number
  pageStart?: number
  pageEnd?: number

  // — scene / number / scene-change rows —
  /** Scene location ("Lodge Lobby") or number title ("What You've Missed"). */
  title?: string
  /** Musical number label, e.g. "#5", "#5a". */
  numberLabel?: string

  // — cue rows —
  page?: number
  timecode?: string
  location?: StageLocation
  /** Precise spot, e.g. "stair unit", "airport seats". */
  locationDetail?: string
  cueType?: CueType
  trackId?: string
  /** Performer override when a cue is not tied to a roster track. */
  performerLabel?: string
  offLookIds?: string[]
  onLookIds?: string[]
  /** Free text when a look has not been assigned a number yet. */
  offText?: string
  onText?: string
  /** Body text for note / clear / receive / standby rows. */
  body?: string
  notes?: string
  /** Page the performer is back onstage — defines the change window. */
  reentryPage?: number
  /** Flagged as a hard/fast change. */
  isFast?: boolean
  /** Still an open question in tech (the "?" items on a paper list). */
  needsDecision?: boolean
  /** Crew member responsible — matches a RunOfShow.crew name, or "(Self)". */
  assignedTo?: string
  /** Look is finished for the show and can be struck. */
  isDead?: boolean
}

export type RunOfShowStatus = 'draft' | 'dress_run' | 'locked'

export interface RunCrewMember {
  name: string
  role: string
  /** Preshow responsibilities. */
  preshow?: string
}

export interface RunOfShow {
  id: string
  productionId: string
  department: 'wardrobe'
  title: string
  createdBy: string
  updatedAt: string
  status: RunOfShowStatus
  crew: RunCrewMember[]
  items: RunOfShowItem[]
}
