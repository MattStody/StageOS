'use client'
import { useState, useRef, Suspense } from 'react'
import { useStore } from '@/lib/store'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fmt, fmtPct, formatDate, statusLabel } from '@/lib/utils'
import {
  generateBrief,
  type BriefConfig,
  type BriefReport,
  type BriefSectionKey,
  type BriefAudience,
  type BriefTone,
  type OverallRisk,
  type BriefSection,
} from '@/lib/briefEngine'
import {
  Sparkles, Loader2, ChevronLeft, Copy, Printer, CheckCircle2,
  AlertTriangle, AlertCircle, TrendingUp, DollarSign, FileText,
  CalendarDays, Megaphone, Users, List, Clock, BarChart3,
} from 'lucide-react'
import Link from 'next/link'

// ── Config constants ────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS: { value: BriefAudience; label: string; desc: string }[] = [
  { value: 'gm', label: 'Producer / GM', desc: 'Full operational and financial detail' },
  { value: 'board', label: 'Board', desc: 'Governance-level summary with key metrics' },
  { value: 'investor', label: 'Investor / Co-Producer', desc: 'Commercial health and financial trajectory' },
  { value: 'marketing', label: 'Marketing Team', desc: 'Revenue gaps, capacity, campaign status' },
  { value: 'executive_director', label: 'Executive Director', desc: 'Strategic overview with risk flags' },
]

const TONE_OPTIONS: { value: BriefTone; label: string; desc: string }[] = [
  { value: 'concise', label: 'Concise', desc: 'Short paragraphs, key points only' },
  { value: 'detailed', label: 'Detailed', desc: 'Full context and explanatory narrative' },
  { value: 'formal', label: 'Formal', desc: 'Board-ready professional language' },
  { value: 'plain_english', label: 'Plain English', desc: 'Accessible language for non-specialists' },
]

const ALL_SECTIONS: { key: BriefSectionKey; label: string; icon: React.ElementType }[] = [
  { key: 'executive_summary', label: 'Executive Summary', icon: BarChart3 },
  { key: 'financial_position', label: 'Financial Position', icon: DollarSign },
  { key: 'revenue_sales', label: 'Revenue & Sales', icon: TrendingUp },
  { key: 'forecast', label: 'Forecast & Breakeven', icon: TrendingUp },
  { key: 'cash_flow', label: 'Cash Flow', icon: DollarSign },
  { key: 'contracts', label: 'Contracts', icon: FileText },
  { key: 'deadlines', label: 'Deadlines', icon: CalendarDays },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
  { key: 'labour_risk', label: 'Labour & Cost Risk', icon: Users },
  { key: 'decisions', label: 'Decisions Needed', icon: List },
  { key: 'next_7_days', label: 'Next 7 Days', icon: Clock },
]

const DEFAULT_SECTIONS: BriefSectionKey[] = [
  'executive_summary', 'financial_position', 'revenue_sales', 'forecast',
  'cash_flow', 'contracts', 'deadlines', 'decisions', 'next_7_days',
]

const RISK_COLORS: Record<OverallRisk, string> = {
  healthy: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  watch: 'text-amber-700 bg-amber-50 border-amber-200',
  at_risk: 'text-orange-700 bg-orange-50 border-orange-200',
  critical: 'text-red-700 bg-red-50 border-red-200',
}

const RISK_DOT: Record<OverallRisk, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  at_risk: 'bg-orange-500',
  critical: 'bg-red-500',
}

const RISK_LABELS: Record<OverallRisk, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At Risk',
  critical: 'Critical',
}

const FLAG_STYLES = {
  ok: 'text-emerald-700',
  warn: 'text-amber-700',
  risk: 'text-red-700',
}

const URGENCY_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-stone-50 text-stone-600 border-stone-200',
}

