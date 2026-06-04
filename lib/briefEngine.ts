import type { Production, BudgetLine, RevenueWeek, Contract, CashFlowRow, Deadline, MarketingBudgetLine, MarketingCampaign } from './types'
import { fmt, fmtPct, formatDate, daysUntil, variancePct, budgetUsedPct } from './utils'
import { computeCoreForecast, type CoreForecast } from './forecasting'

// ── Public types ────────────────────────────────────────────────────────────

export type BriefAudience = 'gm' | 'board' | 'investor' | 'marketing' | 'executive_director'
export type BriefTone = 'concise' | 'detailed' | 'formal' | 'plain_english'
export type BriefSectionKey =
  | 'executive_summary' | 'financial_position' | 'revenue_sales'
  | 'forecast' | 'cash_flow' | 'contracts' | 'deadlines'
  | 'marketing' | 'labour_risk' | 'decisions' | 'next_7_days'
export type OverallRisk = 'healthy' | 'watch' | 'at_risk' | 'critical'

export interface BriefConfig {
  productionId: string
  periodStart: string
  periodEnd: string
  audience: BriefAudience
  tone: BriefTone
  sections: BriefSectionKey[]
}

export interface Decision {
  title: string
  context: string
  recommendation: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  owner: string
}

export interface BriefMetric {
  label: string
  value: string
  sub?: string
  flag?: 'ok' | 'warn' | 'risk'
}

export interface BriefSection {
  key: BriefSectionKey
  title: string
  narrative: string
  metrics?: BriefMetric[]
  bullets?: string[]
  decisions?: Decision[]
  checklist?: string[]
  dataMissing?: string
}

export interface BriefReport {
  config: BriefConfig
  generatedAt: string
  productionName: string
  venue: string
  status: string
  openingDate: string
  closingDate: string
  audience: BriefAudience
  tone: BriefTone
  overallRisk: OverallRisk
  sections: BriefSection[]
  emailSubject: string
  emailBody: string
}

export interface BriefRawData {
  production: Production
  budgetLines: BudgetLine[]
  revenueWeeks: RevenueWeek[]
  contracts: Contract[]
  cashFlowRows: CashFlowRow[]
  deadlines: Deadline[]
  marketingBudgetLines: MarketingBudgetLine[]
  marketingCampaigns: MarketingCampaign[]
}

const SECTION_TITLES: Record<BriefSectionKey, string> = {
  executive_summary: 'Executive Summary',
  financial_position: 'Financial Position',
  revenue_sales: 'Revenue & Sales Pace',
  forecast: 'Forecast & Breakeven',
  cash_flow: 'Cash Flow',
  contracts: 'Contracts & Obligations',
  deadlines: 'Deadlines & Calendar',
  marketing: 'Marketing',
  labour_risk: 'Labour & Cost Risk',
  decisions: 'Decisions Needed',
  next_7_days: 'Next 7 Days',
}

// ── Internal context ────────────────────────────────────────────────────────

interface Ctx {
  prod: Production
  tone: BriefTone
  audience: BriefAudience
  periodStart: Date
  periodEnd: Date
  periodLabel: string

  allLines: BudgetLine[]
  totalBudgeted: number
  totalActual: number
  totalCommitted: number
  budgetPct: number
  highVarLines: BudgetLine[]
  categoryMap: Record<string, { budgeted: number; actual: number }>

  allWeeks: RevenueWeek[]
  periodWeeks: RevenueWeek[]
  priorWeeks: RevenueWeek[]
  periodGross: number
  periodNet: number
  periodTickets: number
  periodComps: number
  periodDiscounts: number
  periodAvgATP: number
  periodAvgCapacity: number
  cumGross: number
  lastWeek: RevenueWeek | undefined
  prevWeek: RevenueWeek | undefined
  weekOverWeekChange: number

  forecast: CoreForecast | null

  allCashRows: CashFlowRow[]
  periodCashRows: CashFlowRow[]
  cashBalance: number
  openingCash: number
  periodInflows: number
  periodOutflows: number
  periodPayroll: number
  periodVenue: number
  periodMktCash: number
  periodRoyalties: number
  lowestBalance: number
  weeksBelowZero: number

  allContracts: Contract[]
  signed: Contract[]
  unsigned: Contract[]
  overdueContracts: Contract[]
  nearDueContracts: Contract[]
  needsReview: Contract[]
  expired: Contract[]

  allDeadlines: Deadline[]
  overdueDeadlines: Deadline[]
  atRiskDeadlines: Deadline[]
  upcoming7: Deadline[]
  upcoming14: Deadline[]

  mktLines: MarketingBudgetLine[]
  mktCampaigns: MarketingCampaign[]
  totalMktBudgeted: number
  totalMktActual: number
  overspendChannels: MarketingBudgetLine[]
  activeCampaigns: MarketingCampaign[]

  labourLines: BudgetLine[]
  labourBudgeted: number
  labourActual: number

  riskScore: number
  overallRisk: OverallRisk
  riskFactors: string[]
}

// ── Context builder ─────────────────────────────────────────────────────────

