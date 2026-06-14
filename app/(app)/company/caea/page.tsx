'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, formatDate } from '@/lib/utils'
import { personName, avatarColor, initials, downloadCSV } from '@/lib/company'
import {
  CAEA_DISCLAIMER,
  PACT_TIERS,
  PENALTY_RATES,
  PENALTY_LABELS,
  computeCAEAEntry,
  makePenalty,
  entryHealth,
  approachingMax,
  SEASON_MAX_HOURS,
  type CAEAEntryInput,
  type CAEAWeekHealth,
} from '@/lib/caea'
import {
  AlertTriangle,
  Download,
  Printer,
  CheckCircle2,
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
} from 'lucide-react'
import type {
  CAEAWeeklyReport,
  CAEAWeeklyEntry,
  CAEAPenalty,
  CAEAPenaltyType,
  PACTContractType,
} from '@/lib/types'

const PACT_TYPES: PACTContractType[] = ['PACT-A', 'PACT-B', 'PACT-C', 'PACT-D', 'LOA']
const PENALTY_TYPES: CAEAPenaltyType[] = ['MissedBreak', 'RestInvasion', 'MealPenalty', 'Other']

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

// Rebuild the input used by the calc engine from an existing computed entry.
function entryToInput(e: CAEAWeeklyEntry): CAEAEntryInput {
  return {
    personId: e.personId,
    weeklyContractRate: e.weeklyContractRate,
    scheduledHours: e.scheduledHours,
    actualHours: e.actualHours,
    isPartialWeek: e.isPartialWeek,
    partialWeekDays: e.partialWeekDays,
    partialWeekType: e.partialWeekType,
    isTechWeek: e.isTechWeek,
    penalties: e.penalties,
    sickDays: e.sickDays,
    personalDays: e.personalDays,
  }
}

const HEALTH_BORDER: Record<CAEAWeekHealth, string> = {
  clean: 'border-l-emerald-400',
  penalties: 'border-l-amber-400',
  issue: 'border-l-red-500',
}

const HEALTH_BADGE: Record<CAEAWeekHealth, string> = {
  clean: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  penalties: 'text-amber-700 bg-amber-50 border-amber-200',
  issue: 'text-red-700 bg-red-50 border-red-200',
}

const HEALTH_LABEL: Record<CAEAWeekHealth, string> = {
  clean: 'Clean',
  penalties: 'Penalties',
  issue: 'Review',
}

