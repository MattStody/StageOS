import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, Document, MarketingBudgetLine, MarketingCampaign, CustomEvent, ContractObligation, PerformanceDate } from './types'

export const PRODUCTIONS: Production[] = [
  {
    id: 'prod-1',
    name: "A Winter's Dream",
    subtitle: 'A New Commercial Holiday Musical',
    status: 'in_rehearsal',
    venue: 'Princess of Wales Theatre, Toronto',
    openingDate: '2026-09-15',
    closingDate: '2026-11-05',
    totalBudget: 2800000,
    totalActual: 2641000,
    cashOnHand: 412000,
    projectedGross: 3200000,
    currentGross: 478000,
    color: '#6366f1',
  },
  {
    id: 'prod-2',
    name: 'The Silence Between',
    subtitle: 'A New Opera — Nonprofit Production',
    status: 'pre_production',
    venue: 'Bluma Appel Theatre, Toronto',
    openingDate: '2026-10-14',
    closingDate: '2026-11-08',
    totalBudget: 980000,
    totalActual: 386000,
    cashOnHand: 295000,
    projectedGross: 620000,
    currentGross: 350366,
    color: '#0891b2',
  },
  {
    id: 'prod-3',
    name: 'Echoes: The Concert',
    subtitle: 'A National Touring Concert Production',
    status: 'in_rehearsal',
    venue: 'Multi-city Tour',
    openingDate: '2026-09-05',
    closingDate: '2027-04-20',
    totalBudget: 4100000,
    totalActual: 3280000,
    cashOnHand: 710000,
    projectedGross: 6800000,
    currentGross: 4950000,
    color: '#059669',
  },
]

// ─── BUDGET LINES ────────────────────────────────────────────────────────────

const budgetCategories = [
  'General Management',
  'Cast',
  'Creative Team',
  'Musicians',
  'Production Staff',
  'Stage Management',
  'Set',
  'Costumes',
  'Lighting',
  'Sound',
  'Venue Rental',
  'Insurance',
  'Marketing & Advertising',
  'Press',
  'Ticketing Fees',
  'Royalties',
  'Legal',
  'Travel & Housing',
  'Contingency',
]

export const BUDGET_LINES: BudgetLine[] = [
  // prod-1: A Winter's Dream
  { id: 'b1-1', productionId: 'prod-1', category: 'General Management', lineItem: 'GM Fee', budgeted: 85000, committed: 85000, actual: 85000, notes: 'Full season fee' },
  { id: 'b1-2', productionId: 'prod-1', category: 'General Management', lineItem: 'Office & Admin', budgeted: 12000, committed: 10000, actual: 9800, notes: '' },
  { id: 'b1-3', productionId: 'prod-1', category: 'Cast', lineItem: 'Principal Salaries', budgeted: 320000, committed: 320000, actual: 310000, notes: 'CAEA contracts' },
  { id: 'b1-4', productionId: 'prod-1', category: 'Cast', lineItem: 'Ensemble Salaries', budgeted: 180000, committed: 180000, actual: 175000, notes: '' },
  { id: 'b1-5', productionId: 'prod-1', category: 'Cast', lineItem: 'Understudies', budgeted: 45000, committed: 45000, actual: 43000, notes: '' },
  { id: 'b1-6', productionId: 'prod-1', category: 'Creative Team', lineItem: 'Director Fee', budgeted: 75000, committed: 75000, actual: 75000, notes: '' },
  { id: 'b1-7', productionId: 'prod-1', category: 'Creative Team', lineItem: 'Choreographer', budgeted: 55000, committed: 55000, actual: 55000, notes: '' },
  { id: 'b1-8', productionId: 'prod-1', category: 'Creative Team', lineItem: 'Music Director', budgeted: 40000, committed: 40000, actual: 38000, notes: '' },
  { id: 'b1-9', productionId: 'prod-1', category: 'Musicians', lineItem: 'Orchestra (10 players)', budgeted: 95000, committed: 95000, actual: 92000, notes: 'AFM Local 149' },
  { id: 'b1-10', productionId: 'prod-1', category: 'Set', lineItem: 'Scenic Design', budgeted: 180000, committed: 195000, actual: 198000, notes: 'Over budget — snow effect added' },
  { id: 'b1-11', productionId: 'prod-1', category: 'Costumes', lineItem: 'Costume Build & Rental', budgeted: 120000, committed: 118000, actual: 115000, notes: '' },
  { id: 'b1-12', productionId: 'prod-1', category: 'Lighting', lineItem: 'Lighting Design & Equipment', budgeted: 95000, committed: 97000, actual: 95000, notes: '' },
  { id: 'b1-13', productionId: 'prod-1', category: 'Sound', lineItem: 'Sound Design & Equipment', budgeted: 88000, committed: 88000, actual: 86000, notes: '' },
  { id: 'b1-14', productionId: 'prod-1', category: 'Venue Rental', lineItem: 'Theatre Rental', budgeted: 320000, committed: 320000, actual: 302000, notes: '8 weeks' },
  { id: 'b1-15', productionId: 'prod-1', category: 'Marketing & Advertising', lineItem: 'Digital & Print Ads', budgeted: 220000, committed: 230000, actual: 228000, notes: 'Holiday push increased spend' },
  { id: 'b1-16', productionId: 'prod-1', category: 'Press', lineItem: 'Press Rep', budgeted: 22000, committed: 22000, actual: 22000, notes: '' },
  { id: 'b1-17', productionId: 'prod-1', category: 'Royalties', lineItem: 'Author Royalties', budgeted: 85000, committed: 85000, actual: 78000, notes: '3% of gross' },
  { id: 'b1-18', productionId: 'prod-1', category: 'Legal', lineItem: 'Legal Fees', budgeted: 35000, committed: 35000, actual: 32000, notes: '' },
  { id: 'b1-19', productionId: 'prod-1', category: 'Insurance', lineItem: 'Production Insurance', budgeted: 28000, committed: 28000, actual: 27500, notes: '' },
  { id: 'b1-20', productionId: 'prod-1', category: 'Ticketing Fees', lineItem: 'Box Office Fees', budgeted: 48000, committed: 48000, actual: 44000, notes: '' },
  { id: 'b1-21', productionId: 'prod-1', category: 'Travel & Housing', lineItem: 'Cast Travel & Housing', budgeted: 42000, committed: 42000, actual: 40700, notes: '' },
  { id: 'b1-22', productionId: 'prod-1', category: 'Stage Management', lineItem: 'Stage Management Team', budgeted: 55000, committed: 55000, actual: 53000, notes: '' },
  { id: 'b1-23', productionId: 'prod-1', category: 'Production Staff', lineItem: 'Production Manager', budgeted: 38000, committed: 38000, actual: 37000, notes: '' },
  { id: 'b1-24', productionId: 'prod-1', category: 'Contingency', lineItem: 'Contingency Reserve', budgeted: 62000, committed: 0, actual: 0, notes: '' },

  // prod-2: The Silence Between
  { id: 'b2-1', productionId: 'prod-2', category: 'General Management', lineItem: 'GM Fee', budgeted: 42000, committed: 42000, actual: 28000, notes: '' },
  { id: 'b2-2', productionId: 'prod-2', category: 'Cast', lineItem: 'Principal Singers', budgeted: 145000, committed: 145000, actual: 72500, notes: 'CAEA contracts' },
  { id: 'b2-3', productionId: 'prod-2', category: 'Creative Team', lineItem: 'Stage Director', budgeted: 38000, committed: 38000, actual: 19000, notes: '' },
  { id: 'b2-4', productionId: 'prod-2', category: 'Creative Team', lineItem: 'Conductor', budgeted: 32000, committed: 32000, actual: 16000, notes: '' },
  { id: 'b2-5', productionId: 'prod-2', category: 'Musicians', lineItem: 'Chamber Orchestra', budgeted: 120000, committed: 120000, actual: 60000, notes: 'AFM' },
  { id: 'b2-6', productionId: 'prod-2', category: 'Set', lineItem: 'Scenic Design', budgeted: 85000, committed: 90000, actual: 42000, notes: '' },
  { id: 'b2-7', productionId: 'prod-2', category: 'Costumes', lineItem: 'Costume Design', budgeted: 55000, committed: 55000, actual: 25000, notes: '' },
  { id: 'b2-8', productionId: 'prod-2', category: 'Lighting', lineItem: 'Lighting', budgeted: 48000, committed: 48000, actual: 22000, notes: '' },
  { id: 'b2-9', productionId: 'prod-2', category: 'Sound', lineItem: 'Sound Design', budgeted: 35000, committed: 35000, actual: 18000, notes: '' },
  { id: 'b2-10', productionId: 'prod-2', category: 'Venue Rental', lineItem: 'Bluma Appel Rental', budgeted: 95000, committed: 95000, actual: 0, notes: 'Settlement post-run' },
  { id: 'b2-11', productionId: 'prod-2', category: 'Marketing & Advertising', lineItem: 'Marketing', budgeted: 75000, committed: 62000, actual: 35000, notes: '' },
  { id: 'b2-12', productionId: 'prod-2', category: 'Royalties', lineItem: 'Composer/Librettist', budgeted: 45000, committed: 45000, actual: 0, notes: 'Post-run' },
  { id: 'b2-13', productionId: 'prod-2', category: 'Legal', lineItem: 'Legal', budgeted: 18000, committed: 18000, actual: 12000, notes: '' },
  { id: 'b2-14', productionId: 'prod-2', category: 'Insurance', lineItem: 'Insurance', budgeted: 15000, committed: 15000, actual: 15000, notes: '' },
  { id: 'b2-15', productionId: 'prod-2', category: 'Contingency', lineItem: 'Contingency', budgeted: 32000, committed: 0, actual: 0, notes: '' },
  { id: 'b2-16', productionId: 'prod-2', category: 'Travel & Housing', lineItem: 'Travel', budgeted: 28000, committed: 20000, actual: 12000, notes: '' },
  { id: 'b2-17', productionId: 'prod-2', category: 'Stage Management', lineItem: 'Stage Management', budgeted: 30000, committed: 30000, actual: 15000, notes: '' },
  { id: 'b2-18', productionId: 'prod-2', category: 'Press', lineItem: 'Press', budgeted: 15000, committed: 15000, actual: 10500, notes: '' },

  // prod-3: Echoes Tour
  { id: 'b3-1', productionId: 'prod-3', category: 'General Management', lineItem: 'GM Fee', budgeted: 120000, committed: 120000, actual: 120000, notes: '' },
  { id: 'b3-2', productionId: 'prod-3', category: 'Cast', lineItem: 'Principal Artist', budgeted: 850000, committed: 850000, actual: 850000, notes: 'Tour guarantee' },
  { id: 'b3-3', productionId: 'prod-3', category: 'Musicians', lineItem: 'Touring Band (8 players)', budgeted: 320000, committed: 320000, actual: 312000, notes: 'AFM touring agreement' },
  { id: 'b3-4', productionId: 'prod-3', category: 'Creative Team', lineItem: 'Musical Director', budgeted: 95000, committed: 95000, actual: 92000, notes: '' },
  { id: 'b3-5', productionId: 'prod-3', category: 'Lighting', lineItem: 'Touring Rig', budgeted: 280000, committed: 290000, actual: 290000, notes: 'LED upgrade added' },
  { id: 'b3-6', productionId: 'prod-3', category: 'Sound', lineItem: 'PA System & Audio', budgeted: 320000, committed: 320000, actual: 315000, notes: '' },
  { id: 'b3-7', productionId: 'prod-3', category: 'Set', lineItem: 'Stage Production', budgeted: 180000, committed: 185000, actual: 178000, notes: '' },
  { id: 'b3-8', productionId: 'prod-3', category: 'Venue Rental', lineItem: 'Venue Guarantees (multi)', budgeted: 480000, committed: 480000, actual: 420000, notes: '22 of 28 cities settled' },
  { id: 'b3-9', productionId: 'prod-3', category: 'Marketing & Advertising', lineItem: 'National Marketing', budgeted: 380000, committed: 395000, actual: 372000, notes: '' },
  { id: 'b3-10', productionId: 'prod-3', category: 'Travel & Housing', lineItem: 'Tour Travel & Per Diems', budgeted: 310000, committed: 310000, actual: 298000, notes: '' },
  { id: 'b3-11', productionId: 'prod-3', category: 'Production Staff', lineItem: 'Tour Manager & Crew', budgeted: 220000, committed: 220000, actual: 215000, notes: '' },
  { id: 'b3-12', productionId: 'prod-3', category: 'Royalties', lineItem: 'Artist Royalties', budgeted: 180000, committed: 180000, actual: 165000, notes: '' },
  { id: 'b3-13', productionId: 'prod-3', category: 'Insurance', lineItem: 'Touring Insurance', budgeted: 55000, committed: 55000, actual: 52000, notes: '' },
  { id: 'b3-14', productionId: 'prod-3', category: 'Legal', lineItem: 'Legal & Contracts', budgeted: 45000, committed: 45000, actual: 42000, notes: '' },
  { id: 'b3-15', productionId: 'prod-3', category: 'Ticketing Fees', lineItem: 'Ticketing & Service Fees', budgeted: 120000, committed: 120000, actual: 115000, notes: '' },
  { id: 'b3-16', productionId: 'prod-3', category: 'Contingency', lineItem: 'Contingency', budgeted: 145000, committed: 0, actual: 0, notes: '' },
]

