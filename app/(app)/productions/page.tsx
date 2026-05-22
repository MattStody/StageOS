'use client'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { fmt, fmtPct, formatDate, statusLabel, budgetUsedPct } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Building2, Calendar } from 'lucide-react'

export default function ProductionsPage() {
  const { productions, contracts, deadlines, revenueWeeks } = useStore()

  return (
    <div>
      <PageHeader
        title="Productions"
        subtitle="All active and recent productions"
      />

      <div className="space-y-4">
        {productions.map((p) => {
          const weeks = revenueWeeks.filter((w) => w.productionId === p.id)
          const cumGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
          const prodContracts = contracts.filter((c) => c.productionId === p.id)
          const signedCount = prodContracts.filter((c) => c.status === 'signed').length
          const budgetPct = budgetUsedPct(p.totalActual, p.totalBudget)
          const overdueItems = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length

          return (
            <Link key={p.id} href={`/productions/${p.id}`} className="block">
              <div className="bg-white border border-stone-200 rounded-lg p-6 hover:border-stone-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: p.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-medium text-stone-900">{p.name}</h2>
                        <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                        {overdueItems > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">{overdueItems} overdue</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mb-4">{p.subtitle}</p>

                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-1.5 text-sm text-stone-600">
                          <Building2 size={13} className="text-stone-400" />
                          {p.venue}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-stone-600">
                          <Calendar size={13} className="text-stone-400" />
                          {formatDate(p.openingDate)} — {formatDate(p.closingDate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 shrink-0 ml-8">
                    <div className="text-right">
                      <p className="text-xs text-stone-500 mb-0.5">Gross Revenue</p>
                      <p className="text-lg font-light text-stone-900">{fmt(cumGross || p.currentGross)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500 mb-0.5">Budget Used</p>
                      <p className="text-lg font-light text-stone-900">{fmtPct(budgetPct)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500 mb-0.5">Contracts</p>
                      <p className="text-lg font-light text-stone-900">{signedCount}/{prodContracts.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500 mb-0.5">Cash</p>
                      <p className="text-lg font-light text-stone-900">{fmt(p.cashOnHand)}</p>
                    </div>
                    <ArrowRight size={16} className="text-stone-400" />
                  </div>
                </div>

                {/* Budget bar */}
                <div className="mt-4 ml-5">
                  <div className="h-0.5 bg-stone-100 rounded-full overflow-hidden max-w-sm">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(budgetPct, 100)}%`,
                        backgroundColor: budgetPct > 95 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : p.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