function Avatar({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(id), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full rounded border border-stone-300 px-2.5 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300'

// compact numeric cell input
const numCls =
  'w-20 rounded border border-stone-300 px-1.5 py-1 text-sm text-stone-800 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-300'

export default function CAEAWeeklyReportsPage() {
  const { people, productions, caeaReports, addCAEAReport, updateCAEAReport, deleteCAEAReport } =
    useStore()
  const { canEdit } = useAccess()

  // ── Eligible productions: those with CAEA members or existing reports ───────
  const eligibleProductions = useMemo(() => {
    const withReports = new Set(caeaReports.map((r) => r.productionId))
    return productions.filter((prod) => {
      if (withReports.has(prod.id)) return true
      return people.some(
        (p) =>
          p.unionAffiliation === 'CAEA' &&
          p.productionHistory.some((h) => h.productionId === prod.id),
      )
    })
  }, [productions, people, caeaReports])

  const [productionId, setProductionId] = useState(eligibleProductions[0]?.id ?? '')
  const activeProductionId =
    eligibleProductions.find((p) => p.id === productionId)?.id ?? eligibleProductions[0]?.id ?? ''

  // Reports for the selected production, sorted by weekEnding desc.
  const prodReports = useMemo(
    () =>
      caeaReports
        .filter((r) => r.productionId === activeProductionId)
        .sort((a, b) => b.weekEnding.localeCompare(a.weekEnding)),
    [caeaReports, activeProductionId],
  )

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [newWeekOpen, setNewWeekOpen] = useState(false)

  // Resolve the active report: explicit selection, else most recent.
  const report =
    prodReports.find((r) => r.id === selectedReportId) ?? prodReports[0] ?? null

  const production = productions.find((p) => p.id === activeProductionId)

  // ── Persist helpers ─────────────────────────────────────────────────────────
  function persistEntries(entries: CAEAWeeklyEntry[]) {
    if (!report) return
    updateCAEAReport({ ...report, entries })
  }

  function recomputeEntry(index: number, patch: Partial<CAEAEntryInput>) {
    if (!report) return
    const entries = report.entries.map((e, i) => {
      if (i !== index) return e
      const input = { ...entryToInput(e), ...patch }
      return computeCAEAEntry(input, report.contractType)
    })
    persistEntries(entries)
  }

  function changeContractType(type: PACTContractType) {
    if (!report) return
    const entries = report.entries.map((e) => computeCAEAEntry(entryToInput(e), type))
    updateCAEAReport({ ...report, contractType: type, entries })
  }

  // ── Season hours per person across all reports for this production ──────────
  const seasonHours = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of prodReports) {
      for (const e of r.entries) {
        map.set(e.personId, (map.get(e.personId) ?? 0) + e.actualHours)
      }
    }
    return map
  }, [prodReports])

  // ── Season gross / net per person ───────────────────────────────────────────
  const seasonTotals = useMemo(() => {
    const map = new Map<string, { gross: number; net: number }>()
    for (const r of prodReports) {
      for (const e of r.entries) {
        const cur = map.get(e.personId) ?? { gross: 0, net: 0 }
        cur.gross += e.grossPay
        cur.net += e.netToPayroll
        map.set(e.personId, cur)
      }
    }
    return map
  }, [prodReports])

  // ── Penalty popover ──────────────────────────────────────────────────────────
  const [penaltyIdx, setPenaltyIdx] = useState<number | null>(null)

  // ── Create a new weekly report ───────────────────────────────────────────────
  function createReport(weekEnding: string, contractType: PACTContractType) {
    if (!activeProductionId) return
    const members = people.filter(
      (p) =>
        p.unionAffiliation === 'CAEA' &&
        p.productionHistory.some((h) => h.productionId === activeProductionId),
    )
    const entries: CAEAWeeklyEntry[] = members.map((m) =>
      computeCAEAEntry(
        {
          personId: m.id,
          weeklyContractRate: 1200,
          scheduledHours: 42,
          actualHours: 42,
          isPartialWeek: false,
          isTechWeek: false,
          penalties: [],
          sickDays: 0,
          personalDays: 0,
        },
        contractType,
      ),
    )
    const newReport: CAEAWeeklyReport = {
      id: uid('caea'),
      productionId: activeProductionId,
      weekEnding,
      contractType,
      entries,
    }
    addCAEAReport(newReport)
    setSelectedReportId(newReport.id)
    setNewWeekOpen(false)
  }

  // ── Footer totals ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const acc = { gross: 0, pension: 0, dues: 0, vacation: 0, net: 0 }
    if (report) {
      for (const e of report.entries) {
        acc.gross += e.grossPay
        acc.pension += e.pensionContribution
        acc.dues += e.duesCheckoff
        acc.vacation += e.vacationPay
        acc.net += e.netToPayroll
      }
    }
    return acc
  }, [report])

  // ── Members approaching season max ──────────────────────────────────────────
  const approachingPeople = useMemo(() => {
    if (!report) return []
    return report.entries
      .map((e) => ({ personId: e.personId, hours: seasonHours.get(e.personId) ?? 0 }))
      .filter((x) => approachingMax(x.hours))
  }, [report, seasonHours])

  // ── Export CSV ────────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!report) return
    const rows: (string | number)[][] = [
      [
        'Person',
        'Weekly rate (CAD)',
        'Scheduled hrs',
        'Actual hrs',
        'Partial week',
        'Tech week',
        'Overtime hrs',
        'Overtime pay (CAD)',
        'Penalty total (CAD)',
        'Added time (CAD)',
        'Vacation pay (CAD)',
        'Gross (CAD)',
        'Pension (CAD)',
        'Dues (CAD)',
        'Sick days',
        'Personal days',
        'Net to payroll (CAD)',
      ],
    ]
    for (const e of report.entries) {
      rows.push([
        personName(people, e.personId),
        e.weeklyContractRate,
        e.scheduledHours,
        e.actualHours,
        e.isPartialWeek ? `${e.partialWeekDays ?? 0}d ${e.partialWeekType ?? ''}`.trim() : 'No',
        e.isTechWeek ? 'Yes' : 'No',
        e.overtimeHours,
        e.overtimePay,
        e.penaltyTotal,
        e.addedTimePay,
        e.vacationPay,
        e.grossPay,
        e.pensionContribution,
        e.duesCheckoff,
        e.sickDays,
        e.personalDays,
        e.netToPayroll,
      ])
    }
    rows.push([
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.vacation,
      totals.gross,
      totals.pension,
      totals.dues,
      '',
      '',
      totals.net,
    ])
    const prodSlug = (production?.name ?? 'production').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadCSV(`caea-${prodSlug}-${report.weekEnding}.csv`, rows)
    updateCAEAReport({ ...report, exportedAt: new Date().toISOString() })
  }

  function markSubmitted() {
    if (!report) return
    updateCAEAReport({ ...report, submittedAt: new Date().toISOString() })
  }

  const tier = report ? PACT_TIERS[report.contractType] : null

  return (
    <div>
      <PageHeader
        title="CAEA Weekly Reports"
        subtitle="Automated PACT weekly payroll tabulation — ready for payroll"
        actions={
          report ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer size={14} /> Print / PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={exportCSV}>
                <Download size={14} /> Export CSV
              </Button>
              {canEdit && !report.submittedAt && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={markSubmitted}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 size={14} /> Mark Submitted
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {eligibleProductions.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg px-6 py-16 text-center text-stone-400 text-sm">
          No productions with CAEA company members yet.
        </div>
      ) : (
        <>
          {/* ── Top controls bar ── */}
          <div className="bg-white border border-stone-200 rounded-lg px-4 py-4 mb-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Production selector */}
              <Field label="Production">
                <select
                  value={activeProductionId}
                  onChange={(e) => {
                    setProductionId(e.target.value)
                    setSelectedReportId(null)
                  }}
                  className={inputCls}
                >
                  {eligibleProductions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Week selector */}
              <Field label="Week ending">
                <select
                  value={report?.id ?? ''}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setNewWeekOpen(true)
                    } else {
                      setSelectedReportId(e.target.value)
                    }
                  }}
                  className={inputCls}
                >
                  {prodReports.length === 0 && <option value="">No reports yet</option>}
                  {prodReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.weekEnding)}
                      {r.submittedAt ? ' · submitted' : ''}
                    </option>
                  ))}
                  {canEdit && <option value="__new__">+ New week…</option>}
                </select>
              </Field>

              {/* PACT contract tier selector */}
              <Field label="PACT contract tier">
                {report ? (
                  <select
                    value={report.contractType}
                    onChange={(e) => changeContractType(e.target.value as PACTContractType)}
                    disabled={!canEdit}
                    className={cn(inputCls, !canEdit && 'opacity-60 cursor-not-allowed')}
                  >
                    {PACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PACT_TIERS[t].label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-2.5 py-1.5 text-sm text-stone-400">—</div>
                )}
              </Field>
            </div>

            {tier && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <Calculator size={13} className="text-stone-400" />
                  <span className="font-medium text-stone-700">{tier.weeklyHours} hrs</span> straight-time / week
                </span>
                <span className="text-stone-400">·</span>
                <span>{tier.description}</span>
                <span className="text-stone-400">·</span>
                <span>OT ×{tier.otMultiplier}</span>
              </div>
            )}
          </div>

          {!report ? (
            <div className="bg-white border border-stone-200 rounded-lg px-6 py-16 text-center">
              <p className="text-sm text-stone-500 mb-4">
                No weekly report yet for {production?.name}. Create one to begin.
              </p>
              {canEdit && (
                <Button variant="primary" size="sm" onClick={() => setNewWeekOpen(true)}>
                  <Plus size={14} /> New weekly report
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* ── Disclaimer banner (always) ── */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 mb-5 text-sm">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{CAEA_DISCLAIMER}</span>
              </div>

              {/* ── Status / week header ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  {production?.color && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: production.color }}
                    />
                  )}
                  <span className="text-base font-semibold text-stone-800">
                    Week ending {formatDate(report.weekEnding)}
                  </span>
                  <span className="text-xs text-stone-400">{PACT_TIERS[report.contractType].label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {report.submittedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 size={12} /> Submitted {formatDate(report.submittedAt.slice(0, 10))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-500">
                      Draft
                    </span>
                  )}
                  {report.exportedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                      <Download size={12} /> Exported
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this weekly report?')) {
                          deleteCAEAReport(report.id)
                          setSelectedReportId(null)
                        }
                      }}
                      className="text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Approaching-max alerts ── */}
              {approachingPeople.length > 0 && (
                <div className="space-y-2 mb-5">
                  {approachingPeople.map((a) => (
                    <div
                      key={a.personId}
                      className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5 text-sm"
                    >
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>
                        <strong>{personName(people, a.personId)}</strong> is approaching the contract
                        maximum — <strong>{a.hours}</strong> of {SEASON_MAX_HOURS} season hours.
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Weekly table ── */}
              <div className="bg-white border border-stone-200 rounded-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1500px]">
                    <thead>
                      <tr className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider border-b border-stone-200 bg-stone-50">
                        <th className="px-3 py-2.5 sticky left-0 bg-stone-50">Person</th>
                        <th className="px-3 py-2.5 text-right">Weekly rate</th>
                        <th className="px-3 py-2.5 text-right">Sched hrs</th>
                        <th className="px-3 py-2.5 text-right">Actual hrs</th>
                        <th className="px-3 py-2.5">Partial wk</th>
                        <th className="px-3 py-2.5 text-center">Tech</th>
                        <th className="px-3 py-2.5">Penalties</th>
                        <th className="px-3 py-2.5 text-right">Sick</th>
                        <th className="px-3 py-2.5 text-right">Pers</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">OT hrs</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">OT pay</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">Penalty $</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">Vacation</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">Gross</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">Pension</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">Dues</th>
                        <th className="px-3 py-2.5 text-right bg-stone-100/60">Net to payroll</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.entries.length === 0 && (
                        <tr>
                          <td colSpan={17} className="px-4 py-12 text-center text-stone-400 text-sm">
                            No CAEA company members on this production.
                          </td>
                        </tr>
                      )}
                      {report.entries.map((e, idx) => {
                        const health = entryHealth(e, report.contractType)
                        const pCount = e.penalties.reduce((s, p) => s + p.count, 0)
                        return (
                          <tr
                            key={e.personId}
                            className={cn(
                              'border-b border-stone-100 last:border-0 border-l-2',
                              HEALTH_BORDER[health],
                            )}
                          >
                            {/* Person */}
                            <td className="px-3 py-2 sticky left-0 bg-white">
                              <span className="flex items-center gap-2">
                                <Avatar id={e.personId} name={personName(people, e.personId)} />
                                <span className="font-medium text-stone-800 whitespace-nowrap">
                                  {personName(people, e.personId)}
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                                    HEALTH_BADGE[health],
                                  )}
                                >
                                  {HEALTH_LABEL[health]}
                                </span>
                              </span>
                            </td>

                            {/* Weekly rate */}
                            <td className="px-3 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={e.weeklyContractRate}
                                  onChange={(ev) =>
                                    recomputeEntry(idx, { weeklyContractRate: Number(ev.target.value) })
                                  }
                                  className={numCls}
                                />
                              ) : (
                                <span className="tabular-nums text-stone-700">{fmt(e.weeklyContractRate)}</span>
                              )}
                            </td>

                            {/* Scheduled hours */}
                            <td className="px-3 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={e.scheduledHours}
                                  onChange={(ev) =>
                                    recomputeEntry(idx, { scheduledHours: Number(ev.target.value) })
                                  }
                                  className={numCls}
                                />
                              ) : (
                                <span className="tabular-nums text-stone-700">{e.scheduledHours}</span>
                              )}
                            </td>

                            {/* Actual hours */}
                            <td className="px-3 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={e.actualHours}
                                  onChange={(ev) =>
                                    recomputeEntry(idx, { actualHours: Number(ev.target.value) })
                                  }
                                  className={numCls}
                                />
                              ) : (
                                <span className="tabular-nums text-stone-700">{e.actualHours}</span>
                              )}
                            </td>

                            {/* Partial week */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={e.isPartialWeek}
                                  disabled={!canEdit}
                                  onChange={(ev) =>
                                    recomputeEntry(idx, {
                                      isPartialWeek: ev.target.checked,
                                      partialWeekDays: ev.target.checked
                                        ? e.partialWeekDays ?? 3
                                        : undefined,
                                      partialWeekType: ev.target.checked
                                        ? e.partialWeekType ?? 'rehearsal'
                                        : undefined,
                                    })
                                  }
                                  className="accent-stone-700"
                                />
                                {e.isPartialWeek && (
                                  <>
                                    <input
                                      type="number"
                                      min={0}
                                      max={5}
                                      value={e.partialWeekDays ?? 0}
                                      disabled={!canEdit}
                                      onChange={(ev) =>
                                        recomputeEntry(idx, { partialWeekDays: Number(ev.target.value) })
                                      }
                                      className="w-12 rounded border border-stone-300 px-1 py-0.5 text-xs text-right tabular-nums"
                                      title="Days"
                                    />
                                    <select
                                      value={e.partialWeekType ?? 'rehearsal'}
                                      disabled={!canEdit}
                                      onChange={(ev) =>
                                        recomputeEntry(idx, {
                                          partialWeekType: ev.target.value as 'rehearsal' | 'performance',
                                        })
                                      }
                                      className="rounded border border-stone-300 px-1 py-0.5 text-xs"
                                    >
                                      <option value="rehearsal">Reh</option>
                                      <option value="performance">Perf</option>
                                    </select>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Tech week */}
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={e.isTechWeek}
                                disabled={!canEdit}
                                onChange={(ev) => recomputeEntry(idx, { isTechWeek: ev.target.checked })}
                                className="accent-stone-700"
                              />
                            </td>

                            {/* Penalties */}
                            <td className="px-3 py-2">
                              <button
                                onClick={() => canEdit && setPenaltyIdx(idx)}
                                disabled={!canEdit}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors',
                                  pCount > 0
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-stone-200 bg-white text-stone-500',
                                  canEdit && 'hover:bg-stone-50 cursor-pointer',
                                )}
                              >
                                {pCount > 0 ? `${pCount} · ${fmt(e.penaltyTotal)}` : 'None'}
                                {canEdit && <ChevronDown size={12} />}
                              </button>
                            </td>

                            {/* Sick days */}
                            <td className="px-3 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={e.sickDays}
                                  onChange={(ev) =>
                                    recomputeEntry(idx, { sickDays: Number(ev.target.value) })
                                  }
                                  className="w-14 rounded border border-stone-300 px-1.5 py-1 text-sm text-right tabular-nums"
                                />
                              ) : (
                                <span className="tabular-nums text-stone-700">{e.sickDays}</span>
                              )}
                            </td>

                            {/* Personal days */}
                            <td className="px-3 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={e.personalDays}
                                  onChange={(ev) =>
                                    recomputeEntry(idx, { personalDays: Number(ev.target.value) })
                                  }
                                  className="w-14 rounded border border-stone-300 px-1.5 py-1 text-sm text-right tabular-nums"
                                />
                              ) : (
                                <span className="tabular-nums text-stone-700">{e.personalDays}</span>
                              )}
                            </td>

                            {/* Computed (read-only) */}
                            <td className="px-3 py-2 text-right tabular-nums text-stone-600 bg-stone-50/60">
                              {e.overtimeHours}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-stone-600 bg-stone-50/60">
                              {fmt(e.overtimePay)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-stone-600 bg-stone-50/60">
                              {fmt(e.penaltyTotal)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-stone-600 bg-stone-50/60">
                              {fmt(e.vacationPay)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-stone-700 bg-stone-50/60">
                              {fmt(e.grossPay)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-stone-600 bg-stone-50/60">
                              {fmt(e.pensionContribution)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-stone-600 bg-stone-50/60">
                              {fmt(e.duesCheckoff)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold text-stone-900 bg-stone-50/60">
                              {fmt(e.netToPayroll)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {report.entries.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-stone-200 bg-stone-50 font-semibold text-stone-800 text-sm">
                          <td className="px-3 py-3 sticky left-0 bg-stone-50">Totals</td>
                          <td colSpan={11} />
                          <td className="px-3 py-3 text-right tabular-nums">{fmt(totals.vacation)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{fmt(totals.gross)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{fmt(totals.pension)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{fmt(totals.dues)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-stone-900">{fmt(totals.net)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ── Running season totals ── */}
              <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-200">
                  <h2 className="text-sm font-semibold text-stone-800">Running season totals</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Per artist across all weekly reports for {production?.name}.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider border-b border-stone-200 bg-stone-50">
                        <th className="px-4 py-2.5">Artist</th>
                        <th className="px-4 py-2.5 text-right">Season hours</th>
                        <th className="px-4 py-2.5 text-right">Total gross</th>
                        <th className="px-4 py-2.5 text-right">Total net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(seasonTotals.entries()).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-stone-400 text-sm">
                            No reports yet this season.
                          </td>
                        </tr>
                      )}
                      {Array.from(seasonTotals.entries())
                        .sort((a, b) => b[1].net - a[1].net)
                        .map(([personId, t]) => {
                          const hrs = seasonHours.get(personId) ?? 0
                          const warn = approachingMax(hrs)
                          return (
                            <tr key={personId} className="border-b border-stone-100 last:border-0">
                              <td className="px-4 py-2.5">
                                <span className="flex items-center gap-2">
                                  <Avatar id={personId} name={personName(people, personId)} size={24} />
                                  <span className="font-medium text-stone-800">
                                    {personName(people, personId)}
                                  </span>
                                </span>
                              </td>
                              <td
                                className={cn(
                                  'px-4 py-2.5 text-right tabular-nums',
                                  warn ? 'text-amber-700 font-semibold' : 'text-stone-600',
                                )}
                              >
                                {hrs} / {SEASON_MAX_HOURS}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">
                                {fmt(t.gross)}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-stone-900">
                                {fmt(t.net)}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── New week modal ── */}
      {newWeekOpen && (
        <NewWeekModal
          defaultType={report?.contractType ?? 'PACT-C'}
          onClose={() => setNewWeekOpen(false)}
          onCreate={createReport}
        />
      )}

      {/* ── Penalty editor modal ── */}
      {penaltyIdx !== null && report && report.entries[penaltyIdx] && (
        <PenaltyModal
          entry={report.entries[penaltyIdx]}
          onClose={() => setPenaltyIdx(null)}
          onSave={(penalties) => {
            recomputeEntry(penaltyIdx, { penalties })
            setPenaltyIdx(null)
          }}
        />
      )}
    </div>
  )
}

function NewWeekModal({
  defaultType,
  onClose,
  onCreate,
}: {
  defaultType: PACTContractType
  onClose: () => void
  onCreate: (weekEnding: string, type: PACTContractType) => void
}) {
  const [weekEnding, setWeekEnding] = useState(todayISO())
  const [type, setType] = useState<PACTContractType>(defaultType)

  return (
    <Modal open onClose={onClose} title="New weekly report" className="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Seeds one entry per CAEA company member on this production, ready to tabulate.
        </p>
        <Field label="Week ending">
          <input
            type="date"
            value={weekEnding}
            onChange={(e) => setWeekEnding(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="PACT contract tier">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PACTContractType)}
            className={inputCls}
          >
            {PACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PACT_TIERS[t].label} — {PACT_TIERS[t].weeklyHours} hrs/wk
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onCreate(weekEnding, type)}
            disabled={!weekEnding}
          >
            <Plus size={14} /> Create report
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function PenaltyModal({
  entry,
  onClose,
  onSave,
}: {
  entry: CAEAWeeklyEntry
  onClose: () => void
  onSave: (penalties: CAEAPenalty[]) => void
}) {
  const [counts, setCounts] = useState<Record<CAEAPenaltyType, number>>(() => {
    const base: Record<CAEAPenaltyType, number> = {
      MissedBreak: 0,
      RestInvasion: 0,
      MealPenalty: 0,
      Other: 0,
    }
    for (const p of entry.penalties) base[p.type] = p.count
    return base
  })

  const penalties = PENALTY_TYPES.filter((t) => counts[t] > 0).map((t) => makePenalty(t, counts[t]))
  const total = penalties.reduce((s, p) => s + p.total, 0)

  return (
    <Modal open onClose={onClose} title="Penalties" className="max-w-md">
      <div className="space-y-4">
        <p className="text-xs text-stone-500">
          Set the number of occurrences per penalty type. Totals are calculated from CAEA indicative rates.
        </p>
        <div className="space-y-2">
          {PENALTY_TYPES.map((t) => (
            <div
              key={t}
              className="flex items-center justify-between gap-3 rounded border border-stone-200 px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium text-stone-800">{PENALTY_LABELS[t]}</div>
                <div className="text-xs text-stone-400">{fmt(PENALTY_RATES[t])} per occurrence</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={counts[t]}
                  onChange={(e) =>
                    setCounts((c) => ({ ...c, [t]: Math.max(0, Number(e.target.value)) }))
                  }
                  className="w-16 rounded border border-stone-300 px-2 py-1 text-sm text-right tabular-nums"
                />
                <span className="w-20 text-right text-sm tabular-nums text-stone-600">
                  {fmt(counts[t] * PENALTY_RATES[t])}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Penalty total</span>
          <span className="text-base font-semibold text-stone-900 tabular-nums">{fmt(total)}</span>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSave(penalties)}>
            <CheckCircle2 size={14} /> Apply penalties
          </Button>
        </div>
      </div>
    </Modal>
  )
}
