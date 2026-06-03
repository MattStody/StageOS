import type { Production, RevenueWeek, CashFlowRow, BudgetLine } from './types'

export type RiskLevel = 'healthy' | 'watch' | 'at_risk' | 'critical'

export interface CoreForecast {
  weeksElapsed: number
  weeksRemaining: number
  totalWeeks: number
  performancesToDate: number
  avgPerfsPerWeek: number
  remainingPerfs: number
  cumGross: number
  cumNet: number
  netGrossRatio: number
  avgGrossPerPerf: number
  avgWeeklyGross: number
  avgATP: number
  avgCapacityPct: number
  avgTotalSeats: number
  projectedRemainingGross: number
  projectedFinalGross: number
  projectedFinalNet: number
  totalBudgeted: number
  totalActual: number
  avgWeeklyNut: number
  maxWeeklyNut: number
  breakevenGross: number
  breakevenGap: number
  requiredRemainingGross: number
  requiredRemainingCapacity: number
  cashPosition: number
  overallRisk: RiskLevel
}

export interface WeekRiskRow {
  weekEnding: string
  performances: number
  gross: number
  weeklyNut: number
  difference: number
  capacityPct: number
  atp: number
  risk: RiskLevel
  recommendation: string
  isProjected: boolean
}

export interface ScenarioConfig {
  downsidePct: number
  upsidePct: number
  extraMarketing: number
  marketingLiftPct: number
  labourIncreasePct: number
  earlyCloseWeeks: number
  extensionWeeks: number
  extensionCapacityPct: number
  extensionATP: number
  extensionExtraWeeklyCost: number
}

export interface ScenarioResult {
  type: string
  label: string
  projectedFinalGross: number
  projectedFinalNet: number
  totalCosts: number
  breakevenGap: number
  endingCash: number
  risk: RiskLevel
  keyAssumption: string
}

export interface ChartPoint {
  label: string
  actual: number | null
  projected: number | null
  breakeven: number
  target: number | null
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function computeCoreForecast(
  prod: Production,
  allWeeks: RevenueWeek[],
  cashRows: CashFlowRow[],
  lines: BudgetLine[],
): CoreForecast {
  const now = Date.now()
  const opening = new Date(prod.openingDate).getTime()
  const closing = new Date(prod.closingDate).getTime()

  const totalWeeks = Math.max(1, Math.round((closing - opening) / MS_PER_WEEK))
  const weeksElapsed = Math.min(totalWeeks, Math.max(0, Math.floor((now - opening) / MS_PER_WEEK)))
  const weeksRemaining = Math.max(0, Math.ceil((closing - now) / MS_PER_WEEK))

  const perfWeeks = allWeeks
    .filter(w => w.performances > 0)
    .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())

  const performancesToDate = perfWeeks.reduce((s, w) => s + w.performances, 0)
  const cumGross = perfWeeks.reduce((s, w) => s + w.grossRevenue, 0)
  const cumNet = perfWeeks.reduce((s, w) => s + w.netRevenue, 0)

  const avgPerfsPerWeek = perfWeeks.length > 0 ? performancesToDate / perfWeeks.length : 8
  const remainingPerfs = weeksRemaining * avgPerfsPerWeek
  const netGrossRatio = cumGross > 0 ? Math.min(1, cumNet / cumGross) : 0.82
  const avgGrossPerPerf = performancesToDate > 0
    ? cumGross / performancesToDate
    : prod.projectedGross > 0 ? prod.projectedGross / (totalWeeks * avgPerfsPerWeek) : 0
  const avgWeeklyGross = perfWeeks.length > 0 ? cumGross / perfWeeks.length : avgGrossPerPerf * avgPerfsPerWeek

  const avgATP = performancesToDate > 0
    ? perfWeeks.reduce((s, w) => s + w.avgTicketPrice * w.performances, 0) / performancesToDate
    : 0
  const avgCapacityPct = perfWeeks.length > 0
    ? perfWeeks.reduce((s, w) => s + w.capacityPct, 0) / perfWeeks.length
    : 0
  const avgTotalSeats = perfWeeks.length > 0
    ? Math.round(perfWeeks.reduce((s, w) => s + (w.totalSeats || 1000), 0) / perfWeeks.length)
    : 1000

