'use client'
import { use, useState } from 'react'
import { useStore } from '@/lib/store'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, formatDate, daysUntil, statusLabel, budgetUsedPct } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrendingUp, FileText, DollarSign, CalendarDays, ArrowRight, ImageIcon, Sparkles, Theater, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Ticket, ExternalLink, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import type { PerformanceDate, PerformanceStatus } from '@/lib/types'
import { generateTicketMap, getVenueSections } from '@/lib/spektrix'
import type { TicketMapData } from '@/lib/spektrix'
import { SeatMap } from '@/components/ui/SeatMap'

const PERF_STATUS_LABELS: Record<PerformanceStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  postponed: 'Postponed',
}

const PERF_STATUS_COLORS: Record<PerformanceStatus, string> = {
  scheduled: 'text-blue-700 bg-blue-50 border-blue-200',
  completed: 'text-green-700 bg-green-50 border-green-200',
  cancelled: 'text-red-700 bg-red-50 border-red-200',
  postponed: 'text-amber-700 bg-amber-50 border-amber-200',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt12(time: string) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function blankPerf(productionId: string): Omit<PerformanceDate, 'id'> {
  return { productionId, date: '', time: '20:00', notes: '', status: 'scheduled', spektrixInstanceId: '' }
}

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { productions, budgetLines, revenueWeeks, contracts, deadlines, cashFlowRows, updateProduction,
    performanceDates, addPerformanceDate, updatePerformanceDate, deletePerformanceDate,
    spektrixBaseUrl } = useStore()
  const { isAdmin } = useAuth()

  const [editImageOpen, setEditImageOpen] = useState(false)
  const [imageDraft, setImageDraft] = useState('')
  const [perfModalOpen, setPerfModalOpen] = useState(false)
  const [editingPerf, setEditingPerf] = useState<PerformanceDate | null>(null)
  const [perfForm, setPerfForm] = useState<Omit<PerformanceDate, 'id'>>(blankPerf(id))
  const [showAllPerfs, setShowAllPerfs] = useState(false)
  const [ticketPerf, setTicketPerf] = useState<PerformanceDate | null>(null)
  const [ticketMapData, setTicketMapData] = useState<TicketMapData | null>(null)
  const [ticketTab, setTicketTab] = useState<'live' | 'analytics'>('live')
  const [iframeBlocked, setIframeBlocked] = useState(false)

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

  // Performance schedule
  const perfs = performanceDates
    .filter((p) => p.productionId === id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const scheduledCount = perfs.filter((p) => p.status === 'scheduled').length
  const completedCount = perfs.filter((p) => p.status === 'completed').length
  const cancelledCount = perfs.filter((p) => p.status === 'cancelled').length
  const displayPerfs = showAllPerfs ? perfs : perfs.slice(0, 8)

  function openTicketMap(p: PerformanceDate) {
    const sections = getVenueSections(id)
    const basePct = prod
      ? Math.min(0.98, Math.max(0.25, (prod.currentGross / Math.max(prod.projectedGross, 1)) * (p.status === 'scheduled' ? 0.55 : 1.05)))
      : 0.72
    const targetPct = p.status === 'cancelled' ? 0.18 : p.status === 'postponed' ? 0.28 : basePct
    setTicketMapData(generateTicketMap(p.id, targetPct, sections))
    setTicketPerf(p)
    setIframeBlocked(false)
    // Default to live map if both URL and instance ID are present, otherwise analytics
    setTicketTab(spektrixBaseUrl && p.spektrixInstanceId ? 'live' : 'analytics')
  }

  function openAddPerf() {
    setEditingPerf(null)
    setPerfForm(blankPerf(id))
    setPerfModalOpen(true)
  }
  function openEditPerf(p: PerformanceDate) {
    setEditingPerf(p)
    setPerfForm({ ...p })
    setPerfModalOpen(true)
  }
  function savePerf() {
    if (editingPerf) {
      updatePerformanceDate({ ...perfForm, id: editingPerf.id })
    } else {
      addPerformanceDate({ ...perfForm, id: `perf-${id}-${Date.now()}` })
    }
    setPerfModalOpen(false)
  }

  // Map a performance date to its revenue week (week-ending Saturday)
  function weekForPerf(perfDate: string) {
    const d = new Date(perfDate + 'T12:00:00')
    const daysToSat = d.getDay() === 6 ? 0 : 6 - d.getDay()
    const sat = new Date(d)
    sat.setDate(d.getDate() + daysToSat)
    return weeks.find((w) => w.weekEnding === sat.toISOString().slice(0, 10))
  }

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
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { label: 'Budget', href: `/budget?prod=${id}` },
            { label: 'Revenue', href: `/revenue?prod=${id}` },
            { label: 'Forecasting', href: `/productions/${id}/forecasting` },
            { label: 'Contracts', href: `/contracts?prod=${id}` },
            { label: 'Cash Flow', href: `/cashflow?prod=${id}` },
          ].map(({ label, href }) => (
            <Link key={href} href={href} className="px-3 py-1.5 text-xs border border-stone-300 rounded text-stone-600 hover:bg-stone-50 transition-colors">
              {label}
            </Link>
          ))}
          <Link
            href={`/reports/ai-brief?prod=${id}`}
            className="px-3 py-1.5 text-xs border border-stone-900 rounded text-white bg-stone-900 hover:bg-stone-800 transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={11} />
            Weekly Brief
          </Link>
        </div>
      </div>

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

      {/* Ticket map modal */}
      <Modal
        open={!!ticketPerf}
        onClose={() => { setTicketPerf(null); setTicketMapData(null) }}
        title={ticketPerf ? `${formatDate(ticketPerf.date)} · ${fmt12(ticketPerf.time)}${ticketPerf.notes ? ` — ${ticketPerf.notes}` : ''}` : ''}
        className="max-w-[95vw] w-full"
      >
        {ticketPerf && ticketMapData && prod && (() => {
          const liveUrl = spektrixBaseUrl && ticketPerf.spektrixInstanceId
            ? `${spektrixBaseUrl}/ChooseSeats/${ticketPerf.spektrixInstanceId}`
            : null
          const hasLive = !!liveUrl

          return (
            <div>
              {/* Tab bar */}
              <div className="flex gap-1 border-b border-stone-100 mb-5 -mt-1">
                {hasLive && (
                  <button
                    onClick={() => setTicketTab('live')}
                    className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                      ticketTab === 'live' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    Live Seat Map
                    <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">Spektrix</span>
                  </button>
                )}
                <button
                  onClick={() => setTicketTab('analytics')}
                  className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    ticketTab === 'analytics' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Analytics View
                </button>
                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 py-2 px-2"
                  >
                    Open in Spektrix <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* Live Spektrix iframe */}
              {ticketTab === 'live' && liveUrl && (
                <div>
                  {!iframeBlocked ? (
                    <div className="relative">
                      <div className="h-[calc(85vh-140px)] rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                        <iframe
                          src={liveUrl}
                          className="w-full h-full"
                          title="Spektrix Seat Map"
                          onError={() => setIframeBlocked(true)}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1.5 text-right">
                        Powered by Spektrix · instance {ticketPerf.spektrixInstanceId}
                      </p>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 rounded-lg border border-stone-200 bg-stone-50">
                      <AlertCircle size={24} className="text-amber-500" />
                      <p className="text-sm font-medium text-stone-700">Seat map blocked by browser security policy</p>
                      <p className="text-xs text-stone-400 text-center max-w-sm">
                        Spektrix may restrict embedding via X-Frame-Options. Open the map directly in Spektrix instead.
                      </p>
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs rounded hover:bg-stone-700 transition-colors"
                      >
                        Open in Spektrix <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* No instance ID configured */}
              {ticketTab === 'live' && !liveUrl && (
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                  <Ticket size={22} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-sm font-medium text-stone-700 mb-1">No Spektrix instance linked</p>
                  <p className="text-xs text-stone-400 mb-3">
                    {!spektrixBaseUrl
                      ? 'Set your Spektrix purchasing URL in Settings → Integrations, then add the instance ID to this performance.'
                      : 'Edit this performance to add its Spektrix instance ID (the number from the ChooseSeats URL).'}
                  </p>
                  {!spektrixBaseUrl && (
                    <Link href="/settings/integrations" className="text-xs text-stone-600 underline">
                      Go to Integrations →
                    </Link>
                  )}
                </div>
              )}

              {/* Analytics view */}
              {ticketTab === 'analytics' && (
                <SeatMap data={ticketMapData} productionColor={prod.color} />
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Performance modal */}
      <Modal open={perfModalOpen} onClose={() => setPerfModalOpen(false)} title={editingPerf ? 'Edit Performance' : 'Add Performance'} className="max-w-md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Date</label>
              <input
                type="date"
                value={perfForm.date}
                onChange={(e) => setPerfForm({ ...perfForm, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Time</label>
              <input
                type="time"
                value={perfForm.time}
                onChange={(e) => setPerfForm({ ...perfForm, time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
            <select
              value={perfForm.status}
              onChange={(e) => setPerfForm({ ...perfForm, status: e.target.value as PerformanceStatus })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input
              value={perfForm.notes}
              onChange={(e) => setPerfForm({ ...perfForm, notes: e.target.value })}
              placeholder="Opening night, matinee, press night…"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>
          <div className="pt-1 border-t border-stone-100">
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
              Spektrix Instance ID
              <span className="ml-1 text-stone-400 font-normal normal-case tracking-normal">optional</span>
            </label>
            <input
              value={perfForm.spektrixInstanceId ?? ''}
              onChange={(e) => setPerfForm({ ...perfForm, spektrixInstanceId: e.target.value })}
              placeholder="e.g. 46001"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
            {spektrixBaseUrl && perfForm.spektrixInstanceId && (
              <p className="text-[10px] text-stone-400 mt-1 font-mono truncate">
                → {spektrixBaseUrl}/ChooseSeats/{perfForm.spektrixInstanceId}
              </p>
            )}
            {!spektrixBaseUrl && (
              <p className="text-[10px] text-stone-400 mt-1">
                Set your purchasing base URL in{' '}
                <Link href="/settings/integrations" className="underline">Settings → Integrations</Link>
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPerfModalOpen(false)}>Cancel</Button>
            <Button onClick={savePerf} disabled={!perfForm.date}>{editingPerf ? 'Save Changes' : 'Add Performance'}</Button>
          </div>
        </div>
      </Modal>

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

      {/* Performance Schedule */}
      <Card className="mb-5">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Theater size={14} className="text-stone-400" />
            <CardTitle>Performance Schedule</CardTitle>
            <div className="flex gap-1.5 ml-2">
              {scheduledCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-blue-700 bg-blue-50 border-blue-200">{scheduledCount} upcoming</span>
              )}
              {completedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-green-700 bg-green-50 border-green-200">{completedCount} completed</span>
              )}
              {cancelledCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-red-700 bg-red-50 border-red-200">{cancelledCount} cancelled</span>
              )}
            </div>
          </div>
          {isAdmin && (
            <Button size="sm" variant="secondary" onClick={openAddPerf}>
              <Plus size={12} /> Add Performance
            </Button>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {perfs.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Theater size={24} className="mx-auto text-stone-300 mb-2" />
              <p className="text-sm text-stone-500 mb-3">No performances scheduled yet</p>
              {isAdmin && <Button size="sm" onClick={openAddPerf}><Plus size={12} /> Add Performance</Button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Day</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Time</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Sold</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Avg ATP</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                      {isAdmin && <th className="px-4 py-2 w-16" />}
                    </tr>
                  </thead>
                  <tbody>
                    {displayPerfs.map((p) => {
                      const d = new Date(p.date + 'T12:00:00')
                      const wk = weekForPerf(p.date)
                      const perfsInWeek = wk ? perfs.filter((pp) => weekForPerf(pp.date)?.weekEnding === wk.weekEnding && pp.status !== 'cancelled').length : 0
                      const soldPct = wk && perfsInWeek > 0 ? wk.capacityPct : null
                      const atp = wk && perfsInWeek > 0 ? wk.avgTicketPrice : null
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-stone-100 hover:bg-stone-50/50 group cursor-pointer"
                          onClick={() => openTicketMap(p)}
                        >
                          <td className="px-5 py-2.5 text-stone-800 font-medium text-sm">{formatDate(p.date)}</td>
                          <td className="px-4 py-2.5 text-stone-500 text-xs">{DAY_NAMES[d.getDay()]}</td>
                          <td className="px-4 py-2.5 text-stone-600 text-sm">{fmt12(p.time)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs border font-medium ${PERF_STATUS_COLORS[p.status]}`}>
                              {PERF_STATUS_LABELS[p.status]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {soldPct !== null ? (
                              <span className={`text-xs font-medium ${soldPct >= 85 ? 'text-emerald-700' : soldPct >= 65 ? 'text-stone-700' : 'text-amber-700'}`}>
                                {soldPct.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-xs text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-stone-600">
                            {atp !== null ? `$${atp.toFixed(0)}` : <span className="text-stone-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-stone-400 max-w-xs truncate">{p.notes || '—'}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1.5 items-center justify-end">
                              {p.spektrixInstanceId && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  Spx
                                </span>
                              )}
                              <Ticket size={11} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                              {isAdmin && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => openEditPerf(p)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>
                                  <button onClick={() => deletePerformanceDate(p.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {perfs.length > 8 && (
                <button
                  onClick={() => setShowAllPerfs(!showAllPerfs)}
                  className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 flex items-center justify-center gap-1.5 transition-colors border-t border-stone-100"
                >
                  {showAllPerfs ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {perfs.length} performances</>}
                </button>
              )}
            </>
          )}
        </CardBody>
      </Card>

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