// ─── REVENUE WEEKS ───────────────────────────────────────────────────────────

export const REVENUE_WEEKS: RevenueWeek[] = [
  // prod-1: A Winter's Dream — advance sales only (in rehearsal, opening Sep 15 2026)
  { id: 'r1-pre-1', productionId: 'prod-1', weekEnding: '2026-08-29', performances: 0, ticketsSold: 625,  grossRevenue: 75000,  avgTicketPrice: 120, capacityPct: 21, comps: 0,  discounts: 0,    netRevenue: 75000,  totalSeats: 2932 },
  { id: 'r1-pre-2', productionId: 'prod-1', weekEnding: '2026-09-05', performances: 0, ticketsSold: 1275, grossRevenue: 153000, avgTicketPrice: 120, capacityPct: 43, comps: 0,  discounts: 500,  netRevenue: 152500, totalSeats: 2932 },
  { id: 'r1-pre-3', productionId: 'prod-1', weekEnding: '2026-09-12', performances: 0, ticketsSold: 2083, grossRevenue: 250000, avgTicketPrice: 120, capacityPct: 71, comps: 15, discounts: 2000, netRevenue: 246500, totalSeats: 2932 },

  // prod-2: The Silence Between — advance sales Jul–Oct, then 4 performance weeks (Oct–Nov 2026)
  { id: 'r2-adv-1', productionId: 'prod-2', weekEnding: '2026-07-04', performances: 0, ticketsSold: 168, grossRevenue: 18816,  avgTicketPrice: 112, capacityPct: 15, comps: 0,  discounts: 0,    netRevenue: 18816,  totalSeats: 1100 },
  { id: 'r2-adv-2', productionId: 'prod-2', weekEnding: '2026-07-11', performances: 0, ticketsSold: 285, grossRevenue: 31920,  avgTicketPrice: 112, capacityPct: 26, comps: 0,  discounts: 800,  netRevenue: 31120,  totalSeats: 1100 },
  { id: 'r2-adv-3', productionId: 'prod-2', weekEnding: '2026-07-18', performances: 0, ticketsSold: 418, grossRevenue: 50160,  avgTicketPrice: 120, capacityPct: 38, comps: 0,  discounts: 1200, netRevenue: 48960,  totalSeats: 1100 },
  { id: 'r2-adv-4', productionId: 'prod-2', weekEnding: '2026-07-25', performances: 0, ticketsSold: 542, grossRevenue: 67750,  avgTicketPrice: 125, capacityPct: 49, comps: 12, discounts: 1800, netRevenue: 65950,  totalSeats: 1100 },
  { id: 'r2-adv-5', productionId: 'prod-2', weekEnding: '2026-08-01', performances: 0, ticketsSold: 660, grossRevenue: 84480,  avgTicketPrice: 128, capacityPct: 60, comps: 18, discounts: 2200, netRevenue: 82280,  totalSeats: 1100 },
  { id: 'r2-adv-6', productionId: 'prod-2', weekEnding: '2026-08-08', performances: 0, ticketsSold: 748, grossRevenue: 97240,  avgTicketPrice: 130, capacityPct: 68, comps: 22, discounts: 2800, netRevenue: 94440,  totalSeats: 1100 },
  { id: 'r2-adv-7', productionId: 'prod-2', weekEnding: '2026-09-26', performances: 0, ticketsSold: 820, grossRevenue: 106600, avgTicketPrice: 130, capacityPct: 75, comps: 25, discounts: 3000, netRevenue: 103600, totalSeats: 1100 },
  { id: 'r2-adv-8', productionId: 'prod-2', weekEnding: '2026-10-03', performances: 0, ticketsSold: 880, grossRevenue: 114400, avgTicketPrice: 130, capacityPct: 80, comps: 28, discounts: 3400, netRevenue: 111000, totalSeats: 1100 },
  { id: 'r2-adv-9', productionId: 'prod-2', weekEnding: '2026-10-10', performances: 0, ticketsSold: 930, grossRevenue: 120900, avgTicketPrice: 130, capacityPct: 85, comps: 30, discounts: 3800, netRevenue: 117100, totalSeats: 1100 },
  { id: 'r2-1', productionId: 'prod-2', weekEnding: '2026-10-17', performances: 4,  ticketsSold: 800,  grossRevenue: 104000, avgTicketPrice: 130, capacityPct: 73, comps: 35, discounts: 4000, netRevenue: 100000, totalSeats: 1100 },
  { id: 'r2-2', productionId: 'prod-2', weekEnding: '2026-10-24', performances: 5,  ticketsSold: 970,  grossRevenue: 126100, avgTicketPrice: 130, capacityPct: 88, comps: 30, discounts: 3500, netRevenue: 122600, totalSeats: 1100 },
  { id: 'r2-3', productionId: 'prod-2', weekEnding: '2026-10-31', performances: 4,  ticketsSold: 900,  grossRevenue: 117000, avgTicketPrice: 130, capacityPct: 82, comps: 32, discounts: 3800, netRevenue: 113200, totalSeats: 1100 },
  { id: 'r2-4', productionId: 'prod-2', weekEnding: '2026-11-07', performances: 5,  ticketsSold: 990,  grossRevenue: 128700, avgTicketPrice: 130, capacityPct: 90, comps: 25, discounts: 3000, netRevenue: 125700, totalSeats: 1100 },

  // prod-3: Echoes Tour — 3 advance weeks (MSG pre-sale) then 8 tour weeks (Sep–Nov 2026)
  { id: 'r3-pre-1', productionId: 'prod-3', weekEnding: '2026-08-15', performances: 0, ticketsSold: 12000, grossRevenue: 264000, avgTicketPrice: 22, capacityPct: 39, comps: 0,   discounts: 5000,  netRevenue: 259000, totalSeats: 30800 },
  { id: 'r3-pre-2', productionId: 'prod-3', weekEnding: '2026-08-22', performances: 0, ticketsSold: 20000, grossRevenue: 440000, avgTicketPrice: 22, capacityPct: 65, comps: 0,   discounts: 8000,  netRevenue: 432000, totalSeats: 30800 },
  { id: 'r3-pre-3', productionId: 'prod-3', weekEnding: '2026-08-29', performances: 0, ticketsSold: 27500, grossRevenue: 605000, avgTicketPrice: 22, capacityPct: 89, comps: 0,   discounts: 12000, netRevenue: 593000, totalSeats: 30800 },
  { id: 'r3-1', productionId: 'prod-3', weekEnding: '2026-09-13', performances: 4, ticketsSold: 24000, grossRevenue: 528000, avgTicketPrice: 22,   capacityPct: 78, comps: 600, discounts: 18000, netRevenue: 498000, totalSeats: 30800 },
  { id: 'r3-2', productionId: 'prod-3', weekEnding: '2026-09-20', performances: 5, ticketsSold: 31500, grossRevenue: 724500, avgTicketPrice: 23,   capacityPct: 82, comps: 500, discounts: 22000, netRevenue: 690000, totalSeats: 38500 },
  { id: 'r3-3', productionId: 'prod-3', weekEnding: '2026-09-27', performances: 4, ticketsSold: 28000, grossRevenue: 644000, avgTicketPrice: 23,   capacityPct: 85, comps: 420, discounts: 16500, netRevenue: 614000, totalSeats: 32900 },
  { id: 'r3-4', productionId: 'prod-3', weekEnding: '2026-10-04', performances: 5, ticketsSold: 33000, grossRevenue: 792000, avgTicketPrice: 24,   capacityPct: 86, comps: 480, discounts: 21000, netRevenue: 755000, totalSeats: 38400 },
  { id: 'r3-5', productionId: 'prod-3', weekEnding: '2026-10-11', performances: 4, ticketsSold: 29500, grossRevenue: 708000, avgTicketPrice: 24,   capacityPct: 88, comps: 390, discounts: 17000, netRevenue: 675000, totalSeats: 33500 },
  { id: 'r3-6', productionId: 'prod-3', weekEnding: '2026-10-18', performances: 5, ticketsSold: 34200, grossRevenue: 838900, avgTicketPrice: 24.5, capacityPct: 89, comps: 450, discounts: 19500, netRevenue: 803000, totalSeats: 38400 },
  { id: 'r3-7', productionId: 'prod-3', weekEnding: '2026-10-25', performances: 4, ticketsSold: 30000, grossRevenue: 750000, avgTicketPrice: 25,   capacityPct: 90, comps: 350, discounts: 15000, netRevenue: 720000, totalSeats: 33300 },
  { id: 'r3-8', productionId: 'prod-3', weekEnding: '2026-11-01', performances: 5, ticketsSold: 35500, grossRevenue: 888000, avgTicketPrice: 25,   capacityPct: 92, comps: 400, discounts: 16000, netRevenue: 857000, totalSeats: 38600 },
]