function buildCtx(config: BriefConfig, raw: BriefRawData): Ctx {
  const { production: prod, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, marketingBudgetLines, marketingCampaigns } = raw
  const periodStart = new Date(config.periodStart)
  const periodEnd = new Date(config.periodEnd)
  const periodLabel = `${formatDate(config.periodStart)} – ${formatDate(config.periodEnd)}`

  // Budget
  const allLines = budgetLines
  const totalBudgeted = allLines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual = allLines.reduce((s, l) => s + l.actual, 0)
  const totalCommitted = allLines.reduce((s, l) => s + l.committed, 0)
  const budgetPct = budgetUsedPct(totalActual, totalBudgeted)
  const highVarLines = allLines.filter(l => l.budgeted > 0 && Math.abs(variancePct(l.actual, l.budgeted)) > 10 && l.actual > 0)

  const categoryMap: Record<string, { budgeted: number; actual: number }> = {}
  for (const l of allLines) {
    if (!categoryMap[l.category]) categoryMap[l.category] = { budgeted: 0, actual: 0 }
    categoryMap[l.category].budgeted += l.budgeted
    categoryMap[l.category].actual += l.actual
  }

  // Revenue
  const allWeeks = [...revenueWeeks].sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())
  const periodWeeks = allWeeks.filter(w => {
    const t = new Date(w.weekEnding).getTime()
    return t >= periodStart.getTime() && t <= periodEnd.getTime() + 86400000
  })
  const periodLenMs = periodEnd.getTime() - periodStart.getTime()
  const priorStart = new Date(periodStart.getTime() - periodLenMs - 86400000)
  const priorWeeks = allWeeks.filter(w => {
    const t = new Date(w.weekEnding).getTime()
    return t >= priorStart.getTime() && t < periodStart.getTime()
  })

  const periodGross = periodWeeks.reduce((s, w) => s + w.grossRevenue, 0)
  const periodNet = periodWeeks.reduce((s, w) => s + w.netRevenue, 0)
  const periodTickets = periodWeeks.reduce((s, w) => s + w.ticketsSold, 0)
  const periodComps = periodWeeks.reduce((s, w) => s + w.comps, 0)
  const periodDiscounts = periodWeeks.reduce((s, w) => s + w.discounts, 0)
  const periodAvgATP = periodTickets > 0 ? periodGross / periodTickets : 0
  const periodAvgCapacity = periodWeeks.length > 0 ? periodWeeks.reduce((s, w) => s + w.capacityPct, 0) / periodWeeks.length : 0
  const cumGross = allWeeks.reduce((s, w) => s + w.grossRevenue, 0)

  const lastWeek = allWeeks[allWeeks.length - 1]
  const prevWeek = allWeeks[allWeeks.length - 2]
  const weekOverWeekChange = lastWeek && prevWeek ? lastWeek.grossRevenue - prevWeek.grossRevenue : 0

  // Forecast
  let forecast: CoreForecast | null = null
  if (allWeeks.length >= 2) {
    try { forecast = computeCoreForecast(prod, allWeeks, cashFlowRows, budgetLines) } catch { /* no-op */ }
  }

  // Cash
  const allCashRows = [...cashFlowRows].sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())
  const periodCashRows = allCashRows.filter(r => {
    const t = new Date(r.weekOf).getTime()
    return t >= periodStart.getTime() && t <= periodEnd.getTime() + 86400000
  })
  const lastCash = allCashRows[allCashRows.length - 1]
  const cashBalance = lastCash?.closingCash ?? prod.cashOnHand
  const openingCash = periodCashRows.length > 0 ? periodCashRows[0].startingCash : cashBalance
  const periodInflows = periodCashRows.reduce((s, r) => s + r.ticketRevenue + r.otherInflows, 0)
  const periodOutflows = periodCashRows.reduce((s, r) => s + r.payroll + r.venueCosts + r.marketing + r.royalties + r.vendorPayments + r.otherOutflows, 0)
  const periodPayroll = periodCashRows.reduce((s, r) => s + r.payroll, 0)
  const periodVenue = periodCashRows.reduce((s, r) => s + r.venueCosts, 0)
  const periodMktCash = periodCashRows.reduce((s, r) => s + r.marketing, 0)
  const periodRoyalties = periodCashRows.reduce((s, r) => s + r.royalties, 0)
  const lowestBalance = allCashRows.length > 0 ? Math.min(...allCashRows.map(r => r.closingCash)) : cashBalance
  const weeksBelowZero = allCashRows.filter(r => r.closingCash < 0).length

  // Contracts
  const allContracts = contracts
  const signed = allContracts.filter(c => c.status === 'signed')
  const unsigned = allContracts.filter(c => c.status !== 'signed' && c.status !== 'expired')
  const overdueContracts = unsigned.filter(c => daysUntil(c.dueDate) < 0)
  const nearDueContracts = unsigned.filter(c => { const d = daysUntil(c.dueDate); return d >= 0 && d <= 14 })
  const needsReview = allContracts.filter(c => c.status === 'needs_review')
  const expired = allContracts.filter(c => c.status === 'expired')

  // Deadlines
  const allDeadlines = deadlines
  const overdueDeadlines = allDeadlines.filter(d => d.status === 'overdue')
  const atRiskDeadlines = allDeadlines.filter(d => d.status === 'at_risk')
  const upcoming7 = allDeadlines.filter(d => d.status !== 'completed' && d.status !== 'overdue' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 7)
  const upcoming14 = allDeadlines.filter(d => d.status !== 'completed' && d.status !== 'overdue' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14)

  // Marketing
  const mktLines = marketingBudgetLines
  const mktCampaigns = marketingCampaigns
  const totalMktBudgeted = mktLines.reduce((s, l) => s + l.budgeted, 0)
  const totalMktActual = mktLines.reduce((s, l) => s + l.actual, 0)
  const overspendChannels = mktLines.filter(l => l.budgeted > 0 && l.actual > l.budgeted * 1.05)
  const activeCampaigns = mktCampaigns.filter(c => {
    const start = new Date(c.startDate).getTime()
    const end = new Date(c.endDate).getTime()
    return start <= periodEnd.getTime() && end >= periodStart.getTime() && c.status === 'active'
  })

  // Labour (payroll-like budget lines)
  const labourKeywords = ['payroll', 'cast', 'crew', 'labour', 'labor', 'salary', 'wage', 'employee', 'staff']
  const labourLines = allLines.filter(l =>
    labourKeywords.some(kw => l.category.toLowerCase().includes(kw) || l.lineItem.toLowerCase().includes(kw))
  )
  const labourBudgeted = labourLines.reduce((s, l) => s + l.budgeted, 0)
  const labourActual = labourLines.reduce((s, l) => s + l.actual, 0)

  // Risk scoring
  let riskScore = 0
  const riskFactors: string[] = []

  if (periodAvgCapacity > 0 && periodAvgCapacity < 60) { riskScore += 30; riskFactors.push(`Average capacity ${fmtPct(periodAvgCapacity)} — well below the 70% threshold`) }
  else if (periodAvgCapacity > 0 && periodAvgCapacity < 70) { riskScore += 15; riskFactors.push(`Average capacity ${fmtPct(periodAvgCapacity)} — below 70% target`) }

  if (budgetPct > 95) { riskScore += 20; riskFactors.push(`Budget at ${fmtPct(budgetPct)} with run remaining`) }
  else if (budgetPct > 85) { riskScore += 10; riskFactors.push(`Budget at ${fmtPct(budgetPct)} — tracking high`) }

  if (overdueContracts.length > 0) { riskScore += Math.min(overdueContracts.length * 12, 30); riskFactors.push(`${overdueContracts.length} unsigned contract${overdueContracts.length > 1 ? 's' : ''} past due`) }
  if (overdueDeadlines.length > 0) { riskScore += Math.min(overdueDeadlines.length * 8, 20); riskFactors.push(`${overdueDeadlines.length} overdue deadline${overdueDeadlines.length > 1 ? 's' : ''}`) }
  if (cashBalance < 0) { riskScore += 40; riskFactors.push('Cash balance is negative') }
  else if (cashBalance < 75000) { riskScore += 20; riskFactors.push(`Cash on hand low at ${fmt(cashBalance)}`) }

  if (weekOverWeekChange < -20000 && prevWeek) { riskScore += 15; riskFactors.push(`Revenue declined ${fmt(Math.abs(weekOverWeekChange))} week-over-week`) }
  if (forecast && forecast.breakevenGap < -50000) { riskScore += 20; riskFactors.push(`Forecast ${fmt(Math.abs(forecast.breakevenGap))} below breakeven`) }
  if (totalMktActual > totalMktBudgeted * 1.1 && totalMktBudgeted > 0) { riskScore += 8; riskFactors.push('Marketing spend over budget') }

  const overallRisk: OverallRisk =
    riskScore >= 65 ? 'critical' :
    riskScore >= 40 ? 'at_risk' :
    riskScore >= 20 ? 'watch' : 'healthy'

  return {
    prod, tone: config.tone, audience: config.audience, periodStart, periodEnd, periodLabel,
    allLines, totalBudgeted, totalActual, totalCommitted, budgetPct, highVarLines, categoryMap,
    allWeeks, periodWeeks, priorWeeks,
    periodGross, periodNet, periodTickets, periodComps, periodDiscounts,
    periodAvgATP, periodAvgCapacity, cumGross, lastWeek, prevWeek, weekOverWeekChange,
    forecast,
    allCashRows, periodCashRows, cashBalance, openingCash,
    periodInflows, periodOutflows, periodPayroll, periodVenue, periodMktCash, periodRoyalties,
    lowestBalance, weeksBelowZero,
    allContracts, signed, unsigned, overdueContracts, nearDueContracts, needsReview, expired,
    allDeadlines, overdueDeadlines, atRiskDeadlines, upcoming7, upcoming14,
    mktLines, mktCampaigns, totalMktBudgeted, totalMktActual, overspendChannels, activeCampaigns,
    labourLines, labourBudgeted, labourActual,
    riskScore, overallRisk, riskFactors,
  }
}

