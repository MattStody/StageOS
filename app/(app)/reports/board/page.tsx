'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useDemo } from '@/contexts/DemoContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fmt, fmtPct, formatDate, daysUntil, statusLabel, variancePct } from '@/lib/utils'
import type { Grant, Production as ProductionType } from '@/lib/types'
import { computeCoreForecast } from '@/lib/forecasting'
import Link from 'next/link'
import {
  Users, Printer, Copy, Check, ChevronLeft,
  AlertTriangle, CheckCircle, TrendingUp, DollarSign,
  AlertCircle, Shield, Calendar,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type PortfolioRisk = 'healthy' | 'watch' | 'at_risk' | 'critical'
type PacingStatus  = 'ahead' | 'on-pace' | 'behind' | 'no-data'

interface Scorecard {
  id: string
  name: string
  color: string
  status: string
  venue: string
  openingDate: string
  closingDate: string
  grossToDate: number
  projectedGross: number
  grossPct: number
  lastWeekGross: number | null
  lastWeekCapPct: number | null
  pacing: PacingStatus
  totalBudgeted: number
  totalActual: number
  budgetPct: number
  highVarianceCount: number
  cashOnHand: number
  runway: number | null
  breakEvenCap: number | null
  risk: PortfolioRisk
  unsignedContracts: number
  overdueContracts: number
  overdueDeadlines: number
  upcomingDeadlines: number
  criticalFlags: string[]
}

interface RiskItem {
  severity: 'critical' | 'high' | 'medium'
  production: string
  description: string
  detail: string
}

interface DecisionItem {
  urgency: 'immediate' | 'this-meeting' | 'next-meeting'
  title: string
  context: string
  owner: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const RISK_CFG: Record<PortfolioRisk, { label: string; cls: string; dot: string }> = {
  healthy:  { label: 'Healthy',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  watch:    { label: 'Watch',    cls: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
  at_risk:  { label: 'At Risk',  cls: 'text-orange-700 bg-orange-50 border-orange-200',    dot: 'bg-orange-500'  },
  critical: { label: 'Critical', cls: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500'     },
}

const SEVERITY_CFG = {
  critical: { cls: 'text-red-700 bg-red-50 border-red-200',     icon: AlertCircle  },
  high:     { cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
  medium:   { cls: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: AlertTriangle },
}

const URGENCY_CFG = {
  immediate:     { cls: 'text-red-700 bg-red-50 border-red-200',     label: 'Immediate'     },
  'this-meeting':  { cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'This Meeting'  },
  'next-meeting':  { cls: 'text-stone-600 bg-stone-50 border-stone-200', label: 'Next Meeting'   },
}

const PACING_CFG: Record<PacingStatus, { label: string; cls: string }> = {
  'ahead':   { label: 'Ahead',   cls: 'text-emerald-700' },
  'on-pace': { label: 'On Pace', cls: 'text-stone-600'   },
  'behind':  { label: 'Behind',  cls: 'text-red-600'     },
  'no-data': { label: '—',       cls: 'text-stone-300'   },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveRisk(sc: Omit<Scorecard, 'risk' | 'criticalFlags'>): { risk: PortfolioRisk; criticalFlags: string[] } {
  const flags: string[] = []
  if (sc.overdueContracts > 0)       flags.push(`${sc.overdueContracts} overdue contract${sc.overdueContracts > 1 ? 's' : ''}`)
  if (sc.overdueDeadlines > 0)       flags.push(`${sc.overdueDeadlines} overdue deadline${sc.overdueDeadlines > 1 ? 's' : ''}`)
  if (sc.highVarianceCount > 0)      flags.push(`${sc.highVarianceCount} budget line${sc.highVarianceCount > 1 ? 's' : ''} over variance`)
  if (sc.runway !== null && sc.runway <= 4) flags.push(`${sc.runway}-wk cash runway`)
  if (sc.breakEvenCap !== null && sc.breakEvenCap > 100) flags.push('Break-even requires SRO capacity')

  let risk: PortfolioRisk = 'healthy'
  if (sc.budgetPct > 95 || (sc.runway !== null && sc.runway <= 3) || (sc.breakEvenCap !== null && sc.breakEvenCap > 110))
    risk = 'critical'
  else if (flags.length >= 2 || sc.overdueContracts > 0 || (sc.runway !== null && sc.runway <= 6) || sc.budgetPct > 85)
    risk = 'at_risk'
  else if (flags.length >= 1 || sc.unsignedContracts > 0 || sc.budgetPct > 75)
    risk = 'watch'

  return { risk, criticalFlags: flags }
}

// ── Grant Pipeline sub-component ───────────────────────────────────────────────

const GRANT_STATUS_LABEL: Record<string, string> = {
  identified: 'Identified', drafting: 'Drafting', submitted: 'Submitted',
  under_review: 'Under Review', awarded: 'Awarded', declined: 'Declined',
  report_due: 'Report Due', report_submitted: 'Report Submitted', complete: 'Complete',
}
const GRANT_STATUS_CLS: Record<string, string> = {
  identified: 'text-stone-500 bg-stone-50 border-stone-200',
  drafting: 'text-blue-700 bg-blue-50 border-blue-200',
  submitted: 'text-violet-700 bg-violet-50 border-violet-200',
  under_review: 'text-amber-700 bg-amber-50 border-amber-200',
  awarded: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  declined: 'text-red-700 bg-red-50 border-red-200',
  report_due: 'text-orange-700 bg-orange-50 border-orange-200',
  report_submitted: 'text-teal-700 bg-teal-50 border-teal-200',
  complete: 'text-stone-400 bg-stone-50 border-stone-100',
}

function GrantPipelineSection({ grants, productions }: { grants: Grant[]; productions: ProductionType[] }) {
  const pipeline = grants.filter(g => ['identified', 'drafting', 'submitted', 'under_review'].includes(g.status))
  const awarded  = grants.filter(g => ['awarded', 'report_due', 'report_submitted'].includes(g.status))
  const totalAwarded  = awarded.reduce((s, g) => s + (g.amountAwarded ?? 0), 0)
  const totalPipeline = pipeline.reduce((s, g) => s + g.amountRequested, 0)
  const reportsUrgent = grants.filter(g => g.status === 'report_due' && g.reportDeadline && daysUntil(g.reportDeadline) <= 30)

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
        <DollarSign size={13} className="text-stone-400" />
        6. Grant Pipeline
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Confirmed Funding', value: fmt(totalAwarded), sub: `${awarded.length} active grant${awarded.length !== 1 ? 's' : ''}` },
          { label: 'Pipeline Value',    value: fmt(totalPipeline), sub: `${pipeline.length} application${pipeline.length !== 1 ? 's' : ''} pending decision` },
          { label: 'Reports Due ≤30d',  value: String(reportsUrgent.length), sub: reportsUrgent.length > 0 ? reportsUrgent.map(g => g.funder.split(' ').slice(0, 2).join(' ')).join(', ') : 'All current', alert: reportsUrgent.length > 0 },
        ].map(({ label, value, sub, alert }) => (
          <div key={label} className={`rounded-lg border p-3.5 ${alert ? 'border-orange-200 bg-orange-50' : 'bg-stone-50 border-stone-100'}`}>
            <p className="text-xs text-stone-400 mb-0.5">{label}</p>
            <p className={`text-base font-semibold ${alert ? 'text-orange-700' : 'text-stone-900'}`}>{value}</p>
            <p className={`text-xs mt-0.5 ${alert ? 'text-orange-600' : 'text-stone-400'}`}>{sub}</p>
          </div>
        ))}
      </div>

      {grants.length === 0 ? (
        <p className="text-sm text-stone-500 p-4 bg-stone-50 rounded-lg border border-stone-100">No grants on record.</p>
      ) : (
        <div className="overflow-x-auto border border-stone-100 rounded-lg">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Funder / Program', 'Production', 'Requested', 'Awarded', 'Report Deadline', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {[...grants]
                .filter(g => g.status !== 'declined' && g.status !== 'complete')
                .sort((a, b) => {
                  const order: Record<string, number> = { report_due: 0, report_submitted: 1, awarded: 2, under_review: 3, submitted: 4, drafting: 5, identified: 6 }
                  return (order[a.status] ?? 9) - (order[b.status] ?? 9)
                })
                .map(g => {
                  const prod = productions.find(p => p.id === g.productionId)
                  const sc   = GRANT_STATUS_CLS[g.status] ?? ''
                  const repDays = g.reportDeadline ? daysUntil(g.reportDeadline) : null
                  return (
                    <tr key={g.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-800">{g.funder}</p>
                        <p className="text-stone-400 mt-0.5 leading-tight">{g.programName}</p>
                      </td>
                      <td className="px-4 py-3">
                        {prod ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prod.color }} />
                            <span className="text-stone-600">{prod.name}</span>
                          </div>
                        ) : (
                          <span className="text-stone-400">General operating</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-700 whitespace-nowrap">{fmt(g.amountRequested)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {g.amountAwarded != null
                          ? <span className="font-semibold text-emerald-700">{fmt(g.amountAwarded)}</span>
                          : <span className="text-stone-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {g.reportDeadline ? (
                          <span className={repDays !== null && repDays <= 30 ? 'font-medium text-orange-700' : 'text-stone-600'}>
                            {formatDate(g.reportDeadline)}{repDays !== null && repDays <= 0 ? ' (overdue)' : repDays !== null && repDays <= 30 ? ` (${repDays}d)` : ''}
                          </span>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border font-medium ${sc}`}>
                          {GRANT_STATUS_LABEL[g.status] ?? g.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BoardReportPage() {
  const { productions, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, obligations, grants } = useStore()
  const { isDemo, config } = useDemo()

  const orgName  = isDemo && config?.org  ? config.org  : 'Adam Blanshay Productions'
  const preparedBy = isDemo && config?.user ? config.user : 'Leon Kay'

  const today = new Date()
  const [meetingDate, setMeetingDate]   = useState(today.toISOString().slice(0, 10))
  const [chair, setChair]               = useState('')
  const [confidential, setConfidential] = useState(true)
  const [includeAppendix, setIncludeAppendix] = useState(true)
  const [generated, setGenerated]       = useState(false)
  const [copied, setCopied]             = useState(false)

  // ── Compute scorecards ──────────────────────────────────────────────────────

  const scorecards: Scorecard[] = productions.map(p => {
    const lines   = budgetLines.filter(l => l.productionId === p.id)
    const weeks   = revenueWeeks.filter(w => w.productionId === p.id)
      .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())
    const rows    = cashFlowRows.filter(r => r.productionId === p.id)
      .sort((a, b) => a.weekOf.localeCompare(b.weekOf))
    const pContracts = contracts.filter(c => c.productionId === p.id)
    const pDeadlines = deadlines.filter(d => d.productionId === p.id)

    const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
    const totalActual   = lines.reduce((s, l) => s + l.actual,   0)
    const grossToDate   = weeks.reduce((s, w) => s + w.grossRevenue, 0) || p.currentGross
    const lastWeek      = weeks[weeks.length - 1] ?? null
    const cashOnHand    = rows.length ? rows[rows.length - 1].closingCash : p.cashOnHand

    // Runway
    const outflows = rows.reduce((s, r) => s + r.payroll + r.venueCosts + r.marketing + r.royalties + r.vendorPayments + r.otherOutflows, 0)
    const inflows  = rows.reduce((s, r) => s + r.ticketRevenue + r.otherInflows, 0)
    const burn     = rows.length > 0 ? (outflows - inflows) / rows.length : 0
    const runway   = burn > 0 ? Math.round(cashOnHand / burn) : null

    // Break-even
    const weeksRem  = p.closingDate ? Math.max(0, Math.ceil((new Date(p.closingDate + 'T12:00:00').getTime() - Date.now()) / (7 * 86_400_000))) : 0
    const avgATP    = weeks.length > 0 ? weeks.reduce((s, w) => s + w.avgTicketPrice, 0) / weeks.length : 0
    const avgPerfs  = weeks.length > 0 ? weeks.reduce((s, w) => s + w.performances, 0) / weeks.length : 8
    const maxSeats  = weeks.length > 0 ? Math.max(...weeks.map(w => w.totalSeats)) : 0
    const needsGross = Math.max(0, totalBudgeted - grossToDate)
    const breakEvenCap = weeksRem > 0 && avgATP > 0 && maxSeats > 0
      ? (needsGross / (weeksRem * avgPerfs * maxSeats * avgATP)) * 100 : null

    // Pacing
    let pacing: PacingStatus = 'no-data'
    if (p.openingDate && p.closingDate && p.projectedGross > 0 && grossToDate > 0) {
      const open  = new Date(p.openingDate + 'T12:00:00').getTime()
      const close = new Date(p.closingDate + 'T12:00:00').getTime()
      const now   = Date.now()
      if (now > open && close > open) {
        const pctElapsed  = Math.min(1, (now - open) / (close - open))
        const pctCaptured = Math.min(grossToDate / p.projectedGross, 2)
        pacing = pctCaptured - pctElapsed > 0.05 ? 'ahead' : pctCaptured - pctElapsed < -0.10 ? 'behind' : 'on-pace'
      }
    }

    const grossPct        = p.projectedGross > 0 ? (grossToDate / p.projectedGross) * 100 : 0
    const budgetPct       = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
    const highVariance    = lines.filter(l => l.budgeted > 0 && Math.abs(variancePct(l.actual, l.budgeted)) > 10 && l.actual > 0)
    const unsigned        = pContracts.filter(c => c.status !== 'signed' && c.status !== 'expired')
    const overdueC        = unsigned.filter(c => daysUntil(c.dueDate) < 0)
    const overdueD        = pDeadlines.filter(d => d.status === 'overdue')
    const upcoming30      = pDeadlines.filter(d => d.status !== 'completed' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 30)

    const base = {
      id: p.id, name: p.name, color: p.color, status: p.status, venue: p.venue,
      openingDate: p.openingDate, closingDate: p.closingDate,
      grossToDate, projectedGross: p.projectedGross, grossPct,
      lastWeekGross: lastWeek?.grossRevenue ?? null,
      lastWeekCapPct: lastWeek?.capacityPct ?? null,
      pacing,
      totalBudgeted, totalActual, budgetPct,
      highVarianceCount: highVariance.length,
      cashOnHand, runway, breakEvenCap,
      unsignedContracts: unsigned.length,
      overdueContracts: overdueC.length,
      overdueDeadlines: overdueD.length,
      upcomingDeadlines: upcoming30.length,
    }
    const { risk, criticalFlags } = deriveRisk(base)
    return { ...base, risk, criticalFlags }
  })

  // ── Portfolio aggregates ────────────────────────────────────────────────────

  const active    = scorecards.filter(s => s.status !== 'closed')
  const totalGross  = scorecards.reduce((s, c) => s + c.grossToDate, 0)
  const totalBudget = scorecards.reduce((s, c) => s + c.totalBudgeted, 0)
  const totalActual = scorecards.reduce((s, c) => s + c.totalActual,   0)
  const totalCash   = scorecards.reduce((s, c) => s + c.cashOnHand,    0)
  const portfolioBudgetPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

  const minRunway   = active.map(s => s.runway).filter((r): r is number => r !== null)
  const shortestRunway = minRunway.length > 0 ? Math.min(...minRunway) : null

  const criticalCount = active.filter(s => s.risk === 'critical').length
  const atRiskCount   = active.filter(s => s.risk === 'at_risk').length
  const portfolioRisk: PortfolioRisk =
    criticalCount > 0 ? 'critical' :
    atRiskCount   > 0 ? 'at_risk'  :
    active.some(s => s.risk === 'watch') ? 'watch' : 'healthy'

  // ── Risk register ───────────────────────────────────────────────────────────

  const riskItems: RiskItem[] = []

  for (const sc of active) {
    // Critical obligations
    const critObls = obligations.filter(o =>
      o.productionId === sc.id &&
      !['completed', 'waived', 'not_applicable'].includes(o.status) &&
      o.risk === 'critical'
    )
    for (const o of critObls) {
      riskItems.push({
        severity: 'critical',
        production: sc.name,
        description: o.description,
        detail: daysUntil(o.dueDate) < 0 ? `${Math.abs(daysUntil(o.dueDate))} days overdue` : `Due ${formatDate(o.dueDate)}`,
      })
    }
    // Cash runway
    if (sc.runway !== null && sc.runway <= 4) {
      riskItems.push({ severity: 'critical', production: sc.name, description: `Critical cash runway: ${sc.runway} weeks remaining`, detail: `${fmt(sc.cashOnHand)} on hand` })
    } else if (sc.runway !== null && sc.runway <= 8) {
      riskItems.push({ severity: 'high', production: sc.name, description: `Short cash runway: ${sc.runway} weeks`, detail: `${fmt(sc.cashOnHand)} on hand` })
    }
    // Budget
    if (sc.budgetPct > 95) riskItems.push({ severity: 'critical', production: sc.name, description: 'Budget critically overrun', detail: `${fmtPct(sc.budgetPct)} of total budget used` })
    else if (sc.budgetPct > 85) riskItems.push({ severity: 'high', production: sc.name, description: 'Budget under pressure', detail: `${fmtPct(sc.budgetPct)} of total budget used` })
    // Overdue contracts
    if (sc.overdueContracts > 0) riskItems.push({ severity: 'high', production: sc.name, description: `${sc.overdueContracts} unsigned contract${sc.overdueContracts > 1 ? 's' : ''} past due date`, detail: 'Signature follow-up required' })
    // Break-even
    if (sc.breakEvenCap !== null && sc.breakEvenCap > 100) riskItems.push({ severity: 'high', production: sc.name, description: 'Break-even requires above-capacity performance', detail: `${Math.ceil(sc.breakEvenCap)}% avg capacity needed` })
    // Pacing
    if (sc.pacing === 'behind') riskItems.push({ severity: 'medium', production: sc.name, description: 'Sales pacing below projected trajectory', detail: 'Cumulative gross behind schedule relative to run elapsed' })
    // Variance lines
    if (sc.highVarianceCount > 0) riskItems.push({ severity: 'medium', production: sc.name, description: `${sc.highVarianceCount} budget line${sc.highVarianceCount > 1 ? 's' : ''} over 10% variance`, detail: 'Review budget allocation' })
    // Overdue deadlines
    if (sc.overdueDeadlines > 0) riskItems.push({ severity: 'medium', production: sc.name, description: `${sc.overdueDeadlines} overdue deadline${sc.overdueDeadlines > 1 ? 's' : ''}`, detail: 'Requires immediate owner assignment' })
  }

  // Sort: critical first, then high, then medium
  const sevOrder = { critical: 0, high: 1, medium: 2 }
  riskItems.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])

  // ── Decisions required ──────────────────────────────────────────────────────

  const decisions: DecisionItem[] = []
  const criticalProds = active.filter(s => s.risk === 'critical' || s.risk === 'at_risk')
  for (const sc of criticalProds) {
    if (sc.runway !== null && sc.runway <= 4) {
      decisions.push({
        urgency: 'immediate',
        title: `Emergency cash action — ${sc.name}`,
        context: `${sc.name} has ${sc.runway} weeks of cash runway remaining (${fmt(sc.cashOnHand)} on hand). Immediate action required to avoid operational disruption.`,
        owner: 'Executive Producer / GM',
      })
    }
    if (sc.budgetPct > 95) {
      decisions.push({
        urgency: 'this-meeting',
        title: `Budget overrun approval — ${sc.name}`,
        context: `${sc.name} has consumed ${fmtPct(sc.budgetPct)} of its total budget. Board approval required for any additional spend.`,
        owner: 'General Manager',
      })
    }
    if (sc.breakEvenCap !== null && sc.breakEvenCap > 100) {
      decisions.push({
        urgency: 'this-meeting',
        title: `Break-even strategy review — ${sc.name}`,
        context: `Current trajectory requires ${Math.ceil(sc.breakEvenCap)}% average capacity to reach breakeven — above house capacity. Board should discuss options: marketing push, price adjustment, or early closure.`,
        owner: 'Producer / Marketing',
      })
    }
  }
  if (active.filter(s => s.overdueContracts > 0).length > 0) {
    decisions.push({
      urgency: 'this-meeting',
      title: 'Unsigned contracts — follow-up authority',
      context: `${active.reduce((s, c) => s + c.overdueContracts, 0)} contracts are past their signature deadline across the portfolio. Board to confirm pursuit strategy and any escalation authority.`,
      owner: 'General Manager',
    })
  }

  // ── Forward calendar (next 30 days) ────────────────────────────────────────

  const forwardItems = deadlines
    .filter(d => d.status !== 'completed' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 30)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10)

  // ── Plaintext export ────────────────────────────────────────────────────────

  const fmtDate = (d: string) => new Date(meetingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const plainText = [
    confidential ? 'CONFIDENTIAL — FOR BOARD USE ONLY' : '',
    '',
    `${orgName.toUpperCase()}`,
    `BOARD REPORT — ${new Date(meetingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}`,
    chair ? `Meeting Chair: ${chair}` : '',
    `Prepared by: ${preparedBy}`,
    '═'.repeat(60),
    '',
    '1. PORTFOLIO OVERVIEW',
    `   Active productions:  ${active.length}`,
    `   Total gross to date: ${fmt(totalGross)}`,
    `   Combined cash:       ${fmt(totalCash)}${shortestRunway ? ` (${shortestRunway}-wk shortest runway)` : ''}`,
    `   Portfolio budget:    ${fmtPct(portfolioBudgetPct)} used`,
    `   Portfolio risk:      ${RISK_CFG[portfolioRisk].label}`,
    '',
    '2. PRODUCTION SCORECARDS',
    ...active.map(sc => [
      `   ${sc.name.toUpperCase()} — ${statusLabel(sc.status)}`,
      `   Gross: ${fmt(sc.grossToDate)} of ${fmt(sc.projectedGross)} projected (${fmtPct(sc.grossPct)} captured) — ${PACING_CFG[sc.pacing].label}`,
      `   Budget: ${fmtPct(sc.budgetPct)} used | Cash: ${fmt(sc.cashOnHand)}${sc.runway ? ` (${sc.runway}-wk runway)` : ''} | Risk: ${RISK_CFG[sc.risk].label}`,
      sc.criticalFlags.length > 0 ? `   Flags: ${sc.criticalFlags.join('; ')}` : '   No critical flags',
      '',
    ]).flat(),
    '3. RISK REGISTER',
    ...riskItems.map(r => `   [${r.severity.toUpperCase()}] ${r.production}: ${r.description} — ${r.detail}`),
    '',
    '4. DECISIONS REQUIRED',
    decisions.length === 0 ? '   No decisions required at this time.' : '',
    ...decisions.map((d, i) => [
      `   ${i + 1}. [${d.urgency.toUpperCase()}] ${d.title}`,
      `      ${d.context}`,
      `      Owner: ${d.owner}`,
      '',
    ]).flat(),
    '5. FORWARD CALENDAR (NEXT 30 DAYS)',
    ...forwardItems.map(d => {
      const prod = productions.find(p => p.id === d.productionId)
      return `   ${formatDate(d.date)} — ${d.title} (${prod?.name ?? 'Portfolio'})`
    }),
    '',
    '6. GRANT PIPELINE',
    `   Confirmed funding: ${fmt(grants.filter(g => ['awarded','report_due','report_submitted'].includes(g.status)).reduce((s,g) => s+(g.amountAwarded??0), 0))}`,
    `   Pipeline value:    ${fmt(grants.filter(g => ['identified','drafting','submitted','under_review'].includes(g.status)).reduce((s,g) => s+g.amountRequested, 0))}`,
    ...grants.filter(g => g.status !== 'declined' && g.status !== 'complete').map(g => {
      const prod = productions.find(p => p.id === g.productionId)
      return `   [${(g.status).toUpperCase().replace('_',' ')}] ${g.funder} — ${g.programName} ${g.amountAwarded != null ? fmt(g.amountAwarded)+' awarded' : fmt(g.amountRequested)+' requested'}${prod ? ` (${prod.name})` : ''}`
    }),
    '',
    '─'.repeat(60),
    `Board Report generated by StageOS · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
  ].filter(l => l !== undefined).join('\n')

  if (!generated) {
    return (
      <div>
        <PageHeader
          title="Board Report"
          subtitle="Portfolio-level governance report for board meetings"
          actions={
            <Link href="/reports" className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1">
              <ChevronLeft size={13} /> All Reports
            </Link>
          }
        />

        <div className="max-w-2xl">
          <Card>
            <CardBody className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Configure Board Report</h2>
                  <p className="text-sm text-stone-500">Covers all {active.length} active production{active.length !== 1 ? 's' : ''} in the portfolio.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Meeting Date</label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={e => setMeetingDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Meeting Chair <span className="text-stone-300 font-normal normal-case tracking-normal">optional</span></label>
                    <input
                      value={chair}
                      onChange={e => setChair(e.target.value)}
                      placeholder="e.g. Sarah Mitchell"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={confidential} onChange={e => setConfidential(e.target.checked)} className="rounded" />
                    <span className="text-sm text-stone-700">Mark as confidential</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeAppendix} onChange={e => setIncludeAppendix(e.target.checked)} className="rounded" />
                    <span className="text-sm text-stone-700">Include production appendix</span>
                  </label>
                </div>

                {/* Preview of what's included */}
                <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Report contents</p>
                  <div className="space-y-2">
                    {[
                      ['Portfolio Overview', `${active.length} active productions — headline KPIs`],
                      ['Production Scorecards', 'Gross, budget, cash, pacing, risk per show'],
                      ['Risk Register', `${riskItems.length} identified risk${riskItems.length !== 1 ? 's' : ''} across portfolio`],
                      ['Decisions Required', `${decisions.length} item${decisions.length !== 1 ? 's' : ''} requiring board action`],
                      ['Forward Calendar', `${forwardItems.length} milestone${forwardItems.length !== 1 ? 's' : ''} in the next 30 days`],
                      ['Grant Pipeline', `${grants.length} grant${grants.length !== 1 ? 's' : ''} — funding pipeline & reporting obligations`],
                      ['Production Appendix', 'Detailed financials per production', !includeAppendix],
                    ].map(([title, desc, disabled]) => (
                      <div key={title as string} className={`flex items-center gap-2.5 text-sm ${disabled ? 'opacity-40' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${disabled ? 'bg-stone-300' : 'bg-stone-700'}`} />
                        <span className="font-medium text-stone-800">{title as string}</span>
                        <span className="text-stone-400 text-xs">— {desc as string}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portfolio risk preview */}
                <div className={`flex items-center gap-3 p-3.5 rounded-lg border ${RISK_CFG[portfolioRisk].cls}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${RISK_CFG[portfolioRisk].dot}`} />
                  <div>
                    <p className="text-sm font-medium">Current portfolio risk: {RISK_CFG[portfolioRisk].label}</p>
                    <p className="text-xs mt-0.5 opacity-75">
                      {criticalCount > 0 && `${criticalCount} critical · `}
                      {atRiskCount > 0 && `${atRiskCount} at risk · `}
                      {active.filter(s => s.risk === 'watch').length > 0 && `${active.filter(s => s.risk === 'watch').length} watch · `}
                      {active.filter(s => s.risk === 'healthy').length} healthy
                    </p>
                  </div>
                </div>

                <Button className="w-full justify-center" onClick={() => setGenerated(true)}>
                  <Users size={15} />
                  Generate Board Report
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  // ── Generated report ────────────────────────────────────────────────────────

  const meetingDateFmt = new Date(meetingDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => setGenerated(false)}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft size={15} /> Reconfigure
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(plainText)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
          >
            {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy plaintext</>}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Printer size={12} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report document */}
      <div className="max-w-4xl print:max-w-none">

        {/* Cover header */}
        <div className="bg-stone-950 text-white rounded-t-xl px-8 py-8 print:rounded-none">
          {confidential && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-4">
              Confidential — Board Use Only
            </p>
          )}
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">{orgName}</p>
              <h1 className="text-3xl font-light mb-1">Board Report</h1>
              <p className="text-stone-400 text-sm">{meetingDateFmt}</p>
              {chair && <p className="text-stone-500 text-xs mt-1">Chair: {chair}</p>}
            </div>
            <div className="text-right shrink-0 space-y-3">
              <div>
                <p className="text-stone-400 text-xs mb-1">Portfolio Risk</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${RISK_CFG[portfolioRisk].cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${RISK_CFG[portfolioRisk].dot}`} />
                  {RISK_CFG[portfolioRisk].label}
                </span>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Prepared by</p>
                <p className="text-stone-300 text-xs">{preparedBy}</p>
              </div>
            </div>
          </div>

          {/* Headline KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
            {[
              { label: 'Active Productions', value: String(active.length) },
              { label: 'Total Gross to Date', value: fmt(totalGross) },
              { label: 'Combined Cash', value: fmt(totalCash) },
              { label: 'Portfolio Budget Used', value: fmtPct(portfolioBudgetPct) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-stone-400 text-xs mb-0.5">{label}</p>
                <p className="text-xl font-light text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Report body */}
        <div className="bg-white border border-stone-200 border-t-0 rounded-b-xl px-8 py-8 print:border-0 space-y-10">

          {/* ── Section 1: Production Scorecards ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              <TrendingUp size={13} className="text-stone-400" />
              1. Production Scorecards
            </h2>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full min-w-[700px] text-sm border border-stone-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Production', 'Status', 'Gross / Projected', 'Pacing', 'Budget Used', 'Cash / Runway', 'Break-even', 'Risk'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scorecards.map(sc => {
                    const rc = RISK_CFG[sc.risk]
                    const pc = PACING_CFG[sc.pacing]
                    const beLabel = sc.breakEvenCap === null ? '—'
                      : sc.breakEvenCap <= 0 ? '✓ In profit'
                      : sc.breakEvenCap > 110 ? 'SRO+ needed'
                      : `${Math.ceil(sc.breakEvenCap)}% avg`
                    return (
                      <tr key={sc.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                            <Link href={`/productions/${sc.id}`} className="font-medium text-stone-800 hover:text-stone-500 transition-colors">{sc.name}</Link>
                          </div>
                          <p className="text-xs text-stone-400 pl-4 mt-0.5 truncate max-w-[140px]">{sc.venue}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={sc.status as any}>{statusLabel(sc.status as any)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-800">{fmt(sc.grossToDate)}</p>
                          <p className="text-xs text-stone-400">{sc.projectedGross > 0 ? `of ${fmt(sc.projectedGross)} (${fmtPct(sc.grossPct)})` : '—'}</p>
                        </td>
                        <td className={`px-4 py-3 text-xs font-medium ${pc.cls}`}>{pc.label}</td>
                        <td className="px-4 py-3">
                          <p className={`text-sm font-medium ${sc.budgetPct > 95 ? 'text-red-600' : sc.budgetPct > 85 ? 'text-amber-600' : 'text-stone-700'}`}>
                            {sc.totalBudgeted > 0 ? fmtPct(sc.budgetPct) : '—'}
                          </p>
                          {sc.highVarianceCount > 0 && (
                            <p className="text-xs text-amber-600 mt-0.5">{sc.highVarianceCount} over variance</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-stone-700">{fmt(sc.cashOnHand)}</p>
                          {sc.runway !== null && (
                            <p className={`text-xs mt-0.5 ${sc.runway <= 4 ? 'text-red-600 font-medium' : sc.runway <= 8 ? 'text-amber-600' : 'text-stone-400'}`}>
                              {sc.runway} wk runway
                            </p>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-xs font-medium ${sc.breakEvenCap !== null && sc.breakEvenCap > 90 ? 'text-red-600' : sc.breakEvenCap !== null && sc.breakEvenCap <= 0 ? 'text-emerald-600' : 'text-stone-600'}`}>
                          {beLabel}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${rc.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                            {rc.label}
                          </span>
                          {sc.criticalFlags.length > 0 && (
                            <p className="text-[10px] text-stone-400 mt-1 leading-tight max-w-[120px]">{sc.criticalFlags[0]}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 2: Financial Summary ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              <DollarSign size={13} className="text-stone-400" />
              2. Financial Summary
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Gross Revenue', value: fmt(totalGross), sub: `across ${productions.length} production${productions.length !== 1 ? 's' : ''}` },
                { label: 'Total Spend', value: fmt(totalActual), sub: `${fmtPct(portfolioBudgetPct)} of total budget` },
                { label: 'Combined Cash', value: fmt(totalCash), sub: shortestRunway ? `${shortestRunway}-wk shortest runway` : 'current balance' },
                { label: 'Unsigned Contracts', value: String(active.reduce((s, c) => s + c.unsignedContracts, 0)), sub: `${active.reduce((s, c) => s + c.overdueContracts, 0)} past due` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-stone-50 border border-stone-100 rounded-lg p-4">
                  <p className="text-xs text-stone-400 mb-0.5">{label}</p>
                  <p className="text-lg font-semibold text-stone-900">{value}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            {/* Budget by production */}
            <div className="space-y-2">
              {active.map(sc => (
                sc.totalBudgeted > 0 && (
                  <div key={sc.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                        <span className="text-stone-700 font-medium">{sc.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-stone-500">
                        <span>{fmt(sc.totalActual)} of {fmt(sc.totalBudgeted)}</span>
                        <span className={`font-medium w-12 text-right ${sc.budgetPct > 95 ? 'text-red-600' : sc.budgetPct > 85 ? 'text-amber-600' : 'text-stone-700'}`}>{fmtPct(sc.budgetPct)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(sc.budgetPct, 100)}%`, backgroundColor: sc.budgetPct > 95 ? '#ef4444' : sc.budgetPct > 85 ? '#f59e0b' : sc.color }}
                      />
                    </div>
                  </div>
                )
              ))}
            </div>
          </section>

          {/* ── Section 3: Risk Register ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              <Shield size={13} className="text-stone-400" />
              3. Risk Register
            </h2>
            {riskItems.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                <CheckCircle size={15} />
                No material risks identified across the portfolio.
              </div>
            ) : (
              <div className="space-y-2">
                {riskItems.map((item, i) => {
                  const cfg = SEVERITY_CFG[item.severity]
                  const Icon = cfg.icon
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3.5 rounded-lg border ${cfg.cls}`}>
                      <Icon size={14} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase tracking-wide">{item.severity}</span>
                          <span className="text-xs opacity-60">·</span>
                          <span className="text-xs font-medium">{item.production}</span>
                        </div>
                        <p className="text-sm font-medium mt-0.5">{item.description}</p>
                        <p className="text-xs opacity-70 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Section 4: Decisions Required ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              <AlertCircle size={13} className="text-stone-400" />
              4. Decisions Required
            </h2>
            {decisions.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-600">
                <CheckCircle size={15} className="text-stone-400" />
                No decisions requiring board action at this time.
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d, i) => {
                  const uc = URGENCY_CFG[d.urgency]
                  return (
                    <div key={i} className="border border-stone-200 rounded-lg p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
                          <p className="text-sm font-semibold text-stone-900">{d.title}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-0.5 rounded border font-medium shrink-0 ${uc.cls}`}>{uc.label}</span>
                      </div>
                      <p className="text-sm text-stone-600 ml-8.5 leading-relaxed mb-2">{d.context}</p>
                      <p className="text-xs text-stone-400 ml-8.5">Owner: {d.owner}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Section 5: Forward Calendar ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              <Calendar size={13} className="text-stone-400" />
              5. Forward Calendar — Next 30 Days
            </h2>
            {forwardItems.length === 0 ? (
              <p className="text-sm text-stone-500 p-4 bg-stone-50 rounded-lg border border-stone-100">No significant milestones in the next 30 days.</p>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
                {forwardItems.map((d) => {
                  const prod = productions.find(p => p.id === d.productionId)
                  const days = daysUntil(d.date)
                  return (
                    <div key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {prod && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prod.color }} />}
                        <div className="min-w-0">
                          <p className="text-sm text-stone-800 truncate">{d.title}</p>
                          <p className="text-xs text-stone-400">{prod?.name ?? 'Portfolio'} · {d.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs font-medium text-stone-700">{formatDate(d.date)}</p>
                        <p className={`text-xs ${days <= 3 ? 'text-red-500 font-medium' : days <= 7 ? 'text-amber-500' : 'text-stone-400'}`}>
                          in {days}d
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Section 6: Grant Pipeline ── */}
          <GrantPipelineSection grants={grants} productions={productions} />

          {/* ── Appendix: Per-production detail ── */}
          {includeAppendix && (
            <section>
              <h2 className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
                <AlertTriangle size={13} className="text-stone-400" />
                Appendix — Production Detail
              </h2>
              <div className="space-y-4">
                {active.map(sc => (
                  <div key={sc.id} className="border border-stone-100 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-stone-50 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                        <span className="text-sm font-semibold text-stone-800">{sc.name}</span>
                        <Badge variant={sc.status as any}>{statusLabel(sc.status as any)}</Badge>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${RISK_CFG[sc.risk].cls}`}>{RISK_CFG[sc.risk].label}</span>
                    </div>
                    <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      {[
                        ['Venue', sc.venue || '—'],
                        ['Run', sc.openingDate ? `${formatDate(sc.openingDate)}${sc.closingDate ? ` – ${formatDate(sc.closingDate)}` : ''}` : '—'],
                        ['Gross to Date', fmt(sc.grossToDate)],
                        ['Projected Gross', sc.projectedGross > 0 ? fmt(sc.projectedGross) : '—'],
                        ['Budget Used', sc.totalBudgeted > 0 ? `${fmtPct(sc.budgetPct)} (${fmt(sc.totalActual)} of ${fmt(sc.totalBudgeted)})` : '—'],
                        ['Cash on Hand', fmt(sc.cashOnHand)],
                        ['Cash Runway', sc.runway !== null ? `${sc.runway} weeks` : '—'],
                        ['Break-even', (() => { const b = sc.breakEvenCap; return b === null ? '—' : b <= 0 ? 'In profit' : b > 110 ? 'SRO+ needed' : `${Math.ceil(b)}% avg` })()],
                        ['Contracts', `${sc.unsignedContracts} unsigned${sc.overdueContracts > 0 ? `, ${sc.overdueContracts} overdue` : ''}`],
                        ['Deadlines', `${sc.overdueDeadlines} overdue · ${sc.upcomingDeadlines} in 30 days`],
                        ['Last Week Gross', sc.lastWeekGross !== null ? fmt(sc.lastWeekGross) : '—'],
                        ['Last Week Capacity', sc.lastWeekCapPct !== null ? `${sc.lastWeekCapPct.toFixed(0)}%` : '—'],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <p className="text-stone-400 mb-0.5">{label as string}</p>
                          <p className="text-stone-700 font-medium">{value as string}</p>
                        </div>
                      ))}
                    </div>
                    {sc.criticalFlags.length > 0 && (
                      <div className="px-5 pb-4">
                        <p className="text-xs font-medium text-stone-500 mb-1">Risk flags:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {sc.criticalFlags.map((f, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-stone-100 text-xs text-stone-400 flex items-center justify-between">
            <p>Board Report generated by StageOS · {orgName} · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            {confidential && <p className="font-medium">Confidential — Board Use Only</p>}
          </div>
        </div>

      </div>
    </div>
  )
}
