'use client'
import { useStore } from '@/lib/store'
import { useDemo } from '@/contexts/DemoContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiskAlert } from '@/components/ui/RiskAlert'
import { fmt, fmtPct, formatDate, daysUntil, statusLabel } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const { productions, contracts, deadlines, budgetLines, revenueWeeks, cashFlowRows } = useStore()
  const { isDemo, config } = useDemo()
  const firstName = (isDemo && config?.user ? config.user : 'Leon Kay').split(' ')[0]

  const totalGross = productions.reduce((s, p) => s + p.currentGross, 0)
  const totalBudget = productions.reduce((s, p) => s + p.totalBudget, 0)
  const totalActual = productions.reduce((s, p) => s + p.totalActual, 0)
  const totalCash = productions.reduce((s, p) => s + p.cashOnHand, 0)

  // Risk alerts
  const risks: string[] = []
  const overdueContracts = contracts.filter((c) => c.status !== 'signed' && c.status !== 'expired' && daysUntil(c.dueDate) < 0)
  if (overdueContracts.length) risks.push(`${overdueContracts.length} unsigned contract${overdueContracts.length > 1 ? 's' : ''} past due date`)

  const overdueDeadlines = deadlines.filter((d) => d.status === 'overdue')
  if (overdueDeadlines.length) risks.push(`${overdueDeadlines.length} overdue deadline${overdueDeadlines.length > 1 ? 's' : ''} require attention`)

  const highVarianceLines = budgetLines.filter((l) => l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0)
  if (highVarianceLines.length) risks.push(`${highVarianceLines.length} budget line${highVarianceLines.length > 1 ? 's' : ''} over 10% variance`)

  const upcomingDeadlines = deadlines
    .filter((d) => d.status !== 'completed' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6)

  return (
    <div>
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle="All productions — current snapshot"
      />

      {/* Risk alerts */}
      {risks.length > 0 && (
        <div className="mb-6 space-y-2">
          {risks.map((r, i) => <RiskAlert key={i} message={r} />)}
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Gross (All)" value={fmt(totalGross)} sub={`across ${productions.length} production${productions.length !== 1 ? 's' : ''}`} trend="up" />
        <StatCard label="Total Budget" value={fmt(totalBudget)} sub="committed capacity" />
        <StatCard label="Total Spent" value={fmt(totalActual)} sub={fmtPct((totalActual / totalBudget) * 100) + ' of budget'} />
        <StatCard label="Cash on Hand" value={fmt(totalCash)} sub="combined available" trend="neutral" />
      </div>

      {/* Productions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {productions.map((p) => {
          const budgetPct = (p.totalActual / p.totalBudget) * 100
          const prodContracts = contracts.filter((c) => c.productionId === p.id)
          const unsigned = prodContracts.filter((c) => c.status !== 'signed' && c.status !== 'expired').length
          const prodDeadlines = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length

          return (
            <Link key={p.id} href={`/productions/${p.id}`} className="block">
              <Card className="hover:border-stone-300 transition-colors cursor-pointer h-full">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                    </div>
                    <ArrowRight size={14} className="text-stone-400 mt-0.5" />
                  </div>
                  <h3 className="font-medium text-stone-900 mb-0.5 leading-snug">{p.name}</h3>
                  <p className="text-xs text-stone-500 mb-4">{p.venue}</p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-500">Budget used</span>
                        <span className="text-stone-700 font-medium">{fmtPct(budgetPct)}</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(budgetPct, 100)}%`,
                            backgroundColor: budgetPct > 95 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : p.color,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-xs text-stone-500">Gross Revenue</p>
                        <p className="text-sm font-medium text-stone-800">{fmt(p.currentGross)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Cash on Hand</p>
                        <p className="text-sm font-medium text-stone-800">{fmt(p.cashOnHand)}</p>
                      </div>
                    </div>

                    {(unsigned > 0 || prodDeadlines > 0) && (
                      <div className="flex gap-2 pt-1">
                        {unsigned > 0 && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">{unsigned} unsigned</span>}
                        {prodDeadlines > 0 && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">{prodDeadlines} overdue</span>}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming deadlines */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <Link href="/calendar" className="text-xs text-stone-500 hover:text-stone-800">View all</Link>
          </CardHeader>
          <CardBody className="p-0">
            {upcomingDeadlines.length === 0 ? (
              <p className="px-6 py-4 text-sm text-stone-500">No upcoming deadlines in next 14 days.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {upcomingDeadlines.map((d) => {
                  const days = daysUntil(d.date)
                  const prod = productions.find((p) => p.id === d.productionId)
                  return (
                    <div key={d.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prod?.color || '#a8a29e' }} />
                        <div>
                          <p className="text-sm text-stone-800">{d.title}</p>
                          <p className="text-xs text-stone-500">{prod?.name}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs text-stone-700 font-medium">{formatDate(d.date)}</p>
                        <p className={`text-xs ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-stone-500'}`}>
                          {days === 0 ? 'Today' : `${days}d`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Contract status */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Contract Status</CardTitle>
            <Link href="/contracts" className="text-xs text-stone-500 hover:text-stone-800">View all</Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-stone-100">
              {contracts
                .filter((c) => c.status !== 'signed' && c.status !== 'expired')
                .slice(0, 6)
                .map((c) => {
                  const prod = productions.find((p) => p.id === c.productionId)
                  return (
                    <div key={c.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prod?.color || '#a8a29e' }} />
                        <div>
                          <p className="text-sm text-stone-800">{c.partyName}</p>
                          <p className="text-xs text-stone-500">{prod?.name}</p>
                        </div>
                      </div>
                      <Badge variant={c.status}>{statusLabel(c.status)}</Badge>
                    </div>
                  )
                })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