// ── Section generators ──────────────────────────────────────────────────────

function genExecutiveSummary(ctx: Ctx): BriefSection {
  const { prod, overallRisk, riskFactors, periodWeeks, periodGross, periodAvgCapacity, lastWeek, forecast, overdueContracts, periodLabel, tone } = ctx

  const healthPhrase: Record<OverallRisk, string> = {
    healthy: 'is operationally stable and tracking above target',
    watch: 'is on plan with several items requiring attention this period',
    at_risk: 'is facing revenue and operational challenges requiring active management',
    critical: 'is in a critical position requiring immediate producer attention',
  }

  let narrative = `${prod.name} ${healthPhrase[overallRisk]} as of ${periodLabel}.`

  if (periodWeeks.length > 0) {
    narrative += ` Gross revenue for the reporting period reached ${fmt(periodGross)}, with an average house capacity of ${fmtPct(periodAvgCapacity)}.`
  } else {
    narrative += ' No revenue data is recorded for the selected reporting period.'
  }

  if (overallRisk === 'healthy' && forecast) {
    const gap = forecast.breakevenGap
    narrative += ` The production is currently projecting a final gross of ${fmt(forecast.projectedFinalGross)}, ${gap >= 0 ? `${fmt(gap)} above breakeven` : `${fmt(Math.abs(gap))} below breakeven`}.`
  } else if (riskFactors.length > 0 && tone !== 'concise') {
    narrative += ` The primary concerns for this period are: ${riskFactors.slice(0, 3).map(r => r.toLowerCase()).join('; ')}.`
  }

  if (overdueContracts.length > 0) {
    narrative += ` The most urgent operational item is resolving ${overdueContracts.length} unsigned contract${overdueContracts.length > 1 ? 's' : ''} past the signature deadline.`
  } else if (lastWeek && lastWeek.capacityPct < 65) {
    narrative += ` The priority this week is addressing below-target capacity, particularly for weekday performances.`
  } else if (forecast && forecast.breakevenGap < -75000) {
    narrative += ` The financial priority is developing a plan to close the ${fmt(Math.abs(forecast.breakevenGap))} breakeven gap before closing.`
  } else if (overallRisk === 'healthy') {
    narrative += ` The focus for the coming week is maintaining sales momentum and clearing outstanding operational items.`
  }

  const metrics: BriefMetric[] = [
    { label: 'Period Gross', value: fmt(periodGross), flag: periodGross > 0 ? 'ok' : 'warn' },
    { label: 'Avg Capacity', value: fmtPct(periodAvgCapacity), flag: periodAvgCapacity >= 70 ? 'ok' : periodAvgCapacity >= 55 ? 'warn' : 'risk' },
    { label: 'Budget Used', value: fmtPct(ctx.budgetPct), flag: ctx.budgetPct < 80 ? 'ok' : ctx.budgetPct < 95 ? 'warn' : 'risk' },
    { label: 'Cash on Hand', value: fmt(ctx.cashBalance), flag: ctx.cashBalance > 100000 ? 'ok' : ctx.cashBalance > 0 ? 'warn' : 'risk' },
  ]

  return { key: 'executive_summary', title: SECTION_TITLES.executive_summary, narrative, metrics }
}

function genFinancialPosition(ctx: Ctx): BriefSection {
  const { totalBudgeted, totalActual, totalCommitted, budgetPct, highVarLines, cashBalance, categoryMap, tone } = ctx

  let narrative = `Budget utilization stands at ${fmtPct(budgetPct)} — ${fmt(totalActual)} spent against ${fmt(totalBudgeted)} budgeted, with ${fmt(totalCommitted)} committed but not yet expensed.`

  if (highVarLines.length > 0) {
    const topVarCats = [...new Set(highVarLines.map(l => l.category))].slice(0, 3)
    narrative += ` ${highVarLines.length} budget line${highVarLines.length > 1 ? 's' : ''} exceed the 10% variance threshold — concentrated in ${topVarCats.join(' and ')}.`
    if (tone === 'detailed') {
      const topLine = highVarLines.sort((a, b) => Math.abs(variancePct(b.actual, b.budgeted)) - Math.abs(variancePct(a.actual, a.budgeted)))[0]
      const pct = variancePct(topLine.actual, topLine.budgeted)
      narrative += ` The largest single variance is ${topLine.lineItem} at ${pct > 0 ? '+' : ''}${fmtPct(pct)} (${fmt(topLine.actual)} actual vs ${fmt(topLine.budgeted)} budgeted).`
    }
  } else {
    narrative += ' All budget lines are tracking within acceptable variance thresholds.'
  }

  narrative += ` Cash on hand is ${fmt(cashBalance)}.`
  if (cashBalance < 0) {
    narrative += ' The cash balance is currently negative — this requires immediate attention.'
  } else if (cashBalance < 75000) {
    narrative += ' Cash reserves are low and warrant close monitoring against upcoming outflow obligations.'
  }

  const topCategories = Object.entries(categoryMap)
    .filter(([, v]) => v.actual > 0)
    .sort(([, a], [, b]) => b.actual - a.actual)
    .slice(0, 5)

  const metrics: BriefMetric[] = [
    { label: 'Total Budgeted', value: fmt(totalBudgeted) },
    { label: 'Total Actual', value: fmt(totalActual), flag: budgetPct > 95 ? 'risk' : budgetPct > 80 ? 'warn' : 'ok' },
    { label: 'Committed', value: fmt(totalCommitted), sub: 'contracted, not yet spent' },
    { label: 'Budget Used', value: fmtPct(budgetPct), flag: budgetPct < 80 ? 'ok' : budgetPct < 95 ? 'warn' : 'risk' },
  ]

  const bullets = topCategories.map(([cat, { budgeted, actual }]) => {
    const pct = budgetUsedPct(actual, budgeted)
    return `${cat}: ${fmt(actual)} actual (${fmtPct(pct)} of ${fmt(budgeted)} budgeted)`
  })

  return { key: 'financial_position', title: SECTION_TITLES.financial_position, narrative, metrics, bullets }
}

