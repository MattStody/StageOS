// Seed data for the Company Management module — Canadian regional theatre context.
// Tied to the three existing productions:
//   prod-1 A Winter's Dream · prod-2 The Silence Between · prod-3 Echoes: The Concert

import type {
  Person, HousingAssignment, TravelLeg, PerDiemEntry,
  CAEAWeeklyReport, OnboardingChecklist,
} from './types'
import { computeCAEAEntry, makePenalty, type CAEAEntryInput } from './caea'
import { generateOnboardingChecklist } from './onboarding'

const now = '2026-06-14T09:00:00Z'

// ── People ──────────────────────────────────────────────────────────────────────

export const PEOPLE: Person[] = [
  {
    id: 'person-1',
    name: 'Eleanor Vance',
    pronouns: 'she/her',
    roleType: 'Principal',
    email: 'eleanor.vance@email.ca',
    phone: '(416) 555-0142',
    emergencyContact: { name: 'Robert Vance', phone: '(416) 555-0188', relationship: 'Spouse' },
    unionAffiliation: 'CAEA',
    unionMemberNumber: 'CAEA-44821',
    agentName: 'Talent House Toronto',
    agentEmail: 'bookings@talenthouse.ca',
    agentPhone: '(416) 555-0700',
    measurements: { height: '5\'6"', weight: '135 lbs', chest: '36"', waist: '28"', hips: '38"', inseam: '30"', dressSuitSize: '8', shoeSize: '8', hatSize: '7', lastUpdated: '2026-05-20', notes: 'Prefers natural fibres' },
    dietaryRestrictions: 'Vegetarian',
    accessibilityNeeds: '',
    city: 'Toronto',
    province: 'Ontario',
    productionHistory: [
      { productionId: 'prod-1', productionName: "A Winter's Dream", role: 'Titania', startDate: '2026-08-01', endDate: '2026-11-05', fee: 18850 },
      { productionId: 'prod-2', productionName: 'The Silence Between', role: 'Margaret', startDate: '2025-09-01', endDate: '2025-11-08', fee: 16200 },
    ],
    documents: [
      { id: 'pdoc-1-1', name: 'Headshot 2026', category: 'headshot', uploadedAt: '2026-05-01', size: '2.1 MB', type: 'jpg' },
      { id: 'pdoc-1-2', name: 'Resume', category: 'resume', uploadedAt: '2026-05-01', size: '180 KB', type: 'pdf' },
      { id: 'pdoc-1-3', name: 'TD1 Federal 2026', category: 'td1', uploadedAt: '2026-08-02', size: '95 KB', type: 'pdf' },
    ],
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-2',
    name: 'Marcus Chen',
    pronouns: 'he/him',
    roleType: 'Principal',
    email: 'marcus.chen@email.ca',
    phone: '(604) 555-0231',
    emergencyContact: { name: 'Linda Chen', phone: '(604) 555-0299', relationship: 'Sister' },
    unionAffiliation: 'CAEA',
    unionMemberNumber: 'CAEA-39112',
    agentName: 'West Coast Artists',
    agentEmail: 'info@westcoastartists.ca',
    measurements: { height: '6\'0"', weight: '178 lbs', chest: '42"', waist: '34"', hips: '40"', inseam: '34"', dressSuitSize: '42R', shoeSize: '11', hatSize: '7 1/4', lastUpdated: '2026-05-18' },
    dietaryRestrictions: 'No shellfish (allergy)',
    accessibilityNeeds: '',
    city: 'Vancouver',
    province: 'British Columbia',
    productionHistory: [
      { productionId: 'prod-1', productionName: "A Winter's Dream", role: 'Oberon', startDate: '2026-08-01', endDate: '2026-11-05', fee: 16900 },
    ],
    documents: [
      { id: 'pdoc-2-1', name: 'Headshot', category: 'headshot', uploadedAt: '2026-04-22', size: '1.9 MB', type: 'jpg' },
    ],
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-3',
    name: 'Priya Sharma',
    pronouns: 'she/her',
    roleType: 'Ensemble',
    email: 'priya.sharma@email.ca',
    phone: '(514) 555-0177',
    emergencyContact: { name: 'Anil Sharma', phone: '(514) 555-0166', relationship: 'Father' },
    unionAffiliation: 'CAEA',
    unionMemberNumber: 'CAEA-51203',
    agentName: 'Premiere Artists Montréal',
    agentEmail: 'contact@premiereartists.ca',
    measurements: { height: '5\'4"', weight: '120 lbs', chest: '34"', waist: '26"', hips: '36"', inseam: '29"', dressSuitSize: '4', shoeSize: '7', hatSize: '6 7/8', lastUpdated: '2026-05-25' },
    dietaryRestrictions: 'Gluten-free',
    accessibilityNeeds: 'Quiet room access during long tech days',
    city: 'Montreal',
    province: 'Quebec',
    productionHistory: [
      { productionId: 'prod-1', productionName: "A Winter's Dream", role: 'Ensemble / Cobweb', startDate: '2026-08-01', endDate: '2026-11-05', fee: 14300 },
    ],
    documents: [
      { id: 'pdoc-3-1', name: 'Headshot', category: 'headshot', uploadedAt: '2026-05-02', size: '2.0 MB', type: 'jpg' },
    ],
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-4',
    name: "James O'Brien",
    pronouns: 'he/him',
    roleType: 'Production Staff',
    email: 'james.obrien@email.ca',
    phone: '(416) 555-0319',
    emergencyContact: { name: 'Maureen O\'Brien', phone: '(416) 555-0320', relationship: 'Spouse' },
    unionAffiliation: 'CAEA',
    unionMemberNumber: 'CAEA-28840',
    measurements: { lastUpdated: '2026-01-01' },
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    city: 'Toronto',
    province: 'Ontario',
    productionHistory: [
      { productionId: 'prod-1', productionName: "A Winter's Dream", role: 'Stage Manager', startDate: '2026-08-01', endDate: '2026-11-05', fee: 16250 },
      { productionId: 'prod-3', productionName: 'Echoes: The Concert', role: 'Stage Manager', startDate: '2026-08-15', endDate: '2027-04-20', fee: 28000 },
    ],
    documents: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-5',
    name: 'Sophie Tremblay',
    pronouns: 'she/her',
    roleType: 'Creative',
    email: 'sophie.tremblay@email.ca',
    phone: '(514) 555-0455',
    unionAffiliation: 'CAEA',
    unionMemberNumber: 'CAEA-33019',
    agentName: 'Tremblay Creative Mgmt',
    agentEmail: 'agent@tremblaycreative.ca',
    measurements: { lastUpdated: '2026-01-01' },
    dietaryRestrictions: 'Dairy-free',
    accessibilityNeeds: '',
    city: 'Montreal',
    province: 'Quebec',
    productionHistory: [
      { productionId: 'prod-2', productionName: 'The Silence Between', role: 'Director', startDate: '2026-07-15', endDate: '2026-11-08', fee: 24000 },
    ],
    documents: [
      { id: 'pdoc-5-1', name: 'Director Resume', category: 'resume', uploadedAt: '2026-03-10', size: '210 KB', type: 'pdf' },
    ],
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-6',
    name: 'David Kowalski',
    pronouns: 'he/him',
    roleType: 'Crew',
    email: 'david.kowalski@email.ca',
    phone: '(416) 555-0512',
    emergencyContact: { name: 'Eva Kowalski', phone: '(416) 555-0513', relationship: 'Spouse' },
    unionAffiliation: 'IATSE',
    unionMemberNumber: 'IATSE-822-1147',
    measurements: { lastUpdated: '2026-01-01' },
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    city: 'Toronto',
    province: 'Ontario',
    productionHistory: [
      { productionId: 'prod-1', productionName: "A Winter's Dream", role: 'Head Carpenter', startDate: '2026-08-10', endDate: '2026-11-10', fee: 12400 },
      { productionId: 'prod-3', productionName: 'Echoes: The Concert', role: 'Head Carpenter', startDate: '2026-08-20', endDate: '2027-04-22', fee: 22000 },
    ],
    documents: [],
    createdAt: '2025-05-01T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-7',
    name: 'Rachel Goldberg',
    pronouns: 'she/her',
    roleType: 'Principal',
    email: 'rachel.goldberg@email.ca',
    phone: '(416) 555-0644',
    emergencyContact: { name: 'Sam Goldberg', phone: '(416) 555-0645', relationship: 'Brother' },
    unionAffiliation: 'AFM',
    unionMemberNumber: 'AFM-149-9921',
    agentName: 'Toronto Musicians Booking',
    measurements: { lastUpdated: '2026-01-01' },
    dietaryRestrictions: 'Kosher',
    accessibilityNeeds: '',
    city: 'Toronto',
    province: 'Ontario',
    productionHistory: [
      { productionId: 'prod-3', productionName: 'Echoes: The Concert', role: 'Music Director / Keys', startDate: '2026-08-01', endDate: '2027-04-20', fee: 31000 },
    ],
    documents: [
      { id: 'pdoc-7-1', name: 'Headshot', category: 'headshot', uploadedAt: '2026-04-15', size: '1.7 MB', type: 'jpg' },
    ],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-8',
    name: 'Liam Murphy',
    pronouns: 'he/him',
    roleType: 'Principal',
    email: 'liam.murphy@email.ca',
    phone: '(902) 555-0788',
    emergencyContact: { name: 'Claire Murphy', phone: '(902) 555-0789', relationship: 'Spouse' },
    unionAffiliation: 'CAEA',
    unionMemberNumber: 'CAEA-47766',
    agentName: 'East Coast Talent',
    agentEmail: 'bookings@eastcoasttalent.ca',
    measurements: { height: '5\'11"', weight: '170 lbs', chest: '40"', waist: '32"', hips: '39"', inseam: '33"', dressSuitSize: '40R', shoeSize: '10.5', hatSize: '7 1/8', lastUpdated: '2026-06-01' },
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    city: 'Halifax',
    province: 'Nova Scotia',
    productionHistory: [
      { productionId: 'prod-2', productionName: 'The Silence Between', role: 'Thomas', startDate: '2026-09-01', endDate: '2026-11-08', fee: 15600 },
    ],
    documents: [],
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-9',
    name: 'Anna Petrov',
    pronouns: 'they/them',
    roleType: 'Production Staff',
    email: 'anna.petrov@email.ca',
    phone: '(204) 555-0810',
    emergencyContact: { name: 'Viktor Petrov', phone: '(204) 555-0811', relationship: 'Parent' },
    unionAffiliation: 'Non-union',
    measurements: { lastUpdated: '2026-01-01' },
    dietaryRestrictions: 'Vegan',
    accessibilityNeeds: 'Wheelchair accessible workspace required',
    city: 'Winnipeg',
    province: 'Manitoba',
    productionHistory: [
      { productionId: 'prod-3', productionName: 'Echoes: The Concert', role: 'Assistant Production Manager', startDate: '2026-08-01', endDate: '2027-04-20', fee: 19500 },
    ],
    documents: [],
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: now,
  },
  {
    id: 'person-10',
    name: 'Tom Fitzgerald',
    pronouns: 'he/him',
    roleType: 'Vendor',
    email: 'tom@brightlightyyz.ca',
    phone: '(416) 555-0934',
    unionAffiliation: 'Non-union',
    agentName: 'Bright Light Productions Inc.',
    agentEmail: 'accounts@brightlightyyz.ca',
    measurements: { lastUpdated: '2026-01-01' },
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    city: 'Toronto',
    province: 'Ontario',
    productionHistory: [
      { productionId: 'prod-1', productionName: "A Winter's Dream", role: 'Lighting Equipment Rental', startDate: '2026-08-15', endDate: '2026-11-08', fee: 9800 },
    ],
    documents: [],
    createdAt: '2025-09-01T00:00:00Z',
    updatedAt: now,
  },
]