// ─── CONTRACTS ───────────────────────────────────────────────────────────────

export const CONTRACTS: Contract[] = [
  // prod-1
  { id: 'c1-1', productionId: 'prod-1', partyName: 'Jordan A. Mercer', contractType: 'cast', status: 'signed', dueDate: '2025-09-01', fee: 28000, keyObligations: 'Lead role, exclusive through closing', notes: 'CAEA principal', hasFile: true },
  { id: 'c1-2', productionId: 'prod-1', partyName: 'Sarah Chen', contractType: 'cast', status: 'signed', dueDate: '2025-09-01', fee: 22000, keyObligations: 'Supporting lead', notes: 'CAEA', hasFile: true },
  { id: 'c1-3', productionId: 'prod-1', partyName: 'Ensemble (12)', contractType: 'cast', status: 'signed', dueDate: '2025-09-01', fee: 148000, keyObligations: 'CAEA minimum + 15%', notes: '', hasFile: true },
  { id: 'c1-4', productionId: 'prod-1', partyName: 'Daniel Rivera (Director)', contractType: 'creative', status: 'signed', dueDate: '2025-07-01', fee: 75000, keyObligations: 'Approval rights over design elements', notes: '', hasFile: true },
  { id: 'c1-5', productionId: 'prod-1', partyName: 'Premiere Rights LLC', contractType: 'rights', status: 'signed', dueDate: '2025-06-01', fee: 45000, keyObligations: 'NY rights only, 3% gross royalty', notes: 'Option exercised', hasFile: true },
  { id: 'c1-6', productionId: 'prod-1', partyName: 'Princess of Wales Theatre', contractType: 'venue', status: 'signed', dueDate: '2025-08-01', fee: 320000, keyObligations: 'Exclusive booking Sep 15 – Nov 5', notes: '', hasFile: true },
  { id: 'c1-7', productionId: 'prod-1', partyName: 'Pinnacle Scenic Studios', contractType: 'vendor', status: 'signed', dueDate: '2025-09-15', fee: 198000, keyObligations: 'Delivery by Oct 30 load-in', notes: 'Over budget — approved', hasFile: true },
  { id: 'c1-8', productionId: 'prod-1', partyName: 'Marcus Lee (Choreographer)', contractType: 'creative', status: 'needs_review', dueDate: '2026-01-10', fee: 55000, keyObligations: 'Closing fee + transfer clause', notes: 'Renegotiation for potential transfer', hasFile: false },
  { id: 'c1-9', productionId: 'prod-1', partyName: 'Horizon Investors LLC', contractType: 'investor', status: 'signed', dueDate: '2025-05-15', fee: 500000, keyObligations: 'Capitalization agreement, recoupment at 110%', notes: '', hasFile: true },
  { id: 'c1-10', productionId: 'prod-1', partyName: 'Lightworks (Lighting)', contractType: 'vendor', status: 'signed', dueDate: '2025-10-01', fee: 95000, keyObligations: 'Equipment rental through closing', notes: '', hasFile: true },

  // prod-2
  { id: 'c2-1', productionId: 'prod-2', partyName: 'Elena Vasquez (Soprano)', contractType: 'cast', status: 'signed', dueDate: '2025-10-15', fee: 48000, keyObligations: 'Title role, CAEA', notes: '', hasFile: true },
  { id: 'c2-2', productionId: 'prod-2', partyName: 'Thomas Kline (Tenor)', contractType: 'cast', status: 'sent', dueDate: '2025-11-01', fee: 38000, keyObligations: 'Male lead, CAEA', notes: 'Awaiting counter-signature', hasFile: false },
  { id: 'c2-3', productionId: 'prod-2', partyName: 'Amara Osei (Composer)', contractType: 'rights', status: 'signed', dueDate: '2025-08-01', fee: 35000, keyObligations: 'Commission fee + 4% gross royalty', notes: 'World premiere rights', hasFile: true },
  { id: 'c2-4', productionId: 'prod-2', partyName: 'Bluma Appel Theatre', contractType: 'venue', status: 'signed', dueDate: '2025-09-01', fee: 95000, keyObligations: 'Oct 14 – Nov 8, 2026', notes: '', hasFile: true },
  { id: 'c2-5', productionId: 'prod-2', partyName: 'Dr. Fiona Walsh (Director)', contractType: 'creative', status: 'signed', dueDate: '2025-09-01', fee: 38000, keyObligations: 'Approval rights, revival rights held 5 yrs', notes: '', hasFile: true },
  { id: 'c2-6', productionId: 'prod-2', partyName: 'Canada Council for the Arts Grant', contractType: 'investor', status: 'signed', dueDate: '2025-07-01', fee: 75000, keyObligations: 'Reporting requirements, non-commercial clause', notes: 'Final report due Mar 30', hasFile: true },
  { id: 'c2-7', productionId: 'prod-2', partyName: 'Apex Sound Design', contractType: 'vendor', status: 'draft', dueDate: '2025-12-01', fee: 35000, keyObligations: 'Design and rental through closing', notes: 'In negotiation', hasFile: false },
  { id: 'c2-8', productionId: 'prod-2', partyName: 'Chamber Orchestra (8)', contractType: 'employment', status: 'sent', dueDate: '2025-12-15', fee: 95000, keyObligations: 'AFM Local 149 rates, 3-week run', notes: '', hasFile: false },

  // prod-3
  { id: 'c3-1', productionId: 'prod-3', partyName: 'Kai Monroe (Headliner)', contractType: 'cast', status: 'signed', dueDate: '2025-06-01', fee: 850000, keyObligations: 'Tour guarantee, approval of support artists', notes: 'Exclusive worldwide through Apr 20', hasFile: true },
  { id: 'c3-2', productionId: 'prod-3', partyName: 'Touring Band Agreement', contractType: 'employment', status: 'signed', dueDate: '2025-07-01', fee: 320000, keyObligations: 'AFM touring scale, per diems', notes: '8 musicians', hasFile: true },
  { id: 'c3-3', productionId: 'prod-3', partyName: 'Live Nation Venues (22 cities)', contractType: 'venue', status: 'signed', dueDate: '2025-07-15', fee: 480000, keyObligations: 'Settlement per city, 90/10 split after breakeven', notes: '', hasFile: true },
  { id: 'c3-4', productionId: 'prod-3', partyName: 'Remaining 6 Cities (venues)', contractType: 'venue', status: 'needs_review', dueDate: '2025-11-30', fee: 120000, keyObligations: 'Terms under negotiation', notes: 'Overdue — escalate', hasFile: false },
  { id: 'c3-5', productionId: 'prod-3', partyName: 'Soundcheck Audio LLC', contractType: 'vendor', status: 'signed', dueDate: '2025-07-01', fee: 315000, keyObligations: 'Full PA system, touring run', notes: '', hasFile: true },
  { id: 'c3-6', productionId: 'prod-3', partyName: 'Arc Light Touring', contractType: 'vendor', status: 'signed', dueDate: '2025-07-01', fee: 290000, keyObligations: 'LED touring rig, full run', notes: '', hasFile: true },
  { id: 'c3-7', productionId: 'prod-3', partyName: 'Evergreen Capital Partners', contractType: 'investor', status: 'signed', dueDate: '2025-05-01', fee: 1200000, keyObligations: 'Recoupment at 110%, 40% override split', notes: '', hasFile: true },
  { id: 'c3-8', productionId: 'prod-3', partyName: 'National Media Rights', contractType: 'rights', status: 'draft', dueDate: '2026-01-15', fee: 95000, keyObligations: 'Film/streaming rights for tour documentary', notes: 'In development', hasFile: false },
]