function genRevenueSales(ctx: Ctx): BriefSection {
  const { periodWeeks, periodGross, periodNet, periodTickets, periodComps, periodDiscounts, periodAvgATP, periodAvgCapacity, priorWeeks, lastWeek, prevWeek, weekOverWeekChange, cumGross, tone } = ctx

  if (periodWeeks.length === 0) {
    return {
      key: 'revenue_sales', title: SECTION_TITLES.revenue_sales,
      narrative: 'No revenue data is recorded for the selected reporting period.',
      dataMissing: 'Revenue weeks must be entered in the Revenue module for this section to populate.',
    }
  }

  const priorGross = priorWeeks.reduce((s, w) => s + w.grossRevenue, 0)
  const vsLastPeriod = priorGross > 0 ? ((periodGross - priorGross) / priorGross) * 100 : null

  let narrative = `Gross revenue for the period reached ${fmt(periodGross)}`
  if (vsLastPeriod !== null) {
    narrative += `, ${vsLastPeriod >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(vsLastPeriod))} compared to the prior equivalent period (${fmt(priorGross)})`
  }
  narrative += `.`

  if (lastWeek) {
    narrative += ` The most recent week ended at ${fmtPct(lastWeek.capacityPct)} capacity with a gross of ${fmt(lastWeek.grossRevenue)} and an average ticket price of ${fmt(lastWeek.avgTicketPrice, 2)}.`
  }

  if (weekOverWeekChange !== 0 && prevWeek) {
    const changePct = prevWeek.grossRevenue > 0 ? (weekOverWeekChange / prevWeek.grossRevenue) * 100 : 0
    narrative += ` Week-over-week, gross revenue ${weekOverWeekChange >= 0 ? 'increased' : 'decreased'} by ${fmt(Math.abs(weekOverWeekChange))} (${fmtPct(Math.abs(changePct))}).`
  }

  if (periodDiscounts > 0 && periodTickets > 0) {
    const discountPct = (periodDiscounts / periodGross) * 100
    if (discountPct > 8 || tone === 'detailed') {
      narrative += ` Discounts accounted for ${fmtPct(discountPct)} of gross revenue (${fmt(periodDiscounts)}), and comps totalled ${periodComps} seats.`
    }
  }

  const metrics: BriefMetric[] = [
    { label: 'Period Gross', value: fmt(periodGross), flag: 'ok' },
    { label: 'Period Net', value: fmt(periodNet) },
    { label: 'Tickets Sold', value: periodTickets.toLocaleString() },
    { label: 'Avg Ticket Price', value: fmt(periodAvgATP, 2) },
    { label: 'Avg Capacity', value: fmtPct(periodAvgCapacity), flag: periodAvgCapacity >= 70 ? 'ok' : periodAvgCapacity >= 55 ? 'warn' : 'risk' },
    { label: 'Cumulative Gross', value: fmt(cumGross), sub: 'all weeks on record' },
  ]

  const bullets: string[] = []
  if (vsLastPeriod !== null) bullets.push(`Prior period comparison: ${fmt(priorGross)} → ${fmt(periodGross)} (${vsLastPeriod >= 0 ? '+' : ''}${fmtPct(vsLastPeriod)})`)
  if (periodComps > 0) bullets.push(`Comps: ${periodComps} seats (${fmtPct((periodComps / periodTickets) * 100)} of tickets)`)
  if (periodDiscounts > 0) bullets.push(`Discounts: ${fmt(periodDiscounts)} (${fmtPct((periodDiscounts / periodGross) * 100)} of gross)`)

  return { key: 'revenue_sales', title: SECTION_TITLES.revenue_sales, narrative, metrics, bullets: bullets.length ? bullets : undefined }
}

function genForecast(ctx: Ctx): BriefSection {
  const { forecast, prod, tone } = ctx

  if (!forecast) {
    return {
      key: 'forecast', title: SECTION_TITLES.forecast,
      narrative: 'Forecasting requires at least two weeks of revenue data to generate a projection.',
      dataMissing: 'Enter revenue weeks in the Revenue module to enable forecasting.',
    }
  }

  const { projectedFinalGross, projectedFinalNet, breakevenGap, requiredRemainingCapacity, overallRisk, weeksRemaining, avgWeeklyNut, breakevenGross } = forecast

  const riskLabel = { healthy: 'tracking to target', watch: 'at watch level', at_risk: 'at risk', critical: 'in a critical position' }[overallRisk]

  let narrative = `The forecast model is ${riskLabel} with ${weeksRemaining} week${weeksRemaining !== 1 ? 's' : ''} remaining in the run.`
  narrative += ` At current pace, the production is projected to close with a gross of ${fmt(projectedFinalGross)} and a net of ${fmt(projectedFinalNet)}.`

  if (breakevenGap >= 0) {
    narrative += ` This puts the production ${fmt(breakevenGap)} above the breakeven gross of ${fmt(breakevenGross)}.`
  } else {
    narrative += ` The production is currently projected to finish ${fmt(Math.abs(breakevenGap))} below the breakeven gross of ${fmt(breakevenGross)}.`
    if (weeksRemaining > 0) {
      narrative += ` To close this gap, remaining performances need to average at least ${fmtPct(requiredRemainingCapacity)} capacity.`
    }
  }

  if (tone === 'detailed') {
    narrative += ` The average weekly operating cost (nut) is ${fmt(avgWeeklyNut)}, which requires consistent revenue generation to sustain positive cash flow.`
  }

  const metrics: BriefMetric[] = [
    { label: 'Projected Final Gross', value: fmt(projectedFinalGross), flag: breakevenGap >= 0 ? 'ok' : 'risk' },
    { label: 'Projected Final Net', value: fmt(projectedFinalNet), flag: projectedFinalNet >= 0 ? 'ok' : 'risk' },
    { label: 'Breakeven Gap', value: `${breakevenGap >= 0 ? '+' : ''}${fmt(breakevenGap)}`, flag: breakevenGap >= 0 ? 'ok' : breakevenGap > -50000 ? 'warn' : 'risk' },
    { label: 'Required Capacity', value: fmtPct(requiredRemainingCapacity), sub: 'to reach breakeven', flag: requiredRemainingCapacity <= 80 ? 'ok' : requiredRemainingCapacity <= 95 ? 'warn' : 'risk' },
    { label: 'Weeks Remaining', value: String(weeksRemaining) },
    { label: 'Weekly Nut', value: fmt(avgWeeklyNut), sub: 'avg operating cost' },
  ]

  const bullets: string[] = []
  if (prod.projectedGross > 0) {
    const vsTarget = ((projectedFinalGross - prod.projectedGross) / prod.projectedGross) * 100
    bullets.push(`vs. original gross target ${fmt(prod.projectedGross)}: ${vsTarget >= 0 ? '+' : ''}${fmtPct(vsTarget)}`)
  }
  bullets.push(`Forecast risk level: ${overallRisk.replace('_', ' ')}`)

  return { key: 'forecast', title: SECTION_TITLES.forecast, narrative, metrics, bullets }
}