  const projectedRemainingGross = remainingPerfs * avgGrossPerPerf
  const projectedFinalGross = cumGross + projectedRemainingGross
  const projectedFinalNet = cumNet + projectedRemainingGross * netGrossRatio

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)

  const nutValues = cashRows.map(r =>
    r.payroll + r.venueCosts + r.marketing + r.royalties + r.vendorPayments + r.otherOutflows
  )
  const avgWeeklyNut = nutValues.length > 0
    ? nutValues.reduce((s, v) => s + v, 0) / nutValues.length
    : totalWeeks > 0 ? totalBudgeted / totalWeeks : 0
  const maxWeeklyNut = nutValues.length > 0 ? Math.max(...nutValues) : avgWeeklyNut

  const breakevenGross = netGrossRatio > 0 ? totalBudgeted / netGrossRatio : totalBudgeted
  const breakevenGap = projectedFinalGross - breakevenGross
  const requiredRemainingGross = Math.max(0, breakevenGross - cumGross)
  const requiredRemainingCapacity =
    remainingPerfs > 0 && avgATP > 0 && avgTotalSeats > 0
      ? Math.min(200, (requiredRemainingGross / remainingPerfs / avgATP / avgTotalSeats) * 100)
      : 0

  const sortedCash = [...cashRows].sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())
  const cashPosition = sortedCash.length > 0
    ? sortedCash[sortedCash.length - 1].closingCash
    : prod.cashOnHand

  const overallRisk: RiskLevel =
    cashPosition < 0 ? 'critical'
    : breakevenGap < -200000 ? 'critical'
    : breakevenGap < -50000 ? 'at_risk'
    : breakevenGap < 0 ? 'watch'
    : 'healthy'

  return {
    weeksElapsed, weeksRemaining, totalWeeks,
    performancesToDate, avgPerfsPerWeek, remainingPerfs,
    cumGross, cumNet, netGrossRatio,
    avgGrossPerPerf, avgWeeklyGross, avgATP, avgCapacityPct, avgTotalSeats,
    projectedRemainingGross, projectedFinalGross, projectedFinalNet,
    totalBudgeted, totalActual, avgWeeklyNut, maxWeeklyNut,
    breakevenGross, breakevenGap, requiredRemainingGross, requiredRemainingCapacity,
    cashPosition, overallRisk,
  }
}

export function computeWeekRiskRows(
  fc: CoreForecast,
  weeks: RevenueWeek[],
  cashRows: CashFlowRow[],
  minCapacity = 65,
): WeekRiskRow[] {
  const perfWeeks = weeks
    .filter(w => w.performances > 0)
    .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())

  const actual: WeekRiskRow[] = perfWeeks.map(w => {
    const match = cashRows.find(r =>
      Math.abs(new Date(r.weekOf).getTime() - new Date(w.weekEnding).getTime()) <= MS_PER_WEEK
    )
    const nut = match
      ? match.payroll + match.venueCosts + match.marketing + match.royalties + match.vendorPayments + match.otherOutflows
      : fc.avgWeeklyNut
    const diff = w.grossRevenue - nut

    const risk: RiskLevel =
      diff < 0 ? 'critical'
      : w.capacityPct < minCapacity * 0.75 ? 'critical'
      : w.capacityPct < minCapacity * 0.9 ? 'at_risk'
      : w.capacityPct < minCapacity ? 'watch'
      : 'healthy'

    const recs: string[] = []
    if (diff < 0) recs.push('Revenue below weekly nut')
    if (w.capacityPct < minCapacity) recs.push(`Capacity below ${minCapacity}% target`)
    if (fc.avgATP > 0 && w.avgTicketPrice < fc.avgATP * 0.92) recs.push('ATP below run average')

    return {
      weekEnding: w.weekEnding,
      performances: w.performances,
      gross: w.grossRevenue,
      weeklyNut: nut,
      difference: diff,
      capacityPct: w.capacityPct,
      atp: w.avgTicketPrice,
      risk,
      recommendation: recs.length ? recs.join('; ') : 'On track',
      isProjected: false,
    }
  })

  const projected: WeekRiskRow[] = Array.from({ length: Math.min(fc.weeksRemaining, 8) }, (_, i) => {
    const d = new Date(Date.now() + (i + 1) * MS_PER_WEEK)
    const diff = fc.avgWeeklyGross - fc.avgWeeklyNut
    const risk: RiskLevel =
      diff < 0 ? 'critical'
      : fc.avgCapacityPct < minCapacity * 0.75 ? 'critical'
      : fc.avgCapacityPct < minCapacity * 0.9 ? 'at_risk'
      : fc.avgCapacityPct < minCapacity ? 'watch'
      : 'healthy'
    return {
      weekEnding: d.toISOString().split('T')[0],
      performances: Math.round(fc.avgPerfsPerWeek),
      gross: fc.avgWeeklyGross,
      weeklyNut: fc.avgWeeklyNut,
      difference: diff,
      capacityPct: fc.avgCapacityPct,
      atp: fc.avgATP,
      risk,
      recommendation: diff < 0 ? 'Projected below weekly nut' : 'Maintain current pace',
      isProjected: true,
    }
  })

  return [...actual, ...projected]
}