// ─── CASH FLOW ────────────────────────────────────────────────────────────────

export const CASH_FLOW_ROWS: CashFlowRow[] = [
  // prod-1: performance weeks Sep–Nov 2026 (shifted +10 months)
  { id: 'cf1-1', productionId: 'prod-1', weekOf: '2026-09-14', startingCash: 620000,  ticketRevenue: 218400, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 28000, royalties: 6552,  vendorPayments: 15000, otherOutflows: 8000,  closingCash: 675848  },
  { id: 'cf1-2', productionId: 'prod-1', weekOf: '2026-09-21', startingCash: 675848,  ticketRevenue: 303000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 22000, royalties: 9090,  vendorPayments: 12000, otherOutflows: 5000,  closingCash: 825758  },
  { id: 'cf1-3', productionId: 'prod-1', weekOf: '2026-09-28', startingCash: 825758,  ticketRevenue: 286000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 20000, royalties: 8580,  vendorPayments: 10000, otherOutflows: 4500,  closingCash: 963678  },
  { id: 'cf1-4', productionId: 'prod-1', weekOf: '2026-10-05', startingCash: 963678,  ticketRevenue: 341000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 18000, royalties: 10230, vendorPayments: 8000,  otherOutflows: 4000,  closingCash: 1159448 },
  { id: 'cf1-5', productionId: 'prod-1', weekOf: '2026-10-12', startingCash: 1159448, ticketRevenue: 428000, otherInflows: 0, payroll: 72000, venueCosts: 48000, marketing: 15000, royalties: 12840, vendorPayments: 8000,  otherOutflows: 3000,  closingCash: 1428608 },
  { id: 'cf1-6', productionId: 'prod-1', weekOf: '2026-10-19', startingCash: 1428608, ticketRevenue: 447000, otherInflows: 0, payroll: 72000, venueCosts: 48000, marketing: 12000, royalties: 13410, vendorPayments: 6000,  otherOutflows: 3000,  closingCash: 1721198 },
  { id: 'cf1-7', productionId: 'prod-1', weekOf: '2026-10-26', startingCash: 1721198, ticketRevenue: 348000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 10000, royalties: 10440, vendorPayments: 5000,  otherOutflows: 2500,  closingCash: 1936258 },
  { id: 'cf1-8', productionId: 'prod-1', weekOf: '2026-11-02', startingCash: 1936258, ticketRevenue: 109600, otherInflows: 0, payroll: 25000, venueCosts: 18000, marketing: 4000,  royalties: 3288,  vendorPayments: 40000, otherOutflows: 35000, closingCash: 1920570 },

  // prod-2: pre-production Jul–Aug 2026, then performance weeks Oct–Nov 2026
  { id: 'cf2-1', productionId: 'prod-2', weekOf: '2026-07-14', startingCash: 380000, ticketRevenue: 0,      otherInflows: 0, payroll: 18000, venueCosts: 0,  marketing: 8000,  royalties: 0,    vendorPayments: 12000, otherOutflows: 5000, closingCash: 337000 },
  { id: 'cf2-2', productionId: 'prod-2', weekOf: '2026-07-21', startingCash: 337000, ticketRevenue: 0,      otherInflows: 0, payroll: 18000, venueCosts: 0,  marketing: 9500,  royalties: 0,    vendorPayments: 15000, otherOutflows: 4500, closingCash: 290000 },
  { id: 'cf2-3', productionId: 'prod-2', weekOf: '2026-07-28', startingCash: 290000, ticketRevenue: 42000,  otherInflows: 0, payroll: 22000, venueCosts: 8000, marketing: 12000, royalties: 0,    vendorPayments: 8000,  otherOutflows: 3500, closingCash: 278500 },
  { id: 'cf2-4', productionId: 'prod-2', weekOf: '2026-08-04', startingCash: 278500, ticketRevenue: 55000,  otherInflows: 0, payroll: 22000, venueCosts: 8000, marketing: 12000, royalties: 0,    vendorPayments: 6000,  otherOutflows: 3000, closingCash: 282500 },
  { id: 'cf2-5', productionId: 'prod-2', weekOf: '2026-08-11', startingCash: 282500, ticketRevenue: 68000,  otherInflows: 0, payroll: 25000, venueCosts: 10000, marketing: 14000, royalties: 0,   vendorPayments: 6000,  otherOutflows: 3000, closingCash: 292500 },
  { id: 'cf2-6', productionId: 'prod-2', weekOf: '2026-10-12', startingCash: 292500, ticketRevenue: 104000, otherInflows: 0, payroll: 32000, venueCosts: 22000, marketing: 8000, royalties: 4160,  vendorPayments: 5000,  otherOutflows: 2500, closingCash: 322840 },
  { id: 'cf2-7', productionId: 'prod-2', weekOf: '2026-10-19', startingCash: 322840, ticketRevenue: 126100, otherInflows: 0, payroll: 32000, venueCosts: 22000, marketing: 6000, royalties: 5044,  vendorPayments: 4000,  otherOutflows: 2000, closingCash: 377896 },
  { id: 'cf2-8', productionId: 'prod-2', weekOf: '2026-10-26', startingCash: 377896, ticketRevenue: 117000, otherInflows: 0, payroll: 32000, venueCosts: 22000, marketing: 5000, royalties: 4680,  vendorPayments: 4000,  otherOutflows: 2000, closingCash: 425216 },
  { id: 'cf2-9', productionId: 'prod-2', weekOf: '2026-11-02', startingCash: 425216, ticketRevenue: 128700, otherInflows: 0, payroll: 32000, venueCosts: 22000, marketing: 4000, royalties: 5148,  vendorPayments: 15000, otherOutflows: 8000, closingCash: 467768 },

  // prod-3: Echoes Tour — starting from first shows Sep 2026 (shifted +12 months)
  { id: 'cf3-1', productionId: 'prod-3', weekOf: '2026-09-07', startingCash: 820000,  ticketRevenue: 528000, otherInflows: 0, payroll: 85000, venueCosts: 62000, marketing: 22000, royalties: 15840, vendorPayments: 18000, otherOutflows: 8000, closingCash: 1137160 },
  { id: 'cf3-2', productionId: 'prod-3', weekOf: '2026-09-14', startingCash: 1137160, ticketRevenue: 724500, otherInflows: 0, payroll: 85000, venueCosts: 58000, marketing: 20000, royalties: 21735, vendorPayments: 16000, otherOutflows: 7000, closingCash: 1653925 },
  { id: 'cf3-3', productionId: 'prod-3', weekOf: '2026-09-21', startingCash: 1653925, ticketRevenue: 644000, otherInflows: 0, payroll: 85000, venueCosts: 60000, marketing: 18000, royalties: 19320, vendorPayments: 15000, otherOutflows: 7500, closingCash: 2093105 },
  { id: 'cf3-4', productionId: 'prod-3', weekOf: '2026-09-28', startingCash: 2093105, ticketRevenue: 792000, otherInflows: 0, payroll: 85000, venueCosts: 62000, marketing: 16000, royalties: 23760, vendorPayments: 14000, otherOutflows: 7000, closingCash: 2677345 },
  { id: 'cf3-5', productionId: 'prod-3', weekOf: '2026-10-05', startingCash: 2677345, ticketRevenue: 708000, otherInflows: 0, payroll: 85000, venueCosts: 65000, marketing: 14000, royalties: 21240, vendorPayments: 13000, otherOutflows: 6500, closingCash: 3180605 },
]

// ─── DEADLINES ────────────────────────────────────────────────────────────────