function genCashFlow(ctx: Ctx): BriefSection {
  const { periodCashRows, openingCash, cashBalance, periodInflows, periodOutflows, periodPayroll, periodVenue, periodMktCash, periodRoyalties, lowestBalance, weeksBelowZero, tone } = ctx

  if (periodCashRows.length === 0) {
    return {
      key: 'cash_flow', title: SECTION_TITLES.cash_flow,
      narrative: 'No cash flow data is recorded for the selected reporting period.',
      dataMissing: 'Enter weekly cash flow rows in the Cash Flow module to populate this section.',
    }
  }

  let narrative = `Cash opened the reporting period at ${fmt(openingCash)} and closed at ${fmt(cashBalance)}.`

  if (periodInflows > 0 || periodOutflows > 0) {
    narrative += ` Total inflows for the period were ${fmt(periodInflows)}, against outflows of ${fmt(periodOutflows)} — a net ${periodInflows >= periodOutflows ? 'surplus' : 'deficit'} of ${fmt(Math.abs(periodInflows - periodOutflows))}.`
  }

  if (weeksBelowZero > 0) {
    narrative += ` ${weeksBelowZero} week${weeksBelowZero > 1 ? 's' : ''} in the projection show a negative closing balance, with the lowest point at ${fmt(lowestBalance)}.`
  } else if (lowestBalance < 75000) {
    narrative += ` The lowest projected balance is ${fmt(lowestBalance)} — reserves are limited, and any unexpected outflows should be reviewed against available cash.`
  }

  if (tone === 'detailed' && (periodPayroll > 0 || periodVenue > 0)) {
    const components = []
    if (periodPayroll > 0) components.push(`payroll ${fmt(periodPayroll)}`)
    if (periodVenue > 0) components.push(`venue costs ${fmt(periodVenue)}`)
    if (periodRoyalties > 0) components.push(`royalties ${fmt(periodRoyalties)}`)
    if (periodMktCash > 0) components.push(`marketing ${fmt(periodMktCash)}`)
    if (components.length > 0) narrative += ` Key outflow components: ${components.join(', ')}.`
  }

  const metrics: BriefMetric[] = [
    { label: 'Opening Balance', value: fmt(openingCash) },
    { label: 'Total Inflows', value: fmt(periodInflows), flag: 'ok' },
    { label: 'Total Outflows', value: fmt(periodOutflows) },
    { label: 'Closing Balance', value: fmt(cashBalance), flag: cashBalance > 75000 ? 'ok' : cashBalance > 0 ? 'warn' : 'risk' },
  ]

  const bullets: string[] = []
  if (periodPayroll > 0) bullets.push(`Payroll: ${fmt(periodPayroll)}`)
  if (periodVenue > 0) bullets.push(`Venue costs: ${fmt(periodVenue)}`)
  if (periodRoyalties > 0) bullets.push(`Royalties: ${fmt(periodRoyalties)}`)
  if (periodMktCash > 0) bullets.push(`Marketing: ${fmt(periodMktCash)}`)
  if (weeksBelowZero > 0) bullets.push(`Weeks with negative balance: ${weeksBelowZero}`)

  return { key: 'cash_flow', title: SECTION_TITLES.cash_flow, narrative, metrics, bullets: bullets.length ? bullets : undefined }
}

function genContracts(ctx: Ctx): BriefSection {
  const { allContracts, signed, unsigned, overdueContracts, nearDueContracts, needsReview, expired, tone } = ctx

  let narrative = `${allContracts.length} total contract${allContracts.length !== 1 ? 's' : ''} on record: ${signed.length} signed, ${unsigned.length} pending signature${expired.length > 0 ? `, and ${expired.length} expired` : ''}.`

  if (overdueContracts.length > 0) {
    const names = overdueContracts.slice(0, 3).map(c => c.partyName).join(', ')
    const oldest = overdueContracts.reduce((a, b) => daysUntil(a.dueDate) < daysUntil(b.dueDate) ? a : b)
    narrative += ` ${overdueContracts.length} unsigned contract${overdueContracts.length > 1 ? 's are' : ' is'} past the signature due date — including ${names}. The most overdue is ${oldest.partyName}, now ${Math.abs(daysUntil(oldest.dueDate))} days past due.`
  } else if (unsigned.length === 0) {
    narrative += ' All active contracts are signed — no action required on contract signatures.'
  }

  if (needsReview.length > 0) {
    narrative += ` ${needsReview.length} contract${needsReview.length > 1 ? 's are' : ' is'} flagged as Needs Review and should be assessed before the next payment cycle.`
  }

  if (nearDueContracts.length > 0 && tone === 'detailed') {
    narrative += ` ${nearDueContracts.length} unsigned contract${nearDueContracts.length > 1 ? 's' : ''} are due within the next 14 days.`
  }

  const metrics: BriefMetric[] = [
    { label: 'Signed', value: String(signed.length), flag: 'ok' },
    { label: 'Unsigned', value: String(unsigned.length), flag: unsigned.length > 0 ? 'warn' : 'ok' },
    { label: 'Overdue', value: String(overdueContracts.length), flag: overdueContracts.length > 0 ? 'risk' : 'ok' },
    { label: 'Needs Review', value: String(needsReview.length), flag: needsReview.length > 0 ? 'warn' : 'ok' },
  ]

  const bullets: string[] = []
  overdueContracts.forEach(c => bullets.push(`${c.partyName} (${c.contractType}) — ${Math.abs(daysUntil(c.dueDate))}d overdue, ${fmt(c.fee)}`))
  nearDueContracts.forEach(c => bullets.push(`${c.partyName} — due in ${daysUntil(c.dueDate)} days`))

  return { key: 'contracts', title: SECTION_TITLES.contracts, narrative, metrics, bullets: bullets.length ? bullets : undefined }
}