// ── Quick presets for date range ────────────────────────────────────────────

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
const today = new Date('2026-06-04')
const PRESETS = [
  { label: 'Last 7 days', from: isoDate(new Date(today.getTime() - 7 * 86400000)), to: isoDate(today) },
  { label: 'Last 14 days', from: isoDate(new Date(today.getTime() - 14 * 86400000)), to: isoDate(today) },
  { label: 'Last 4 weeks', from: isoDate(new Date(today.getTime() - 28 * 86400000)), to: isoDate(today) },
  { label: 'Last 8 weeks', from: isoDate(new Date(today.getTime() - 56 * 86400000)), to: isoDate(today) },
]

// ── Section renderer ────────────────────────────────────────────────────────

function SectionView({ section }: { section: BriefSection }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-0.5 h-4 rounded-full bg-stone-300" />
        {section.title}
      </h2>

      {section.dataMissing ? (
        <div className="p-3 rounded bg-stone-50 border border-stone-200 text-xs text-stone-500 italic">
          {section.dataMissing}
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-700 leading-relaxed mb-4">{section.narrative}</p>

          {section.metrics && section.metrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {section.metrics.map((m) => (
                <div key={m.label} className="bg-stone-50 border border-stone-100 rounded p-3">
                  <p className="text-xs text-stone-400 mb-0.5">{m.label}</p>
                  <p className={`text-base font-semibold ${m.flag ? FLAG_STYLES[m.flag] : 'text-stone-800'}`}>{m.value}</p>
                  {m.sub && <p className="text-xs text-stone-400 mt-0.5">{m.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {section.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                  <span className="w-1 h-1 rounded-full bg-stone-300 mt-2 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {section.decisions && section.decisions.length > 0 && (
            <div className="space-y-3">
              {section.decisions.map((d, i) => (
                <div key={i} className="border border-stone-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-medium shrink-0">{i + 1}</span>
                      <p className="text-sm font-medium text-stone-800">{d.title}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${URGENCY_STYLES[d.urgency]}`}>
                      {d.urgency.charAt(0).toUpperCase() + d.urgency.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-1.5 ml-7"><span className="font-medium">Context:</span> {d.context}</p>
                  <p className="text-xs text-stone-600 mb-1.5 ml-7"><span className="font-medium">Recommendation:</span> {d.recommendation}</p>
                  <p className="text-xs text-stone-400 ml-7">Owner: {d.owner}</p>
                </div>
              ))}
            </div>
          )}

          {section.checklist && section.checklist.length > 0 && (
            <ul className="space-y-2">
              {section.checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <CheckCircle2 size={15} className="text-stone-300 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

function AIBriefInner() {
  const searchParams = useSearchParams()
  const { productions, budgetLines, revenueWeeks, contracts, cashFlowRows, deadlines, marketingBudgetLines, marketingCampaigns } = useStore()

  const defaultProdId = searchParams.get('prod') || productions[0]?.id || ''

  const [productionId, setProductionId] = useState(defaultProdId)
  const [periodStart, setPeriodStart] = useState(PRESETS[2].from)
  const [periodEnd, setPeriodEnd] = useState(PRESETS[2].to)
  const [audience, setAudience] = useState<BriefAudience>('gm')
  const [tone, setTone] = useState<BriefTone>('detailed')
  const [sections, setSections] = useState<BriefSectionKey[]>(DEFAULT_SECTIONS)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<BriefReport | null>(null)
  const [outputTab, setOutputTab] = useState<'report' | 'email' | 'print'>('report')
  const [copied, setCopied] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  function toggleSection(key: BriefSectionKey) {
    setSections(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleGenerate() {
    const prod = productions.find(p => p.id === productionId)
    if (!prod || sections.length === 0) return

    setGenerating(true)
    setReport(null)

    // Simulate generation time for UX
    await new Promise(r => setTimeout(r, 1800))

    const config: BriefConfig = {
      productionId,
      periodStart,
      periodEnd,
      audience,
      tone,
      sections: ALL_SECTIONS.map(s => s.key).filter(k => sections.includes(k)), // maintain order
    }

    const raw = {
      production: prod,
      budgetLines: budgetLines.filter(l => l.productionId === productionId),
      revenueWeeks: revenueWeeks.filter(w => w.productionId === productionId),
      contracts: contracts.filter(c => c.productionId === productionId),
      cashFlowRows: cashFlowRows.filter(r => r.productionId === productionId),
      deadlines: deadlines.filter(d => d.productionId === productionId),
      marketingBudgetLines: marketingBudgetLines.filter(l => l.productionId === productionId),
      marketingCampaigns: marketingCampaigns.filter(c => c.productionId === productionId),
    }

    const result = generateBrief(config, raw)
    setReport(result)
    setGenerating(false)
    setOutputTab('report')
  }

  function handleCopyEmail() {
    if (!report) return
    navigator.clipboard.writeText(`Subject: ${report.emailSubject}\n\n${report.emailBody}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    window.print()
  }

  const prod = productions.find(p => p.id === productionId)
  const generatedProd = report ? productions.find(p => p.id === report.config.productionId) : null

  // ── Config panel ──────────────────────────────────────────────────────────

  if (!report && !generating) {
    return (
      <div>
        <PageHeader
          title="AI Weekly Producer Brief"
          subtitle="Generate an executive-ready briefing from your live production data"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
          {/* Left column: production + period + audience + tone */}
          <div className="lg:col-span-2 space-y-5">

            <Card>
              <CardBody className="space-y-4">
                {/* Production */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Production</label>
                  <div className="flex flex-wrap gap-2">
                    {productions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setProductionId(p.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors border ${productionId === p.id ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reporting period */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Reporting Period</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => { setPeriodStart(preset.from); setPeriodEnd(preset.to) }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${periodStart === preset.from && periodEnd === preset.to ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">From</label>
                      <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">To</label>
                      <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                    </div>
                  </div>
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Audience</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AUDIENCE_OPTIONS.map(opt => (
                      <label key={opt.value} className={`flex items-start gap-2.5 p-3 rounded border cursor-pointer transition-colors ${audience === opt.value ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}`}>
                        <input type="radio" name="audience" value={opt.value} checked={audience === opt.value} onChange={() => setAudience(opt.value)} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                          <p className="text-xs text-stone-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Tone</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map(opt => (
                      <label key={opt.value} className={`flex items-start gap-2.5 p-3 rounded border cursor-pointer transition-colors ${tone === opt.value ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}`}>
                        <input type="radio" name="tone" value={opt.value} checked={tone === opt.value} onChange={() => setTone(opt.value)} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                          <p className="text-xs text-stone-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right column: sections + generate */}
          <div className="space-y-5">
            <Card>
              <CardBody>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Include Sections</label>
                <div className="space-y-1">
                  {ALL_SECTIONS.map(({ key, label, icon: Icon }) => (
                    <label key={key} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={sections.includes(key)}
                        onChange={() => toggleSection(key)}
                        className="rounded"
                      />
                      <Icon size={13} className="text-stone-400" />
                      <span className="text-sm text-stone-700 group-hover:text-stone-900">{label}</span>
                    </label>
                  ))}
                </div>
              </CardBody>
            </Card>

            <div className="space-y-2">
              <Button className="w-full justify-center" onClick={handleGenerate} disabled={!prod || sections.length === 0}>
                <Sparkles size={15} />
                Generate Brief
              </Button>
              {prod && (
                <p className="text-xs text-stone-400 text-center">
                  {prod.name} · {sections.length} section{sections.length !== 1 ? 's' : ''} · {formatDate(periodStart)} – {formatDate(periodEnd)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Generating state ──────────────────────────────────────────────────────

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <Loader2 size={20} className="absolute -bottom-1 -right-1 text-stone-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-light text-stone-800">Generating brief…</p>
          <p className="text-sm text-stone-400 mt-1">Analysing production data and assembling your report</p>
        </div>
        <div className="w-48 h-1 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    )
  }

  // ── Report view ───────────────────────────────────────────────────────────

  if (!report) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setReport(null)} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
            <ChevronLeft size={15} /> Configure
          </button>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-600">AI Weekly Producer Brief</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer size={13} /> Print
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOutputTab('email')}>
            <Copy size={13} /> Email Copy
          </Button>
          <Button size="sm" onClick={() => setReport(null)}>
            <Sparkles size={13} /> Regenerate
          </Button>
        </div>
      </div>

      {/* Output tabs */}
      <div className="flex gap-1 mb-5 border-b border-stone-200">
        {([['report', 'In-App Report'], ['email', 'Email Copy'], ['print', 'Print View']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setOutputTab(tab)}
            className={`px-4 py-2 text-sm transition-colors -mb-px border-b-2 ${outputTab === tab ? 'border-stone-900 text-stone-900 font-medium' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Email Copy tab */}
      {outputTab === 'email' && (
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-stone-800">Subject: {report.emailSubject}</p>
              <p className="text-xs text-stone-400 mt-0.5">Copy and paste into Gmail or Outlook — edit as needed before sending.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyEmail}>
              {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy Email'}
            </Button>
          </div>
          <pre className="bg-stone-50 border border-stone-200 rounded-lg p-5 text-xs text-stone-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {report.emailBody}
          </pre>
        </div>
      )}

      {/* Report and Print tabs */}
      {(outputTab === 'report' || outputTab === 'print') && (
        <div className={`max-w-3xl ${outputTab === 'print' ? 'print:block' : ''}`} ref={printRef}>
          {/* Report header */}
          <div className="bg-stone-900 text-white rounded-t-lg px-8 py-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">AI Weekly Producer Brief</p>
                <h1 className="text-2xl font-light mb-1">{report.productionName}</h1>
                <p className="text-stone-400 text-sm">{report.venue}</p>
                <p className="text-stone-400 text-xs mt-2">{formatDate(report.config.periodStart)} – {formatDate(report.config.periodEnd)}</p>
              </div>
              <div className="text-right space-y-2 shrink-0 ml-6">
                <div>
                  <p className="text-stone-400 text-xs">Status</p>
                  <Badge variant={report.status as any} className="mt-1">{statusLabel(report.status)}</Badge>
                </div>
                <div>
                  <p className="text-stone-400 text-xs">Risk Level</p>
                  <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded text-xs font-medium border ${RISK_COLORS[report.overallRisk]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[report.overallRisk]}`} />
                    {RISK_LABELS[report.overallRisk]}
                  </span>
                </div>
                <div>
                  <p className="text-stone-400 text-xs">Audience</p>
                  <p className="text-stone-300 text-xs mt-0.5">{AUDIENCE_OPTIONS.find(a => a.value === report.audience)?.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Report body */}
          <div className="bg-white border border-stone-200 border-t-0 rounded-b-lg px-8 py-7">
            <div className="text-xs text-stone-400 mb-8 flex items-center gap-3">
              <span>Generated {new Date(report.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              <span>·</span>
              <span>{report.tone.replace('_', ' ')} tone</span>
              <span>·</span>
              <span>{report.sections.length} sections</span>
            </div>

            {report.sections.map(section => (
              <SectionView key={section.key} section={section} />
            ))}

            <div className="mt-8 pt-6 border-t border-stone-100 text-xs text-stone-400">
              <p>This brief was generated by StageOS from live production data as of {formatDate(report.generatedAt.slice(0, 10))}. All figures should be verified before external distribution. Generated for: {AUDIENCE_OPTIONS.find(a => a.value === report.audience)?.label}.</p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="secondary" onClick={() => setReport(null)}>
              <ChevronLeft size={14} /> Reconfigure
            </Button>
            {generatedProd && (
              <Link
                href={`/productions/${generatedProd.id}`}
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                View {generatedProd.name} →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AIBriefPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-sm text-stone-400">Loading…</div>}>
      <AIBriefInner />
    </Suspense>
  )
}
