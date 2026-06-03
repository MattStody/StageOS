'use client'
import { use, useState } from 'react'
import { useStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fmt, fmtPct, formatDate } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import {
  computeCoreForecast,
  computeWeekRiskRows,
  computeAllScenarios,
  computeChartData,
  generateInsights,
  type ScenarioConfig,
  type RiskLevel,
} from '@/lib/forecasting'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ArrowLeft, TrendingUp, AlertCircle, Info } from 'lucide-react'

// ── Risk styling ────────────────────────────────────────────────────────────
const riskColor: Record<RiskLevel, string> = {
  healthy: 'text-emerald-600',
  watch: 'text-amber-600',
  at_risk: 'text-orange-600',
  critical: 'text-red-600',
}
const riskBg: Record<RiskLevel, string> = {
  healthy: 'bg-emerald-50 border-emerald-200',
  watch: 'bg-amber-50 border-amber-200',
  at_risk: 'bg-orange-50 border-orange-200',
  critical: 'bg-red-50 border-red-200',
}
const riskLabel: Record<RiskLevel, string> = {
  healthy: 'Healthy', watch: 'Watch', at_risk: 'At Risk', critical: 'Critical',
}

// ── Small number input ───────────────────────────────────────────────────────
function NumInput({
  label, value, onChange, min = 0, max = 100, step = 1, prefix = '', suffix = '',
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; prefix?: string; suffix?: string
}) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        {prefix && <span className="text-xs text-stone-400">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="w-24 px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
        />
        {suffix && <span className="text-xs text-stone-400">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Scenario types ───────────────────────────────────────────────────────────
type ScenarioType = 'base' | 'downside' | 'upside' | 'marketing_push' | 'labour_increase' | 'early_close' | 'extension'
const SCENARIOS: { type: ScenarioType; label: string }[] = [
  { type: 'base', label: 'Base Case' },
  { type: 'downside', label: 'Downside' },
  { type: 'upside', label: 'Upside' },
  { type: 'marketing_push', label: 'Marketing Push' },
  { type: 'labour_increase', label: 'Labour Increase' },
  { type: 'early_close', label: 'Early Close' },
  { type: 'extension', label: 'Extension' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ForecastingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { productions, revenueWeeks, cashFlowRows, budgetLines } = useStore()

  const [activeScenario, setActiveScenario] = useState<ScenarioType>('base')
  const [cfg, setCfg] = useState<ScenarioConfig>({
    downsidePct: 10,
    upsidePct: 10,
    extraMarketing: 20000,
    marketingLiftPct: 8,
    labourIncreasePct: 10,
    earlyCloseWeeks: 2,
    extensionWeeks: 4,
    extensionCapacityPct: 70,
    extensionATP: 0,
    extensionExtraWeeklyCost: 0,
  })

  const weeks = revenueWeeks.filter(w => w.productionId === id)
  const cashRows = cashFlowRows.filter(r => r.productionId === id)
  const lines = budgetLines.filter(l => l.productionId === id)
  const prod = productions.find(p => p.id === id)
  if (!prod) return notFound()

  function setField<K extends keyof ScenarioConfig>(key: K, value: ScenarioConfig[K]) {
    setCfg(prev => ({ ...prev, [key]: value }))
  }

  // ── Calculations ────────────────────────────────────────────────────────
  const fc = computeCoreForecast(prod, weeks, cashRows, lines)
  const scenarios = computeAllScenarios(fc, cfg)
  const riskRows = computeWeekRiskRows(fc, weeks, cashRows)
  const insights = generateInsights(fc, scenarios)
  const activeResult = scenarios.find(s => s.type === activeScenario)
  const baseResult = scenarios.find(s => s.type === 'base')!
  const chartData = computeChartData(fc, weeks, activeResult?.projectedFinalGross)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <Link href={`/productions/${id}`} className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mb-2">
          <ArrowLeft size={12} /> {prod.name}
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-light text-stone-900">Forecasting</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${riskBg[fc.overallRisk]} ${riskColor[fc.overallRisk]}`}>
            {riskLabel[fc.overallRisk]}
          </span>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">
          {prod.venue} · {fc.weeksElapsed} of {fc.totalWeeks} weeks elapsed · {fc.weeksRemaining} remaining
        </p>
      </div>

      {/* ── Insight panel ─────────────────────────────────────────────────── */}
      <div className={`border rounded-lg p-5 mb-6 ${riskBg[fc.overallRisk]}`}>
        <div className="flex items-start gap-3">
          <Info size={16} className={`${riskColor[fc.overallRisk]} shrink-0 mt-0.5`} />
          <div className="space-y-1.5">
            {insights.map((insight, i) => (
              <p key={i} className={`text-sm ${i === 0 ? 'font-medium' : ''} ${riskColor[fc.overallRisk]}`}>
                {insight}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overview cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Projected Final Gross"
          value={fmt(fc.projectedFinalGross)}
          sub={`${fmt(fc.cumGross)} actual to date`}
          trend={fc.projectedFinalGross >= fc.breakevenGross ? 'up' : 'down'}
        />
        <StatCard
          label="Projected Final Net"
          value={fmt(fc.projectedFinalNet)}
          sub={`${(fc.netGrossRatio * 100).toFixed(0)}% net/gross ratio`}
        />
        <StatCard
          label="Breakeven Gap"
          value={fmt(Math.abs(fc.breakevenGap))}
          sub={fc.breakevenGap >= 0 ? 'above breakeven' : 'below breakeven'}
          alert={fc.breakevenGap < 0}
          trend={fc.breakevenGap >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Avg Weekly Nut"
          value={fc.avgWeeklyNut > 0 ? fmt(fc.avgWeeklyNut) : '—'}
          sub={fc.maxWeeklyNut > fc.avgWeeklyNut ? `peak ${fmt(fc.maxWeeklyNut)}` : 'weekly operating cost'}
        />
        <StatCard
          label="Required Capacity"
          value={fc.requiredRemainingCapacity > 0 ? fmtPct(fc.requiredRemainingCapacity) : '—'}
          sub={fc.avgCapacityPct > 0 ? `currently ${fmtPct(fc.avgCapacityPct)} avg` : 'to break even'}
          alert={fc.requiredRemainingCapacity > 0 && fc.requiredRemainingCapacity > fc.avgCapacityPct + 5}
        />
        <StatCard
          label="Forecast Risk"
          value={riskLabel[fc.overallRisk]}
          sub={`${fc.weeksRemaining} wk${fc.weeksRemaining !== 1 ? 's' : ''} remaining`}
          alert={fc.overallRisk === 'at_risk' || fc.overallRisk === 'critical'}
        />
      </div>

      {/* ── Chart + Scenario controls ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-stone-400" />
              <CardTitle>Gross Revenue Trajectory</CardTitle>
            </div>
            {activeScenario !== 'base' && (
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                {SCENARIOS.find(s => s.type === activeScenario)?.label}
              </span>
            )}
          </CardHeader>
          <CardBody>
            {chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-stone-400">
                No revenue data yet — projections will appear once performances begin.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ right: 60 }}>
                  <defs>
                    <linearGradient id={`fg-actual-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={prod.color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={prod.color} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`fg-proj-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={prod.color} stopOpacity={0.07} />
                      <stop offset="100%" stopColor={prod.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={46} />
                  <Tooltip
                    formatter={(v, name) => [fmt(Number(v)), name]}
                    contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }}
                  />
                  {fc.breakevenGross > 0 && (
                    <ReferenceLine y={fc.breakevenGross} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1}
                      label={{ value: 'Breakeven', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                  )}
                  {prod.projectedGross > 0 && (
                    <ReferenceLine y={prod.projectedGross} stroke="#a8a29e" strokeDasharray="4 3" strokeWidth={1}
                      label={{ value: 'Target', fill: '#a8a29e', fontSize: 10, position: 'insideTopRight' }} />
                  )}
                  <Area type="monotone" dataKey="actual" stroke={prod.color} strokeWidth={2}
                    fill={`url(#fg-actual-${id})`} name="Actual" connectNulls={false} dot={false} />
                  <Line type="monotone" dataKey="projected" stroke={prod.color} strokeWidth={1.5}
                    strokeDasharray="5 4" name="Projected" dot={false} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Scenario controls */}
        <Card>
          <CardHeader>
            <CardTitle>Scenario Engine</CardTitle>
          </CardHeader>
          <CardBody className="p-4 space-y-4">
            {/* Scenario selector buttons */}
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map(({ type, label }) => (
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

            {/* Controls for active scenario */}
            <div className="space-y-3 pt-1">
              {activeScenario === 'base' && (
                <p className="text-xs text-stone-500 leading-relaxed">
                  Base case projects current sales pace through the remainder of the run with no adjustment.
                </p>
              )}
              {activeScenario === 'downside' && (
                <NumInput label="Sales decline" value={cfg.downsidePct}
                  onChange={v => setField('downsidePct', v)} min={1} max={50} suffix="%" />
              )}
              {activeScenario === 'upside' && (
                <NumInput label="Sales improvement" value={cfg.upsidePct}
                  onChange={v => setField('upsidePct', v)} min={1} max={100} suffix="%" />
              )}
              {activeScenario === 'marketing_push' && (
                <>
                  <NumInput label="Extra marketing spend" value={cfg.extraMarketing}
                    onChange={v => setField('extraMarketing', v)} min={0} step={1000} prefix="$" />
                  <NumInput label="Expected revenue lift" value={cfg.marketingLiftPct}
                    onChange={v => setField('marketingLiftPct', v)} min={0} max={50} suffix="%" />
                </>
              )}
              {activeScenario === 'labour_increase' && (
                <NumInput label="Labour cost increase" value={cfg.labourIncreasePct}
                  onChange={v => setField('labourIncreasePct', v)} min={0} max={100} suffix="%" />
              )}
              {activeScenario === 'early_close' && (
                <NumInput label="Weeks to cut from run" value={cfg.earlyCloseWeeks}
                  onChange={v => setField('earlyCloseWeeks', v)} min={1} max={Math.max(1, fc.weeksRemaining)} />
              )}
              {activeScenario === 'extension' && (
                <>
                  <NumInput label="Extension weeks" value={cfg.extensionWeeks}
                    onChange={v => setField('extensionWeeks', v)} min={1} max={26} />
                  <NumInput label="Expected capacity" value={cfg.extensionCapacityPct}
                    onChange={v => setField('extensionCapacityPct', v)} min={10} max={100} suffix="%" />
                  <NumInput label="Expected ATP (0 = current)" value={cfg.extensionATP}
                    onChange={v => setField('extensionATP', v)} min={0} step={5} prefix="$" />
                  <NumInput label="Extra weekly cost" value={cfg.extensionExtraWeeklyCost}
                    onChange={v => setField('extensionExtraWeeklyCost', v)} min={0} step={500} prefix="$" />
                </>
              )}
            </div>

            {/* Active scenario result summary */}
            {activeResult && activeScenario !== 'base' && (
              <div className={`p-3 rounded border text-xs space-y-1 ${riskBg[activeResult.risk]}`}>
                <p className={`font-medium ${riskColor[activeResult.risk]}`}>{activeResult.label}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-stone-600 pt-0.5">
                  <span>Final gross</span>
                  <span className="font-medium text-stone-800">{fmt(activeResult.projectedFinalGross)}</span>
                  <span>vs Base</span>
                  <span className={`font-medium ${activeResult.projectedFinalGross >= baseResult.projectedFinalGross ? 'text-emerald-600' : 'text-red-600'}`}>
                    {activeResult.projectedFinalGross >= baseResult.projectedFinalGross ? '+' : ''}
                    {fmt(activeResult.projectedFinalGross - baseResult.projectedFinalGross)}
                  </span>
                  <span>Breakeven gap</span>
                  <span className={`font-medium ${activeResult.breakevenGap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {activeResult.breakevenGap >= 0 ? '+' : ''}{fmt(activeResult.breakevenGap)}
                  </span>
                  <span>Ending cash</span>
                  <span className={`font-medium ${activeResult.endingCash < 0 ? 'text-red-600' : 'text-stone-800'}`}>
                    {fmt(activeResult.endingCash)}
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Weekly risk table ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <AlertCircle size={14} className="text-stone-400" />
          <CardTitle>Weekly Risk Table</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Week Ending', 'Perfs', 'Gross', 'Weekly Nut', 'Difference', 'Capacity', 'ATP', 'Risk', 'Note'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-sm text-stone-400 text-center">
                      No performance data yet. Risk analysis will appear once revenue weeks are entered.
                    </td>
                  </tr>
                ) : riskRows.map((row, i) => (
                  <tr key={i} className={`border-b border-stone-100 ${row.isProjected ? 'bg-stone-50/40 italic' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-stone-700 whitespace-nowrap">
                      {formatDate(row.weekEnding)}
                      {row.isProjected && <span className="ml-1 text-stone-400 not-italic">(proj.)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-stone-600 not-italic">{row.performances || '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-stone-800 not-italic">{row.gross > 0 ? fmt(row.gross) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-stone-600 not-italic">{row.weeklyNut > 0 ? fmt(row.weeklyNut) : '—'}</td>
                    <td className={`px-4 py-2.5 text-xs font-medium not-italic ${row.weeklyNut > 0 ? (row.difference < 0 ? 'text-red-600' : 'text-emerald-600') : 'text-stone-400'}`}>
                      {row.weeklyNut > 0 ? (row.difference >= 0 ? '+' : '') + fmt(row.difference) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-stone-600 not-italic">{row.capacityPct > 0 ? fmtPct(row.capacityPct) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-stone-600 not-italic">{row.atp > 0 ? fmt(row.atp) : '—'}</td>
                    <td className="px-4 py-2.5 not-italic">
                      <span className={`text-xs font-medium ${riskColor[row.risk]}`}>{riskLabel[row.risk]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-stone-400 max-w-[200px] truncate not-italic">{row.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* ── Scenario comparison table ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <TrendingUp size={14} className="text-stone-400" />
          <CardTitle>Scenario Comparison</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Scenario', 'Projected Gross', 'Projected Net', 'Total Costs', 'Ending Cash', 'Breakeven Gap', 'Risk', 'Key Assumption'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scen) => (
                  <tr
                    key={scen.type}
                    onClick={() => setActiveScenario(scen.type as ScenarioType)}
                    className={`border-b border-stone-100 cursor-pointer transition-colors ${
                      activeScenario === scen.type ? 'bg-stone-50 ring-1 ring-inset ring-stone-200' : 'hover:bg-stone-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-stone-800">{scen.label}</td>
                    <td className="px-4 py-3 text-stone-700">{fmt(scen.projectedFinalGross)}</td>
                    <td className="px-4 py-3 text-stone-700">{fmt(scen.projectedFinalNet)}</td>
                    <td className="px-4 py-3 text-stone-600">{fmt(scen.totalCosts)}</td>
                    <td className={`px-4 py-3 font-medium ${scen.endingCash < 0 ? 'text-red-600' : 'text-stone-700'}`}>
                      {fmt(scen.endingCash)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${scen.breakevenGap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {scen.breakevenGap >= 0 ? '+' : ''}{fmt(scen.breakevenGap)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${riskColor[scen.risk]}`}>{riskLabel[scen.risk]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{scen.keyAssumption}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-xs text-stone-400 border-t border-stone-100">
            Click a row to update the chart and scenario controls above.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