export function computeAllScenarios(fc: CoreForecast, cfg: ScenarioConfig): ScenarioResult[] {
  const {
    cumGross, cumNet, netGrossRatio, projectedRemainingGross,
    avgWeeklyNut, avgWeeklyGross, avgPerfsPerWeek, avgATP, avgTotalSeats,
    weeksRemaining, totalBudgeted, totalActual, cashPosition,
  } = fc

  function make(type: string, label: string, finalGross: number, costs: number, keyAssumption: string): ScenarioResult {
    const addedGross = finalGross - cumGross
    const finalNet = cumNet + addedGross * netGrossRatio
    const be = netGrossRatio > 0 ? costs / netGrossRatio : costs
    const gap = finalGross - be
    const endingCash = cashPosition + (finalNet - Math.max(0, costs - totalActual))
    const risk: RiskLevel =
      endingCash < 0 ? 'critical'
      : gap < -200000 ? 'critical'
      : gap < -50000 ? 'at_risk'
      : gap < 0 ? 'watch'
      : 'healthy'
    return { type, label, projectedFinalGross: finalGross, projectedFinalNet: finalNet, totalCosts: costs, breakevenGap: gap, endingCash, risk, keyAssumption }
  }

  const base = cumGross + projectedRemainingGross
  const extATP = cfg.extensionATP > 0 ? cfg.extensionATP : avgATP
  const extGross = cfg.extensionWeeks * avgPerfsPerWeek * extATP * avgTotalSeats * (cfg.extensionCapacityPct / 100)
  const extCosts = cfg.extensionWeeks * (avgWeeklyNut + cfg.extensionExtraWeeklyCost)

  return [
    make('base', 'Base Case', base, totalBudgeted, 'Current pace continues'),
    make('downside', `Downside (−${cfg.downsidePct}%)`,
      cumGross + projectedRemainingGross * (1 - cfg.downsidePct / 100),
      totalBudgeted, `Sales decline ${cfg.downsidePct}%`),
    make('upside', `Upside (+${cfg.upsidePct}%)`,
      cumGross + projectedRemainingGross * (1 + cfg.upsidePct / 100),
      totalBudgeted, `Sales improve ${cfg.upsidePct}%`),
    make('marketing_push', 'Marketing Push',
      cumGross + projectedRemainingGross * (1 + cfg.marketingLiftPct / 100),
      totalBudgeted + cfg.extraMarketing,
      `+${cfg.marketingLiftPct}% lift with $${cfg.extraMarketing.toLocaleString()} spend`),
    make('labour_increase', 'Labour Increase',
      base,
      totalBudgeted + avgWeeklyNut * (cfg.labourIncreasePct / 100) * weeksRemaining,
      `Labour costs +${cfg.labourIncreasePct}%`),
    make('early_close', 'Early Close',
      base - cfg.earlyCloseWeeks * avgWeeklyGross,
      totalBudgeted - cfg.earlyCloseWeeks * avgWeeklyNut,
      `Close ${cfg.earlyCloseWeeks} weeks early`),
    make('extension', 'Extension',
      base + extGross,
      totalBudgeted + extCosts,
      `${cfg.extensionWeeks}-wk extension at ${cfg.extensionCapacityPct}% cap.`),
  ]
}

