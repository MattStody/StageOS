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
import { ArrowRight, Shield, ChevronRight } from 'lucide-react'
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
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { productions, contracts, deadlines, budgetLines, obligations } = useStore()
  const { isDemo, config } = useDemo()
  const firstName = (isDemo && config?.user ? config.user : 'Leon Kay').split(' ')[0]

  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all')
  const [showAll, setShowAll] = useState(false)

  // ── KPI aggregates ───────────────────────────────────────────────────────
  const totalGross  = productions.reduce((s, p) => s + p.currentGross, 0)
  const totalBudget = productions.reduce((s, p) => s + p.totalBudget, 0)
  const totalActual = productions.reduce((s, p) => s + p.totalActual, 0)
  const totalCash   = productions.reduce((s, p) => s + p.cashOnHand, 0)
  const activeCount = productions.filter((p) => p.status !== 'closed').length

  const highVarianceLines = budgetLines.filter(
    (l) => l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0,
  )

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
    })
  }

  allItems.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  // Filtered + paginated items
  const filteredItems = attentionFilter === 'all' ? allItems : allItems.filter((i) => i.category === attentionFilter)
  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 5)
  const hiddenCount = filteredItems.length - visibleItems.length

  // Summary counts
  const criticalCount  = allItems.filter((i) => i.priority === 'critical').length
  const highCount      = allItems.filter((i) => i.priority === 'high').length
  const mediumCount    = allItems.filter((i) => i.priority === 'medium').length
  const affectedProds  = new Set(allItems.map((i) => i.production).filter((p) => p !== 'All productions')).size

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

  return (
    <div>
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle={`${activeCount} active production${activeCount !== 1 ? 's' : ''} · ${allItems.length} item${allItems.length !== 1 ? 's' : ''} need${allItems.length === 1 ? 's' : ''} attention today`}
      />

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
          value={`${highVarianceLines.length} line${highVarianceLines.length !== 1 ? 's' : ''} over threshold`}
          sub={highVarianceLines.length > 0 ? 'review required' : 'all within range'}
          trend={highVarianceLines.length > 0 ? 'down' : 'neutral'}
          alert={highVarianceLines.length > 0}
        />
        <StatCard
          label="Total Spent"
          value={fmt(totalActual)}
          sub={`${fmtPct((totalBudget > 0 ? totalActual / totalBudget : 0) * 100)} of budget`}
          trend="neutral"
        />
        <StatCard
          label="Cash on Hand"
          value={fmt(totalCash)}
          sub="combined available"
          trend="neutral"
        />
      </div>

      {/* ── Needs Attention Today ─────────────────────────────────────────── */}
      {allItems.length > 0 && (
        <Card className="mb-6">
          {/* Card header with title + summary strip */}
          <CardHeader className="border-b border-stone-100 pb-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Needs Attention Today</CardTitle>
                <p className="text-xs text-stone-500 mt-0.5">Critical production risks and operational items requiring action.</p>
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
                        {['Priority', 'Issue', 'Production', 'Status / Detail', 'Action'].map((h) => (
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