function genDeadlines(ctx: Ctx): BriefSection {
  const { overdueDeadlines, atRiskDeadlines, upcoming7, upcoming14, tone } = ctx

  const totalFlagged = overdueDeadlines.length + atRiskDeadlines.length

  let narrative: string
  if (totalFlagged === 0 && upcoming14.length === 0) {
    narrative = 'No overdue or at-risk deadlines. The calendar is clear for the next 14 days.'
  } else {
    narrative = ''
    if (overdueDeadlines.length > 0) {
      narrative += `${overdueDeadlines.length} deadline${overdueDeadlines.length > 1 ? 's are' : ' is'} overdue and unresolved.`
    }
    if (atRiskDeadlines.length > 0) {
      narrative += ` ${atRiskDeadlines.length} item${atRiskDeadlines.length > 1 ? 's are' : ' is'} flagged at risk.`
    }
    if (upcoming7.length > 0) {
      narrative += ` ${upcoming7.length} deadline${upcoming7.length > 1 ? 's fall' : ' falls'} within the next 7 days.`
    }
    if (upcoming14.length > upcoming7.length && tone !== 'concise') {
      narrative += ` An additional ${upcoming14.length - upcoming7.length} item${(upcoming14.length - upcoming7.length) > 1 ? 's are' : ' is'} due within 14 days.`
    }
  }

  const metrics: BriefMetric[] = [
    { label: 'Overdue', value: String(overdueDeadlines.length), flag: overdueDeadlines.length > 0 ? 'risk' : 'ok' },
    { label: 'At Risk', value: String(atRiskDeadlines.length), flag: atRiskDeadlines.length > 0 ? 'warn' : 'ok' },
    { label: 'Due in 7 Days', value: String(upcoming7.length), flag: upcoming7.length > 3 ? 'warn' : 'ok' },
    { label: 'Due in 14 Days', value: String(upcoming14.length) },
  ]

  const bullets: string[] = []
  overdueDeadlines.slice(0, 4).forEach(d => bullets.push(`OVERDUE: ${d.title} (${d.type.replace('_', ' ')}) — was due ${formatDate(d.date)}`))
  upcoming7.slice(0, 4).forEach(d => bullets.push(`In ${daysUntil(d.date)}d: ${d.title} — ${formatDate(d.date)}`))

  return { key: 'deadlines', title: SECTION_TITLES.deadlines, narrative, metrics, bullets: bullets.length ? bullets : undefined }
}

function genMarketing(ctx: Ctx): BriefSection {
  const { mktLines, totalMktBudgeted, totalMktActual, overspendChannels, activeCampaigns, periodAvgCapacity, tone } = ctx

  if (mktLines.length === 0) {
    return {
      key: 'marketing', title: SECTION_TITLES.marketing,
      narrative: 'No marketing budget data is recorded for this production.',
      dataMissing: 'Enter marketing budget lines in the Marketing module to populate this section.',
    }
  }

  const mktPct = totalMktBudgeted > 0 ? (totalMktActual / totalMktBudgeted) * 100 : 0
  const mktVariance = totalMktActual - totalMktBudgeted

  let narrative = `Total marketing spend is ${fmt(totalMktActual)}, representing ${fmtPct(mktPct)} of the ${fmt(totalMktBudgeted)} marketing budget.`

  if (overspendChannels.length > 0) {
    const topChannel = overspendChannels.sort((a, b) => (b.actual - b.budgeted) - (a.actual - a.budgeted))[0]
    narrative += ` ${overspendChannels.length} channel${overspendChannels.length > 1 ? 's are' : ' is'} over budget — the largest overspend is ${topChannel.lineItem} at ${fmt(topChannel.actual)} vs ${fmt(topChannel.budgeted)} budgeted (${fmt(topChannel.actual - topChannel.budgeted)} over plan).`
    if (periodAvgCapacity < 70 && periodAvgCapacity > 0) {
      narrative += ` Increased marketing spend has not yet produced a proportional improvement in capacity, which warrants a channel-level review.`
    }
  } else if (mktVariance <= 0) {
    narrative += ` Marketing is tracking within budget.`
  }

  if (activeCampaigns.length > 0 && tone === 'detailed') {
    narrative += ` ${activeCampaigns.length} campaign${activeCampaigns.length > 1 ? 's are' : ' is'} currently active during this period.`
  }

  const metrics: BriefMetric[] = [
    { label: 'Total Budgeted', value: fmt(totalMktBudgeted) },
    { label: 'Total Actual', value: fmt(totalMktActual), flag: mktPct < 100 ? 'ok' : mktPct < 115 ? 'warn' : 'risk' },
    { label: 'Budget Used', value: fmtPct(mktPct), flag: mktPct < 100 ? 'ok' : mktPct < 115 ? 'warn' : 'risk' },
    { label: 'Active Campaigns', value: String(activeCampaigns.length) },
  ]

  const bullets: string[] = []
  const topChannels = mktLines.filter(l => l.actual > 0).sort((a, b) => b.actual - a.actual).slice(0, 4)
  topChannels.forEach(l => {
    const pct = l.budgeted > 0 ? (l.actual / l.budgeted) * 100 : 0
    bullets.push(`${l.lineItem}: ${fmt(l.actual)} (${fmtPct(pct)} of budget)`)
  })

  return { key: 'marketing', title: SECTION_TITLES.marketing, narrative, metrics, bullets: bullets.length ? bullets : undefined }
}

