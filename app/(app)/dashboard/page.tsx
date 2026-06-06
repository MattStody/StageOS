'use client'
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

// ── Severity config ──────────────────────────────────────────────────────────

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

interface AttentionItem {
  id: string
  priority: keyof typeof PRIORITY_CFG
  issue: string
  production: string
  detail: string
  actionLabel: string
  actionHref: string
}

const PRIORITY_ORDER: Record<keyof typeof PRIORITY_CFG, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export default function DashboardPage() {
  const { productions, contracts, deadlines, budgetLines, obligations } = useStore()
  const { isDemo, config } = useDemo()
  const firstName = (isDemo && config?.user ? config.user : 'Leon Kay').split(' ')[0]

  // ── KPI aggregates ───────────────────────────────────────────────────────
  const totalGross  = productions.reduce((s, p) => s + p.currentGross, 0)
  const totalBudget = productions.reduce((s, p) => s + p.totalBudget, 0)
  const totalActual = productions.reduce((s, p) => s + p.totalActual, 0)
  const totalCash   = productions.reduce((s, p) => s + p.cashOnHand, 0)
  const activeCount = productions.filter((p) => p.status !== 'closed').length

  const highVarianceLines = budgetLines.filter(
    (l) => l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0,
  )

  const highRiskObligations = obligations.filter((o) => {
    if (['completed', 'waived', 'not_applicable'].includes(o.status)) return false
    return o.risk === 'critical' || o.risk === 'high'
  })

  // ── "Needs Attention Today" items ────────────────────────────────────────
  const attentionItems: AttentionItem[] = []

  // 1. Critical obligations — one row each
  const criticalObls = obligations
    .filter((o) => !['completed', 'waived', 'not_applicable'].includes(o.status) && o.risk === 'critical')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  for (const o of criticalObls) {
    const prod = productions.find((p) => p.id === o.productionId)
    const daysOver = Math.abs(daysUntil(o.dueDate))
    attentionItems.push({
      id: `obl-crit-${o.id}`,
      priority: 'critical',
      issue: o.description,
      production: prod?.name ?? '—',
      detail: daysUntil(o.dueDate) < 0 ? `${daysOver} days overdue` : `Due ${formatDate(o.dueDate)}`,
      actionLabel: 'Review contract',
      actionHref: `/contracts/${o.contractId}`,
    })
  }

  // 2. Overdue deadlines — grouped by production
  const overdueByProd = new Map<string, typeof deadlines>()
  for (const d of deadlines.filter((d) => d.status === 'overdue')) {
    const arr = overdueByProd.get(d.productionId) ?? []
    arr.push(d)
    overdueByProd.set(d.productionId, arr)
  }
  for (const [prodId, dls] of overdueByProd.entries()) {
    const prod = productions.find((p) => p.id === prodId)
    attentionItems.push({
      id: `deadlines-${prodId}`,
      priority: 'high',
      issue: `${dls.length} overdue deadline${dls.length > 1 ? 's' : ''}`,
      production: prod?.name ?? '—',
      detail: 'Deadlines past due',
      actionLabel: 'View deadlines',
      actionHref: '/calendar',
    })
  }

  // 3. Budget variance — one aggregate row
  if (highVarianceLines.length > 0) {
    attentionItems.push({
      id: 'budget-variance',
      priority: 'high',
      issue: `${highVarianceLines.length} budget line${highVarianceLines.length > 1 ? 's' : ''} over 10% variance`,
      production: 'All productions',
      detail: 'Budget review needed',
      actionLabel: 'Review budget',
      actionHref: '/budget',
    })
  }

  // 4. High-risk overdue obligations (non-critical)
  const highObls = obligations
    .filter((o) => !['completed', 'waived', 'not_applicable'].includes(o.status) && o.risk === 'high' && daysUntil(o.dueDate) < 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 2)

  for (const o of highObls) {
    const prod = productions.find((p) => p.id === o.productionId)
    attentionItems.push({
      id: `obl-high-${o.id}`,
      priority: 'high',
      issue: o.description,
      production: prod?.name ?? '—',
      detail: `${Math.abs(daysUntil(o.dueDate))} days overdue`,
      actionLabel: 'Review contract',
      actionHref: `/contracts/${o.contractId}`,
    })
  }

  // 5. Unsigned contracts past due — one aggregate row
  const overdueContracts = contracts.filter(
    (c) => c.status !== 'signed' && c.status !== 'expired' && daysUntil(c.dueDate) < 0,
  )
  if (overdueContracts.length > 0) {
    const prodNames = [...new Set(
      overdueContracts
        .map((c) => productions.find((p) => p.id === c.productionId)?.name)
        .filter((n): n is string => Boolean(n)),
    )]
    attentionItems.push({
      id: 'unsigned-contracts',
      priority: 'medium',
      issue: `${overdueContracts.length} unsigned contract${overdueContracts.length > 1 ? 's' : ''} past due`,
      production: prodNames.length === 1 ? prodNames[0] : `${prodNames.length} productions`,
      detail: 'Signature follow-up required',
      actionLabel: 'View contracts',
      actionHref: '/contracts',
    })
  }

  attentionItems.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

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
    const unsigned = contracts.filter(
      (c) => c.productionId === p.id && c.status !== 'signed' && c.status !== 'expired',
    ).length
    const overdueCount = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length
    const hasCritical = obligations.some(
      (o) =>
        o.productionId === p.id &&
        !['completed', 'waived', 'not_applicable'].includes(o.status) &&
        o.risk === 'critical',
    )
    if (budgetPct > 90 || hasCritical) return 'high-risk'
    if (unsigned > 0 || overdueCount > 0 || budgetPct > 80) return 'needs-attention'
    return 'stable'
  }

  // ── Obligation spotlight ─────────────────────────────────────────────────
  const spotlightObls = obligations
    .filter((o) => !['completed', 'waived', 'not_applicable'].includes(o.status) && (o.risk === 'critical' || o.risk === 'high'))
    .sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return (riskOrder[a.risk] - riskOrder[b.risk]) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    .slice(0, 5)

  return (
    <div>
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle={`${activeCount} active production${activeCount !== 1 ? 's' : ''} · ${attentionItems.length} item${attentionItems.length !== 1 ? 's' : ''} need${attentionItems.length === 1 ? 's' : ''} attention today`}
      />

      {/* ── Needs Attention Today ─────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div>
              <CardTitle>Needs Attention Today</CardTitle>
              <p className="text-xs text-stone-500 mt-0.5">Critical production risks and operational items requiring action.</p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-100 bg-stone-50">
                  <tr>
                    {['Priority', 'Issue', 'Production', 'Status / Detail', 'Action'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {attentionItems.map((item) => {
                    const cfg = PRIORITY_CFG[item.priority]
                    return (
                      <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-800 font-medium">{item.issue}</td>
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{item.production}</td>
                        <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{item.detail}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={item.actionHref}
                            className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 underline underline-offset-2 transition-colors"
                          >
                            {item.actionLabel}
                            <ChevronRight size={11} />
                          </Link>
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

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* ── Production cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {productions.map((p) => {
          const budgetPct = p.totalBudget > 0 ? (p.totalActual / p.totalBudget) * 100 : 0
          const unsigned = contracts.filter(
            (c) => c.productionId === p.id && c.status !== 'signed' && c.status !== 'expired',
          )
          const prodOverdue = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue')
          const variantLines = budgetLines.filter(
            (l) => l.productionId === p.id && l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0,
          )
          const health = productionHealth(p)
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
                {/* Status row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${healthCfg.cls}`}>
                    {healthCfg.label}
                  </span>
                </div>

                <h3 className="font-semibold text-stone-900 mb-0.5 leading-snug">{p.name}</h3>
                <p className="text-xs text-stone-500 mb-4 leading-relaxed">{p.venue}</p>

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
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(budgetPct, 100)}%`,
                        backgroundColor: budgetPct > 90 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : p.color,
                      }}
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
                      <Link
                        href="/contracts"
                        className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {unsigned.length} unsigned — Review contracts
                      </Link>
                    )}
                    {prodOverdue.length > 0 && (
                      <Link
                        href="/calendar"
                        className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {prodOverdue.length} overdue — View deadlines
                      </Link>
                    )}
                    {variantLines.length > 0 && (
                      <Link
                        href="/budget"
                        className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {variantLines.length} over budget — Review budget
                      </Link>
                    )}
                  </div>
                )}

                {/* Primary action */}
                <div className="mt-auto pt-1">
                  <Link
                    href={`/productions/${p.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    {health === 'high-risk'
                      ? 'Review risks'
                      : health === 'needs-attention'
                      ? 'View production'
                      : 'Open production'}
                    <ArrowRight size={12} />
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
            <Link href="/calendar" className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors">
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {upcomingDeadlines.length === 0 ? (
              <div className="px-6 py-5">
                <p className="text-sm text-stone-600">
                  No deadlines due in the next 14 days. All tracked deadlines are currently up to date.
                </p>
                {nextDeadline && (
                  <p className="text-xs text-stone-400 mt-2">
                    Next deadline:{' '}
                    <span className="text-stone-600 font-medium">{nextDeadline.title}</span>
                    {' — '}
                    {formatDate(nextDeadline.date)}
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
            <Link href="/contracts" className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors">
              View contracts →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {spotlightObls.length === 0 ? (
              <p className="px-6 py-5 text-sm text-stone-500">No critical obligations outstanding.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {spotlightObls.map((o) => {
                  const prod = productions.find((p) => p.id === o.productionId)
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
                          <p className="text-xs text-stone-500 mt-0.5">
                            {o.partyName}{prod ? ` · ${prod.name}` : ''}
                          </p>
                          {daysOver && (
                            <p className="text-xs text-red-600 font-medium mt-0.5">{daysOver} days overdue</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${
                          o.risk === 'critical'
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
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
