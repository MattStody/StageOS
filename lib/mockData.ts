import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, Document } from './types'

export const PRODUCTIONS: Production[] = [
  {
    id: 'prod-1',
    name: "A Winter's Dream",
    subtitle: 'A New Commercial Holiday Musical',
    status: 'in_performance',
    venue: 'St. James Theatre, New York',
    openingDate: '2025-11-15',
    closingDate: '2026-01-05',
    totalBudget: 2800000,
    totalActual: 2641000,
    cashOnHand: 412000,
    projectedGross: 3200000,
    currentGross: 1840000,
    color: '#6366f1',
  },
  {
    id: 'prod-2',
    name: 'The Silence Between',
    subtitle: 'A New Opera — Nonprofit Production',
    status: 'in_rehearsal',
    venue: 'Brooklyn Academy of Music, Harvey Theater',
    openingDate: '2026-02-14',
    closingDate: '2026-03-08',
    totalBudget: 980000,
    totalActual: 386000,
    cashOnHand: 295000,
    projectedGross: 620000,
    currentGross: 0,
    color: '#0891b2',
  },
  {
    id: 'prod-3',
    name: 'Echoes: The Concert',
    subtitle: 'A National Touring Concert Production',
    status: 'in_performance',
    venue: 'Multi-city Tour',
    openingDate: '2025-09-05',
    closingDate: '2026-04-20',
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
  { id: 'b1-3', productionId: 'prod-1', category: 'Cast', lineItem: 'Principal Salaries', budgeted: 320000, committed: 320000, actual: 310000, notes: 'AEA contracts' },
  { id: 'b1-4', productionId: 'prod-1', category: 'Cast', lineItem: 'Ensemble Salaries', budgeted: 180000, committed: 180000, actual: 175000, notes: '' },
  { id: 'b1-5', productionId: 'prod-1', category: 'Cast', lineItem: 'Understudies', budgeted: 45000, committed: 45000, actual: 43000, notes: '' },
  { id: 'b1-6', productionId: 'prod-1', category: 'Creative Team', lineItem: 'Director Fee', budgeted: 75000, committed: 75000, actual: 75000, notes: '' },
  { id: 'b1-7', productionId: 'prod-1', category: 'Creative Team', lineItem: 'Choreographer', budgeted: 55000, committed: 55000, actual: 55000, notes: '' },
  { id: 'b1-8', productionId: 'prod-1', category: 'Creative Team', lineItem: 'Music Director', budgeted: 40000, committed: 40000, actual: 38000, notes: '' },
  { id: 'b1-9', productionId: 'prod-1', category: 'Musicians', lineItem: 'Orchestra (10 players)', budgeted: 95000, committed: 95000, actual: 92000, notes: 'AFM Local 802' },
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
  { id: 'b2-2', productionId: 'prod-2', category: 'Cast', lineItem: 'Principal Singers', budgeted: 145000, committed: 145000, actual: 72500, notes: 'AGMA contracts' },
  { id: 'b2-3', productionId: 'prod-2', category: 'Creative Team', lineItem: 'Stage Director', budgeted: 38000, committed: 38000, actual: 19000, notes: '' },
  { id: 'b2-4', productionId: 'prod-2', category: 'Creative Team', lineItem: 'Conductor', budgeted: 32000, committed: 32000, actual: 16000, notes: '' },
  { id: 'b2-5', productionId: 'prod-2', category: 'Musicians', lineItem: 'Chamber Orchestra', budgeted: 120000, committed: 120000, actual: 60000, notes: 'AFM' },
  { id: 'b2-6', productionId: 'prod-2', category: 'Set', lineItem: 'Scenic Design', budgeted: 85000, committed: 90000, actual: 42000, notes: '' },
  { id: 'b2-7', productionId: 'prod-2', category: 'Costumes', lineItem: 'Costume Design', budgeted: 55000, committed: 55000, actual: 25000, notes: '' },
  { id: 'b2-8', productionId: 'prod-2', category: 'Lighting', lineItem: 'Lighting', budgeted: 48000, committed: 48000, actual: 22000, notes: '' },
  { id: 'b2-9', productionId: 'prod-2', category: 'Sound', lineItem: 'Sound Design', budgeted: 35000, committed: 35000, actual: 18000, notes: '' },
  { id: 'b2-10', productionId: 'prod-2', category: 'Venue Rental', lineItem: 'BAM Harvey Rental', budgeted: 95000, committed: 95000, actual: 0, notes: 'Settlement post-run' },
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
  // prod-1: A Winter's Dream (8 weeks)
  { id: 'r1-1', productionId: 'prod-1', weekEnding: '2025-11-22', performances: 8, ticketsSold: 1820, grossRevenue: 218400, avgTicketPrice: 120, capacityPct: 62, comps: 85, discounts: 12000, netRevenue: 204000, totalSeats: 2932 },
  { id: 'r1-2', productionId: 'prod-1', weekEnding: '2025-11-29', performances: 8, ticketsSold: 2340, grossRevenue: 303000, avgTicketPrice: 129, capacityPct: 80, comps: 60, discounts: 8500, netRevenue: 286000, totalSeats: 2932 },
  { id: 'r1-3', productionId: 'prod-1', weekEnding: '2025-12-06', performances: 8, ticketsSold: 2200, grossRevenue: 286000, avgTicketPrice: 130, capacityPct: 75, comps: 72, discounts: 9800, netRevenue: 269000, totalSeats: 2932 },
  { id: 'r1-4', productionId: 'prod-1', weekEnding: '2025-12-13', performances: 8, ticketsSold: 2540, grossRevenue: 341000, avgTicketPrice: 134, capacityPct: 87, comps: 45, discounts: 6200, netRevenue: 326000, totalSeats: 2932 },
  { id: 'r1-5', productionId: 'prod-1', weekEnding: '2025-12-20', performances: 10, ticketsSold: 2932, grossRevenue: 428000, avgTicketPrice: 146, capacityPct: 100, comps: 30, discounts: 4000, netRevenue: 417000, totalSeats: 2932 },
  { id: 'r1-6', productionId: 'prod-1', weekEnding: '2025-12-27', performances: 10, ticketsSold: 2932, grossRevenue: 447000, avgTicketPrice: 152, capacityPct: 100, comps: 20, discounts: 2000, netRevenue: 438000, totalSeats: 2932 },
  { id: 'r1-7', productionId: 'prod-1', weekEnding: '2026-01-03', performances: 8, ticketsSold: 2680, grossRevenue: 348000, avgTicketPrice: 130, capacityPct: 91, comps: 55, discounts: 7200, netRevenue: 333000, totalSeats: 2932 },
  { id: 'r1-8', productionId: 'prod-1', weekEnding: '2026-01-05', performances: 3, ticketsSold: 820, grossRevenue: 109600, avgTicketPrice: 134, capacityPct: 94, comps: 18, discounts: 1800, netRevenue: 104000, totalSeats: 2932 },

  // prod-3: Echoes Tour (18 weeks of tour so far)
  { id: 'r3-1', productionId: 'prod-3', weekEnding: '2025-09-13', performances: 4, ticketsSold: 24000, grossRevenue: 528000, avgTicketPrice: 22, capacityPct: 78, comps: 600, discounts: 18000, netRevenue: 498000, totalSeats: 30800 },
  { id: 'r3-2', productionId: 'prod-3', weekEnding: '2025-09-20', performances: 5, ticketsSold: 31500, grossRevenue: 724500, avgTicketPrice: 23, capacityPct: 82, comps: 500, discounts: 22000, netRevenue: 690000, totalSeats: 38500 },
  { id: 'r3-3', productionId: 'prod-3', weekEnding: '2025-09-27', performances: 4, ticketsSold: 28000, grossRevenue: 644000, avgTicketPrice: 23, capacityPct: 85, comps: 420, discounts: 16500, netRevenue: 614000, totalSeats: 32900 },
  { id: 'r3-4', productionId: 'prod-3', weekEnding: '2025-10-04', performances: 5, ticketsSold: 33000, grossRevenue: 792000, avgTicketPrice: 24, capacityPct: 86, comps: 480, discounts: 21000, netRevenue: 755000, totalSeats: 38400 },
  { id: 'r3-5', productionId: 'prod-3', weekEnding: '2025-10-11', performances: 4, ticketsSold: 29500, grossRevenue: 708000, avgTicketPrice: 24, capacityPct: 88, comps: 390, discounts: 17000, netRevenue: 675000, totalSeats: 33500 },
  { id: 'r3-6', productionId: 'prod-3', weekEnding: '2025-10-18', performances: 5, ticketsSold: 34200, grossRevenue: 838900, avgTicketPrice: 24.5, capacityPct: 89, comps: 450, discounts: 19500, netRevenue: 803000, totalSeats: 38400 },
  { id: 'r3-7', productionId: 'prod-3', weekEnding: '2025-10-25', performances: 4, ticketsSold: 30000, grossRevenue: 750000, avgTicketPrice: 25, capacityPct: 90, comps: 350, discounts: 15000, netRevenue: 720000, totalSeats: 33300 },
  { id: 'r3-8', productionId: 'prod-3', weekEnding: '2025-11-01', performances: 5, ticketsSold: 35500, grossRevenue: 888000, avgTicketPrice: 25, capacityPct: 92, comps: 400, discounts: 16000, netRevenue: 857000, totalSeats: 38600 },
]

// ─── CONTRACTS ───────────────────────────────────────────────────────────────

export const CONTRACTS: Contract[] = [
  // prod-1
  { id: 'c1-1', productionId: 'prod-1', partyName: 'Jordan A. Mercer', contractType: 'cast', status: 'signed', dueDate: '2025-09-01', fee: 28000, keyObligations: 'Lead role, exclusive through closing', notes: 'AEA principal', hasFile: true },
  { id: 'c1-2', productionId: 'prod-1', partyName: 'Sarah Chen', contractType: 'cast', status: 'signed', dueDate: '2025-09-01', fee: 22000, keyObligations: 'Supporting lead', notes: 'AEA', hasFile: true },
  { id: 'c1-3', productionId: 'prod-1', partyName: 'Ensemble (12)', contractType: 'cast', status: 'signed', dueDate: '2025-09-01', fee: 148000, keyObligations: 'AEA minimum + 15%', notes: '', hasFile: true },
  { id: 'c1-4', productionId: 'prod-1', partyName: 'Daniel Rivera (Director)', contractType: 'creative', status: 'signed', dueDate: '2025-07-01', fee: 75000, keyObligations: 'Approval rights over design elements', notes: '', hasFile: true },
  { id: 'c1-5', productionId: 'prod-1', partyName: 'Premiere Rights LLC', contractType: 'rights', status: 'signed', dueDate: '2025-06-01', fee: 45000, keyObligations: 'NY rights only, 3% gross royalty', notes: 'Option exercised', hasFile: true },
  { id: 'c1-6', productionId: 'prod-1', partyName: 'St. James Theatre', contractType: 'venue', status: 'signed', dueDate: '2025-08-01', fee: 320000, keyObligations: 'Exclusive booking Nov 15 – Jan 5', notes: '', hasFile: true },
  { id: 'c1-7', productionId: 'prod-1', partyName: 'Pinnacle Scenic Studios', contractType: 'vendor', status: 'signed', dueDate: '2025-09-15', fee: 198000, keyObligations: 'Delivery by Oct 30 load-in', notes: 'Over budget — approved', hasFile: true },
  { id: 'c1-8', productionId: 'prod-1', partyName: 'Marcus Lee (Choreographer)', contractType: 'creative', status: 'needs_review', dueDate: '2026-01-10', fee: 55000, keyObligations: 'Closing fee + transfer clause', notes: 'Renegotiation for potential transfer', hasFile: false },
  { id: 'c1-9', productionId: 'prod-1', partyName: 'Horizon Investors LLC', contractType: 'investor', status: 'signed', dueDate: '2025-05-15', fee: 500000, keyObligations: 'Capitalization agreement, recoupment at 110%', notes: '', hasFile: true },
  { id: 'c1-10', productionId: 'prod-1', partyName: 'Lightworks (Lighting)', contractType: 'vendor', status: 'signed', dueDate: '2025-10-01', fee: 95000, keyObligations: 'Equipment rental through closing', notes: '', hasFile: true },

  // prod-2
  { id: 'c2-1', productionId: 'prod-2', partyName: 'Elena Vasquez (Soprano)', contractType: 'cast', status: 'signed', dueDate: '2025-10-15', fee: 48000, keyObligations: 'Title role, AGMA', notes: '', hasFile: true },
  { id: 'c2-2', productionId: 'prod-2', partyName: 'Thomas Kline (Tenor)', contractType: 'cast', status: 'sent', dueDate: '2025-11-01', fee: 38000, keyObligations: 'Male lead, AGMA', notes: 'Awaiting counter-signature', hasFile: false },
  { id: 'c2-3', productionId: 'prod-2', partyName: 'Amara Osei (Composer)', contractType: 'rights', status: 'signed', dueDate: '2025-08-01', fee: 35000, keyObligations: 'Commission fee + 4% gross royalty', notes: 'World premiere rights', hasFile: true },
  { id: 'c2-4', productionId: 'prod-2', partyName: 'BAM Harvey Theater', contractType: 'venue', status: 'signed', dueDate: '2025-09-01', fee: 95000, keyObligations: 'Feb 14 – Mar 8, 2026', notes: '', hasFile: true },
  { id: 'c2-5', productionId: 'prod-2', partyName: 'Dr. Fiona Walsh (Director)', contractType: 'creative', status: 'signed', dueDate: '2025-09-01', fee: 38000, keyObligations: 'Approval rights, revival rights held 5 yrs', notes: '', hasFile: true },
  { id: 'c2-6', productionId: 'prod-2', partyName: 'NEA Grant Agreement', contractType: 'investor', status: 'signed', dueDate: '2025-07-01', fee: 75000, keyObligations: 'Reporting requirements, non-commercial clause', notes: 'Final report due Mar 30', hasFile: true },
  { id: 'c2-7', productionId: 'prod-2', partyName: 'Apex Sound Design', contractType: 'vendor', status: 'draft', dueDate: '2025-12-01', fee: 35000, keyObligations: 'Design and rental through closing', notes: 'In negotiation', hasFile: false },
  { id: 'c2-8', productionId: 'prod-2', partyName: 'Chamber Orchestra (8)', contractType: 'employment', status: 'sent', dueDate: '2025-12-15', fee: 95000, keyObligations: 'AFM touring rates, 3-week run', notes: '', hasFile: false },

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
  // prod-1: weeks through closing
  { id: 'cf1-1', productionId: 'prod-1', weekOf: '2025-11-17', startingCash: 620000, ticketRevenue: 218400, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 28000, royalties: 6552, vendorPayments: 15000, otherOutflows: 8000, closingCash: 675848 },
  { id: 'cf1-2', productionId: 'prod-1', weekOf: '2025-11-24', startingCash: 675848, ticketRevenue: 303000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 22000, royalties: 9090, vendorPayments: 12000, otherOutflows: 5000, closingCash: 825758 },
  { id: 'cf1-3', productionId: 'prod-1', weekOf: '2025-12-01', startingCash: 825758, ticketRevenue: 286000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 20000, royalties: 8580, vendorPayments: 10000, otherOutflows: 4500, closingCash: 963678 },
  { id: 'cf1-4', productionId: 'prod-1', weekOf: '2025-12-08', startingCash: 963678, ticketRevenue: 341000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 18000, royalties: 10230, vendorPayments: 8000, otherOutflows: 4000, closingCash: 1159448 },
  { id: 'cf1-5', productionId: 'prod-1', weekOf: '2025-12-15', startingCash: 1159448, ticketRevenue: 428000, otherInflows: 0, payroll: 72000, venueCosts: 48000, marketing: 15000, royalties: 12840, vendorPayments: 8000, otherOutflows: 3000, closingCash: 1428608 },
  { id: 'cf1-6', productionId: 'prod-1', weekOf: '2025-12-22', startingCash: 1428608, ticketRevenue: 447000, otherInflows: 0, payroll: 72000, venueCosts: 48000, marketing: 12000, royalties: 13410, vendorPayments: 6000, otherOutflows: 3000, closingCash: 1721198 },
  { id: 'cf1-7', productionId: 'prod-1', weekOf: '2025-12-29', startingCash: 1721198, ticketRevenue: 348000, otherInflows: 0, payroll: 65000, venueCosts: 40000, marketing: 10000, royalties: 10440, vendorPayments: 5000, otherOutflows: 2500, closingCash: 1936258 },
  { id: 'cf1-8', productionId: 'prod-1', weekOf: '2026-01-05', startingCash: 1936258, ticketRevenue: 109600, otherInflows: 0, payroll: 25000, venueCosts: 18000, marketing: 4000, royalties: 3288, vendorPayments: 40000, otherOutflows: 35000, closingCash: 1920570 },

  // prod-2: The Silence Between (pre-production weeks)
  { id: 'cf2-1', productionId: 'prod-2', weekOf: '2025-11-17', startingCash: 380000, ticketRevenue: 0, otherInflows: 0, payroll: 18000, venueCosts: 0, marketing: 8000, royalties: 0, vendorPayments: 12000, otherOutflows: 5000, closingCash: 337000 },
  { id: 'cf2-2', productionId: 'prod-2', weekOf: '2025-11-24', startingCash: 337000, ticketRevenue: 0, otherInflows: 0, payroll: 18000, venueCosts: 0, marketing: 9500, royalties: 0, vendorPayments: 15000, otherOutflows: 4500, closingCash: 290000 },
  { id: 'cf2-3', productionId: 'prod-2', weekOf: '2025-12-01', startingCash: 290000, ticketRevenue: 42000, otherInflows: 0, payroll: 22000, venueCosts: 8000, marketing: 12000, royalties: 0, vendorPayments: 8000, otherOutflows: 3500, closingCash: 278500 },
  { id: 'cf2-4', productionId: 'prod-2', weekOf: '2025-12-08', startingCash: 278500, ticketRevenue: 55000, otherInflows: 0, payroll: 22000, venueCosts: 8000, marketing: 12000, royalties: 0, vendorPayments: 6000, otherOutflows: 3000, closingCash: 282500 },
  { id: 'cf2-5', productionId: 'prod-2', weekOf: '2025-12-15', startingCash: 282500, ticketRevenue: 68000, otherInflows: 0, payroll: 25000, venueCosts: 10000, marketing: 14000, royalties: 0, vendorPayments: 6000, otherOutflows: 3000, closingCash: 292500 },

  // prod-3: Echoes Tour
  { id: 'cf3-1', productionId: 'prod-3', weekOf: '2025-11-17', startingCash: 820000, ticketRevenue: 888000, otherInflows: 0, payroll: 85000, venueCosts: 62000, marketing: 22000, royalties: 26640, vendorPayments: 18000, otherOutflows: 8000, closingCash: 1486360 },
  { id: 'cf3-2', productionId: 'prod-3', weekOf: '2025-11-24', startingCash: 1486360, ticketRevenue: 720000, otherInflows: 0, payroll: 85000, venueCosts: 58000, marketing: 20000, royalties: 21600, vendorPayments: 16000, otherOutflows: 7000, closingCash: 1998760 },
  { id: 'cf3-3', productionId: 'prod-3', weekOf: '2025-12-01', startingCash: 1998760, ticketRevenue: 755000, otherInflows: 0, payroll: 85000, venueCosts: 60000, marketing: 18000, royalties: 22650, vendorPayments: 15000, otherOutflows: 7500, closingCash: 2545610 },
  { id: 'cf3-4', productionId: 'prod-3', weekOf: '2025-12-08', startingCash: 2545610, ticketRevenue: 803000, otherInflows: 0, payroll: 85000, venueCosts: 62000, marketing: 16000, royalties: 24090, vendorPayments: 14000, otherOutflows: 7000, closingCash: 3140520 },
  { id: 'cf3-5', productionId: 'prod-3', weekOf: '2025-12-15', startingCash: 3140520, ticketRevenue: 850000, otherInflows: 0, payroll: 85000, venueCosts: 65000, marketing: 14000, royalties: 25500, vendorPayments: 13000, otherOutflows: 6500, closingCash: 3781520 },
]

// ─── DEADLINES ────────────────────────────────────────────────────────────────

export const DEADLINES: Deadline[] = [
  // prod-1
  { id: 'd1-1', productionId: 'prod-1', title: 'Final settlement with St. James', date: '2026-01-20', type: 'settlement', status: 'upcoming', notes: 'Coordinate with venue manager', assignedTo: 'Finance' },
  { id: 'd1-2', productionId: 'prod-1', title: 'Royalty report — Q4', date: '2026-01-15', type: 'royalty', status: 'upcoming', notes: 'Submit to rights holders', assignedTo: 'GM' },
  { id: 'd1-3', productionId: 'prod-1', title: 'Closing night', date: '2026-01-05', type: 'closing', status: 'completed', notes: '', assignedTo: 'Production' },
  { id: 'd1-4', productionId: 'prod-1', title: 'Investor closing notice', date: '2026-01-12', type: 'general', status: 'upcoming', notes: 'Notify Horizon Investors', assignedTo: 'GM' },
  { id: 'd1-5', productionId: 'prod-1', title: 'Choreographer renegotiation deadline', date: '2026-01-10', type: 'contract', status: 'at_risk', notes: 'Transfer clause must be resolved', assignedTo: 'Legal' },
  { id: 'd1-6', productionId: 'prod-1', title: 'Final payroll run', date: '2026-01-08', type: 'payroll', status: 'upcoming', notes: 'AEA closeout payroll', assignedTo: 'Finance' },

  // prod-2
  { id: 'd2-1', productionId: 'prod-2', title: 'Tenor contract signed', date: '2025-11-30', type: 'contract', status: 'overdue', notes: 'Thomas Kline — sent Oct 15, no response', assignedTo: 'Casting' },
  { id: 'd2-2', productionId: 'prod-2', title: 'Orchestrations delivered', date: '2025-12-15', type: 'general', status: 'upcoming', notes: 'From composer Amara Osei', assignedTo: 'Music' },
  { id: 'd2-3', productionId: 'prod-2', title: 'Rehearsals begin', date: '2026-01-12', type: 'rehearsal', status: 'upcoming', notes: 'BAM studio space confirmed', assignedTo: 'Stage Management' },
  { id: 'd2-4', productionId: 'prod-2', title: 'Tech rehearsal start', date: '2026-02-07', type: 'tech', status: 'upcoming', notes: '', assignedTo: 'Stage Management' },
  { id: 'd2-5', productionId: 'prod-2', title: 'First preview', date: '2026-02-14', type: 'preview', status: 'upcoming', notes: '', assignedTo: 'Production' },
  { id: 'd2-6', productionId: 'prod-2', title: 'Opening night', date: '2026-02-21', type: 'opening', status: 'upcoming', notes: 'Press night same evening', assignedTo: 'Production' },
  { id: 'd2-7', productionId: 'prod-2', title: 'Sound vendor contract finalized', date: '2025-12-01', type: 'contract', status: 'overdue', notes: 'Apex Sound still in draft', assignedTo: 'Production' },
  { id: 'd2-8', productionId: 'prod-2', title: 'Marketing launch — digital', date: '2025-12-20', type: 'marketing', status: 'upcoming', notes: 'Social + email push', assignedTo: 'Marketing' },
  { id: 'd2-9', productionId: 'prod-2', title: 'NEA grant final report', date: '2026-03-30', type: 'royalty', status: 'upcoming', notes: 'Required per grant agreement', assignedTo: 'GM' },

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
  { id: 'doc1-2', productionId: 'prod-1', name: 'St. James Theatre License Agreement', category: 'contracts', uploadedAt: '2025-08-22', size: '1.2 MB', type: 'pdf' },
  { id: 'doc1-3', productionId: 'prod-1', name: 'Capitalization Agreement — Horizon Investors', category: 'contracts', uploadedAt: '2025-05-20', size: '2.4 MB', type: 'pdf' },
  { id: 'doc1-4', productionId: 'prod-1', name: 'Production Insurance Certificate', category: 'insurance', uploadedAt: '2025-09-30', size: '380 KB', type: 'pdf' },
  { id: 'doc1-5', productionId: 'prod-1', name: 'Holiday Campaign Brief', category: 'marketing', uploadedAt: '2025-10-01', size: '5.1 MB', type: 'pdf' },
  { id: 'doc1-6', productionId: 'prod-1', name: 'Weekly Report — Dec 13 2025', category: 'reports', uploadedAt: '2025-12-13', size: '210 KB', type: 'pdf' },

  { id: 'doc2-1', productionId: 'prod-2', name: 'The Silence Between — Production Budget', category: 'budgets', uploadedAt: '2025-09-10', size: '710 KB', type: 'xlsx' },
  { id: 'doc2-2', productionId: 'prod-2', name: 'BAM Harvey Theater Agreement', category: 'contracts', uploadedAt: '2025-09-05', size: '980 KB', type: 'pdf' },
  { id: 'doc2-3', productionId: 'prod-2', name: 'NEA Grant Award Letter', category: 'legal', uploadedAt: '2025-07-08', size: '220 KB', type: 'pdf' },
  { id: 'doc2-4', productionId: 'prod-2', name: 'Commission Agreement — Amara Osei', category: 'contracts', uploadedAt: '2025-08-02', size: '1.1 MB', type: 'pdf' },

  { id: 'doc3-1', productionId: 'prod-3', name: 'Echoes Tour — Master Budget', category: 'budgets', uploadedAt: '2025-07-01', size: '1.8 MB', type: 'xlsx' },
  { id: 'doc3-2', productionId: 'prod-3', name: 'Kai Monroe Tour Agreement', category: 'contracts', uploadedAt: '2025-06-15', size: '3.2 MB', type: 'pdf' },
  { id: 'doc3-3', productionId: 'prod-3', name: 'Live Nation Venue Package', category: 'contracts', uploadedAt: '2025-07-20', size: '2.9 MB', type: 'pdf' },
  { id: 'doc3-4', productionId: 'prod-3', name: 'Touring Insurance — All Risks Policy', category: 'insurance', uploadedAt: '2025-07-01', size: '460 KB', type: 'pdf' },
  { id: 'doc3-5', productionId: 'prod-3', name: 'Evergreen Capital Agreement', category: 'contracts', uploadedAt: '2025-05-10', size: '4.1 MB', type: 'pdf' },
]