export const DEADLINES: Deadline[] = [
  // prod-1
  { id: 'd1-1', productionId: 'prod-1', title: 'Final settlement with Princess of Wales Theatre', date: '2026-01-20', type: 'settlement', status: 'upcoming', notes: 'Coordinate with venue manager', assignedTo: 'Finance' },
  { id: 'd1-2', productionId: 'prod-1', title: 'Royalty report — Q4', date: '2026-01-15', type: 'royalty', status: 'upcoming', notes: 'Submit to rights holders', assignedTo: 'GM' },
  { id: 'd1-3', productionId: 'prod-1', title: 'Closing night', date: '2026-01-05', type: 'closing', status: 'completed', notes: '', assignedTo: 'Production' },
  { id: 'd1-4', productionId: 'prod-1', title: 'Investor closing notice', date: '2026-01-12', type: 'general', status: 'upcoming', notes: 'Notify Horizon Investors', assignedTo: 'GM' },
  { id: 'd1-5', productionId: 'prod-1', title: 'Choreographer renegotiation deadline', date: '2026-01-10', type: 'contract', status: 'at_risk', notes: 'Transfer clause must be resolved', assignedTo: 'Legal' },
  { id: 'd1-6', productionId: 'prod-1', title: 'Final payroll run', date: '2026-01-08', type: 'payroll', status: 'upcoming', notes: 'CAEA closeout payroll', assignedTo: 'Finance' },

  // prod-2
  { id: 'd2-1', productionId: 'prod-2', title: 'Tenor contract signed', date: '2025-11-30', type: 'contract', status: 'overdue', notes: 'Thomas Kline — sent Oct 15, no response', assignedTo: 'Casting' },
  { id: 'd2-2', productionId: 'prod-2', title: 'Orchestrations delivered', date: '2025-12-15', type: 'general', status: 'upcoming', notes: 'From composer Amara Osei', assignedTo: 'Music' },
  { id: 'd2-3', productionId: 'prod-2', title: 'Rehearsals begin', date: '2026-01-12', type: 'rehearsal', status: 'upcoming', notes: 'Bluma Appel Theatre studio space confirmed', assignedTo: 'Stage Management' },
  { id: 'd2-4', productionId: 'prod-2', title: 'Tech rehearsal start', date: '2026-02-07', type: 'tech', status: 'upcoming', notes: '', assignedTo: 'Stage Management' },
  { id: 'd2-5', productionId: 'prod-2', title: 'First preview', date: '2026-02-14', type: 'preview', status: 'upcoming', notes: '', assignedTo: 'Production' },
  { id: 'd2-6', productionId: 'prod-2', title: 'Opening night', date: '2026-02-21', type: 'opening', status: 'upcoming', notes: 'Press night same evening', assignedTo: 'Production' },
  { id: 'd2-7', productionId: 'prod-2', title: 'Sound vendor contract finalized', date: '2025-12-01', type: 'contract', status: 'overdue', notes: 'Apex Sound still in draft', assignedTo: 'Production' },
  { id: 'd2-8', productionId: 'prod-2', title: 'Marketing launch — digital', date: '2025-12-20', type: 'marketing', status: 'upcoming', notes: 'Social + email push', assignedTo: 'Marketing' },
  { id: 'd2-9', productionId: 'prod-2', title: 'Canada Council grant final report', date: '2026-03-30', type: 'royalty', status: 'upcoming', notes: 'Required per grant agreement', assignedTo: 'GM' },

  // prod-3
  { id: 'd3-1', productionId: 'prod-3', title: 'Remaining venue contracts (6 cities)', date: '2025-11-30', type: 'contract', status: 'overdue', notes: 'Escalate immediately', assignedTo: 'GM' },
  { id: 'd3-2', productionId: 'prod-3', title: 'Tour payroll — Dec cycle', date: '2025-12-05', type: 'payroll', status: 'upcoming', notes: 'AFM + crew', assignedTo: 'Finance' },
  { id: 'd3-3', productionId: 'prod-3', title: 'Media rights contract deadline', date: '2026-01-15', type: 'contract', status: 'upcoming', notes: 'National Media Rights — still in draft', assignedTo: 'Legal' },
  { id: 'd3-4', productionId: 'prod-3', title: 'Royalty reporting Q4', date: '2026-01-10', type: 'royalty', status: 'upcoming', notes: '', assignedTo: 'Finance' },
  { id: 'd3-5', productionId: 'prod-3', title: 'Tour closing date', date: '2026-04-20', type: 'closing', status: 'upcoming', notes: 'Subject to extension pending offer', assignedTo: 'Production' },
  { id: 'd3-6', productionId: 'prod-3', title: 'Settlement — Chicago run', date: '2025-12-01', type: 'settlement', status: 'upcoming', notes: 'Post Oct 25 Chicago dates', assignedTo: 'Finance' },
]

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export const DOCUMENTS: Document[] = [
  { id: 'doc1-1', productionId: 'prod-1', name: "A Winter's Dream — Production Budget v3", category: 'budgets', uploadedAt: '2025-10-14', size: '842 KB', type: 'xlsx' },
  { id: 'doc1-2', productionId: 'prod-1', name: 'Princess of Wales Theatre License Agreement', category: 'contracts', uploadedAt: '2025-08-22', size: '1.2 MB', type: 'pdf' },
  { id: 'doc1-3', productionId: 'prod-1', name: 'Capitalization Agreement — Horizon Investors', category: 'contracts', uploadedAt: '2025-05-20', size: '2.4 MB', type: 'pdf' },
  { id: 'doc1-4', productionId: 'prod-1', name: 'Production Insurance Certificate', category: 'insurance', uploadedAt: '2025-09-30', size: '380 KB', type: 'pdf' },
  { id: 'doc1-5', productionId: 'prod-1', name: 'Holiday Campaign Brief', category: 'marketing', uploadedAt: '2025-10-01', size: '5.1 MB', type: 'pdf' },
  { id: 'doc1-6', productionId: 'prod-1', name: 'Weekly Report — Dec 13 2025', category: 'reports', uploadedAt: '2025-12-13', size: '210 KB', type: 'pdf' },

  { id: 'doc2-1', productionId: 'prod-2', name: 'The Silence Between — Production Budget', category: 'budgets', uploadedAt: '2025-09-10', size: '710 KB', type: 'xlsx' },
  { id: 'doc2-2', productionId: 'prod-2', name: 'Bluma Appel Theatre Agreement', category: 'contracts', uploadedAt: '2025-09-05', size: '980 KB', type: 'pdf' },
  { id: 'doc2-3', productionId: 'prod-2', name: 'Canada Council for the Arts Grant Award Letter', category: 'legal', uploadedAt: '2025-07-08', size: '220 KB', type: 'pdf' },
  { id: 'doc2-4', productionId: 'prod-2', name: 'Commission Agreement — Amara Osei', category: 'contracts', uploadedAt: '2025-08-02', size: '1.1 MB', type: 'pdf' },

  { id: 'doc3-1', productionId: 'prod-3', name: 'Echoes Tour — Master Budget', category: 'budgets', uploadedAt: '2025-07-01', size: '1.8 MB', type: 'xlsx' },
  { id: 'doc3-2', productionId: 'prod-3', name: 'Kai Monroe Tour Agreement', category: 'contracts', uploadedAt: '2025-06-15', size: '3.2 MB', type: 'pdf' },
  { id: 'doc3-3', productionId: 'prod-3', name: 'Live Nation Venue Package', category: 'contracts', uploadedAt: '2025-07-20', size: '2.9 MB', type: 'pdf' },
  { id: 'doc3-4', productionId: 'prod-3', name: 'Touring Insurance — All Risks Policy', category: 'insurance', uploadedAt: '2025-07-01', size: '460 KB', type: 'pdf' },
  { id: 'doc3-5', productionId: 'prod-3', name: 'Evergreen Capital Agreement', category: 'contracts', uploadedAt: '2025-05-10', size: '4.1 MB', type: 'pdf' },

  // prod-1 reports
  { id: 'doc1-7', productionId: 'prod-1', name: "Weekly Producer Report — Week of Nov 22", category: 'reports', uploadedAt: '2025-11-22', size: '195 KB', type: 'pdf' },
  { id: 'doc1-8', productionId: 'prod-1', name: "Monthly P&L Summary — November 2025", category: 'reports', uploadedAt: '2025-12-01', size: '210 KB', type: 'pdf' },
  { id: 'doc1-9', productionId: 'prod-1', name: "Investor Report — Q4 2025", category: 'reports', uploadedAt: '2025-12-15', size: '380 KB', type: 'pdf' },
  { id: 'doc1-10', productionId: 'prod-1', name: "Cash Flow Analysis — December 2025", category: 'reports', uploadedAt: '2025-12-31', size: '165 KB', type: 'pdf' },
  { id: 'doc1-11', productionId: 'prod-1', name: "Marketing Performance Report — Holiday Run", category: 'reports', uploadedAt: '2026-01-07', size: '290 KB', type: 'pdf' },

  // prod-2 reports
  { id: 'doc2-5', productionId: 'prod-2', name: "Pre-Production Budget Memo — November 2025", category: 'reports', uploadedAt: '2025-11-15', size: '145 KB', type: 'pdf' },
  { id: 'doc2-6', productionId: 'prod-2', name: "Advance Sales Summary — January 2026", category: 'reports', uploadedAt: '2026-01-31', size: '180 KB', type: 'pdf' },
  { id: 'doc2-7', productionId: 'prod-2', name: "Canada Council Grant Progress Report — Q4 2025", category: 'reports', uploadedAt: '2025-12-20', size: '320 KB', type: 'pdf' },

  // prod-3 reports
  { id: 'doc3-6', productionId: 'prod-3', name: "Tour Revenue Report — September 2025", category: 'reports', uploadedAt: '2025-09-30', size: '245 KB', type: 'pdf' },
  { id: 'doc3-7', productionId: 'prod-3', name: "Monthly Investor Update — October 2025", category: 'reports', uploadedAt: '2025-10-31', size: '415 KB', type: 'pdf' },
  { id: 'doc3-8', productionId: 'prod-3', name: "Mid-Tour Financial Review", category: 'reports', uploadedAt: '2025-11-15', size: '510 KB', type: 'pdf' },
  { id: 'doc3-9', productionId: 'prod-3', name: "Q4 2025 Royalty Settlement Report", category: 'reports', uploadedAt: '2026-01-10', size: '185 KB', type: 'pdf' },
]

// ─── MARKETING BUDGET LINES ──────────────────────────────────────────────────