// ── Housing ───────────────────────────────────────────────────────────────────

export const HOUSING_ASSIGNMENTS: HousingAssignment[] = [
  {
    id: 'house-1', personId: 'person-2', productionId: 'prod-1',
    address: '85 East Liberty St', unit: '1204', landlordContact: 'Liberty Suites — (416) 555-2200',
    leaseStart: '2026-07-28', leaseEnd: '2026-11-08', monthlyCost: 2650, status: 'Confirmed',
    notes: 'Furnished one-bedroom, Liberty Village',
  },
  {
    id: 'house-2', personId: 'person-3', productionId: 'prod-1',
    address: '1190 Queen St E', unit: '3', landlordContact: 'M. Dubois — (416) 555-3310',
    leaseStart: '2026-07-25', leaseEnd: '2026-11-08', monthlyCost: 2200, status: 'Checked In',
    notes: 'Leslieville garden suite, checked in July 26',
  },
  {
    id: 'house-3', personId: 'person-8', productionId: 'prod-2',
    address: '', unit: '', landlordContact: '',
    leaseStart: '2026-08-28', leaseEnd: '2026-11-10', monthlyCost: undefined, status: 'Searching',
    notes: 'Needs furnished unit near Distillery District — rehearsals start Sept 1',
  },
  {
    id: 'house-4', personId: 'person-9', productionId: 'prod-3',
    address: '500 Bloor St W', unit: '808', landlordContact: 'Annex Living — (416) 555-4420',
    leaseStart: '2026-07-28', leaseEnd: '2027-04-22', monthlyCost: 2400, status: 'Confirmed',
    notes: 'Accessible unit confirmed — The Annex',
  },
]

