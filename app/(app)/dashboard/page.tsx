'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useDemo } from '@/contexts/DemoContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fmt, fmtPct, formatDate, daysUntil, statusLabel } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Shield, ChevronRight, CheckCircle2, Copy, Check } from 'lucide-react'
import type { Production } from '@/lib/types'

// ── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  critical: { label: 'Critical', cls: 'text-red-700 bg-red-50 border-red-200' },
  high:     { label: 'High',     cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  medium:   { label: 'Medium',   cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  low:      { label: 'Low',      cls: 'text-stone-500 bg-stone-50 border-stone-200' },
}

const HEALTH_CFG = {
  'high-risk':       { label: 'High risk',       cls: 'text-red-700 bg-red-50 border-red-200' },
  'needs-attention': { label: 'Needs attention', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  'stable':          { label: 'Stable',          cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
}

type AttentionCategory = 'contracts' | 'deadlines' | 'budget' | 'cashflow'
type AttentionFilter = 'all' | AttentionCategory
type PriorityLevel = keyof typeof PRIORITY_CFG

const FILTER_LABELS: Record<AttentionFilter, string> = {
  all: 'All', contracts: 'Contracts', deadlines: 'Deadlines', budget: 'Budget', cashflow: 'Cash Flow',
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }

interface AttentionItem {
  id: string
  priority: PriorityLevel
  category: AttentionCategory
  issue: string
  subtext?: string
  production: string
  detail: string
  actionLabel: string
  actionHref: string
  resolveLabel?: string
  resolveAction?: () => void
}

// ── Sales Pulse helpers ───────────────────────────────────────────────────────

type PacingStatus = 'ahead' | 'on-pace' | 'behind' | 'unknown'

const PACING_CFG: Record<PacingStatus, { label: string; cls: string }> = {
  'ahead':   { label: 'Ahead of pace', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'on-pace': { label: 'On pace',       cls: 'text-stone-600 bg-stone-50 border-stone-200' },
  'behind':  { label: 'Behind pace',  cls: 'text-red-700 bg-red-50 border-red-200' },
  'unknown': { label: '—',            cls: 'text-stone-300 bg-stone-50 border-stone-100' },
}


// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { productions, contracts, deadlines, budgetLines, obligations, revenueWeeks, cashFlowRows,
    updateObligation, updateContract, updateDeadline } = useStore()
  const { isDemo, config } = useDemo()
  const firstName = (isDemo && config?.user ? config.user : 'Leon Kay').split(' ')[0]

  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all')
  const [showAll, setShowAll] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [snapOpen, setSnapOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function resolveItem(item: AttentionItem) {
    item.resolveAction?.()
    setDismissed(prev => new Set([...prev, item.id]))
  }

  // ── KPI aggregates ───────────────────────────────────────────────────────
  const totalGross  = productions.reduce((s, p) => s + p.currentGross, 0)
  const totalBudget = productions.reduce((s, p) => s + p.totalBudget, 0)
  const totalActual = productions.reduce((s, p) => s + p.totalActual, 0)
  const totalCash   = productions.reduce((s, p) => s + p.cashOnHand, 0)
  const activeCount = productions.filter((p) => p.status !== 'closed').length

  const highVarianceLines = budgetLines.filter(
    (l) => l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0,
  )

  // ── Tickets sold across all productions ─────────────────────────────────
  const totalTicketsSold = revenueWeeks.reduce((s, w) => s + w.ticketsSold, 0)

  // ── Budget variance ──────────────────────────────────────────────────────
  const portfolioBudgetVariance = totalBudget - totalActual  // positive = under budget
  const budgetVariantPct = totalBudget > 0 ? (portfolioBudgetVariance / totalBudget) * 100 : 0
  const budgetVariant = portfolioBudgetVariance < 0 ? 'danger' : budgetVariantPct < 10 ? 'warn' : 'success'

  // ── Sales Pulse ──────────────────────────────────────────────────────────
  const activeProds = productions.filter((p) => p.status !== 'closed')
  const salesPulse = activeProds.map((p) => {
    const allWeeks    = revenueWeeks
      .filter((w) => w.productionId === p.id)
      .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())
    const lastWeek    = allWeeks[allWeeks.length - 1] ?? null
    const cumGross    = allWeeks.reduce((s, w) => s + w.grossRevenue, 0) || p.currentGross
    const totalTickets = allWeeks.reduce((s, w) => s + w.ticketsSold, 0)

    // Rate-based pacing: compare actual weekly revenue run-rate vs needed rate to hit projected gross
    let pacing: PacingStatus = 'unknown'
    if (p.closingDate && p.projectedGross > 0) {
      const closeTs    = new Date(p.closingDate + 'T12:00:00').getTime()
      const weeksLeft  = Math.max(0, (closeTs - Date.now()) / (7 * 86_400_000))
      const grossLeft  = Math.max(0, p.projectedGross - cumGross)
      const rateNeeded = weeksLeft > 0 ? grossLeft / weeksLeft : 0
      const recentWks  = allWeeks.filter((w) => w.grossRevenue > 0).slice(-4)
      const actualRate = recentWks.length > 0
        ? recentWks.reduce((s, w) => s + w.grossRevenue, 0) / recentWks.length
        : 0
      if (actualRate > 0 && rateNeeded > 0) {
        const ratio = actualRate / rateNeeded
        pacing = ratio > 1.05 ? 'ahead' : ratio < 0.90 ? 'behind' : 'on-pace'
      }
    }

    // Break-even (totalSeats is per-week, so no avgPerfsPerWk in denominator)
    const avgATPsp      = allWeeks.length > 0 ? allWeeks.reduce((s, w) => s + w.avgTicketPrice, 0) / allWeeks.length : 0
    const seatsSp       = allWeeks.length > 0 ? Math.max(...allWeeks.map(w => w.totalSeats)) : 0
    const weeksRemSp    = p.closingDate
      ? Math.max(0, Math.ceil((new Date(p.closingDate + 'T12:00:00').getTime() - Date.now()) / (7 * 86_400_000)))
      : 0
    const grossNeededSp = Math.max(0, (p.totalBudget || 0) - cumGross)
    const breakEvenCap  = weeksRemSp > 0 && avgATPsp > 0 && seatsSp > 0
      ? (grossNeededSp / (weeksRemSp * seatsSp * avgATPsp)) * 100
      : null
    const isProfitable  = p.totalBudget > 0 && cumGross >= p.totalBudget
    const profitPct     = isProfitable ? Math.round(((cumGross - p.totalBudget) / p.totalBudget) * 100) : 0

    // Avg tickets per performance — computed from all performance weeks, not just lastWeek
    const perfWeeks = allWeeks.filter((w) => w.performances > 0)
    const avgTicketsPerPerf = perfWeeks.length > 0
      ? Math.round(perfWeeks.reduce((s, w) => s + w.ticketsSold, 0) / perfWeeks.reduce((s, w) => s + w.performances, 0))
      : null
    const hasPerformances = perfWeeks.length > 0

    return { prod: p, totalTickets, lastWeek, pacing, breakEvenCap, isProfitable, profitPct, avgTicketsPerPerf, hasPerformances }
  })

  // ── Build attention items ────────────────────────────────────────────────
  const allItems: AttentionItem[] = []

  // Critical obligations
  for (const o of obligations.filter(
    (o) => !['completed', 'waived', 'not_applicable'].includes(o.status) && o.risk === 'critical',
  ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())) {
    const prod = productions.find((p) => p.id === o.productionId)
    const contract = contracts.find((c) => c.id === o.contractId)
    const daysOver = Math.abs(daysUntil(o.dueDate))
    allItems.push({
      id: `obl-crit-${o.id}`,
      priority: 'critical',
      category: 'contracts',
      issue: o.description,
      subtext: contract ? `${contract.partyName} · ${contract.contractType} contract` : undefined,
      production: prod?.name ?? '—',
      detail: daysUntil(o.dueDate) < 0 ? `${daysOver} days overdue` : `Due ${formatDate(o.dueDate)}`,
      actionLabel: 'Review contract',
      actionHref: `/contracts/${o.contractId}`,
      resolveLabel: 'Mark in progress',
      resolveAction: () => updateObligation({ ...o, status: 'in_progress' }),
    })
  }

  // Overdue deadlines — one row per production
  const overdueByProd = new Map<string, typeof deadlines>()
  for (const d of deadlines.filter((d) => d.status === 'overdue')) {
    const arr = overdueByProd.get(d.productionId) ?? []
    arr.push(d)
    overdueByProd.set(d.productionId, arr)
  }
  for (const [prodId, dls] of overdueByProd.entries()) {
    const prod = productions.find((p) => p.id === prodId)
    const oldest = [...dls].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    allItems.push({
      id: `deadlines-${prodId}`,
      priority: 'high',
      category: 'deadlines',
      issue: `${dls.length} overdue deadline${dls.length > 1 ? 's' : ''}`,
      subtext: oldest ? `Oldest: ${oldest.title}` : undefined,
      production: prod?.name ?? '—',
      detail: 'Deadlines past due',
      actionLabel: 'View deadlines',
      actionHref: '/calendar',
      resolveLabel: 'Acknowledge',
    })
  }

  // Budget variance
  if (highVarianceLines.length > 0) {
    const worstLine = [...highVarianceLines].sort((a, b) =>
      Math.abs((b.actual - b.budgeted) / b.budgeted) - Math.abs((a.actual - a.budgeted) / a.budgeted),
    )[0]
    allItems.push({
      id: 'budget-variance',
      priority: 'high',
      category: 'budget',
      issue: `${highVarianceLines.length} budget line${highVarianceLines.length > 1 ? 's' : ''} over 10% variance`,
      subtext: worstLine ? `Largest: ${worstLine.lineItem} (+${fmtPct(Math.abs((worstLine.actual - worstLine.budgeted) / worstLine.budgeted) * 100)})` : undefined,
      production: 'All productions',
      detail: 'Budget review needed',
      actionLabel: 'Review budget',
      actionHref: '/budget',
      resolveLabel: 'Acknowledge',
    })
  }

  // High-risk overdue obligations (non-critical) — limit 2
  for (const o of obligations
    .filter((o) => !['completed', 'waived', 'not_applicable'].includes(o.status) && o.risk === 'high' && daysUntil(o.dueDate) < 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 2)
  ) {
    const prod = productions.find((p) => p.id === o.productionId)
    const contract = contracts.find((c) => c.id === o.contractId)
    allItems.push({
      id: `obl-high-${o.id}`,
      priority: 'high',
      category: 'contracts',
      issue: o.description,
      subtext: contract ? `${contract.partyName}` : undefined,
      production: prod?.name ?? '—',
      detail: `${Math.abs(daysUntil(o.dueDate))} days overdue`,
      actionLabel: 'Review contract',
      actionHref: `/contracts/${o.contractId}`,
      resolveLabel: 'Mark in progress',
      resolveAction: () => updateObligation({ ...o, status: 'in_progress' }),
    })
  }

  // Cash flow risk — productions with low cash relative to remaining run
  for (const p of productions.filter(
    (p) => (p.status === 'in_performance' || p.status === 'closing') &&
            new Date(p.closingDate) > new Date() &&
            p.totalBudget > 0 &&
            p.cashOnHand / p.totalBudget < 0.20,
  )) {
    const weeksLeft = Math.max(1, Math.round((new Date(p.closingDate).getTime() - Date.now()) / (7 * 86400000)))
    allItems.push({
      id: `cashflow-${p.id}`,
      priority: 'high',
      category: 'cashflow',
      issue: 'Cash exposure review needed',
      subtext: `${fmt(p.cashOnHand)} on hand · ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''} remaining`,
      production: p.name,
      detail: `${fmtPct((p.cashOnHand / p.totalBudget) * 100)} of budget in cash`,
      actionLabel: 'Review cash flow',
      actionHref: '/cashflow',
      resolveLabel: 'Acknowledge',
    })
  }

  // Unsigned contracts past due
  const overdueContracts = contracts.filter(
    (c) => c.status !== 'signed' && c.status !== 'expired' && daysUntil(c.dueDate) < 0,
  )
  if (overdueContracts.length > 0) {
    const prodNames = [...new Set(
      overdueContracts.map((c) => productions.find((p) => p.id === c.productionId)?.name).filter(Boolean),
    )] as string[]
    allItems.push({
      id: 'unsigned-contracts',
      priority: 'medium',
      category: 'contracts',
      issue: `${overdueContracts.length} unsigned contract${overdueContracts.length > 1 ? 's' : ''} past due`,
      subtext: 'Signature follow-up required',
      production: prodNames.length === 1 ? prodNames[0] : `${prodNames.length} productions`,
      detail: `${overdueContracts.length} awaiting signature`,
      actionLabel: 'View contracts',
      actionHref: '/contracts',
      resolveLabel: 'Acknowledge',
    })
  }

  allItems.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const undismissed = allItems.filter(i => !dismissed.has(i.id))

  // Filtered + paginated items
  const filteredItems = attentionFilter === 'all' ? undismissed : undismissed.filter((i) => i.category === attentionFilter)
  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 5)
  const hiddenCount = filteredItems.length - visibleItems.length

  // Summary counts
  const criticalCount  = undismissed.filter((i) => i.priority === 'critical').length
  const highCount      = undismissed.filter((i) => i.priority === 'high').length
  const mediumCount    = undismissed.filter((i) => i.priority === 'medium').length
  const affectedProds  = new Set(undismissed.map((i) => i.production).filter((p) => p !== 'All productions')).size

  // ── Portfolio briefing ───────────────────────────────────────────────────
  const briefing = (() => {
    const strengths: string[] = []
    const watches: string[] = []

    for (const { prod: p, pacing, breakEvenCap, isProfitable, profitPct } of salesPulse) {
      if (isProfitable) {
        strengths.push(`${p.name} is ${profitPct}% above breakeven — looking strong`)
      } else if (pacing === 'ahead') {
        strengths.push(`${p.name} advance sales are running ahead of pace`)
      }
      if (!isProfitable && breakEvenCap !== null && breakEvenCap > 50) {
        watches.push(`${p.name} needs ${Math.ceil(breakEvenCap)}% avg capacity to recoup — worth a close look`)
      } else if (!isProfitable && pacing === 'behind') {
        watches.push(`${p.name} is pacing behind — may need a push`)
      }
    }

    if (portfolioBudgetVariance < -100000) {
      watches.push(`You're ${fmt(Math.abs(portfolioBudgetVariance))} over budget across the portfolio`)
    } else if (portfolioBudgetVariance > 300000) {
      strengths.push(`You're ${fmt(portfolioBudgetVariance)} under budget — nice cushion`)
    }

    const unsignedTotal = contracts.filter(c => c.status !== 'signed' && c.status !== 'expired').length
    if (unsignedTotal > 0) watches.push(`${unsignedTotal} contract${unsignedTotal > 1 ? 's' : ''} still need${unsignedTotal === 1 ? 's' : ''} a signature`)

    if (criticalCount > 0) watches.push(`${criticalCount} critical item${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} your attention now`)

    const profitableCount = salesPulse.filter(s => s.isProfitable).length
    let headline = ''
    if (profitableCount === activeProds.length && activeProds.length > 0) {
      headline = `All ${activeProds.length} of your shows are tracking profitably. Your portfolio is in great shape right now.`
    } else if (profitableCount > 0) {
      const names = salesPulse.filter(s => s.isProfitable).map(s => s.prod.name)
      const notYet = salesPulse.filter(s => !s.isProfitable).map(s => s.prod.name)
      headline = `${names.join(' and ')} ${names.length === 1 ? "is" : "are"} above breakeven — that's great news.${notYet.length > 0 ? ` ${notYet.join(' and ')} ${notYet.length === 1 ? "is" : "are"} still working toward recoupment.` : ''}`
    } else {
      headline = `None of your shows have hit breakeven yet — let's keep the focus on advance sales and pacing.`
    }

    return { headline, strengths: strengths.slice(0, 3), watches: watches.slice(0, 3) }
  })()

  // ── Spotlight production ─────────────────────────────────────────────────
  const spotlightProd = (() => {
    if (activeProds.length === 0) return null
    const now = Date.now()
    return [...activeProds].sort((a, b) =>
      Math.abs(new Date(a.openingDate).getTime() - now) - Math.abs(new Date(b.openingDate).getTime() - now)
    )[0]
  })()
  const spotlightEntry = spotlightProd ? (salesPulse.find(s => s.prod.id === spotlightProd.id) ?? null) : null
  const spotlightWeeks = spotlightProd
    ? revenueWeeks.filter(w => w.productionId === spotlightProd.id)
        .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())
    : []
  const spotlightLastPerfWeek = spotlightWeeks.filter(w => w.performances > 0).at(-1) ?? null
  const spotlightAdvanceGross = spotlightWeeks.filter(w => w.performances === 0).reduce((s, w) => s + w.grossRevenue, 0)
  const spotlightAdvanceTickets = spotlightWeeks.filter(w => w.performances === 0).reduce((s, w) => s + w.ticketsSold, 0)
  const spotlightCumGross = spotlightWeeks.reduce((s, w) => s + w.grossRevenue, 0) || (spotlightProd?.currentGross ?? 0)
  const spotlightIsPlaying = spotlightProd?.status === 'in_performance' || spotlightProd?.status === 'closing'
  const spotlightLabel = !spotlightProd ? '' :
    spotlightProd.status === 'in_performance' ? 'Now Playing' :
    spotlightProd.status === 'closing' ? 'Closing Soon' :
    spotlightProd.status === 'in_rehearsal' ? 'In Rehearsal' : 'Opening Soon'
  const spotlightDaysToOpen = spotlightProd ? daysUntil(spotlightProd.openingDate) : 0
  const spotlightDaysToClose = spotlightProd ? daysUntil(spotlightProd.closingDate) : 0
  const spotlightPctCaptured = spotlightProd && spotlightProd.projectedGross > 0
    ? Math.round((spotlightCumGross / spotlightProd.projectedGross) * 100)
    : null

  // ── Upcoming deadlines ───────────────────────────────────────────────────
  const upcomingDeadlines = deadlines
    .filter((d) => d.status !== 'completed' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6)

  const nextDeadline = deadlines
    .filter((d) => d.status !== 'completed' && daysUntil(d.date) > 14)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

  // ── Production health ────────────────────────────────────────────────────
  function productionHealth(p: Production): keyof typeof HEALTH_CFG {
    const budgetPct = p.totalBudget > 0 ? (p.totalActual / p.totalBudget) * 100 : 0
    const unsigned  = contracts.filter((c) => c.productionId === p.id && c.status !== 'signed' && c.status !== 'expired').length
    const overdue   = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length
    const hasCritical = obligations.some(
      (o) => o.productionId === p.id && !['completed', 'waived', 'not_applicable'].includes(o.status) && o.risk === 'critical',
    )
    if (budgetPct > 90 || hasCritical) return 'high-risk'
    if (unsigned > 0 || overdue > 0 || budgetPct > 80) return 'needs-attention'
    return 'stable'
  }

  // ── Obligation spotlight ─────────────────────────────────────────────────
  const spotlightObls = obligations
    .filter((o) => !['completed', 'waived', 'not_applicable'].includes(o.status) && (o.risk === 'critical' || o.risk === 'high'))
    .sort((a, b) => {
      const r = { critical: 0, high: 1, medium: 2, low: 3 }
      return (r[a.risk] - r[b.risk]) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    .slice(0, 5)

  // ── Weekly snapshot text ────────────────────────────────────────────────
  const snapshotDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const snapshotText = [
    `WEEKLY SNAPSHOT — ${snapshotDate}`,
    '═'.repeat(40),
    '',
    `ACTIVE PRODUCTIONS (${activeProds.length})`,
    '',
    ...salesPulse.flatMap(({ prod: p, lastWeek, breakEvenCap, isProfitable, profitPct }) => {
      const weeksRem = p.closingDate
        ? Math.max(0, Math.ceil((new Date(p.closingDate + 'T12:00:00').getTime() - Date.now()) / (7 * 86_400_000)))
        : null
      const pctCaptured = p.projectedGross > 0 ? Math.round((p.currentGross / p.projectedGross) * 100) : null
      const beLabel = isProfitable ? `+${profitPct}% above B/E` : breakEvenCap === null ? '—' : `${Math.ceil(breakEvenCap)}% avg capacity`
      return [
        `${p.name.toUpperCase()}`,
        `  Gross to date:  ${fmt(p.currentGross)}${pctCaptured !== null ? `  (${pctCaptured}% of projected ${fmt(p.projectedGross)})` : ''}`,
        lastWeek ? `  Last week:      ${fmt(lastWeek.grossRevenue)} gross  |  ${lastWeek.capacityPct.toFixed(0)}% capacity` : '  Last week:      No data',
        `  Cash on hand:   ${fmt(p.cashOnHand)}`,
        weeksRem !== null ? `  Break-even:     ${beLabel}${weeksRem > 0 ? ` over ${weeksRem} remaining wk${weeksRem !== 1 ? 's' : ''}` : ''}` : '',
        '',
      ].filter(Boolean)
    }),
    '',
    `ITEMS NEEDING ATTENTION (${undismissed.length})`,
    '',
    ...undismissed
      .filter(i => i.priority === 'critical' || i.priority === 'high')
      .map(i => `  [${i.priority.toUpperCase()}]  ${i.issue} — ${i.production} — ${i.detail}`),
    undismissed.filter(i => i.priority !== 'critical' && i.priority !== 'high').length > 0
      ? `  + ${undismissed.filter(i => i.priority !== 'critical' && i.priority !== 'high').length} medium/low priority items`
      : '',
  ].filter(l => l !== undefined).join('\n')

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle={`You've got ${activeCount} active show${activeCount !== 1 ? 's' : ''}${undismissed.length > 0 ? ` · ${undismissed.length} thing${undismissed.length !== 1 ? 's' : ''} need${undismissed.length === 1 ? 's' : ''} your attention` : ' · all clear today'}`}
        actions={
          <button
            onClick={() => setSnapOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-200 text-xs font-medium text-stone-600 bg-white hover:bg-stone-50 hover:border-stone-300 transition-colors"
          >
            <Copy size={12} />
            Weekly Snapshot
          </button>
        }
      />

      {/* ── Portfolio Briefing ───────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-stone-800 bg-stone-950 px-6 py-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Today's Briefing</p>
        </div>
        <p className="text-sm font-medium text-white leading-relaxed mb-4">{briefing.headline}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <div>
            {briefing.strengths.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-1.5">What's working</p>
            )}
            {briefing.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-stone-300 mb-1">
                <span className="text-emerald-400 shrink-0 mt-px">↑</span>
                {s}
              </div>
            ))}
          </div>
          <div>
            {briefing.watches.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 mb-1.5">Keep an eye on</p>
            )}
            {briefing.watches.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-stone-300 mb-1">
                <span className="text-amber-400 shrink-0 mt-px">!</span>
                {w}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Spotlight Production ──────────────────────────────────────────── */}
      {spotlightProd && spotlightEntry && (
        <div
          className="mb-6 rounded-xl border border-stone-200 bg-white overflow-hidden flex flex-col sm:flex-row"
          style={{ borderTopWidth: 3, borderTopColor: spotlightProd.color }}
        >
          {/* Poster */}
          <div
            className="relative overflow-hidden w-full h-40 sm:w-36 sm:h-auto shrink-0"
            style={{ backgroundColor: `${spotlightProd.color}18` }}
          >
            {spotlightProd.imageUrl ? (
              <img
                src={spotlightProd.imageUrl}
                alt={spotlightProd.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-6xl font-bold" style={{ color: spotlightProd.color, opacity: 0.25 }}>
                  {spotlightProd.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-5 min-w-0">
            {/* Label + pacing */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ color: spotlightProd.color, backgroundColor: `${spotlightProd.color}18` }}
              >
                {spotlightLabel}
              </span>
              {spotlightEntry.pacing !== 'unknown' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${PACING_CFG[spotlightEntry.pacing].cls}`}>
                  {PACING_CFG[spotlightEntry.pacing].label}
                </span>
              )}
            </div>

            {/* Title + link */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-stone-900 leading-tight">{spotlightProd.name}</h2>
                <p className="text-xs text-stone-500 mt-0.5 truncate">{spotlightProd.subtitle} · {spotlightProd.venue}</p>
              </div>
              <Link
                href={`/productions/${spotlightProd.id}`}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors group"
              >
                Full view <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 border-t border-stone-100 pt-4">
              {spotlightIsPlaying ? (
                <>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Gross to Date</p>
                    <p className="text-sm font-semibold text-stone-900">{fmt(spotlightCumGross)}</p>
                    {spotlightPctCaptured !== null && (
                      <p className="text-xs text-stone-400 mt-0.5">{spotlightPctCaptured}% of projected</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Last Week Gross</p>
                    <p className="text-sm font-semibold text-stone-900">
                      {spotlightLastPerfWeek ? fmt(spotlightLastPerfWeek.grossRevenue) : <span className="text-stone-300">—</span>}
                    </p>
                    {spotlightLastPerfWeek && (
                      <p className="text-xs text-stone-400 mt-0.5">{spotlightLastPerfWeek.capacityPct.toFixed(0)}% capacity</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Break-even</p>
                    <p className="text-sm font-semibold text-stone-900">
                      {spotlightEntry.isProfitable
                        ? <span className="text-emerald-700">+{spotlightEntry.profitPct}% above</span>
                        : spotlightEntry.breakEvenCap !== null
                          ? `${Math.ceil(spotlightEntry.breakEvenCap)}% avg cap`
                          : <span className="text-stone-300">—</span>
                      }
                    </p>
                    {!spotlightEntry.isProfitable && spotlightEntry.breakEvenCap !== null && (
                      <p className="text-xs text-stone-400 mt-0.5">needed to recoup</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Closes</p>
                    <p className="text-sm font-semibold text-stone-900">{formatDate(spotlightProd.closingDate)}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {spotlightDaysToClose > 0 ? `in ${spotlightDaysToClose} days` : 'closed'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Advance Sales</p>
                    <p className="text-sm font-semibold text-stone-900">
                      {spotlightAdvanceGross > 0
                        ? fmt(spotlightAdvanceGross)
                        : <span className="text-stone-400 text-xs">Not yet on sale</span>
                      }
                    </p>
                    {spotlightAdvanceGross > 0 && spotlightPctCaptured !== null && (
                      <p className="text-xs text-stone-400 mt-0.5">{spotlightPctCaptured}% of projected</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Tickets Sold</p>
                    <p className="text-sm font-semibold text-stone-900">
                      {spotlightAdvanceTickets > 0
                        ? spotlightAdvanceTickets.toLocaleString()
                        : <span className="text-stone-300">—</span>
                      }
                    </p>
                    {spotlightAdvanceTickets > 0 && <p className="text-xs text-stone-400 mt-0.5">advance tickets</p>}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Opening Night</p>
                    <p className="text-sm font-semibold text-stone-900">{formatDate(spotlightProd.openingDate)}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {spotlightDaysToOpen > 0
                        ? `in ${spotlightDaysToOpen} days`
                        : spotlightDaysToOpen === 0 ? 'Tonight!' : 'Opened'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 mb-0.5">Cash on Hand</p>
                    <p className="text-sm font-semibold text-stone-900">{fmt(spotlightProd.cashOnHand)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Gross"
          value={fmt(totalGross)}
          sub={`across ${productions.length} production${productions.length !== 1 ? 's' : ''}`}
          trend="up"
        />
        <StatCard
          label="Budget Variance"
          value={portfolioBudgetVariance >= 0 ? `+${fmt(portfolioBudgetVariance)}` : `-${fmt(Math.abs(portfolioBudgetVariance))}`}
          sub={portfolioBudgetVariance < 0 ? 'over budget — review required' : budgetVariantPct < 10 ? 'approaching budget — watch spend' : 'under budget — on track'}
          trend={portfolioBudgetVariance >= 0 ? 'up' : 'down'}
          variant={budgetVariant as 'success' | 'warn' | 'danger'}
        />
        <StatCard
          label="Tickets Sold"
          value={totalTicketsSold.toLocaleString()}
          sub="across all productions"
          trend="up"
        />
        <StatCard
          label="Cash on Hand"
          value={fmt(totalCash)}
          sub="combined available"
          trend="neutral"
        />
      </div>

      {/* ── Sales Pulse ──────────────────────────────────────────────────── */}
      {activeProds.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales Pulse</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">Here's how your shows are selling right now.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {['Production', 'Last Week Gross', 'Avg Tickets/Perf', 'Avg Ticket Price', 'Total Tickets Sold', 'Pacing'].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {salesPulse.map(({ prod: p, totalTickets, lastWeek, pacing, avgTicketsPerPerf, hasPerformances }) => {
                    const pacingCfg = PACING_CFG[pacing]
                    return (
                      <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/productions/${p.id}`} className="flex items-center gap-2 group w-fit">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="font-medium text-stone-800 group-hover:text-stone-500 transition-colors">{p.name}</span>
                          </Link>
                          <p className="text-xs text-stone-400 mt-0.5 pl-3.5">{statusLabel(p.status)}</p>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-stone-800">
                          {lastWeek ? fmt(lastWeek.grossRevenue) : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-stone-700">
                          {avgTicketsPerPerf !== null
                            ? avgTicketsPerPerf.toLocaleString()
                            : !hasPerformances
                              ? <span className="text-stone-400 text-xs">Pre-opening</span>
                              : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-stone-700">
                          {lastWeek ? fmt(lastWeek.avgTicketPrice, 2) : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-stone-700 font-medium">
                          {totalTickets > 0 ? totalTickets.toLocaleString() : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${pacingCfg.cls}`}>
                            {pacingCfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Needs Attention Today ─────────────────────────────────────────── */}
      {allItems.length > 0 && (
        <Card className="mb-6">
          {/* Card header with title + summary strip */}
          <CardHeader className="border-b border-stone-100 pb-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Needs Attention Today</CardTitle>
                <p className="text-xs text-stone-500 mt-0.5">Things that need your eyes on them today.</p>
              </div>
              {/* Summary counts */}
              <div className="flex items-center gap-3 text-xs shrink-0">
                {criticalCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-stone-600 font-medium">{criticalCount} critical</span>
                  </span>
                )}
                {highCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-stone-600 font-medium">{highCount} high</span>
                  </span>
                )}
                {mediumCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-stone-600 font-medium">{mediumCount} medium</span>
                  </span>
                )}
                <span className="text-stone-400">·</span>
                <span className="text-stone-500">{affectedProds} production{affectedProds !== 1 ? 's' : ''} affected</span>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {(Object.keys(FILTER_LABELS) as AttentionFilter[]).map((f) => {
                const count = f === 'all' ? allItems.length : allItems.filter((i) => i.category === f).length
                if (f !== 'all' && count === 0) return null
                return (
                  <button
                    key={f}
                    onClick={() => { setAttentionFilter(f); setShowAll(false) }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                      attentionFilter === f
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700'
                    }`}
                  >
                    {FILTER_LABELS[f]}
                    {count > 0 && (
                      <span className={`ml-1.5 ${attentionFilter === f ? 'text-stone-300' : 'text-stone-400'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredItems.length === 0 ? (
              <p className="px-5 py-4 text-sm text-stone-500">No items in this category.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 border-b border-stone-100">
                      <tr>
                        {['Priority', 'Issue', 'Production', 'Status / Detail', 'Action', ''].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {visibleItems.map((item) => {
                        const cfg = PRIORITY_CFG[item.priority]
                        return (
                          <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cfg.cls}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top max-w-xs">
                              <p className="text-sm font-medium text-stone-800 leading-snug">{item.issue}</p>
                              {item.subtext && (
                                <p className="text-xs text-stone-400 mt-0.5 leading-snug">{item.subtext}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-stone-600 text-sm whitespace-nowrap align-top">{item.production}</td>
                            <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap align-top pt-3.5">{item.detail}</td>
                            <td className="px-4 py-3 whitespace-nowrap align-top pt-3.5">
                              <Link
                                href={item.actionHref}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors group"
                              >
                                {item.actionLabel}
                                <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                              </Link>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top pt-3">
                              {item.resolveLabel && (
                                <button
                                  onClick={() => resolveItem(item)}
                                  className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-emerald-600 transition-colors group"
                                  title={item.resolveLabel}
                                >
                                  <CheckCircle2 size={14} className="group-hover:scale-110 transition-transform" />
                                  <span className="hidden sm:inline">{item.resolveLabel}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* View all / collapse footer */}
                {(hiddenCount > 0 || showAll) && (
                  <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/50">
                    <button
                      onClick={() => setShowAll((v) => !v)}
                      className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
                    >
                      {showAll
                        ? '↑ Show fewer items'
                        : `View all ${filteredItems.length} items →`}
                    </button>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Production cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {productions.map((p) => {
          const budgetPct  = p.totalBudget > 0 ? (p.totalActual / p.totalBudget) * 100 : 0
          const unsigned   = contracts.filter((c) => c.productionId === p.id && c.status !== 'signed' && c.status !== 'expired')
          const prodOverdue = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue')
          const variantLines = budgetLines.filter(
            (l) => l.productionId === p.id && l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0,
          )
          const health    = productionHealth(p)
          const healthCfg = HEALTH_CFG[health]

          return (
            <Card key={p.id} className="hover:border-stone-300 transition-colors overflow-hidden flex flex-col">
              {p.imageUrl && (
                <div className="h-28 overflow-hidden shrink-0">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                  />
                </div>
              )}
              <CardBody className="p-5 flex flex-col flex-1">
                {/* Status + health */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${healthCfg.cls}`}>
                    {healthCfg.label}
                  </span>
                </div>

                <h3 className="font-semibold text-stone-900 mb-0.5 leading-snug">{p.name}</h3>
                <p className="text-xs text-stone-500 mb-4">{p.venue}</p>

                {/* Budget bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-500">Budget used</span>
                    <span className={`font-medium ${budgetPct > 90 ? 'text-red-600' : budgetPct > 80 ? 'text-amber-600' : 'text-stone-700'}`}>
                      {fmtPct(budgetPct)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: budgetPct > 90 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : p.color }}
                    />
                  </div>
                </div>

                {/* Revenue & cash */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-stone-500">Gross Revenue</p>
                    <p className="text-sm font-semibold text-stone-800">{fmt(p.currentGross)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Cash on Hand</p>
                    <p className="text-sm font-semibold text-stone-800">{fmt(p.cashOnHand)}</p>
                  </div>
                </div>

                {/* Actionable risk chips */}
                {(unsigned.length > 0 || prodOverdue.length > 0 || variantLines.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {unsigned.length > 0 && (
                      <Link href="/contracts" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors">
                        {unsigned.length} unsigned — Review contracts
                      </Link>
                    )}
                    {prodOverdue.length > 0 && (
                      <Link href="/calendar" className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors">
                        {prodOverdue.length} overdue — View deadlines
                      </Link>
                    )}
                    {variantLines.length > 0 && (
                      <Link href="/budget" className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 transition-colors">
                        {variantLines.length} over budget — Review budget
                      </Link>
                    )}
                  </div>
                )}

                {/* Primary action */}
                <div className="mt-auto pt-1">
                  <Link
                    href={`/productions/${p.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors group"
                  >
                    {health === 'high-risk' ? 'Review risks' : health === 'needs-attention' ? 'View production' : 'Open production'}
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* ── Weekly Snapshot modal ────────────────────────────────────────── */}
      {snapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSnapOpen(false) }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Weekly Snapshot</h2>
                <p className="text-xs text-stone-500 mt-0.5">Copy and paste into email or investor update</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(snapshotText)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                    copied
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy to clipboard</>}
                </button>
                <button
                  onClick={() => setSnapOpen(false)}
                  className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-y-auto px-6 py-4 text-xs text-stone-700 font-mono leading-relaxed whitespace-pre-wrap">
              {snapshotText}
            </pre>
          </div>
        </div>
      )}

      {/* ── Lower modules ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming deadlines */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <Link href="/calendar" className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors group inline-flex items-center gap-1">
              View all <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {upcomingDeadlines.length === 0 ? (
              <div className="px-6 py-5">
                <p className="text-sm text-stone-600">No deadlines due in the next 14 days. All tracked deadlines are currently up to date.</p>
                {nextDeadline && (
                  <p className="text-xs text-stone-400 mt-2">
                    Next deadline: <span className="text-stone-600 font-medium">{nextDeadline.title}</span> — {formatDate(nextDeadline.date)}
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {upcomingDeadlines.map((d) => {
                  const days = daysUntil(d.date)
                  const prod = productions.find((p) => p.id === d.productionId)
                  return (
                    <div key={d.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prod?.color || '#a8a29e' }} />
                        <div className="min-w-0">
                          <p className="text-sm text-stone-800 truncate">{d.title}</p>
                          <p className="text-xs text-stone-500">{prod?.name}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs text-stone-700 font-medium">{formatDate(d.date)}</p>
                        <p className={`text-xs font-medium ${days === 0 ? 'text-red-600' : days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-600' : 'text-stone-400'}`}>
                          {days === 0 ? 'Today' : `in ${days}d`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Obligation Spotlight */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield size={14} className="text-stone-400" />
              Obligation Spotlight
            </CardTitle>
            <Link href="/contracts" className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors group inline-flex items-center gap-1">
              View contracts <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {spotlightObls.length === 0 ? (
              <p className="px-6 py-5 text-sm text-stone-500">No critical obligations outstanding.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {spotlightObls.map((o) => {
                  const prod    = productions.find((p) => p.id === o.productionId)
                  const daysOver = daysUntil(o.dueDate) < 0 ? Math.abs(daysUntil(o.dueDate)) : null
                  return (
                    <Link
                      key={o.id}
                      href={`/contracts/${o.contractId}`}
                      className="flex items-start justify-between px-6 py-3.5 hover:bg-stone-50 transition-colors block"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: prod?.color || '#a8a29e' }} />
                        <div className="min-w-0">
                          <p className="text-sm text-stone-800 font-medium truncate">{o.description}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{o.partyName}{prod ? ` · ${prod.name}` : ''}</p>
                          {daysOver && <p className="text-xs text-red-600 font-medium mt-0.5">{daysOver} days overdue</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${
                          o.risk === 'critical' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {o.risk}
                        </span>
                        <ChevronRight size={13} className="text-stone-300" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