export const MARKETING_BUDGET_LINES: MarketingBudgetLine[] = [
  // prod-1: A Winter's Dream
  { id: 'mb1-1', productionId: 'prod-1', channel: 'digital_social', lineItem: 'Facebook & Instagram Ads', budgeted: 45000, actual: 48200, notes: 'Holiday push exceeded budget' },
  { id: 'mb1-2', productionId: 'prod-1', channel: 'paid_search', lineItem: 'Google Search Ads', budgeted: 22000, actual: 21500, notes: '' },
  { id: 'mb1-3', productionId: 'prod-1', channel: 'print', lineItem: 'Globe and Mail & Playbill Canada Ads', budgeted: 38000, actual: 37200, notes: '' },
  { id: 'mb1-4', productionId: 'prod-1', channel: 'ooh', lineItem: 'TTC Subway & Bus Shelter', budgeted: 55000, actual: 57800, notes: '2-week holiday extension added' },
  { id: 'mb1-5', productionId: 'prod-1', channel: 'email', lineItem: 'Email Campaigns', budgeted: 4000, actual: 3600, notes: '' },
  { id: 'mb1-6', productionId: 'prod-1', channel: 'pr_press', lineItem: 'Press Representative', budgeted: 22000, actual: 22000, notes: '' },
  { id: 'mb1-7', productionId: 'prod-1', channel: 'photography_video', lineItem: 'Production Photography & Trailer', budgeted: 18000, actual: 17400, notes: '' },
  { id: 'mb1-8', productionId: 'prod-1', channel: 'agency_fees', lineItem: 'Agency Retainer (Theatrical)', budgeted: 16000, actual: 16000, notes: '' },
  { id: 'mb1-9', productionId: 'prod-1', channel: 'other', lineItem: 'Group Sales Incentives', budgeted: 8000, actual: 6300, notes: '' },

  // prod-2: The Silence Between
  { id: 'mb2-1', productionId: 'prod-2', channel: 'digital_social', lineItem: 'Social Media Ads', budgeted: 12000, actual: 8500, notes: 'Campaign starts Dec' },
  { id: 'mb2-2', productionId: 'prod-2', channel: 'print', lineItem: 'Globe and Mail & CBC Music Print', budgeted: 14000, actual: 10200, notes: '' },
  { id: 'mb2-3', productionId: 'prod-2', channel: 'email', lineItem: 'Bluma Appel Subscriber Emails', budgeted: 2500, actual: 2500, notes: 'Via Bluma Appel partnership' },
  { id: 'mb2-4', productionId: 'prod-2', channel: 'pr_press', lineItem: 'Press Representative', budgeted: 15000, actual: 10500, notes: 'Through opening night' },
  { id: 'mb2-5', productionId: 'prod-2', channel: 'photography_video', lineItem: 'Rehearsal Photography', budgeted: 6000, actual: 3800, notes: '' },
  { id: 'mb2-6', productionId: 'prod-2', channel: 'agency_fees', lineItem: 'Design & Print Production', budgeted: 9500, actual: 7200, notes: '' },
  { id: 'mb2-7', productionId: 'prod-2', channel: 'other', lineItem: 'Pre-show Talk Promotion', budgeted: 2500, actual: 0, notes: 'Scheduled post-opening' },

  // prod-3: Echoes Tour
  { id: 'mb3-1', productionId: 'prod-3', channel: 'digital_social', lineItem: 'National Social Campaigns', budgeted: 85000, actual: 82000, notes: 'Per-market targeting' },
  { id: 'mb3-2', productionId: 'prod-3', channel: 'paid_search', lineItem: 'Google & Bing Search', budgeted: 42000, actual: 39500, notes: '' },
  { id: 'mb3-3', productionId: 'prod-3', channel: 'radio', lineItem: 'Drive-time Radio Spots', budgeted: 55000, actual: 52000, notes: '18 markets' },
  { id: 'mb3-4', productionId: 'prod-3', channel: 'ooh', lineItem: 'Arena & Transit Posters', budgeted: 38000, actual: 36500, notes: '' },
  { id: 'mb3-5', productionId: 'prod-3', channel: 'tv', lineItem: 'Local TV Spots', budgeted: 65000, actual: 61000, notes: 'Top 10 markets only' },
  { id: 'mb3-6', productionId: 'prod-3', channel: 'email', lineItem: 'Fan Email List', budgeted: 8000, actual: 7200, notes: '' },
  { id: 'mb3-7', productionId: 'prod-3', channel: 'pr_press', lineItem: 'National PR Firm', budgeted: 48000, actual: 45000, notes: '' },
  { id: 'mb3-8', productionId: 'prod-3', channel: 'photography_video', lineItem: 'Tour Sizzle Reel & Assets', budgeted: 22000, actual: 21500, notes: '' },
  { id: 'mb3-9', productionId: 'prod-3', channel: 'agency_fees', lineItem: 'Marketing Agency', budgeted: 17000, actual: 17000, notes: '' },
]

// ─── MARKETING CAMPAIGNS ─────────────────────────────────────────────────────

export const MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  // prod-1: A Winter's Dream
  { id: 'mc1-1', productionId: 'prod-1', title: 'On-Sale Announcement', channel: 'digital_social', startDate: '2025-09-15', endDate: '2025-09-22', status: 'completed', budget: 8000, notes: 'Initial on-sale push' },
  { id: 'mc1-2', productionId: 'prod-1', title: 'Early Bird Campaign', channel: 'email', startDate: '2025-09-23', endDate: '2025-10-15', status: 'completed', budget: 1200, notes: 'Subscriber discount offer' },
  { id: 'mc1-3', productionId: 'prod-1', title: 'TTC Subway Takeover', channel: 'ooh', startDate: '2025-10-27', endDate: '2025-12-27', status: 'completed', budget: 57800, notes: '8-week run, full car cards + station domination' },
  { id: 'mc1-4', productionId: 'prod-1', title: 'Holiday Push — Digital', channel: 'digital_social', startDate: '2025-11-24', endDate: '2025-12-24', status: 'completed', budget: 24000, notes: 'Thanksgiving–Christmas sprint' },
  { id: 'mc1-5', productionId: 'prod-1', title: 'Globe and Mail Full Page', channel: 'print', startDate: '2025-12-07', endDate: '2025-12-07', status: 'completed', budget: 18000, notes: 'Saturday Arts section' },
  { id: 'mc1-6', productionId: 'prod-1', title: 'Closing Week Urgency', channel: 'digital_social', startDate: '2025-12-29', endDate: '2026-01-04', status: 'completed', budget: 5000, notes: 'Last chance messaging' },

  // prod-2: The Silence Between
  { id: 'mc2-1', productionId: 'prod-2', title: 'World Premiere Announcement', channel: 'pr_press', startDate: '2025-10-01', endDate: '2025-10-15', status: 'completed', budget: 3000, notes: 'Press release + media outreach' },
  { id: 'mc2-2', productionId: 'prod-2', title: 'Bluma Appel Season Brochure Feature', channel: 'print', startDate: '2025-10-15', endDate: '2025-10-15', status: 'completed', budget: 0, notes: 'Included in Bluma Appel season materials' },
  { id: 'mc2-3', productionId: 'prod-2', title: 'Composer Profile — Globe and Mail', channel: 'pr_press', startDate: '2025-12-01', endDate: '2025-12-31', status: 'active', budget: 0, notes: 'Pitching feature on Amara Osei' },
  { id: 'mc2-4', productionId: 'prod-2', title: 'Digital Launch Campaign', channel: 'digital_social', startDate: '2025-12-20', endDate: '2026-01-20', status: 'planned', budget: 12000, notes: '4-week pre-opening push' },
  { id: 'mc2-5', productionId: 'prod-2', title: 'Opening Night Press Campaign', channel: 'pr_press', startDate: '2026-02-14', endDate: '2026-02-25', status: 'planned', budget: 4000, notes: 'Reviews + feature placement' },
  { id: 'mc2-6', productionId: 'prod-2', title: 'CBC Music Radio Spots', channel: 'radio', startDate: '2026-01-15', endDate: '2026-02-21', status: 'planned', budget: 8500, notes: '5-week drive-time schedule' },

  // prod-3: Echoes Tour
  { id: 'mc3-1', productionId: 'prod-3', title: 'Tour Announcement', channel: 'digital_social', startDate: '2025-06-01', endDate: '2025-06-14', status: 'completed', budget: 12000, notes: 'National tour announcement across all channels' },
  { id: 'mc3-2', productionId: 'prod-3', title: 'Pre-Sale Email Blast', channel: 'email', startDate: '2025-07-01', endDate: '2025-07-07', status: 'completed', budget: 1500, notes: 'Fan club pre-sale' },
  { id: 'mc3-3', productionId: 'prod-3', title: 'Market-by-Market Radio', channel: 'radio', startDate: '2025-08-01', endDate: '2026-04-01', status: 'active', budget: 52000, notes: 'Rolling market activations, 2 weeks before each city' },
  { id: 'mc3-4', productionId: 'prod-3', title: 'National Social Retargeting', channel: 'digital_social', startDate: '2025-08-15', endDate: '2026-04-15', status: 'active', budget: 55000, notes: 'Always-on retargeting of ticket page visitors' },
  { id: 'mc3-5', productionId: 'prod-3', title: 'TV Spots — Top 10 Markets', channel: 'tv', startDate: '2025-09-01', endDate: '2026-03-01', status: 'active', budget: 61000, notes: 'Rolling 2-week windows per market' },
  { id: 'mc3-6', productionId: 'prod-3', title: 'Sizzle Reel Release', channel: 'photography_video', startDate: '2025-09-10', endDate: '2025-09-10', status: 'completed', budget: 0, notes: 'YouTube + social distribution' },
  { id: 'mc3-7', productionId: 'prod-3', title: 'Closing City Push', channel: 'digital_social', startDate: '2026-03-15', endDate: '2026-04-20', status: 'planned', budget: 15000, notes: 'Final cities + closing announcement' },
]

// ─── CUSTOM EVENTS ────────────────────────────────────────────────────────────

