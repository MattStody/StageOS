'use client'
import { use, useState } from 'react'
import { useStore } from '@/lib/store'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiskAlert } from '@/components/ui/RiskAlert'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, formatDate, daysUntil, statusLabel, budgetUsedPct, variance } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrendingUp, FileText, DollarSign, CalendarDays, ArrowRight, ImageIcon } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { productions, budgetLines, revenueWeeks, contracts, deadlines, cashFlowRows, updateProduction } = useStore()
  const { isAdmin } = useAuth()

  const [editImageOpen, setEditImageOpen] = useState(false)
  const [imageDraft, setImageDraft] = useState('')

  const prod = productions.find((p) => p.id === id)
  if (!prod) return notFound()

  const lines = budgetLines.filter((l) => l.productionId === id)
  const weeks = revenueWeeks.filter((w) => w.productionId === id).sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())
  const prodContracts = contracts.filter((c) => c.productionId === id)
  const prodDeadlines = deadlines.filter((d) => d.productionId === id)
  const cashRows = cashFlowRows.filter((r) => r.productionId === id).sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)
  const cumGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
  const lastCash = cashRows.length ? cashRows[cashRows.length - 1].closingCash : prod.cashOnHand

  const unsigned = prodContracts.filter((c) => c.status !== 'signed' && c.status !== 'expired').length
  const overdueDeadlines = prodDeadlines.filter((d) => d.status === 'overdue')
  const upcomingDeadlines = prodDeadlines
    .filter((d) => d.status !== 'completed' && daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4)

  // Risk alerts
  const risks: string[] = []
  if (unsigned > 0) risks.push(`${unsigned} unsigned contract${unsigned > 1 ? 's' : ''} require attention`)
  if (overdueDeadlines.length > 0) risks.push(`${overdueDeadlines.length} overdue deadline${overdueDeadlines.length > 1 ? 's' : ''}`)
  const highVar = lines.filter((l) => l.budgeted > 0 && Math.abs((l.actual - l.budgeted) / l.budgeted) > 0.1 && l.actual > 0)
  if (highVar.length > 0) risks.push(`${highVar.length} budget line${highVar.length > 1 ? 's' : ''} with >10% variance`)
  if (lastCash < 0) risks.push('Projected cash balance is negative')

  // Chart data
  let cumulative = 0
  const chartData = weeks.map((w) => {
    cumulative += w.grossRevenue
    return {
      week: formatDate(w.weekEnding).replace(', 2025', '').replace(', 2026', ''),
      weekly: w.grossRevenue,
      cumulative,
    }
  })

  const budgetPct = budgetUsedPct(totalActual, totalBudgeted)

  return (
    <div>
      {/* Hero image */}
      {prod.imageUrl && (
        <div className="w-full h-52 rounded-lg overflow-hidden mb-6">
          <img
            src={prod.imageUrl}
            alt={prod.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 rounded-full mt-1" style={{ backgroundColor: prod.color }} />
          <div>
            <div className="flex items-center gap-3 mb-0.5 flex-wrap">
              <h1 className="text-2xl font-light text-stone-900">{prod.name}</h1>
              <Badge variant={prod.status}>{statusLabel(prod.status)}</Badge>
              {isAdmin && (
                <button
                  onClick={() => { setImageDraft(prod.imageUrl || ''); setEditImageOpen(true) }}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded hover:bg-stone-100 transition-colors"
                  title={prod.imageUrl ? 'Change image' : 'Add image'}
                >
                  <ImageIcon size={14} />
                </button>
              )}
            </div>
            <p className="text-sm text-stone-500">{prod.venue} · {formatDate(prod.openingDate)} — {formatDate(prod.closingDate)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          {[
            { label: 'Budget', href: `/budget?prod=${id}` },
            { label: 'Revenue', href: `/revenue?prod=${id}` },
            { label: 'Contracts', href: `/contracts?prod=${id}` },
            { label: 'Cash Flow', href: `/cashflow?prod=${id}` },
          ].map(({ label, href }) => (
            <Link key={href} href={href} className="px-3 py-1.5 text-xs border border-stone-300 rounded text-stone-600 hover:bg-stone-50 transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Risk alerts */}
      {risks.length > 0 && (
        <div className="mb-6 space-y-2">
          {risks.map((r, i) => <RiskAlert key={i} message={r} />)}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Gross Revenue" value={fmt(cumGross || prod.currentGross)} sub={`of ${fmt(prod.projectedGross)} projected`} trend="up" />
        <StatCard label="Budget Used" value={fmtPct(budgetPct)} sub={`${fmt(totalActual)} of ${fmt(totalBudgeted)}`} alert={budgetPct > 90} />
        <StatCard label="Cash on Hand" value={fmt(lastCash)} sub="current balance" />
        <StatCard label="Contracts" value={`${prodContracts.filter(c=>c.status==='signed').length}/${prodContracts.length}`} sub={unsigned > 0 ? `${unsigned} unsigned` : 'All signed'} alert={unsigned > 0} />
        <StatCard label="Deadlines" value={`${upcomingDeadlines.length}`} sub={overdueDeadlines.length > 0 ? `${overdueDeadlines.length} overdue` : 'upcoming'} alert={overdueDeadlines.length > 0} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <TrendingUp size={14} className="text-stone-400" />
            <CardTitle>Weekly Gross Revenue</CardTitle>
          </CardHeader>
          <CardBody>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={prod.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={prod.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }} />
                  <Area type="monotone" dataKey="weekly" stroke={prod.color} strokeWidth={1.5} fill={`url(#grad-${id})`} name="Weekly Gross" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-stone-400">No revenue data yet</div>
            )}
          </CardBody>
        </Card>

        {/* Budget breakdown */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <DollarSign size={14} className="text-stone-400" />
            <CardTitle>Budget by Category</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-stone-50">
              {Object.entries(
                lines.reduce((acc, l) => {
                  acc[l.category] = (acc[l.category] || 0) + l.actual
                  return acc
                }, {} as Record<string, number>)
              )
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([cat, actual]) => {
                  const budgeted = lines.filter((l) => l.category === cat).reduce((s, l) => s + l.budgeted, 0)
                  const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0
                  return (
                    <div key={cat} className="px-5 py-2.5">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-600 truncate">{cat}</span>
                        <span className="text-stone-500 ml-2 shrink-0">{fmtPct(pct)}</span>
                      </div>
                      <div className="h-0.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 100 ? '#ef4444' : prod.color }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Image edit modal */}
      <Modal open={editImageOpen} onClose={() => setEditImageOpen(false)} title="Production Image">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Image URL</label>
            <input
              value={imageDraft}
              onChange={(e) => setImageDraft(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
            <p className="text-xs text-stone-400 mt-1">Paste any image URL. Wide landscape photos work best.</p>
          </div>
          {imageDraft && (
            <div className="h-40 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
              <img
                src={imageDraft}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
              />
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <div>
              {prod.imageUrl && (
                <button
                  onClick={() => { updateProduction({ ...prod, imageUrl: undefined }); setEditImageOpen(false) }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove image
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditImageOpen(false)}>Cancel</Button>
              <Button onClick={() => { updateProduction({ ...prod, imageUrl: imageDraft.trim() || undefined }); setEditImageOpen(false) }}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Contracts + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-stone-400" />
              <CardTitle>Contracts</CardTitle>
            </div>
            <Link href={`/contracts?prod=${id}`} className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1">All <ArrowRight size={11} /></Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-stone-100">
              {prodContracts.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm text-stone-800">{c.partyName}</p>
                    <p className="text-xs text-stone-500 capitalize">{c.contractType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-500">{fmt(c.fee)}</span>
                    <Badge variant={c.status}>{statusLabel(c.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-stone-400" />
              <CardTitle>Upcoming Deadlines</CardTitle>
            </div>
            <Link href={`/calendar?prod=${id}`} className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1">All <ArrowRight size={11} /></Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-stone-100">
              {[...overdueDeadlines, ...upcomingDeadlines].slice(0, 6).map((d) => {
                const days = daysUntil(d.date)
                return (
                  <div key={d.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm text-stone-800">{d.title}</p>
                      <p className="text-xs text-stone-500 capitalize">{d.type.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-500">{formatDate(d.date)}</span>
                      <Badge variant={d.status}>{statusLabel(d.status)}</Badge>
                    </div>
                  </div>
                )
              })}
              {overdueDeadlines.length === 0 && upcomingDeadlines.length === 0 && (
                <p className="px-6 py-4 text-sm text-stone-400">No upcoming deadlines.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