// ── Travel ────────────────────────────────────────────────────────────────────

export const TRAVEL_LEGS: TravelLeg[] = [
  {
    id: 'travel-1', personId: 'person-2', productionId: 'prod-1', direction: 'Inbound',
    date: '2026-07-28', carrier: 'Air Canada', flightTrainNumber: 'AC 116',
    departureCity: 'Vancouver (YVR)', arrivalCity: 'Toronto (YYZ)', bookedBy: 'Company',
    status: 'Confirmed', cost: 540, reimbursementAmount: 0,
  },
  {
    id: 'travel-2', personId: 'person-2', productionId: 'prod-1', direction: 'Outbound',
    date: '2026-11-06', carrier: 'Air Canada', flightTrainNumber: 'AC 121',
    departureCity: 'Toronto (YYZ)', arrivalCity: 'Vancouver (YVR)', bookedBy: 'Company',
    status: 'Booked', cost: 560,
  },
  {
    id: 'travel-3', personId: 'person-3', productionId: 'prod-1', direction: 'Inbound',
    date: '2026-07-24', carrier: 'VIA Rail', flightTrainNumber: 'VIA 67',
    departureCity: 'Montreal (Central)', arrivalCity: 'Toronto (Union)', bookedBy: 'Self',
    status: 'Completed', cost: 189, reimbursementAmount: 189, reimbursementDate: '2026-08-05',
  },
  {
    id: 'travel-4', personId: 'person-8', productionId: 'prod-2', direction: 'Inbound',
    date: '2026-08-30', carrier: 'WestJet', flightTrainNumber: 'WS 254',
    departureCity: 'Halifax (YHZ)', arrivalCity: 'Toronto (YYZ)', bookedBy: 'Company',
    status: 'Not Booked', cost: undefined,
  },
  {
    id: 'travel-5', personId: 'person-8', productionId: 'prod-2', direction: 'Outbound',
    date: '2026-11-09', carrier: 'WestJet', flightTrainNumber: 'WS 261',
    departureCity: 'Toronto (YYZ)', arrivalCity: 'Halifax (YHZ)', bookedBy: 'Company',
    status: 'Not Booked',
  },
  {
    id: 'travel-6', personId: 'person-9', productionId: 'prod-3', direction: 'Inbound',
    date: '2026-07-27', carrier: 'Air Canada', flightTrainNumber: 'AC 264',
    departureCity: 'Winnipeg (YWG)', arrivalCity: 'Toronto (YYZ)', bookedBy: 'Company',
    status: 'Confirmed', cost: 410,
  },
]

