'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fmt, fmtPct, formatDate, daysUntil, statusLabel, budgetUsedPct, variancePct } from '@/lib/utils'
import { FileBarChart, Download, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
  const { productions, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines } = useStore()
  const [selectedProd, setSelectedProd] = useState(productions[0]?.id || '')
  const [generated, setGenerated] = useState(false)
  const [reportType, setReportType] = useState<'weekly' | 'monthly_pl' | 'contracts' | 'cashflow' | 'marketing'>('weekly')

  const prod = productions.find((p) => p.id === selectedProd)
  if (!prod) return null

  const lines = budgetLines.filter((l) => l.productionId === selectedProd)
  const weeks = revenueWeeks.filter((w) => w.productionId === selectedProd).sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())
  const prodContracts = contracts.filter((c) => c.productionId === selectedProd)
  const cashRows = cashFlowRows.filter((r) => r.productionId === selectedProd).sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())
  const prodDeadlines = deadlines.filter((d) => d.productionId === selectedProd)

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)
  const totalGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
  const totalNet = weeks.reduce((s, w) => s + w.netRevenue, 0)
  const lastCashRow = cashRows[cashRows.length - 1]
  const cashBalance = lastCashRow?.closingCash || prod.cashOnHand

  const unsigned = prodContracts.filter((c) => c.status !== 'signed' && c.status !== 'expired')
  const overdueContracts = unsigned.filter((c) => daysUntil(c.dueDate) < 0)
  const overdueDeadlines = prodDeadlines.filter((d) => d.status === 'overdue')
  const upcomingDeadlines = prodDeadlines.filter((d) => d.status !== 'completed' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14)

  const highVariance = lines.filter((l) => l.budgeted > 0 && Math.abs(variancePct(l.actual, l.budgeted)) > 10 && l.actual > 0)
  const budgetPct = budgetUsedPct(totalActual, totalBudgeted)

  const lastWeek = weeks[weeks.length - 1]
  const prevWeek = weeks[weeks.length - 2]
  const salesTrend = lastWeek && prevWeek ? lastWeek.grossRevenue - prevWeek.grossRevenue : 0

  const risks: string[] = []
  if (overdueContracts.length) risks.push(`${overdueContracts.length} contract${overdueContracts.length > 1 ? 's' : ''} past due and unsigned`)
  if (overdueDeadlines.length) risks.push(`${overdueDeadlines.length} overdue deadline${overdueDeadlines.length > 1 ? 's' : ''}`)
  if (highVariance.length) risks.push(`${highVariance.length} budget line${highVariance.length > 1 ? 's' : ''} exceed 10% variance`)
  if (cashBalance < 0) risks.push('Cash balance projected negative')
  if (lastWeek && lastWeek.capacityPct < 70) risks.push(`Last week capacity at ${fmtPct(lastWeek.capacityPct)} — below 70% threshold`)

  const recommendations: string[] = []
  if (overdueContracts.length) recommendations.push(`Immediately follow up on ${overdueContracts.map((c) => c.partyName).join(', ')} for signature`)
  if (highVariance.length) recommendations.push(`Review overruns in: ${highVariance.slice(0, 3).map((l) => l.lineItem).join(', ')}`)
  if (salesTrend < 0) recommendations.push('Sales declining week-over-week — review pricing and discount strategy')
  if (upcomingDeadlines.length) recommendations.push(`${upcomingDeadlines.length} deadline${upcomingDeadlines.length > 1 ? 's' : ''} within 14 days — assign owners and confirm status`)
  if (recommendations.length === 0) recommendations.push('Production tracking on target — maintain current oversight cadence')

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <PageHeader
        title="Weekly Producer Report"
        subtitle="Auto-generated from production data"
      />

      {/* Production selector */}
      <div className="flex gap-2 mb-6">
        {productions.map((p) => (
          <button key={p.id} onClick={() => { setSelectedProd(p.id); setGenerated(false) }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>
            {p.name}
          </button>
        ))}
      </div>

      {!generated ? (
        <div className="max-w-2xl">
          <Card>
            <CardBody className="p-8 text-center">
              <FileBarChart size={32} className="text-stone-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-stone-800 mb-2">Generate Weekly Report</h2>
              <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
                Select a report type and generate a producer-ready summary from your live production data.
              </p>
              {/* AI Brief highlight */}
              <Link href={`/reports/ai-brief?prod=${selectedProd}`} className="block mb-4 max-w-xs mx-auto">
                <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-stone-900 bg-stone-900 text-white cursor-pointer hover:bg-stone-800 transition-colors">
                  <Sparkles size={18} className="text-stone-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">AI Weekly Producer Brief</p>
                    <p className="text-xs text-stone-400 mt-0.5">Executive-ready briefing generated from your live production data — with decisions, narrative, and email copy</p>
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-1 gap-2 mb-6 text-left max-w-xs mx-auto">
                {([
                  ['weekly', 'Weekly Producer Report', 'Full operational overview with risks and actions'],
                  ['monthly_pl', 'Monthly P&L Summary', 'Revenue, costs, and variance by category'],
                  ['contracts', 'Contract Status Overview', 'Signed, pending, and overdue by party'],
                  ['cashflow', 'Cash Flow Analysis', 'Weekly inflows, outflows, and closing balance'],
                  ['marketing', 'Marketing Performance Report', 'Channel spend and campaign status'],
                ] as const).map(([val, label, desc]) => (
                  <label key={val} className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${reportType === val ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <input type="radio" name="reportType" value={val} checked={reportType === val} onChange={() => setReportType(val)} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-stone-800">{label}</p>
                      <p className="text-xs text-stone-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button onClick={() => setGenerated(true)}>
                <FileBarChart size={14} /> Generate Report
              </Button>
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="max-w-3xl">
          {/* Report header */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden mb-0">
            <div className="bg-stone-900 px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">
                    {reportType === 'weekly' ? 'Weekly Producer Report' : reportType === 'monthly_pl' ? 'Monthly P&L Summary' : reportType === 'contracts' ? 'Contract Status Overview' : reportType === 'cashflow' ? 'Cash Flow Analysis' : 'Marketing Performance Report'}
                  </p>
                  <h1 className="text-xl font-light">{prod.name}</h1>
                  <p className="text-stone-400 text-sm mt-0.5">{prod.venue}</p>
                </div>
                <div className="text-right">
                  <p className="text-stone-400 text-xs">Report Date</p>
                  <p className="text-sm">{today}</p>
                  <Badge variant={prod.status} className="mt-1">{statusLabel(prod.status)}</Badge>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Executive Summary</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-stone-500 mb-1">Cumulative Gross</p>
                  <p className="text-2xl font-light text-stone-900">{fmt(totalGross)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">of {fmt(prod.projectedGross)} projected</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">Budget Used</p>
                  <p className={`text-2xl font-light ${budgetPct > 95 ? 'text-red-700' : 'text-stone-900'}`}>{fmtPct(budgetPct)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{fmt(totalActual)} of {fmt(totalBudgeted)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">Cash on Hand</p>
                  <p className={`text-2xl font-light ${cashBalance < 0 ? 'text-red-700' : 'text-stone-900'}`}>{fmt(cashBalance)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">current balance</p>
                </div>
              </div>
            </div>

            {/* Sales Performance */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Sales Performance</h2>
              {lastWeek ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Last week gross ({formatDate(lastWeek.weekEnding)})</span>
                    <span className="font-medium text-stone-800">{fmt(lastWeek.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Capacity</span>
                    <span className={`font-medium ${lastWeek.capacityPct >= 85 ? 'text-emerald-700' : lastWeek.capacityPct >= 70 ? 'text-stone-800' : 'text-amber-700'}`}>{fmtPct(lastWeek.capacityPct)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Average ticket price</span>
                    <span className="font-medium text-stone-800">{fmt(lastWeek.avgTicketPrice, 2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Week-over-week change</span>
                    <span className={`font-medium ${salesTrend >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{salesTrend >= 0 ? '+' : ''}{fmt(salesTrend)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Cumulative gross ({weeks.length} weeks)</span>
                    <span className="font-medium text-stone-800">{fmt(totalGross)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-400">No revenue data recorded yet.</p>
              )}
            </div>

            {/* Budget Status */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Budget Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Total budgeted</span>
                  <span className="font-medium text-stone-800">{fmt(totalBudgeted)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Total actual spend</span>
                  <span className="font-medium text-stone-800">{fmt(totalActual)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Budget used</span>
                  <span className={`font-medium ${budgetPct > 95 ? 'text-red-700' : 'text-stone-800'}`}>{fmtPct(budgetPct)}</span>
                </div>
                {highVariance.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs font-medium text-amber-800 mb-1">Lines with &gt;10% variance:</p>
                    {highVariance.map((l) => (
                      <p key={l.id} className="text-xs text-amber-700">{l.lineItem}: {fmt(l.actual)} vs {fmt(l.budgeted)} budgeted ({variancePct(l.actual, l.budgeted) > 0 ? '+' : ''}{fmtPct(variancePct(l.actual, l.budgeted))})</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cash Flow Status */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Cash Flow Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Current cash balance</span>
                  <span className={`font-medium ${cashBalance < 0 ? 'text-red-700' : 'text-stone-800'}`}>{fmt(cashBalance)}</span>
                </div>
                {lastCashRow && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Last week inflows</span>
                      <span className="font-medium text-emerald-700">+{fmt(lastCashRow.ticketRevenue + lastCashRow.otherInflows)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Last week outflows</span>
                      <span className="font-medium text-red-700">-{fmt(lastCashRow.payroll + lastCashRow.venueCosts + lastCashRow.marketing + lastCashRow.royalties + lastCashRow.vendorPayments + lastCashRow.otherOutflows)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contract Status */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Contract Status</h2>
              <div className="flex gap-6 mb-3">
                <div><p className="text-xs text-stone-500">Signed</p><p className="text-lg font-light text-stone-900">{prodContracts.filter(c => c.status === 'signed').length}</p></div>
                <div><p className="text-xs text-stone-500">Pending</p><p className="text-lg font-light text-stone-900">{unsigned.length}</p></div>
                <div><p className="text-xs text-stone-500">Overdue</p><p className={`text-lg font-light ${overdueContracts.length > 0 ? 'text-red-700' : 'text-stone-900'}`}>{overdueContracts.length}</p></div>
              </div>
              {overdueContracts.length > 0 && overdueContracts.map((c) => (
                <p key={c.id} className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle size={10} /> {c.partyName} — {statusLabel(c.status)} (due {formatDate(c.dueDate)})</p>
              ))}
            </div>

            {/* Key Risks */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Key Risks</h2>
              {risks.length === 0 ? (
                <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle size={14} /> No material risks identified this week.</p>
              ) : (
                <ul className="space-y-2">
                  {risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                      <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recommended Actions */}
            <div className="px-8 py-6 border-b border-stone-100">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Recommended Actions</h2>
              <ul className="space-y-2">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-600 text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Upcoming Deadlines */}
            <div className="px-8 py-6">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Upcoming Deadlines (14 days)</h2>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-stone-500">No deadlines in the next 14 days.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="text-stone-700">{d.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">{formatDate(d.date)}</span>
                        <Badge variant={d.status}>{statusLabel(d.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="secondary" onClick={() => setGenerated(false)}>← Back to Reports</Button>
            <Button variant="ghost" size="sm" className="text-stone-500">
              <Download size={13} /> Export PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