function genLabourRisk(ctx: Ctx): BriefSection {
  const { labourLines, labourBudgeted, labourActual, periodPayroll, tone } = ctx

  const hasLabourData = labourLines.length > 0 || periodPayroll > 0

  if (!hasLabourData) {
    return {
      key: 'labour_risk', title: SECTION_TITLES.labour_risk,
      narrative: 'Labour-specific budget data is not available in the current budget structure. Payroll figures from the cash flow module are used as a proxy where available.',
      dataMissing: 'Add payroll or cast/crew budget line items in the Budget module to enable detailed labour analysis.',
    }
  }

  const labourPct = labourBudgeted > 0 ? (labourActual / labourBudgeted) * 100 : 0

  let narrative = labourLines.length > 0
    ? `Labour-related budget lines total ${fmt(labourActual)} actual spend against ${fmt(labourBudgeted)} budgeted (${fmtPct(labourPct)}).`
    : `Payroll outflows recorded in the cash flow module total ${fmt(periodPayroll)} for the reporting period.`

  if (labourPct > 110 && labourBudgeted > 0) {
    narrative += ` Labour costs are tracking ${fmtPct(labourPct - 100)} over plan. Overtime, additional crew calls, or unbudgeted engagements should be reviewed.`
  } else if (labourPct < 100 && labourBudgeted > 0 && tone === 'detailed') {
    narrative += ` Labour spend is within plan at ${fmtPct(labourPct)} of budget.`
  }

  if (periodPayroll > 0 && tone === 'detailed') {
    narrative += ` Cash flow payroll outflows for the period total ${fmt(periodPayroll)}.`
  }

  const metrics: BriefMetric[] = labourBudgeted > 0 ? [
    { label: 'Labour Budgeted', value: fmt(labourBudgeted) },
    { label: 'Labour Actual', value: fmt(labourActual), flag: labourPct < 100 ? 'ok' : labourPct < 115 ? 'warn' : 'risk' },
    { label: 'Labour vs Budget', value: fmtPct(labourPct), flag: labourPct < 100 ? 'ok' : labourPct < 115 ? 'warn' : 'risk' },
  ] : [
    { label: 'Payroll (Period)', value: fmt(periodPayroll), sub: 'from cash flow module' },
  ]

  return { key: 'labour_risk', title: SECTION_TITLES.labour_risk, narrative, metrics }
}

function genDecisions(ctx: Ctx): BriefSection {
  const decisions: Decision[] = []
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }

  if (ctx.overdueContracts.length > 0) {
    const names = ctx.overdueContracts.slice(0, 3).map(c => c.partyName).join(', ')
    decisions.push({
      title: 'Resolve overdue unsigned contracts',
      context: `${ctx.overdueContracts.length} contract${ctx.overdueContracts.length > 1 ? 's are' : ' is'} past the signature deadline: ${names}.`,
      recommendation: 'Escalate directly to each counterparty with a 48-hour response window. Involve legal counsel if there is no response after the initial follow-up.',
      urgency: 'high',
      owner: 'GM',
    })
  }

  if (ctx.cashBalance < 0) {
    decisions.push({
      title: 'Cash shortfall — producer consultation required',
      context: `Current cash balance is ${fmt(ctx.cashBalance)}. The production cannot cover upcoming obligations without additional funding.`,
      recommendation: 'Convene producers immediately to authorize an interim advance, capital call, or emergency line of credit. Identify which vendor payments can be deferred.',
      urgency: 'critical',
      owner: 'Producer / GM',
    })
  } else if (ctx.cashBalance < 75000) {
    decisions.push({
      title: 'Cash reserves — pre-emptive action',
      context: `Cash on hand is ${fmt(ctx.cashBalance)}${ctx.weeksBelowZero > 0 ? `, and ${ctx.weeksBelowZero} forward week${ctx.weeksBelowZero > 1 ? 's project' : ' projects'} a negative balance` : ''}.`,
      recommendation: 'Map all confirmed outflows against projected ticket revenue for the next four weeks. Present options to producers if the shortfall is confirmed.',
      urgency: 'high',
      owner: 'GM / Producer',
    })
  }

  if (ctx.periodAvgCapacity > 0 && ctx.periodAvgCapacity < 65) {
    decisions.push({
      title: 'Sales pace — intervention required',
      context: `Average capacity for the reporting period was ${fmtPct(ctx.periodAvgCapacity)} — ${fmtPct(70 - ctx.periodAvgCapacity)} below the 70% minimum threshold.`,
      recommendation: 'Evaluate immediate options: group sales push, promotional pricing for specific performance dates, and targeted digital spend on underperforming days. Set a 7-day review checkpoint.',
      urgency: ctx.periodAvgCapacity < 55 ? 'critical' : 'high',
      owner: 'GM / Marketing',
    })
  } else if (ctx.periodAvgCapacity > 0 && ctx.periodAvgCapacity < 72) {
    decisions.push({
      title: 'Sales pace monitoring',
      context: `Average capacity of ${fmtPct(ctx.periodAvgCapacity)} is marginally above the 70% threshold. Any further softening would require intervention.`,
      recommendation: 'Review performance-by-performance sales data to identify specific weak dates. Prepare a contingency marketing plan for activation if capacity drops below 68%.',
      urgency: 'medium',
      owner: 'Marketing Lead',
    })
  }

  if (ctx.overspendChannels.length > 0 && ctx.periodAvgCapacity < 72 && ctx.periodAvgCapacity > 0) {
    const ch = ctx.overspendChannels[0]
    decisions.push({
      title: `Marketing reallocation — ${ch.lineItem}`,
      context: `${ch.lineItem} spend is ${fmtPct(variancePct(ch.actual, ch.budgeted))} over budget (${fmt(ch.actual)} vs ${fmt(ch.budgeted)}) while average capacity remains at ${fmtPct(ctx.periodAvgCapacity)}.`,
      recommendation: 'Redirect spend from brand channels toward performance-level promotions for specific weak dates. Require sign-off for any weekly spend exceeding the allocated cap.',
      urgency: 'medium',
      owner: 'GM / Marketing Lead',
    })
  }

  if (ctx.budgetPct > 90 && ctx.forecast && ctx.forecast.weeksRemaining > 2) {
    decisions.push({
      title: 'Budget reforecast',
      context: `Budget utilization is ${fmtPct(ctx.budgetPct)} with ${ctx.forecast.weeksRemaining} weeks remaining in the run. Current trajectory risks exhausting the budget before close.`,
      recommendation: 'Prepare a revised cost estimate identifying categories that can be reduced or deferred. Present to producers within five business days.',
      urgency: ctx.budgetPct > 97 ? 'critical' : 'high',
      owner: 'GM',
    })
  }

  if (ctx.forecast && ctx.forecast.breakevenGap < -50000 && ctx.forecast.weeksRemaining > 1) {
    decisions.push({
      title: 'Breakeven gap — trajectory review',
      context: `At current pace the production is projected to finish ${fmt(Math.abs(ctx.forecast.breakevenGap))} below breakeven. Remaining performances require ${fmtPct(ctx.forecast.requiredRemainingCapacity)} average capacity to recover.`,
      recommendation: 'Schedule a producer and GM review of the revenue trajectory. Prepare a scenario analysis covering base case, marketing push, and early-close options.',
      urgency: ctx.forecast.overallRisk === 'critical' ? 'critical' : 'high',
      owner: 'GM / Producer',
    })
  }

  if (ctx.weekOverWeekChange < -30000 && ctx.prevWeek) {
    const changePct = ctx.prevWeek.grossRevenue > 0 ? (ctx.weekOverWeekChange / ctx.prevWeek.grossRevenue) * 100 : 0
    decisions.push({
      title: 'Revenue decline — pricing and scheduling review',
      context: `Gross revenue fell ${fmtPct(Math.abs(changePct))} week-over-week (${fmt(ctx.prevWeek.grossRevenue)} → ${fmt(ctx.lastWeek?.grossRevenue ?? 0)}).`,
      recommendation: 'Conduct a date-by-date performance review to determine whether the decline is isolated or systemic. Evaluate dynamic pricing adjustments for upcoming performance dates.',
      urgency: 'medium',
      owner: 'GM',
    })
  }

  if (ctx.overdueDeadlines.length >= 3) {
    decisions.push({
      title: 'Deadline backlog — assign owners',
      context: `${ctx.overdueDeadlines.length} deadlines are overdue without resolution. This creates downstream risk across contracts, press, and operations.`,
      recommendation: `Run a brief status check on all overdue items. Prioritize: ${ctx.overdueDeadlines.slice(0, 2).map(d => d.title).join(' and ')}.`,
      urgency: 'medium',
      owner: 'GM / Production Manager',
    })
  }

  const sorted = decisions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]).slice(0, 7)
  const count = sorted.length

  const narrative = count === 0
    ? 'No decisions are flagged this period. Continue regular oversight.'
    : `${count} decision${count !== 1 ? 's require' : ' requires'} attention this period, prioritized by urgency below.`

  return { key: 'decisions', title: SECTION_TITLES.decisions, narrative, decisions: sorted }
}