export const CUSTOM_EVENTS: CustomEvent[] = [
  { id: 'ce1-1', productionId: 'prod-1', title: 'Investor Cocktail Reception', date: '2025-11-20', color: '#6366f1', category: 'Investor Relations', notes: 'Princess of Wales Theatre green room — 40 guests' },
  { id: 'ce1-2', productionId: 'prod-1', title: 'Production Photography', date: '2025-11-22', color: '#0891b2', category: 'Marketing', notes: 'Full company call, 10am–2pm' },
  { id: 'ce1-3', productionId: 'prod-1', title: 'Holiday Gala Benefit Performance', date: '2025-12-18', color: '#e11d48', category: 'Special Event', notes: 'Fundraiser, post-show reception' },
  { id: 'ce2-1', productionId: 'prod-2', title: 'Donor Cultivation Dinner', date: '2026-01-18', color: '#059669', category: 'Development', notes: 'Bluma Appel Theatre, board + major donors' },
  { id: 'ce2-2', productionId: 'prod-2', title: 'Composer Talk-Back', date: '2026-02-22', color: '#7c3aed', category: 'Audience Engagement', notes: 'Post-show, Amara Osei on stage' },
  { id: 'ce3-1', productionId: 'prod-3', title: 'Meet & Greet — Chicago', date: '2025-10-26', color: '#d97706', category: 'Fan Event', notes: 'VIP package holders only, backstage' },
  { id: 'ce3-2', productionId: 'prod-3', title: 'Tour Documentary Shoot', date: '2025-11-15', color: '#7c3aed', category: 'Media', notes: 'Follows 3 tour dates — crew of 4' },
  { id: 'ce3-3', productionId: 'prod-3', title: 'Label Showcase — LA', date: '2026-01-10', color: '#0891b2', category: 'Industry', notes: 'Private performance for industry guests' },

  // prod-1 additional
  { id: 'ce1-4', productionId: 'prod-1', title: 'Sitzprobe', date: '2025-11-01', color: '#7c3aed', category: 'Music', notes: 'First rehearsal with full 10-piece orchestra' },
  { id: 'ce1-5', productionId: 'prod-1', title: 'Invited Dress Rehearsal', date: '2025-11-08', color: '#6366f1', category: 'Rehearsal', notes: 'Friends & family preview, notes session to follow' },
  { id: 'ce1-6', productionId: 'prod-1', title: 'Opening Night', date: '2025-11-15', color: '#d97706', category: 'Special Event', notes: 'Opening night celebration — Princess of Wales Theatre green room' },
  { id: 'ce1-7', productionId: 'prod-1', title: 'Press Night', date: '2025-11-18', color: '#e11d48', category: 'Press', notes: 'All major critics in attendance' },
  { id: 'ce1-8', productionId: 'prod-1', title: 'Group Sales Block', date: '2025-12-03', color: '#059669', category: 'Sales', notes: 'Large group buyer event — 200 seats reserved' },
  { id: 'ce1-9', productionId: 'prod-1', title: 'Cast Recording', date: '2025-12-09', color: '#7c3aed', category: 'Recording', notes: 'Original cast album — 2-day session' },

  // prod-2 additional
  { id: 'ce2-3', productionId: 'prod-2', title: 'First Day of Rehearsal', date: '2026-01-12', color: '#0891b2', category: 'Rehearsal', notes: 'Bluma Appel Theatre studio space — company meet and read-through' },
  { id: 'ce2-4', productionId: 'prod-2', title: 'Sitzprobe', date: '2026-02-01', color: '#7c3aed', category: 'Music', notes: 'First rehearsal with chamber orchestra' },
  { id: 'ce2-5', productionId: 'prod-2', title: 'Designer Run-Through', date: '2026-02-05', color: '#0891b2', category: 'Rehearsal', notes: 'Creative team observes first full run' },
  { id: 'ce2-6', productionId: 'prod-2', title: 'Production Photography', date: '2026-02-09', color: '#0891b2', category: 'Marketing', notes: 'Rehearsal photography shoot' },
  { id: 'ce2-7', productionId: 'prod-2', title: 'First Preview', date: '2026-02-14', color: '#d97706', category: 'Performance', notes: 'Valentine\'s Day opening preview' },
  { id: 'ce2-8', productionId: 'prod-2', title: 'Opening Night', date: '2026-02-21', color: '#e11d48', category: 'Special Event', notes: 'Press night same evening — Bluma Appel Theatre lobby reception to follow' },

  // prod-3 additional
  { id: 'ce3-4', productionId: 'prod-3', title: 'Tour Kickoff — Toronto', date: '2025-09-05', color: '#059669', category: 'Performance', notes: 'Scotiabank Arena, Toronto — 2 nights' },
  { id: 'ce3-5', productionId: 'prod-3', title: 'Press Roundtable — Chicago', date: '2025-10-21', color: '#e11d48', category: 'Press', notes: 'Media availability at venue' },
  { id: 'ce3-6', productionId: 'prod-3', title: 'VIP Fan Package — Atlanta', date: '2025-11-08', color: '#d97706', category: 'Fan Event', notes: 'Pre-show soundcheck access for 50 VIP holders' },
  { id: 'ce3-7', productionId: 'prod-3', title: 'Label Industry Showcase — LA', date: '2026-01-10', color: '#0891b2', category: 'Industry', notes: 'Private performance for industry guests' },
  { id: 'ce3-8', productionId: 'prod-3', title: 'Tour Documentary Premiere', date: '2026-02-20', color: '#7c3aed', category: 'Media', notes: 'Streaming premiere of tour documentary film' },
  { id: 'ce3-9', productionId: 'prod-3', title: 'Closing City — Miami', date: '2026-04-18', color: '#059669', category: 'Performance', notes: 'Final 2 nights of tour' },
]

// ─── CONTRACT OBLIGATIONS ─────────────────────────────────────────────────────

export const OBLIGATIONS: ContractObligation[] = [
  // prod-1: A Winter's Dream — post-run obligations
  {
    id: 'obl-1-1', productionId: 'prod-1', contractId: 'c1-5', partyName: 'Premiere Rights LLC',
    type: 'royalty_statement', description: 'Q1 2026 royalty statement to rights holder — 3% gross royalty per agreement',
    dueDate: '2026-04-01', amount: 0, status: 'not_started', owner: 'GM', risk: 'critical',
    source: 'ai_extracted', notes: 'Based on NY rights agreement', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2026-01-06T09:00:00Z',
  },
  {
    id: 'obl-1-2', productionId: 'prod-1', contractId: 'c1-8', partyName: 'Marcus Lee (Choreographer)',
    type: 'approval_required', description: 'Transfer clause approval — choreographer must consent before any production transfer',
    dueDate: '2026-01-10', amount: 0, status: 'in_progress', owner: 'Legal', risk: 'high',
    source: 'ai_extracted', notes: 'Renegotiation in progress per contract status', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2026-01-06T09:00:00Z',
  },
  {
    id: 'obl-1-3', productionId: 'prod-1', contractId: 'c1-9', partyName: 'Horizon Investors LLC',
    type: 'report_due', description: 'Final closing investor report — profit/loss, recoupment status, distribution schedule',
    dueDate: '2026-03-01', amount: 0, status: 'not_started', owner: 'GM', risk: 'high',
    source: 'ai_extracted', notes: 'Required per capitalization agreement', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2026-01-06T09:00:00Z',
  },
  {
    id: 'obl-1-4', productionId: 'prod-1', contractId: 'c1-6', partyName: 'Princess of Wales Theatre',
    type: 'payment_due', description: 'Final venue settlement — post-run reconciliation and closing balance',
    dueDate: '2026-01-20', amount: 28000, status: 'completed', owner: 'Finance', risk: 'low',
    source: 'manual', notes: 'Settled Jan 18 — confirmed', syncedToCalendar: true, syncedToCashFlow: true,
    createdAt: '2026-01-06T09:00:00Z',
  },

  // prod-2: The Silence Between — rehearsal/pre-opening + post-run
  {
    id: 'obl-2-1', productionId: 'prod-2', contractId: 'c2-2', partyName: 'Thomas Kline (Tenor)',
    type: 'signature_required', description: 'CAEA male lead contract — sent Oct 15, awaiting counter-signature',
    dueDate: '2025-11-30', amount: 38000, status: 'not_started', owner: 'Casting', risk: 'critical',
    source: 'ai_extracted', notes: 'No response since Oct 15 — escalate immediately', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-15T09:00:00Z',
  },
  {
    id: 'obl-2-2', productionId: 'prod-2', contractId: 'c2-3', partyName: 'Amara Osei (Composer)',
    type: 'royalty_statement', description: 'Post-run royalty statement — 4% gross royalty for world premiere run',
    dueDate: '2026-04-15', amount: 0, status: 'not_started', owner: 'GM', risk: 'medium',
    source: 'ai_extracted', notes: 'Quarterly report required per commission agreement', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-15T09:00:00Z',
  },
  {
    id: 'obl-2-3', productionId: 'prod-2', contractId: 'c2-6', partyName: 'Canada Council for the Arts Grant',
    type: 'report_due', description: 'Canada Council final programmatic report — outcomes, attendance, budget reconciliation',
    dueDate: '2026-03-30', amount: 0, status: 'completed', owner: 'GM', risk: 'low',
    source: 'ai_extracted', notes: 'Submitted Mar 28 — confirmed received', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-15T09:00:00Z',
  },
  {
    id: 'obl-2-4', productionId: 'prod-2', contractId: 'c2-7', partyName: 'Apex Sound Design',
    type: 'signature_required', description: 'Sound design and rental contract — still in draft, must be executed before tech rehearsal',
    dueDate: '2025-12-01', amount: 35000, status: 'not_started', owner: 'Production', risk: 'critical',
    source: 'ai_extracted', notes: 'In negotiation — blocking tech prep', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-15T09:00:00Z',
  },
  {
    id: 'obl-2-5', productionId: 'prod-2', contractId: 'c2-8', partyName: 'Chamber Orchestra (8)',
    type: 'tax_form_required', description: 'TD1 tax forms for all AFM Local 149 musicians prior to first payroll run',
    dueDate: '2026-01-10', amount: 0, status: 'in_progress', owner: 'Finance', risk: 'medium',
    source: 'manual', notes: '6 of 8 forms received', syncedToCalendar: false, syncedToCashFlow: false,
    createdAt: '2025-11-01T09:00:00Z',
  },
  {
    id: 'obl-2-6', productionId: 'prod-2', contractId: 'c2-3', partyName: 'Amara Osei (Composer)',
    type: 'royalty_payment', description: 'Post-run royalty payment — 4% of net gross for 3-week run',
    dueDate: '2026-05-01', amount: 24800, status: 'not_started', owner: 'Finance', risk: 'medium',
    source: 'ai_extracted', notes: 'Amount estimated from projected gross', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'medium', createdAt: '2025-10-15T09:00:00Z',
  },

  // prod-3: Echoes Tour — active + post-tour
  {
    id: 'obl-3-1', productionId: 'prod-3', contractId: 'c3-4', partyName: 'Remaining 6 Cities (venues)',
    type: 'signature_required', description: 'Venue contracts for remaining 6 cities — terms under negotiation, no executed agreements',
    dueDate: '2025-11-30', amount: 120000, status: 'not_started', owner: 'GM', risk: 'critical',
    source: 'ai_extracted', notes: 'Overdue — cannot confirm dates without executed contracts', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-01T09:00:00Z',
  },
  {
    id: 'obl-3-2', productionId: 'prod-3', contractId: 'c3-7', partyName: 'Evergreen Capital Partners',
    type: 'report_due', description: 'Mid-tour investor progress report — gross to date, projection to close, cash position',
    dueDate: '2026-01-15', amount: 0, status: 'completed', owner: 'GM', risk: 'low',
    source: 'ai_extracted', notes: 'Delivered Jan 12 — well received', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-01T09:00:00Z',
  },
  {
    id: 'obl-3-3', productionId: 'prod-3', contractId: 'c3-7', partyName: 'Evergreen Capital Partners',
    type: 'report_due', description: 'Final closing investor report — full P&L, recoupment calculation, distribution schedule',
    dueDate: '2026-06-30', amount: 0, status: 'not_started', owner: 'GM', risk: 'medium',
    source: 'ai_extracted', notes: 'Due 60 days after tour close (Apr 20)', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-01T09:00:00Z',
  },
  {
    id: 'obl-3-4', productionId: 'prod-3', contractId: 'c3-3', partyName: 'Live Nation Venues (22 cities)',
    type: 'payment_due', description: 'Final tour settlement processing — 90/10 split reconciliation for all 22 cities',
    dueDate: '2026-05-20', amount: 0, status: 'in_progress', owner: 'Finance', risk: 'medium',
    source: 'manual', notes: '14 of 22 cities settled. 8 pending.', syncedToCalendar: true, syncedToCashFlow: true,
    createdAt: '2026-04-22T09:00:00Z',
  },
  {
    id: 'obl-3-5', productionId: 'prod-3', contractId: 'c3-8', partyName: 'National Media Rights',
    type: 'signature_required', description: 'Film/streaming rights agreement for tour documentary — currently in draft',
    dueDate: '2026-01-15', amount: 95000, status: 'not_started', owner: 'Legal', risk: 'high',
    source: 'ai_extracted', notes: 'Documentary premiere Feb 20 — contract must precede', syncedToCalendar: true, syncedToCashFlow: false,
    confidence: 'high', createdAt: '2025-10-01T09:00:00Z',
  },
]