export function computeChartData(
  fc: CoreForecast,
  weeks: RevenueWeek[],
  scenarioFinalGross?: number,
): ChartPoint[] {
  const perfWeeks = weeks
    .filter(w => w.performances > 0)
    .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())

  let cum = 0
  const actual: ChartPoint[] = perfWeeks.map(w => {
    cum += w.grossRevenue
    const d = new Date(w.weekEnding)
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: cum,
      projected: null,
      breakeven: fc.breakevenGross,
      target: fc.projectedFinalGross > 0 ? fc.projectedFinalGross : null,
    }
  })

  const multiplier = scenarioFinalGross && fc.projectedFinalGross > 0
    ? scenarioFinalGross / fc.projectedFinalGross
    : 1
  const weeklyStep = fc.avgWeeklyGross * multiplier

  let projCum = cum
  const projected: ChartPoint[] = Array.from({ length: Math.min(fc.weeksRemaining, 16) }, (_, i) => {
    projCum += weeklyStep
    const d = new Date(Date.now() + (i + 1) * MS_PER_WEEK)
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: null,
      projected: projCum,
      breakeven: fc.breakevenGross,
      target: fc.projectedFinalGross > 0 ? fc.projectedFinalGross : null,
    }
  })

  if (actual.length > 0 && projected.length > 0) {
    actual[actual.length - 1] = { ...actual[actual.length - 1], projected: cum }
  }

  return [...actual, ...projected]
}

const fmtAbs = (n: number) => '$' + Math.abs(Math.round(n)).toLocaleString()
const fmtPct = (n: number) => n.toFixed(0) + '%'

export function generateInsights(fc: CoreForecast, scenarios: ScenarioResult[]): string[] {
  const insights: string[] = []

  if (fc.cumGross === 0 && fc.weeksElapsed === 0) {
    insights.push(`This production hasn't opened yet. Projections are based on pro-forma targets and run length.`)
    if (fc.totalBudgeted > 0) {
      insights.push(`The production will need ${fmtAbs(fc.breakevenGross)} in gross revenue to cover its ${fmtAbs(fc.totalBudgeted)} budget.`)
    }
    return insights
  }

  if (fc.cumGross === 0) {
    insights.push('No performance revenue recorded yet — projections are based on pro-forma targets.')
    return insights
  }

  if (fc.breakevenGap < 0) {
    insights.push(`At current pace, this production is projected to finish ${fmtAbs(fc.breakevenGap)} below breakeven.`)
  } else {
    insights.push(`At current pace, this production is on track to exceed breakeven by ${fmtAbs(fc.breakevenGap)}.`)
  }

  if (fc.weeksRemaining > 0 && fc.requiredRemainingCapacity > 0) {
    if (fc.requiredRemainingCapacity > fc.avgCapacityPct + 5) {
      insights.push(`Breakeven requires an average remaining capacity of ${fmtPct(fc.requiredRemainingCapacity)}, but the run is currently averaging ${fmtPct(fc.avgCapacityPct)}.`)
    } else if (fc.avgCapacityPct > 0) {
      insights.push(`Required remaining capacity to break even is ${fmtPct(fc.requiredRemainingCapacity)}, in line with the current ${fmtPct(fc.avgCapacityPct)} average.`)
    }
  }

  if (fc.avgWeeklyNut > 0 && fc.avgWeeklyGross < fc.avgWeeklyNut) {
    insights.push(`Weekly gross (${fmtAbs(fc.avgWeeklyGross)}) is currently below the weekly operating cost (${fmtAbs(fc.avgWeeklyNut)}), creating cash pressure each week.`)
  }

  const down = scenarios.find(s => s.type === 'downside')
  const up = scenarios.find(s => s.type === 'upside')
  if (down && up) {
    insights.push(`Outcome range: ${fmtAbs(down.projectedFinalGross)} (downside) to ${fmtAbs(up.projectedFinalGross)} (upside) in projected gross.`)
  }

  const mkt = scenarios.find(s => s.type === 'marketing_push')
  if (mkt && fc.breakevenGap < 0 && mkt.breakevenGap > fc.breakevenGap) {
    const pct = Math.round(((mkt.breakevenGap - fc.breakevenGap) / Math.abs(fc.breakevenGap)) * 100)
    insights.push(`A marketing push scenario closes approximately ${pct}% of the current breakeven gap.`)
  }

  if (fc.weeksRemaining === 0) {
    insights.push('This production has closed. All values reflect final actuals.')
  } else {
    insights.push(`${fc.weeksRemaining} week${fc.weeksRemaining > 1 ? 's' : ''} remaining in the run.`)
  }

  return insights
}