function genNext7Days(ctx: Ctx, decisions: Decision[]): BriefSection {
  const items: string[] = []

  ctx.overdueContracts.forEach(c => {
    items.push(`Follow up with ${c.partyName} for contract signature — ${Math.abs(daysUntil(c.dueDate))} days overdue.`)
  })

  ctx.upcoming7.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(d => {
    items.push(`${d.title} — due ${formatDate(d.date)}. (${d.type.replace('_', ' ')})`)
  })

  if (ctx.lastWeek && ctx.lastWeek.capacityPct < 70) {
    items.push('Review weekday sales pace and evaluate promotional pricing for underperforming dates.')
  }

  if (ctx.cashBalance < 150000) {
    items.push(`Confirm outflows for the coming week against current cash balance of ${fmt(ctx.cashBalance)}.`)
  }

  if (ctx.overspendChannels.length > 0) {
    items.push(`Review marketing channel allocation — ${ctx.overspendChannels.length} channel${ctx.overspendChannels.length > 1 ? 's are' : ' is'} over budget.`)
  }

  if (ctx.forecast && ctx.forecast.weeksRemaining > 0) {
    items.push('Update the weekly sales report and rerun the forecast model with the latest data.')
  }

  if (ctx.budgetPct > 85) {
    items.push('Review remaining discretionary spend against budget capacity before authorizing new commitments.')
  }

  const hasPayrollDeadline = ctx.upcoming7.some(d => d.type === 'payroll')
  if (!hasPayrollDeadline) {
    items.push('Confirm payroll processing schedule and outflow amounts for the week ahead.')
  }

  const unique = [...new Set(items)].slice(0, 8)
  const narrative = `${unique.length} priority action${unique.length !== 1 ? 's' : ''} for the coming week.`

  return { key: 'next_7_days', title: SECTION_TITLES.next_7_days, narrative, checklist: unique }
}

// ── Email generator ─────────────────────────────────────────────────────────

function buildEmailBody(sections: BriefSection[], ctx: Ctx): string {
  const lines: string[] = [
    `Subject: ${ctx.prod.name} — Weekly Producer Brief (${ctx.periodLabel})`,
    '',
    `Hi [name],`,
    '',
    `Please find below the weekly production brief for ${ctx.prod.name}, covering ${ctx.periodLabel}.`,
    '',
    '---',
    '',
  ]

  for (const section of sections) {
    lines.push(`## ${section.title}`)
    lines.push('')
    if (section.dataMissing) {
      lines.push(`[Data not available: ${section.dataMissing}]`)
    } else {
      lines.push(section.narrative)
      if (section.metrics && section.metrics.length > 0) {
        lines.push('')
        section.metrics.forEach(m => lines.push(`• ${m.label}: ${m.value}${m.sub ? ` (${m.sub})` : ''}`))
      }
      if (section.bullets && section.bullets.length > 0) {
        lines.push('')
        section.bullets.forEach(b => lines.push(`• ${b}`))
      }
      if (section.decisions && section.decisions.length > 0) {
        lines.push('')
        section.decisions.forEach((d, i) => {
          lines.push(`${i + 1}. ${d.title} [${d.urgency.toUpperCase()}]`)
          lines.push(`   Context: ${d.context}`)
          lines.push(`   Recommendation: ${d.recommendation}`)
          lines.push(`   Owner: ${d.owner}`)
          lines.push('')
        })
      }
      if (section.checklist && section.checklist.length > 0) {
        lines.push('')
        section.checklist.forEach(item => lines.push(`☐ ${item}`))
      }
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push('[Signoff placeholder]')
  lines.push('[Name], [Title]')

  return lines.join('\n')
}

// ── Main entry point ────────────────────────────────────────────────────────

export function generateBrief(config: BriefConfig, raw: BriefRawData): BriefReport {
  const ctx = buildCtx(config, raw)

  const sectionGenerators: Record<BriefSectionKey, (ctx: Ctx) => BriefSection> = {
    executive_summary: genExecutiveSummary,
    financial_position: genFinancialPosition,
    revenue_sales: genRevenueSales,
    forecast: genForecast,
    cash_flow: genCashFlow,
    contracts: genContracts,
    deadlines: genDeadlines,
    marketing: genMarketing,
    labour_risk: genLabourRisk,
    decisions: (c) => {
      const d = genDecisions(c)
      return d
    },
    next_7_days: (c) => {
      const decisions = genDecisions(c)
      return genNext7Days(c, decisions.decisions ?? [])
    },
  }

  const sections = config.sections.map(key => sectionGenerators[key](ctx))

  const emailBody = buildEmailBody(sections, ctx)
  const emailSubject = `${raw.production.name} — Weekly Producer Brief (${ctx.periodLabel})`

  return {
    config,
    generatedAt: new Date().toISOString(),
    productionName: raw.production.name,
    venue: raw.production.venue,
    status: raw.production.status,
    openingDate: raw.production.openingDate,
    closingDate: raw.production.closingDate,
    audience: config.audience,
    tone: config.tone,
    overallRisk: ctx.overallRisk,
    sections,
    emailSubject,
    emailBody,
  }
}
