'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { fmt, fmtPct } from '@/lib/utils'
import {
  Plus, TrendingDown, Megaphone, Tag, Wrench,
  BookmarkPlus, Trash2, Info, FlaskConical,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ScenarioType = 'add_performances' | 'sales_drop' | 'marketing_increase' | 'ticket_price' | 'labour_overrun'
type ElasticityType = 'inelastic' | 'moderate' | 'elastic'

interface ResultLine {
  label: string
  value: number | null  // null → show `text` instead
  text?: string
}

interface ScenarioResult {
  grossImpact: number
  costImpact: number   // always positive (magnitude of cost change)
  netImpact: number
  costIsaSaving: boolean  // true when costImpact represents savings (costs went down)
  lines: ResultLine[]
  note: string
  usingEstimates: boolean
}

interface SavedScenario {
  id: string
  type: ScenarioType
  label: string
  prodName: string
  result: ScenarioResult
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCENARIO_DEFS = [
  { id: 'add_performances' as ScenarioType, icon: Plus,        label: 'Add Performances', desc: 'Extra shows or extended run' },
  { id: 'sales_drop'       as ScenarioType, icon: TrendingDown, label: 'Sales Drop',        desc: 'Grosses decline X%'         },
  { id: 'marketing_increase' as ScenarioType, icon: Megaphone, label: 'More Marketing',     desc: 'Spend more, model the uplift' },
  { id: 'ticket_price'     as ScenarioType, icon: Tag,         label: 'Price Change',       desc: 'Raise or lower ticket prices' },
  { id: 'labour_overrun'   as ScenarioType, icon: Wrench,      label: 'Labour Overrun',     desc: 'Payroll comes in over budget' },
] as const

const DAY_DEFAULTS: Record<string, number> = {
  weekday: 72, sat_matinee: 88, sat_evening: 98, sunday: 82,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSigned(n: number) {
  return (n >= 0 ? '+' : '') + fmt(n)
}

function signCls(n: number, invert = false) {
  if (n === 0) return 'text-stone-500'
  const good = invert ? n < 0 : n > 0
  return good ? 'text-emerald-600' : 'text-red-600'
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LBL = 'block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1'
const INP = 'w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500'

export default function WhatIfPage() {
  const { productions, revenueWeeks, budgetLines } = useStore()

  const [selectedProdId, setSelectedProdId] = useState(productions[0]?.id ?? '')
  const [scenario, setScenario] = useState<ScenarioType>('add_performances')

  // ── per-scenario inputs ────────────────────────────────────────────────────
  const [perfCount,        setPerfCount]        = useState(2)
  const [dayType,          setDayType]          = useState('sat_matinee')
  const [perfCapacity,     setPerfCapacity]     = useState(88)
  const [perfPriceOvr,     setPerfPriceOvr]     = useState(0)
  const [dropPct,          setDropPct]          = useState(15)
  const [mktSpend,         setMktSpend]         = useState(20000)
  const [mktMultiplier,    setMktMultiplier]    = useState(3.5)
  const [priceChangePct,   setPriceChangePct]   = useState(-10)
  const [elasticity,       setElasticity]       = useState<ElasticityType>('moderate')
  const [labourOverrunPct, setLabourOverrunPct] = useState(12)

  const [saved, setSaved] = useState<SavedScenario[]>([])

  const prod = productions.find(p => p.id === selectedProdId)
  const weeks = useMemo(
    () => revenueWeeks.filter(w => w.productionId === selectedProdId),
    [revenueWeeks, selectedProdId],
  )
  const prodBudgetLines = useMemo(
    () => budgetLines.filter(b => b.productionId === selectedProdId),
    [budgetLines, selectedProdId],
  )

  // ── derived production data ────────────────────────────────────────────────
  const derived = useMemo(() => {
    if (!prod) return null
    const has = weeks.length > 0

    const avgATP = has
      ? weeks.reduce((s, w) => s + w.avgTicketPrice, 0) / weeks.length
      : 85

    const avgCapacity = has
      ? weeks.reduce((s, w) => s + w.capacityPct, 0) / weeks.length / 100
      : 0.75

    const totalSeats = has ? Math.max(...weeks.map(w => w.totalSeats), 500) : 1000

    const avgPerfsPerWeek = has
      ? weeks.reduce((s, w) => s + w.performances, 0) / weeks.length
      : 8

    const avgWeeklyGross = has
      ? weeks.reduce((s, w) => s + w.grossRevenue, 0) / weeks.length
      : prod.projectedGross > 0
        ? prod.projectedGross / 20
        : totalSeats * avgCapacity * avgATP * 8

    const weeksRemaining = prod.closingDate
      ? Math.max(1, Math.ceil((new Date(prod.closingDate + 'T12:00:00').getTime() - Date.now()) / (7 * 86_400_000)))
      : 10

    const labourKw = ['cast', 'crew', 'labor', 'labour', 'payroll', 'stage management', 'direction', 'design']
    const labourLines = prodBudgetLines.filter(b =>
      labourKw.some(k => b.category.toLowerCase().includes(k) || b.lineItem.toLowerCase().includes(k)),
    )
    const labourBudget = labourLines.length > 0
      ? labourLines.reduce((s, b) => s + b.budgeted, 0)
      : prod.totalBudget * 0.40

    return {
      avgATP, avgCapacity, totalSeats, avgPerfsPerWeek, avgWeeklyGross,
      weeksRemaining, labourBudget,
      usingEstimates: !has,
      labourIsEstimated: labourLines.length === 0,
    }
  }, [prod, weeks, prodBudgetLines])

  // ── scenario calculation ───────────────────────────────────────────────────
  const result = useMemo((): ScenarioResult | null => {
    if (!prod || !derived) return null
    const { avgATP, avgCapacity, totalSeats, avgPerfsPerWeek, avgWeeklyGross, weeksRemaining, labourBudget, usingEstimates, labourIsEstimated } = derived

    switch (scenario) {

      case 'add_performances': {
        const cap = perfCapacity / 100
        const atp = perfPriceOvr > 0 ? perfPriceOvr : avgATP
        const gross = totalSeats * cap * atp * perfCount

        const royalties = gross * 0.12
        const castCrew  = gross * 0.08
        const venue     = gross * 0.05
        const misc      = gross * 0.02
        const cost      = royalties + castCrew + venue + misc

        return {
          grossImpact: gross,
          costImpact: cost,
          netImpact: gross - cost,
          costIsaSaving: false,
          lines: [
            { label: 'Ticket revenue',           value: gross },
            { label: 'Royalties (12%)',           value: -royalties },
            { label: 'Cast & crew (8%)',          value: -castCrew },
            { label: 'Venue incremental (5%)',    value: -venue },
            { label: 'Misc. incremental (2%)',    value: -misc },
          ],
          note: `${perfCount} perf${perfCount !== 1 ? 's' : ''} · ${perfCapacity}% capacity · ${fmt(atp)} avg ticket · ${totalSeats.toLocaleString()} seats`,
          usingEstimates,
        }
      }

      case 'sales_drop': {
        const remainingGross = avgWeeklyGross * weeksRemaining
        const grossLoss     = remainingGross * dropPct / 100
        const royaltySaving = grossLoss * 0.12
        const net           = -(grossLoss - royaltySaving)

        return {
          grossImpact: grossLoss,
          costImpact: royaltySaving,
          netImpact: net,
          costIsaSaving: true,
          lines: [
            { label: `Revenue shortfall (${dropPct}% over ${weeksRemaining} wk${weeksRemaining !== 1 ? 's' : ''})`, value: -grossLoss },
            { label: 'Royalty savings (proportional)',                                                                 value: royaltySaving },
          ],
          note: `Projected cash after shortfall: ${fmt(Math.max(0, prod.cashOnHand + net))}`,
          usingEstimates,
        }
      }

      case 'marketing_increase': {
        const uplift          = mktSpend * mktMultiplier
        const royOnUplift     = uplift * 0.12
        const cost            = mktSpend + royOnUplift

        return {
          grossImpact: uplift,
          costImpact: cost,
          netImpact: uplift - cost,
          costIsaSaving: false,
          lines: [
            { label: `Revenue uplift (${mktMultiplier}× ROAS)`,    value: uplift },
            { label: 'Additional marketing spend',                   value: -mktSpend },
            { label: 'Royalties on uplift (12%)',                    value: -royOnUplift },
          ],
          note: `${fmt(mktSpend)} spend · ${mktMultiplier}× return on ad spend assumed`,
          usingEstimates,
        }
      }

      case 'ticket_price': {
        const ELASTICITY: Record<ElasticityType, number> = { inelastic: 0.3, moderate: 0.8, elastic: 1.5 }
        const newATP        = avgATP * (1 + priceChangePct / 100)
        const demandChange  = -(priceChangePct / 100) * ELASTICITY[elasticity]
        const newCap        = Math.min(avgCapacity * (1 + demandChange), 1.0)
        const newWeeklyGross = totalSeats * newCap * newATP * avgPerfsPerWeek
        const weeklyDelta   = newWeeklyGross - avgWeeklyGross
        const totalDelta    = weeklyDelta * weeksRemaining
        const net           = totalDelta * 0.85   // ~15% variable cost tracks with revenue

        return {
          grossImpact: totalDelta,
          costImpact: Math.abs(totalDelta * 0.15),
          netImpact: net,
          costIsaSaving: totalDelta < 0,
          lines: [
            { label: 'New avg ticket price',                          value: null, text: fmt(newATP) },
            { label: 'New avg capacity',                              value: null, text: fmtPct(newCap * 100) },
            { label: 'Weekly gross change',                           value: weeklyDelta },
            { label: `× ${weeksRemaining} remaining weeks`,          value: totalDelta },
          ],
          note: `${Math.abs(priceChangePct)}% price ${priceChangePct > 0 ? 'increase' : 'reduction'} · ${elasticity} demand response · current ATP ${fmt(avgATP)}`,
          usingEstimates,
        }
      }

      case 'labour_overrun': {
        const overrunAmt    = labourBudget * labourOverrunPct / 100
        const newBudgetPct  = prod.totalBudget > 0 ? (prod.totalActual + overrunAmt) / prod.totalBudget * 100 : 0

        return {
          grossImpact: 0,
          costImpact: overrunAmt,
          netImpact: -overrunAmt,
          costIsaSaving: false,
          lines: [
            { label: 'Labour base budget',         value: null, text: fmt(labourBudget) },
            { label: `Overrun (${labourOverrunPct}%)`, value: -overrunAmt },
            { label: 'Budget utilisation after',   value: null, text: prod.totalBudget > 0 ? fmtPct(newBudgetPct) : '—' },
          ],
          note: `Cash on hand after overrun: ${fmt(Math.max(0, prod.cashOnHand - overrunAmt))}`,
          usingEstimates: labourIsEstimated,
        }
      }
    }
  }, [prod, derived, scenario, perfCount, dayType, perfCapacity, perfPriceOvr, dropPct, mktSpend, mktMultiplier, priceChangePct, elasticity, labourOverrunPct])

  function scenarioLabel() {
    if (!prod) return ''
    switch (scenario) {
      case 'add_performances':    return `Add ${perfCount} ${dayType.replace(/_/g, ' ')} perf${perfCount !== 1 ? 's' : ''}`
      case 'sales_drop':          return `Sales drop ${dropPct}%`
      case 'marketing_increase':  return `+${fmt(mktSpend)} marketing`
      case 'ticket_price':        return `Ticket price ${priceChangePct > 0 ? '+' : ''}${priceChangePct}%`
      case 'labour_overrun':      return `Labour ${labourOverrunPct}% over budget`
    }
  }

  function saveScenario() {
    if (!result || !prod) return
    setSaved(prev => [...prev.slice(-3), {
      id: `s-${Date.now()}`,
      type: scenario,
      label: scenarioLabel(),
      prodName: prod.name,
      result,
    }])
  }

  if (productions.length === 0) {
    return (
      <div>
        <PageHeader title="Scenario Planner" subtitle="Model hypothetical changes before committing to anything" />
        <p className="text-sm text-stone-500 mt-12 text-center">No productions yet — create one first.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Scenario Planner"
        subtitle="Model hypothetical changes before committing to anything"
      />

      {/* Production selector */}
      <div className="mb-6 max-w-xs">
        <label className={LBL}>Production</label>
        <select value={selectedProdId} onChange={e => setSelectedProdId(e.target.value)} className={INP}>
          {productions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Scenario type strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {SCENARIO_DEFS.map(def => {
          const Icon = def.icon
          const active = scenario === def.id
          return (
            <button
              key={def.id}
              onClick={() => setScenario(def.id)}
              className={`p-4 rounded-lg border text-left transition-all ${
                active
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-800'
              }`}
            >
              <Icon size={15} className="mb-2 opacity-75" />
              <p className="text-sm font-medium leading-tight">{def.label}</p>
              <p className={`text-[11px] mt-0.5 leading-tight ${active ? 'text-stone-300' : 'text-stone-400'}`}>{def.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Config + Results */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Config panel ── */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Configure</h3>

            {/* Add Performances */}
            {scenario === 'add_performances' && (
              <div className="space-y-5">
                <div>
                  <label className={LBL}>Number of performances: <span className="text-stone-900">{perfCount}</span></label>
                  <input type="range" min={1} max={20} value={perfCount}
                    onChange={e => setPerfCount(Number(e.target.value))}
                    className="w-full accent-stone-900" />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5"><span>1</span><span>20</span></div>
                </div>
                <div>
                  <label className={LBL}>Performance type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['weekday',     'Weekday'],
                      ['sat_matinee', 'Sat Matinee'],
                      ['sat_evening', 'Sat Evening'],
                      ['sunday',      'Sunday'],
                    ] as const).map(([dt, lbl]) => (
                      <button key={dt}
                        onClick={() => { setDayType(dt); setPerfCapacity(DAY_DEFAULTS[dt]) }}
                        className={`py-1.5 px-3 text-xs rounded border transition-colors ${
                          dayType === dt ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LBL}>Expected capacity: <span className="text-stone-900">{perfCapacity}%</span></label>
                  <input type="range" min={10} max={110} value={perfCapacity}
                    onChange={e => setPerfCapacity(Number(e.target.value))}
                    className="w-full accent-stone-900" />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5"><span>10%</span><span>110% SRO</span></div>
                </div>
                <div>
                  <label className={LBL}>Ticket price override <span className="text-stone-400 normal-case font-normal">(0 = use avg ATP{derived ? ` ${fmt(derived.avgATP)}` : ''})</span></label>
                  <input type="number" value={perfPriceOvr || ''} placeholder="0"
                    onChange={e => setPerfPriceOvr(Number(e.target.value))}
                    className={INP} />
                </div>
              </div>
            )}

            {/* Sales Drop */}
            {scenario === 'sales_drop' && (
              <div className="space-y-5">
                <div>
                  <label className={LBL}>Sales decline: <span className="text-stone-900">{dropPct}%</span></label>
                  <input type="range" min={1} max={60} value={dropPct}
                    onChange={e => setDropPct(Number(e.target.value))}
                    className="w-full accent-stone-900" />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5"><span>1%</span><span>60%</span></div>
                </div>
                {derived && (
                  <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3 space-y-1">
                    <p><span className="text-stone-400">Remaining weeks:</span> <strong>{derived.weeksRemaining}</strong></p>
                    <p><span className="text-stone-400">Avg weekly gross:</span> <strong>{fmt(derived.avgWeeklyGross)}</strong></p>
                  </div>
                )}
              </div>
            )}

            {/* Marketing Increase */}
            {scenario === 'marketing_increase' && (
              <div className="space-y-5">
                <div>
                  <label className={LBL}>Additional spend</label>
                  <input type="number" value={mktSpend} onChange={e => setMktSpend(Number(e.target.value))} className={INP} />
                </div>
                <div>
                  <label className={LBL}>Return on ad spend (ROAS)</label>
                  <div className="space-y-2">
                    {([
                      { v: 2,   label: 'Conservative', sub: '2× — limited lift expected' },
                      { v: 3.5, label: 'Moderate',     sub: '3.5× — typical theatre campaign' },
                      { v: 5,   label: 'Aggressive',   sub: '5× — strong demand, targeted spend' },
                    ]).map(opt => (
                      <button key={opt.v} onClick={() => setMktMultiplier(opt.v)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          mktMultiplier === opt.v ? 'bg-stone-900 border-stone-900' : 'border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <p className={`text-sm font-medium ${mktMultiplier === opt.v ? 'text-white' : 'text-stone-800'}`}>{opt.label}</p>
                        <p className={`text-[11px] ${mktMultiplier === opt.v ? 'text-stone-300' : 'text-stone-400'}`}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Price */}
            {scenario === 'ticket_price' && (
              <div className="space-y-5">
                <div>
                  <label className={LBL}>Price change: <span className="text-stone-900">{priceChangePct > 0 ? '+' : ''}{priceChangePct}%</span></label>
                  <input type="range" min={-30} max={30} value={priceChangePct}
                    onChange={e => setPriceChangePct(Number(e.target.value))}
                    className="w-full accent-stone-900" />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5"><span>−30%</span><span>+30%</span></div>
                </div>
                <div>
                  <label className={LBL}>Demand elasticity</label>
                  <div className="space-y-2">
                    {([
                      { v: 'inelastic' as ElasticityType, label: 'Inelastic', sub: 'Demand barely moves (premium show, sold-out run)' },
                      { v: 'moderate'  as ElasticityType, label: 'Moderate',  sub: 'Some price sensitivity — typical theatre' },
                      { v: 'elastic'   as ElasticityType, label: 'Elastic',   sub: 'Strong sensitivity (family shows, early run)' },
                    ]).map(opt => (
                      <button key={opt.v} onClick={() => setElasticity(opt.v)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          elasticity === opt.v ? 'bg-stone-900 border-stone-900' : 'border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <p className={`text-sm font-medium ${elasticity === opt.v ? 'text-white' : 'text-stone-800'}`}>{opt.label}</p>
                        <p className={`text-[11px] ${elasticity === opt.v ? 'text-stone-300' : 'text-stone-400'}`}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {derived && (
                  <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3 space-y-1">
                    <p><span className="text-stone-400">Current avg ATP:</span> <strong>{fmt(derived.avgATP)}</strong></p>
                    <p><span className="text-stone-400">Weeks remaining:</span> <strong>{derived.weeksRemaining}</strong></p>
                  </div>
                )}
              </div>
            )}

            {/* Labour Overrun */}
            {scenario === 'labour_overrun' && (
              <div className="space-y-5">
                <div>
                  <label className={LBL}>Overrun: <span className="text-stone-900">{labourOverrunPct}%</span></label>
                  <input type="range" min={1} max={50} value={labourOverrunPct}
                    onChange={e => setLabourOverrunPct(Number(e.target.value))}
                    className="w-full accent-stone-900" />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5"><span>1%</span><span>50%</span></div>
                </div>
                {derived && (
                  <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3">
                    <p><span className="text-stone-400">Labour base:</span> <strong>{fmt(derived.labourBudget)}</strong>
                      {derived.labourIsEstimated && <span className="text-amber-600 ml-1">(est. 40% of budget)</span>}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Results panel ── */}
        <div className="lg:col-span-3">
          {result ? (
            <div className="bg-white border border-stone-200 rounded-lg p-5 h-full">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">Projection</p>
                  <h3 className="text-base font-semibold text-stone-900">{scenarioLabel()}</h3>
                  <p className="text-sm text-stone-500">{prod?.name}</p>
                </div>
                <button onClick={saveScenario}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded hover:border-stone-400 text-stone-600 hover:text-stone-800 transition-colors shrink-0">
                  <BookmarkPlus size={12} /> Save to compare
                </button>
              </div>

              {/* KPI trio */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-stone-50 rounded-lg p-3.5 text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Gross Impact</p>
                  <p className={`text-base font-semibold ${signCls(result.grossImpact)}`}>{fmtSigned(result.grossImpact)}</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3.5 text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Cost Impact</p>
                  <p className={`text-base font-semibold ${result.costIsaSaving ? 'text-emerald-600' : result.costImpact > 0 ? 'text-red-600' : 'text-stone-500'}`}>
                    {result.costIsaSaving ? '−' : '+'}{fmt(result.costImpact)}
                  </p>
                </div>
                <div className="border border-stone-200 bg-stone-50 rounded-lg p-3.5 text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Net Impact</p>
                  <p className={`text-xl font-bold ${signCls(result.netImpact)}`}>{fmtSigned(result.netImpact)}</p>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="border border-stone-100 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <tbody>
                    {result.lines.map((line, i) => (
                      <tr key={i} className={i < result.lines.length - 1 ? 'border-b border-stone-100' : ''}>
                        <td className="px-4 py-2.5 text-xs text-stone-600">{line.label}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-medium">
                          {line.value !== null
                            ? <span className={signCls(line.value)}>{fmtSigned(line.value)}</span>
                            : <span className="text-stone-700">{line.text}</span>
                          }
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-stone-200 bg-stone-50">
                      <td className="px-4 py-2.5 text-sm font-semibold text-stone-800">Net impact</td>
                      <td className={`px-4 py-2.5 text-right text-sm font-bold ${signCls(result.netImpact)}`}>{fmtSigned(result.netImpact)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3">{result.note}</p>

              {result.usingEstimates && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2">
                  <Info size={11} />
                  Based on estimates — import Spektrix data for precise projections
                </p>
              )}
            </div>
          ) : (
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-lg min-h-[340px] flex items-center justify-center">
              <div className="text-center text-stone-400">
                <FlaskConical size={32} className="mx-auto mb-3 opacity-25" />
                <p className="text-sm">Adjust the inputs to see a projection</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved scenarios comparison */}
      {saved.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-800">Saved Scenarios</h3>
            <button onClick={() => setSaved([])}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-600 transition-colors">
              <Trash2 size={11} /> Clear all
            </button>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Scenario</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Production</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Gross</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Net</th>
                  <th className="w-8 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {saved.map(s => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                    <td className="px-5 py-3 font-medium text-stone-800 text-sm">{s.label}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{s.prodName}</td>
                    <td className={`px-4 py-3 text-right text-xs font-medium ${signCls(s.result.grossImpact)}`}>{fmtSigned(s.result.grossImpact)}</td>
                    <td className={`px-4 py-3 text-right text-xs font-medium ${s.result.costIsaSaving ? 'text-emerald-600' : s.result.costImpact > 0 ? 'text-red-600' : 'text-stone-500'}`}>
                      {s.result.costIsaSaving ? '−' : '+'}{fmt(s.result.costImpact)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${signCls(s.result.netImpact)}`}>{fmtSigned(s.result.netImpact)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSaved(prev => prev.filter(x => x.id !== s.id))}
                        className="text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