export const PERFORMANCE_DATES: PerformanceDate[] = [
  // A Winter's Dream — Princess of Wales Theatre, Toronto (Sep 15 2026 – Nov 5 2026)
  { id: 'perf-1-1',  productionId: 'prod-1', date: '2026-09-15', time: '20:00', status: 'scheduled', notes: 'Opening Night' },
  { id: 'perf-1-2',  productionId: 'prod-1', date: '2026-09-16', time: '14:00', status: 'scheduled', notes: 'Matinee' },
  { id: 'perf-1-3',  productionId: 'prod-1', date: '2026-09-18', time: '19:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-4',  productionId: 'prod-1', date: '2026-09-19', time: '19:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-5',  productionId: 'prod-1', date: '2026-09-20', time: '19:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-6',  productionId: 'prod-1', date: '2026-09-21', time: '20:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-7',  productionId: 'prod-1', date: '2026-09-22', time: '14:00', status: 'scheduled', notes: 'Matinee' },
  { id: 'perf-1-8',  productionId: 'prod-1', date: '2026-09-22', time: '20:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-9',  productionId: 'prod-1', date: '2026-09-23', time: '15:00', status: 'scheduled', notes: 'Sunday Matinee' },
  { id: 'perf-1-10', productionId: 'prod-1', date: '2026-10-24', time: '14:00', status: 'scheduled', notes: 'Saturday Matinee — advance sold out' },
  { id: 'perf-1-11', productionId: 'prod-1', date: '2026-10-26', time: '19:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-12', productionId: 'prod-1', date: '2026-10-27', time: '14:00', status: 'scheduled', notes: 'Matinee' },
  { id: 'perf-1-13', productionId: 'prod-1', date: '2026-10-31', time: '19:00', status: 'scheduled', notes: 'Halloween gala pricing' },
  { id: 'perf-1-14', productionId: 'prod-1', date: '2026-11-02', time: '19:00', status: 'scheduled', notes: '' },
  { id: 'perf-1-15', productionId: 'prod-1', date: '2026-11-03', time: '14:00', status: 'cancelled',  notes: 'Cancelled — cast illness' },
  { id: 'perf-1-16', productionId: 'prod-1', date: '2026-11-04', time: '15:00', status: 'scheduled', notes: 'Penultimate performance' },
  { id: 'perf-1-17', productionId: 'prod-1', date: '2026-11-05', time: '15:00', status: 'scheduled', notes: 'Closing Performance' },

  // The Silence Between — Bluma Appel Theatre, Toronto (Oct 14 2026 – Nov 8 2026)
  { id: 'perf-2-1',  productionId: 'prod-2', date: '2026-10-14', time: '19:30', status: 'scheduled', notes: 'World Premiere — Opening Night' },
  { id: 'perf-2-2',  productionId: 'prod-2', date: '2026-10-15', time: '15:00', status: 'scheduled', notes: 'Sunday Matinee' },
  { id: 'perf-2-3',  productionId: 'prod-2', date: '2026-10-18', time: '19:30', status: 'scheduled', notes: '' },
  { id: 'perf-2-4',  productionId: 'prod-2', date: '2026-10-20', time: '19:30', status: 'scheduled', notes: '' },
  { id: 'perf-2-5',  productionId: 'prod-2', date: '2026-10-21', time: '14:00', status: 'scheduled', notes: 'Matinee' },
  { id: 'perf-2-6',  productionId: 'prod-2', date: '2026-10-22', time: '15:00', status: 'scheduled', notes: '' },
  { id: 'perf-2-7',  productionId: 'prod-2', date: '2026-10-25', time: '19:30', status: 'scheduled', notes: 'Press Night' },
  { id: 'perf-2-8',  productionId: 'prod-2', date: '2026-10-28', time: '14:00', status: 'scheduled', notes: 'Matinee' },
  { id: 'perf-2-9',  productionId: 'prod-2', date: '2026-11-01', time: '15:00', status: 'scheduled', notes: '' },
  { id: 'perf-2-10', productionId: 'prod-2', date: '2026-11-04', time: '19:30', status: 'postponed', notes: 'Rescheduled from Nov 3 — venue conflict' },
  { id: 'perf-2-11', productionId: 'prod-2', date: '2026-11-06', time: '19:30', status: 'scheduled', notes: '' },
  { id: 'perf-2-12', productionId: 'prod-2', date: '2026-11-07', time: '14:00', status: 'scheduled', notes: 'Matinee' },
  { id: 'perf-2-13', productionId: 'prod-2', date: '2026-11-08', time: '15:00', status: 'scheduled', notes: 'Closing Night' },

  // Echoes: The Concert — National Tour (Sep 2026 – Apr 2027)
  { id: 'perf-3-1',  productionId: 'prod-3', date: '2026-09-05', time: '20:00', status: 'scheduled', notes: 'Tour Opener — Scotiabank Arena, Toronto' },
  { id: 'perf-3-2',  productionId: 'prod-3', date: '2026-09-06', time: '20:00', status: 'scheduled', notes: 'Scotiabank Arena Night 2' },
  { id: 'perf-3-3',  productionId: 'prod-3', date: '2026-09-12', time: '20:00', status: 'scheduled', notes: 'United Center, Chicago' },
  { id: 'perf-3-4',  productionId: 'prod-3', date: '2026-09-14', time: '19:00', status: 'scheduled', notes: 'Chicago Night 2' },
  { id: 'perf-3-5',  productionId: 'prod-3', date: '2026-10-03', time: '20:00', status: 'scheduled', notes: 'The Forum, Los Angeles' },
  { id: 'perf-3-6',  productionId: 'prod-3', date: '2026-10-04', time: '20:00', status: 'scheduled', notes: 'LA Night 2' },
  { id: 'perf-3-7',  productionId: 'prod-3', date: '2026-10-10', time: '20:00', status: 'scheduled', notes: 'Chase Center, San Francisco' },
  { id: 'perf-3-8',  productionId: 'prod-3', date: '2026-11-07', time: '20:00', status: 'scheduled', notes: 'TD Garden, Boston' },
  { id: 'perf-3-9',  productionId: 'prod-3', date: '2026-12-05', time: '20:00', status: 'cancelled',  notes: 'Cancelled — production delay (rescheduled Dec 12)' },
  { id: 'perf-3-10', productionId: 'prod-3', date: '2026-12-12', time: '20:00', status: 'scheduled', notes: 'Spectrum Center, Charlotte' },
  { id: 'perf-3-11', productionId: 'prod-3', date: '2027-01-16', time: '20:00', status: 'scheduled', notes: 'American Airlines Arena, Miami' },
  { id: 'perf-3-12', productionId: 'prod-3', date: '2027-02-06', time: '20:00', status: 'scheduled', notes: 'Smoothie King Center, New Orleans' },
  { id: 'perf-3-13', productionId: 'prod-3', date: '2027-03-06', time: '20:00', status: 'scheduled', notes: 'Ball Arena, Denver' },
  { id: 'perf-3-14', productionId: 'prod-3', date: '2027-04-10', time: '20:00', status: 'scheduled', notes: 'KeyBank Center, Buffalo' },
  { id: 'perf-3-15', productionId: 'prod-3', date: '2027-04-18', time: '20:00', status: 'scheduled', notes: 'PPG Paints Arena, Pittsburgh' },
  { id: 'perf-3-16', productionId: 'prod-3', date: '2027-04-20', time: '20:00', status: 'scheduled', notes: 'Tour Closing — Scotiabank Arena, Toronto' },
]
