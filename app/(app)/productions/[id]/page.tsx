'use client'
import { use, useState } from 'react'
import { useStore } from '@/lib/store'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, formatDate, formatDateShort, daysUntil, statusLabel, budgetUsedPct } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrendingUp, FileText, DollarSign, CalendarDays, ArrowRight, ImageIcon, Sparkles, Theater, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Ticket, ExternalLink, AlertCircle, Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, ReferenceLine } from 'recharts'
import {
  computeCoreForecast,
  computeAllScenarios,
  computeChartData,
  generateInsights,
  type ScenarioConfig,
  type RiskLevel,
} from '@/lib/forecasting'
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

// Deterministic per-performance multipliers based on day-of-week and time slot
function perfMultipliers(perfId: string, date: string, time: string): { soldMult: number; atpMult: number } {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const hour = parseInt(time?.split(':')[0] ?? '20', 10)
  const isMat = hour < 17
  // Base sold/ATP multipliers by day (0=Sun … 6=Sat)
  const SOLD = [1.05, 0.85, 0.88, 0.90, 0.95, 1.12, isMat ? 1.08 : 1.22]
  const ATP  = [1.00, 0.90, 0.92, 0.95, 0.98, 1.12, isMat ? 1.06 : 1.22]
  // Matinee discount on non-Saturday days
  const matAdj = isMat && day !== 6 ? 0.82 : 1.0
  const atpMatAdj = isMat && day !== 6 ? 0.92 : 1.0
  // Deterministic jitter ±6% from perf ID hash
  let h = 0
  for (let i = 0; i < perfId.length; i++) h = (h * 31 + perfId.charCodeAt(i)) & 0xffff
  const j = ((h % 120) - 60) / 1000 // –0.06 … +0.06
  return {
    soldMult: Math.max(0.45, (SOLD[day] ?? 1.0) * matAdj + j),
    atpMult:  Math.max(0.70, (ATP[day]  ?? 1.0) * atpMatAdj + j * 0.5),
  }
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

  type FcScenarioType = 'base' | 'downside' | 'upside' | 'marketing_push' | 'labour_increase' | 'early_close' | 'extension'
  const FC_SCENARIOS: { type: FcScenarioType; label: string }[] = [
    { type: 'base', label: 'Base' },
    { type: 'downside', label: 'Downside' },
    { type: 'upside', label: 'Upside' },
    { type: 'marketing_push', label: 'Mktg Push' },
    { type: 'labour_increase', label: 'Labour +' },
    { type: 'early_close', label: 'Early Close' },
    { type: 'extension', label: 'Extension' },
  ]
  const FC_RISK_COLOR: Record<RiskLevel, string> = {
    healthy: 'text-emerald-600', watch: 'text-amber-600', at_risk: 'text-orange-600', critical: 'text-red-600',
  }
  const FC_RISK_BG: Record<RiskLevel, string> = {
    healthy: 'bg-emerald-50 border-emerald-200', watch: 'bg-amber-50 border-amber-200',
    at_risk: 'bg-orange-50 border-orange-200', critical: 'bg-red-50 border-red-200',
  }
  const FC_RISK_LABEL: Record<RiskLevel, string> = { healthy: 'Healthy', watch: 'Watch', at_risk: 'At Risk', critical: 'Critical' }

  const [editImageOpen, setEditImageOpen] = useState(false)
  const [imageDraft, setImageDraft] = useState('')
  const [perfModalOpen, setPerfModalOpen] = useState(false)
  const [editingPerf, setEditingPerf] = useState<PerformanceDate | null>(null)
  const [perfForm, setPerfForm] = useState<Omit<PerformanceDate, 'id'>>(blankPerf(id))
  const [showAllPerfs, setShowAllPerfs] = useState(false)
  const [activeScenario, setActiveScenario] = useState<FcScenarioType>('base')
  const [fcCfg, setFcCfg] = useState<ScenarioConfig>({
    downsidePct: 10, upsidePct: 10, extraMarketing: 20000, marketingLiftPct: 8,
    labourIncreasePct: 10, earlyCloseWeeks: 2, extensionWeeks: 4,
    extensionCapacityPct: 70, extensionATP: 0, extensionExtraWeeklyCost: 0,
  })
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

  // Map a performance date to its revenue week (week-ending Sunday)
  function weekForPerf(perfDate: string) {
    const d = new Date(perfDate + 'T12:00:00')
    const daysToSun = d.getDay() === 0 ? 0 : 7 - d.getDay()
    const sun = new Date(d)
    sun.setDate(d.getDate() + daysToSun)
    return weeks.find((w) => w.weekEnding === sun.toISOString().slice(0, 10))
  }

  // Chart data — use month labels when there are many weeks
  const useMonthLabels = weeks.length > 16
  const spansYears = weeks.length > 0 &&
    new Date(weeks[0].weekEnding).getFullYear() !== new Date(weeks[weeks.length - 1].weekEnding).getFullYear()
  let cumulative = 0
  const chartData = weeks.map((w) => {
    cumulative += w.grossRevenue
    const d = new Date(w.weekEnding + 'T12:00:00')
    let label: string
    if (!useMonthLabels) {
      label = formatDate(w.weekEnding).replace(', 2025', '').replace(', 2026', '').replace(', 2027', '')
    } else if (spansYears) {
      label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    } else {
      label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return { week: label, weekly: w.grossRevenue, cumulative }
  })

  // Reference line markers: on-sale, 6 weeks BEFORE opening, and opening night week
  const onSaleTs      = prod.onSaleDate ? new Date(prod.onSaleDate + 'T12:00:00').getTime() : null
  const openingTs     = prod.openingDate ? new Date(prod.openingDate + 'T12:00:00').getTime() : null
  const sixWeeksPreTs = openingTs ? openingTs - 42 * 86_400_000 : null
  const onSaleWeekLabel = onSaleTs
    ? chartData[weeks.findIndex((w) => new Date(w.weekEnding + 'T12:00:00').getTime() >= onSaleTs)]?.week ?? null
    : null
  const openingWeekLabel = openingTs
    ? chartData[weeks.findIndex((w) => new Date(w.weekEnding + 'T12:00:00').getTime() >= openingTs)]?.week ?? null
    : null
  const sixWeeksLabel = sixWeeksPreTs
    ? chartData[weeks.findIndex((w) => new Date(w.weekEnding + 'T12:00:00').getTime() >= sixWeeksPreTs)]?.week ?? null
    : null

  const budgetPct = budgetUsedPct(totalActual, totalBudgeted)

  // ── Break-even ────────────────────────────────────────────────────────────
  const weeksRemaining = prod.closingDate
    ? Math.max(0, Math.ceil((new Date(prod.closingDate + 'T12:00:00').getTime() - Date.now()) / (7 * 86_400_000)))
    : 0
  const avgATPprod  = weeks.length > 0 ? weeks.reduce((s, w) => s + w.avgTicketPrice, 0) / weeks.length : 0
  const seatsHouse  = weeks.length > 0 ? Math.max(...weeks.map(w => w.totalSeats)) : 0
  const grossNeeded = Math.max(0, totalBudgeted - (cumGross || prod.currentGross))
  const breakEvenCap = weeksRemaining > 0 && avgATPprod > 0 && seatsHouse > 0
    ? (grossNeeded / (weeksRemaining * seatsHouse * avgATPprod)) * 100
    : null
  const breakEvenLabel  = breakEvenCap === null ? '—'
    : breakEvenCap <= 0 ? '✓ In profit'
    : breakEvenCap > 110 ? 'SRO+ needed'
    : `${Math.ceil(breakEvenCap)}% avg`

  // ── Cash runway ───────────────────────────────────────────────────────────
  const totalOutflows = cashRows.reduce((s, r) => s + r.payroll + r.venueCosts + r.marketing + r.royalties + r.vendorPayments + r.otherOutflows, 0)
  const totalInflows  = cashRows.reduce((s, r) => s + r.ticketRevenue + r.otherInflows, 0)
  const weeklyBurn    = cashRows.length > 0 ? (totalOutflows - totalInflows) / cashRows.length : 0
  const runway        = weeklyBurn > 0 ? Math.round(lastCash / weeklyBurn) : null

  // ── Inline forecaster ────────────────────────────────────────────────────
  function setFcField<K extends keyof ScenarioConfig>(key: K, val: ScenarioConfig[K]) {
    setFcCfg(prev => ({ ...prev, [key]: val }))
  }
  const fc            = computeCoreForecast(prod, weeks, cashRows, lines)
  const fcScenarios   = computeAllScenarios(fc, fcCfg)
  const fcInsights    = generateInsights(fc, fcScenarios)
  const fcActive      = fcScenarios.find(s => s.type === activeScenario)!
  const fcBase        = fcScenarios.find(s => s.type === 'base')!
  const fcChartData   = computeChartData(fc, weeks, fcActive?.projectedFinalGross)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          {prod.imageUrl && (
            <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
              <img
                src={prod.imageUrl}
                alt={prod.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
              />
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="w-1 h-12 rounded-full mt-1" style={{ backgroundColor: prod.color }} />
            <div>
              <div className="flex items-center gap-3 mb-0.5 flex-wrap">
                <h1 className="text-2xl font-semibold text-stone-900">{prod.name}</h1>
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
        <StatCard label="Cash on Hand" value={fmt(lastCash)} sub={runway ? `${runway} wk runway` : 'current balance'} />
        <StatCard label="Break-even" value={breakEvenLabel} sub={weeksRemaining > 0 ? `${weeksRemaining} wks remaining` : 'run complete'} alert={breakEvenCap !== null && breakEvenCap > 90} />
        <StatCard label="Contracts" value={`${prodContracts.filter(c=>c.status==='signed').length}/${prodContracts.length}`} sub={unsigned > 0 ? `${unsigned} unsigned` : 'All signed'} alert={unsigned > 0} />
      </div>

      {/* Revenue chart — full width */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <TrendingUp size={14} className="text-stone-400" />
          <CardTitle>Weekly Gross Revenue</CardTitle>
        </CardHeader>
        <CardBody>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={prod.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={prod.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval={weeks.length > 16 ? Math.max(1, Math.floor(weeks.length / 9)) : 0} />
                  <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }} />
                  <Area type="monotone" dataKey="weekly" stroke={prod.color} strokeWidth={1.5} fill={`url(#grad-${id})`} name="Weekly Gross" />
                  {onSaleWeekLabel && (
                    <ReferenceLine
                      x={onSaleWeekLabel}
                      stroke="#d97706"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}
                  {sixWeeksLabel && sixWeeksLabel !== openingWeekLabel && sixWeeksLabel !== onSaleWeekLabel && (
                    <ReferenceLine
                      x={sixWeeksLabel}
                      stroke="#78716c"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                    />
                  )}
                  {openingWeekLabel && (
                    <ReferenceLine
                      x={openingWeekLabel}
                      stroke={prod.color}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
              {(onSaleWeekLabel || openingWeekLabel || (sixWeeksLabel && sixWeeksLabel !== openingWeekLabel)) && (
                <div className="flex items-center gap-5 text-[11px] text-stone-500 mt-3 mb-1 flex-wrap">
                  {onSaleWeekLabel && (
                    <span className="flex items-center gap-1.5">
                      <svg width="22" height="10" className="shrink-0">
                        <line x1="0" y1="5" x2="22" y2="5" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
                      </svg>
                      <span className="text-amber-700 font-semibold">On Sale</span>
                      {prod.onSaleDate && <span className="text-stone-400">({formatDateShort(prod.onSaleDate)})</span>}
                    </span>
                  )}
                  {sixWeeksLabel && sixWeeksLabel !== openingWeekLabel && sixWeeksLabel !== onSaleWeekLabel && (
                    <span className="flex items-center gap-1.5">
                      <svg width="22" height="10" className="shrink-0">
                        <line x1="0" y1="5" x2="22" y2="5" stroke="#78716c" strokeWidth="1" strokeDasharray="4 3" />
                      </svg>
                      <span className="text-stone-500">6 Weeks Pre-Opening</span>
                    </span>
                  )}
                  {openingWeekLabel && (
                    <span className="flex items-center gap-1.5">
                      <svg width="22" height="10" className="shrink-0">
                        <line x1="0" y1="5" x2="22" y2="5" stroke={prod.color} strokeWidth="1.5" strokeDasharray="4 3" />
                      </svg>
                      <span style={{ color: prod.color }} className="font-semibold">Opening Night</span>
                      {prod.openingDate && <span className="text-stone-400">({formatDateShort(prod.openingDate)})</span>}
                    </span>
                  )}
                </div>
              )}
              {weeks.length >= 2 && (() => {
                const last  = weeks[weeks.length - 1]
                const prev  = weeks[weeks.length - 2]
                const wow   = ((last.grossRevenue - prev.grossRevenue) / prev.grossRevenue) * 100
                const sorted = [...weeks].sort((a, b) => b.grossRevenue - a.grossRevenue)
                const rank  = sorted.findIndex(w => w.weekEnding === last.weekEnding) + 1
                const peak  = sorted[0]
                return (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-500 border-t border-stone-100 mt-3 pt-3">
                    <span>Last wk: <span className={`font-medium ${wow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{wow >= 0 ? '↑' : '↓'} {Math.abs(wow).toFixed(0)}% wk/wk</span></span>
                    <span>Rank: <span className="font-medium text-stone-700">#{rank} of {weeks.length} weeks</span></span>
                    <span>Peak: <span className="font-medium text-stone-700">{fmt(peak.grossRevenue)}</span> ({formatDateShort(peak.weekEnding)})</span>
                  </div>
                )
              })()}
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-stone-400">No revenue data yet</div>
          )}
        </CardBody>
      </Card>

      {/* ── Inline Forecaster ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp size={14} className="text-stone-400" />
            <CardTitle>Revenue Forecast</CardTitle>
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${FC_RISK_BG[fc.overallRisk]} ${FC_RISK_COLOR[fc.overallRisk]}`}>
              {FC_RISK_LABEL[fc.overallRisk]}
            </span>
          </div>
          <Link
            href={`/productions/${id}/forecasting`}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
          >
            Full analysis <ArrowRight size={11} />
          </Link>
        </CardHeader>
        <CardBody className="pt-0">
          {/* Insight bar */}
          <div className={`rounded-lg border px-4 py-3 mb-4 ${FC_RISK_BG[fc.overallRisk]}`}>
            <div className="flex items-start gap-2.5">
              <Info size={14} className={`${FC_RISK_COLOR[fc.overallRisk]} shrink-0 mt-0.5`} />
              <div className="space-y-0.5">
                {fcInsights.slice(0, 2).map((insight, i) => (
                  <p key={i} className={`text-sm ${i === 0 ? 'font-medium' : ''} ${FC_RISK_COLOR[fc.overallRisk]}`}>{insight}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Chart + controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Trajectory chart */}
            <div className="lg:col-span-2">
              {fcChartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-sm text-stone-400 rounded-lg border border-dashed border-stone-200">
                  Projections appear once performance data is entered
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={fcChartData} margin={{ right: 50 }}>
                    <defs>
                      <linearGradient id={`fc-actual-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={prod.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={prod.color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`fc-proj-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={prod.color} stopOpacity={0.07} />
                        <stop offset="100%" stopColor={prod.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={46} />
                    <Tooltip formatter={(v, name) => [fmt(Number(v)), name]} contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }} />
                    {fc.breakevenGross > 0 && (
                      <ReferenceLine y={fc.breakevenGross} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1}
                        label={{ value: 'Breakeven', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                    )}
                    {prod.projectedGross > 0 && (
                      <ReferenceLine y={prod.projectedGross} stroke="#a8a29e" strokeDasharray="4 3" strokeWidth={1}
                        label={{ value: 'Target', fill: '#a8a29e', fontSize: 10, position: 'insideTopRight' }} />
                    )}
                    <Area type="monotone" dataKey="actual" stroke={prod.color} strokeWidth={2}
                      fill={`url(#fc-actual-${id})`} name="Actual" connectNulls={false} dot={false} />
                    <Line type="monotone" dataKey="projected" stroke={prod.color} strokeWidth={1.5}
                      strokeDasharray="5 4" name="Projected" dot={false} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Scenario engine */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Scenario</p>
              <div className="flex flex-wrap gap-1.5">
                {FC_SCENARIOS.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => setActiveScenario(type)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      activeScenario === type
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'border-stone-200 text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Scenario controls */}
              <div className="space-y-2 pt-1">
                {activeScenario === 'base' && (
                  <p className="text-xs text-stone-400 leading-relaxed">Projects current pace through remainder of run.</p>
                )}
                {activeScenario === 'downside' && (
                  <label className="block text-xs text-stone-500">Sales decline
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="number" min={1} max={50} value={fcCfg.downsidePct} onChange={e => setFcField('downsidePct', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                      <span className="text-xs text-stone-400">%</span>
                    </div>
                  </label>
                )}
                {activeScenario === 'upside' && (
                  <label className="block text-xs text-stone-500">Sales improvement
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="number" min={1} max={100} value={fcCfg.upsidePct} onChange={e => setFcField('upsidePct', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                      <span className="text-xs text-stone-400">%</span>
                    </div>
                  </label>
                )}
                {activeScenario === 'marketing_push' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-stone-500">Extra marketing
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-stone-400">$</span>
                        <input type="number" min={0} step={1000} value={fcCfg.extraMarketing} onChange={e => setFcField('extraMarketing', Number(e.target.value))}
                          className="w-24 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                      </div>
                    </label>
                    <label className="block text-xs text-stone-500">Revenue lift
                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="number" min={0} max={50} value={fcCfg.marketingLiftPct} onChange={e => setFcField('marketingLiftPct', Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                        <span className="text-xs text-stone-400">%</span>
                      </div>
                    </label>
                  </div>
                )}
                {activeScenario === 'labour_increase' && (
                  <label className="block text-xs text-stone-500">Labour increase
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="number" min={0} max={100} value={fcCfg.labourIncreasePct} onChange={e => setFcField('labourIncreasePct', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                      <span className="text-xs text-stone-400">%</span>
                    </div>
                  </label>
                )}
                {activeScenario === 'early_close' && (
                  <label className="block text-xs text-stone-500">Weeks to cut
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="number" min={1} max={Math.max(1, fc.weeksRemaining)} value={fcCfg.earlyCloseWeeks} onChange={e => setFcField('earlyCloseWeeks', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                      <span className="text-xs text-stone-400">wks</span>
                    </div>
                  </label>
                )}
                {activeScenario === 'extension' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-stone-500">Extension weeks
                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="number" min={1} max={26} value={fcCfg.extensionWeeks} onChange={e => setFcField('extensionWeeks', Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                        <span className="text-xs text-stone-400">wks</span>
                      </div>
                    </label>
                    <label className="block text-xs text-stone-500">Expected capacity
                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="number" min={10} max={100} value={fcCfg.extensionCapacityPct} onChange={e => setFcField('extensionCapacityPct', Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                        <span className="text-xs text-stone-400">%</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Scenario result */}
              {activeScenario !== 'base' && fcActive && (
                <div className={`p-3 rounded border text-xs space-y-1 ${FC_RISK_BG[fcActive.risk]}`}>
                  <p className={`font-medium ${FC_RISK_COLOR[fcActive.risk]}`}>{fcActive.label}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-stone-600 pt-0.5">
                    <span>Final gross</span>
                    <span className="font-medium text-stone-800">{fmt(fcActive.projectedFinalGross)}</span>
                    <span>vs Base</span>
                    <span className={`font-medium ${fcActive.projectedFinalGross >= fcBase.projectedFinalGross ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fcActive.projectedFinalGross >= fcBase.projectedFinalGross ? '+' : ''}{fmt(fcActive.projectedFinalGross - fcBase.projectedFinalGross)}
                    </span>
                    <span>Breakeven gap</span>
                    <span className={`font-medium ${fcActive.breakevenGap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fcActive.breakevenGap >= 0 ? '+' : ''}{fmt(fcActive.breakevenGap)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

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
                      <th className="text-right px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Tickets Sold</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Avg Ticket Price</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                      {isAdmin && <th className="px-4 py-2 w-16" />}
                    </tr>
                  </thead>
                  <tbody>
                    {displayPerfs.map((p) => {
                      const d = new Date(p.date + 'T12:00:00')
                      const wk = weekForPerf(p.date)
                      const perfsInWeek = wk ? perfs.filter((pp) => weekForPerf(pp.date)?.weekEnding === wk.weekEnding && pp.status !== 'cancelled').length : 0
                      const { soldMult, atpMult } = perfMultipliers(p.id, p.date, p.time)
                      const ticketsPerPerf = wk && perfsInWeek > 0 ? Math.round((wk.ticketsSold / perfsInWeek) * soldMult) : null
                      const atp            = wk && perfsInWeek > 0 ? Math.round(wk.avgTicketPrice * atpMult) : null
                      const grossPerPerf   = ticketsPerPerf != null && atp != null ? ticketsPerPerf * atp : null
                      const soldPct        = ticketsPerPerf != null && wk ? Math.round((ticketsPerPerf / wk.totalSeats) * 100) : null
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
                            {ticketsPerPerf !== null ? (
                              <div>
                                <span className={`text-xs font-medium tabular-nums ${soldPct !== null && soldPct >= 85 ? 'text-emerald-700' : soldPct !== null && soldPct >= 65 ? 'text-stone-700' : 'text-amber-700'}`}>
                                  {ticketsPerPerf.toLocaleString()}
                                </span>
                                {soldPct !== null && (
                                  <p className="text-[10px] text-stone-400 leading-none mt-0.5">{soldPct.toFixed(0)}% cap</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {atp !== null ? (
                              <div>
                                <span className="text-xs font-medium tabular-nums text-stone-700">{fmt(atp, 0)}</span>
                                {grossPerPerf !== null && (
                                  <p className="text-[10px] text-stone-400 leading-none mt-0.5">{fmt(grossPerPerf)} gross</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-stone-300">—</span>
                            )}
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

      {/* Budget by Category + Contracts + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Budget by category */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <DollarSign size={14} className="text-stone-400" />
            <CardTitle>Budget by Category</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {lines.length === 0 ? (
              <p className="px-5 py-4 text-sm text-stone-400">No budget lines yet.</p>
            ) : (
              <div className="divide-y divide-stone-50">
                {Object.entries(
                  lines.reduce((acc, l) => {
                    acc[l.category] = (acc[l.category] || 0) + l.actual
                    return acc
                  }, {} as Record<string, number>)
                )
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
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
            )}
          </CardBody>
        </Card>

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