// ── Per Diems ─────────────────────────────────────────────────────────────────

export const PER_DIEM_ENTRIES: PerDiemEntry[] = [
  {
    id: 'perdiem-1', personId: 'person-2', productionId: 'prod-1',
    dailyRate: 65, periodStart: '2026-08-01', periodEnd: '2026-11-05',
    totalOwed: 6175, totalPaid: 2600,
    payments: [
      { id: 'pdp-1-1', date: '2026-08-15', amount: 1300, method: 'EFT', notes: 'Weeks 1-2' },
      { id: 'pdp-1-2', date: '2026-08-29', amount: 1300, method: 'EFT', notes: 'Weeks 3-4' },
    ],
  },
  {
    id: 'perdiem-2', personId: 'person-3', productionId: 'prod-1',
    dailyRate: 65, periodStart: '2026-08-01', periodEnd: '2026-11-05',
    totalOwed: 6175, totalPaid: 1300,
    payments: [
      { id: 'pdp-2-1', date: '2026-08-15', amount: 1300, method: 'EFT', notes: 'Weeks 1-2' },
    ],
  },
  {
    id: 'perdiem-3', personId: 'person-8', productionId: 'prod-2',
    dailyRate: 60, periodStart: '2026-09-01', periodEnd: '2026-11-08',
    totalOwed: 4140, totalPaid: 0,
    payments: [],
  },
]

// ── CAEA Weekly Report (prod-1, most recent complete week) ──────────────────────

const CAEA_INPUTS: CAEAEntryInput[] = [
  {
    personId: 'person-1', weeklyContractRate: 1450, scheduledHours: 42, actualHours: 42,
    isPartialWeek: false, isTechWeek: false, penalties: [], sickDays: 0, personalDays: 0,
  },
  {
    personId: 'person-2', weeklyContractRate: 1300, scheduledHours: 42, actualHours: 47,
    isPartialWeek: false, isTechWeek: false,
    penalties: [makePenalty('MealPenalty', 1, 'Lunch pushed past 5th hour on Wed')], sickDays: 0, personalDays: 0,
  },
  {
    personId: 'person-3', weeklyContractRate: 1100, scheduledHours: 42, actualHours: 42,
    isPartialWeek: true, partialWeekDays: 4, partialWeekType: 'rehearsal',
    isTechWeek: false, penalties: [], sickDays: 1, personalDays: 0,
  },
  {
    personId: 'person-4', weeklyContractRate: 1250, scheduledHours: 42, actualHours: 55,
    isPartialWeek: false, isTechWeek: false,
    penalties: [makePenalty('RestInvasion', 1, 'Less than 12h turnaround Thu→Fri'), makePenalty('MissedBreak', 2)],
    sickDays: 0, personalDays: 0,
  },
]

export const CAEA_WEEKLY_REPORTS: CAEAWeeklyReport[] = [
  {
    id: 'caea-prod1-w1',
    productionId: 'prod-1',
    weekEnding: '2026-06-07',
    contractType: 'PACT-C',
    entries: CAEA_INPUTS.map((i) => computeCAEAEntry(i, 'PACT-C')),
  },
]

// ── Onboarding Checklists (3: complete / in-progress / just started) ─────────────

const eleanor = PEOPLE.find((p) => p.id === 'person-1')!
const marcus = PEOPLE.find((p) => p.id === 'person-2')!
const priya = PEOPLE.find((p) => p.id === 'person-3')!

function markComplete(cl: OnboardingChecklist, count: number, by = 'Company Manager', at = '2026-06-10T12:00:00Z'): OnboardingChecklist {
  return {
    ...cl,
    items: cl.items.map((item, i) => i < count ? { ...item, completedAt: at, completedBy: by } : item),
    completedAt: count >= cl.items.length ? at : undefined,
  }
}

const eleanorChecklist = (() => {
  const base = generateOnboardingChecklist(eleanor, 'prod-1', 'c-seed-eleanor', '2026-08-02T09:00:00Z')
  return markComplete(base, base.items.length, 'GM', '2026-08-12T16:00:00Z') // complete
})()

const marcusChecklist = (() => {
  const base = generateOnboardingChecklist(marcus, 'prod-1', 'c-seed-marcus', '2026-06-01T09:00:00Z')
  return markComplete(base, Math.ceil(base.items.length / 2)) // ~half done
})()

const priyaChecklist = (() => {
  const base = generateOnboardingChecklist(priya, 'prod-1', 'c-seed-priya', '2026-06-08T09:00:00Z')
  return markComplete(base, 2) // just started
})()

export const ONBOARDING_CHECKLISTS: OnboardingChecklist[] = [
  eleanorChecklist,
  marcusChecklist,
  priyaChecklist,
]
