'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fmt, fmtPct, formatDate } from '@/lib/utils'
import {
  CheckCircle2, AlertCircle, Loader2, ChevronRight, ArrowLeft,
  Plug2, RefreshCw, Database, CalendarDays, Eye, Download, Plus, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  SPEKTRIX_MOCK,
  fetchSpektrixEvents,
  fetchInstancesWithSales,
  testSpektrixConnection,
  aggregateByWeek,
  buildRevenueWeeksFromSpektrix,
} from '@/lib/spektrix'
import type { SpektrixEvent, SpektrixWeekSummary, SpektrixCredentials } from '@/lib/spektrix'
import type { ProductionStatus } from '@/lib/types'

type WizardStep = 'idle' | 'pick_event' | 'pick_production' | 'create_production' | 'date_range' | 'fetching' | 'preview' | 'importing' | 'complete'

interface SyncRecord {
  id: string
  timestamp: string
  eventName: string
  productionName: string
  weeksImported: number
  rowsCreated: number
  rowsUpdated: number
}

const STEP_LABELS: Record<Exclude<WizardStep, 'idle' | 'fetching' | 'importing' | 'complete' | 'create_production'>, string> = {
  pick_event: 'Select Event',
  pick_production: 'Map Production',
  date_range: 'Date Range',
  preview: 'Preview & Import',
}

const WIZARD_STEPS: Exclude<WizardStep, 'idle' | 'fetching' | 'importing' | 'complete' | 'create_production'>[] = [
  'pick_event', 'pick_production', 'date_range', 'preview',
]

const PROD_COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea', '#0f172a', '#be185d']

function StepIndicator({ current }: { current: WizardStep }) {
  const displayStep = current === 'create_production' ? 'pick_production' : current
  const activeIndex = WIZARD_STEPS.indexOf(displayStep as typeof WIZARD_STEPS[number])
  return (
    <div className="flex items-center gap-0 mb-6">
      {WIZARD_STEPS.map((step, i) => {
        const done = activeIndex > i
        const active = activeIndex === i
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${done ? 'bg-emerald-600 text-white' : active ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'}`}>
                {done ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span className={`text-xs ${active ? 'text-stone-800 font-medium' : done ? 'text-stone-500' : 'text-stone-400'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`w-8 h-px mx-2 ${done ? 'bg-emerald-300' : 'bg-stone-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function IntegrationsPage() {
  const { productions, addRevenueWeek, updateRevenueWeek, addProduction, spektrixBaseUrl, setSpektrixBaseUrl } = useStore()

  // Connection fields
  const [clientName, setClientName] = useState('')
  const [apiUser, setApiUser] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrlDraft, setBaseUrlDraft] = useState(spektrixBaseUrl)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Wizard
  const [step, setStep] = useState<WizardStep>('idle')
  const [events, setEvents] = useState<SpektrixEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedProductionId, setSelectedProductionId] = useState('')
  const [fromDate, setFromDate] = useState('2026-01-07')
  const [toDate, setToDate] = useState('2026-06-04')
  const [weekSummaries, setWeekSummaries] = useState<SpektrixWeekSummary[]>([])

  // New production form
  const [newProdName, setNewProdName] = useState('')
  const [newProdSubtitle, setNewProdSubtitle] = useState('')
  const [newProdVenue, setNewProdVenue] = useState('')
  const [newProdStatus, setNewProdStatus] = useState<ProductionStatus>('in_performance')
  const [newProdOpen, setNewProdOpen] = useState('')
  const [newProdClose, setNewProdClose] = useState('')
  const [newProdColor, setNewProdColor] = useState(PROD_COLORS[0])

  // Import results
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null)

  // History
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([])

  const creds: SpektrixCredentials = { clientName, apiUser, apiKey }

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const selectedProduction = useStore.getState().productions.find((p) => p.id === selectedProductionId)

  const totalGross = weekSummaries.reduce((s, w) => s + w.grossRevenue, 0)
  const totalTickets = weekSummaries.reduce((s, w) => s + w.ticketsSold, 0)
  const totalPerfs = weekSummaries.reduce((s, w) => s + w.performances, 0)
  const avgCapacity = weekSummaries.length > 0
    ? weekSummaries.reduce((s, w) => s + w.capacityPct, 0) / weekSummaries.length
    : 0

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    const result = await testSpektrixConnection(creds)
    setTestResult(result)
    setTesting(false)
  }

  async function startSync() {
    setStep('pick_event')
    setLoadingEvents(true)
    setEvents([])
    setSelectedEventId('')
    setSelectedProductionId('')
    setWeekSummaries([])
    setImportResult(null)
    const evts = await fetchSpektrixEvents(creds)
    setEvents(evts)
    setLoadingEvents(false)
  }

  function handlePickEvent(eventId: string) {
    setSelectedEventId(eventId)
    setStep('pick_production')
  }

  function handlePickProduction(productionId: string) {
    setSelectedProductionId(productionId)
    setStep('date_range')
  }

  function handleCreateProduction() {
    const id = `prod-spx-${Date.now()}`
    addProduction({
      id,
      name: newProdName.trim(),
      subtitle: newProdSubtitle.trim(),
      status: newProdStatus,
      venue: newProdVenue.trim(),
      openingDate: newProdOpen,
      closingDate: newProdClose,
      totalBudget: 0,
      totalActual: 0,
      cashOnHand: 0,
      projectedGross: 0,
      currentGross: 0,
      color: newProdColor,
    })
    setSelectedProductionId(id)
    setStep('date_range')
  }

  async function handleFetchPreview() {
    setStep('fetching')
    const instances = await fetchInstancesWithSales(creds, selectedEventId, fromDate, toDate)
    const weeks = aggregateByWeek(instances)
    setWeekSummaries(weeks)
    setStep('preview')
  }

  async function handleImport() {
    if (!selectedProductionId || weekSummaries.length === 0) return
    setStep('importing')
    await new Promise<void>((r) => setTimeout(r, 600))

    const newRows = buildRevenueWeeksFromSpektrix(selectedProductionId, weekSummaries)
    let created = 0
    let updated = 0

    for (const row of newRows) {
      // Read fresh state each iteration to avoid stale closure
      const freshWeeks = useStore.getState().revenueWeeks
      const exists = freshWeeks.find((w) => w.id === row.id)
      if (exists) {
        updateRevenueWeek(row)
        updated++
      } else {
        addRevenueWeek(row)
        created++
      }
    }

    const prod = useStore.getState().productions.find((p) => p.id === selectedProductionId)
    setImportResult({ created, updated })

    setSyncHistory((prev) => [
      {
        id: `sync-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventName: selectedEvent?.name ?? selectedEventId,
        productionName: prod?.name ?? selectedProductionId,
        weeksImported: weekSummaries.length,
        rowsCreated: created,
        rowsUpdated: updated,
      },
      ...prev,
    ])

    setStep('complete')
  }

  function resetWizard() {
    setStep('idle')
    setSelectedEventId('')
    setSelectedProductionId('')
    setWeekSummaries([])
    setImportResult(null)
    setNewProdName('')
    setNewProdSubtitle('')
    setNewProdVenue('')
    setNewProdStatus('in_performance')
    setNewProdOpen('')
    setNewProdClose('')
    setNewProdColor(PROD_COLORS[0])
  }

  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect external ticketing and accounting systems" />

      {/* Connection Panel */}
      <Card className="mb-6 max-w-3xl">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-stone-900 flex items-center justify-center">
              <Plug2 size={15} className="text-white" />
            </div>
            <div>
              <CardTitle>Spektrix</CardTitle>
              <p className="text-xs text-stone-400 mt-0.5">Ticketing &amp; box office data</p>
            </div>
          </div>
          {SPEKTRIX_MOCK ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Mock Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          )}
        </CardHeader>
        <CardBody className="space-y-4">
          {SPEKTRIX_MOCK && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Running with mock Spektrix data. To connect a real account, set{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">SPEKTRIX_MOCK = false</code> in{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">lib/spektrix.ts</code> and provide credentials below.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Client Name</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={SPEKTRIX_MOCK ? 'demo-client' : 'your-client'}
                disabled={SPEKTRIX_MOCK}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 disabled:bg-stone-50 disabled:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">API User</label>
              <input
                value={apiUser}
                onChange={(e) => setApiUser(e.target.value)}
                placeholder={SPEKTRIX_MOCK ? 'api-user' : ''}
                disabled={SPEKTRIX_MOCK}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 disabled:bg-stone-50 disabled:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={SPEKTRIX_MOCK ? '••••••••' : ''}
                disabled={SPEKTRIX_MOCK}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 disabled:bg-stone-50 disabled:text-stone-400"
              />
            </div>
          </div>

          {/* Purchasing base URL */}
          <div className="pt-1 border-t border-stone-100">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Purchasing Base URL
            </label>
            <p className="text-xs text-stone-400 mb-2">
              Your Spektrix purchasing site (e.g. <code className="font-mono bg-stone-100 px-1 rounded">https://purchasing.yourtheatre.org</code>).
              Used to embed live seat maps per performance.
            </p>
            <div className="flex gap-2">
              <input
                value={baseUrlDraft}
                onChange={(e) => setBaseUrlDraft(e.target.value)}
                placeholder="https://purchasing.yourtheatre.org"
                className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
              <Button variant="secondary" size="sm" onClick={() => setSpektrixBaseUrl(baseUrlDraft.trim().replace(/\/$/, ''))}>
                Save
              </Button>
            </div>
            {spektrixBaseUrl && (
              <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={11} /> Saved — live seat maps enabled for linked performances
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Plug2 size={13} />}
              {testing ? 'Testing…' : 'Test Connection'}
            </Button>
            {testResult && (
              <div className={`flex items-center gap-1.5 text-xs ${testResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {testResult.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {testResult.message}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Sync Wizard */}
      {step === 'idle' ? (
        <div className="mb-6">
          <Button onClick={startSync}>
            <RefreshCw size={14} />
            Start Spektrix Sync
          </Button>
        </div>
      ) : (
        <Card className="mb-6 max-w-3xl">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>
              {step === 'complete' ? 'Sync Complete' : step === 'importing' ? 'Importing…' : step === 'fetching' ? 'Fetching data…' : step === 'create_production' ? 'New Production' : 'Sync Wizard'}
            </CardTitle>
            {step !== 'importing' && step !== 'fetching' && (
              <button onClick={resetWizard} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
            )}
          </CardHeader>
          <CardBody>
            {!['fetching', 'importing', 'complete'].includes(step) && (
              <StepIndicator current={step} />
            )}

            {/* Step: pick_event */}
            {step === 'pick_event' && (
              <div>
                <p className="text-sm text-stone-600 mb-4">Select the Spektrix event to import ticket data from.</p>
                {loadingEvents ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-stone-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Fetching events from Spektrix…</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => handlePickEvent(ev.id)}
                        className="w-full flex items-center justify-between p-3 rounded border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-800">{ev.name}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{ev.description}</p>
                        </div>
                        <ChevronRight size={15} className="text-stone-400 shrink-0 ml-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: pick_production */}
            {step === 'pick_production' && (
              <div>
                <button onClick={() => setStep('pick_event')} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-4">
                  <ArrowLeft size={12} /> Back
                </button>
                <div className="mb-4 p-3 bg-stone-50 rounded border border-stone-200">
                  <p className="text-xs text-stone-500">Spektrix event</p>
                  <p className="text-sm font-medium text-stone-800 mt-0.5">{selectedEvent?.name}</p>
                </div>
                <p className="text-sm text-stone-600 mb-3">Map this event to a StageOS production, or create a new one.</p>
                <div className="space-y-2 mb-3">
                  {productions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePickProduction(p.id)}
                      className="w-full flex items-center justify-between p-3 rounded border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <div>
                          <p className="text-sm font-medium text-stone-800">{p.name}</p>
                          <p className="text-xs text-stone-500">{p.venue}</p>
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-stone-400 shrink-0" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    // Pre-fill name from Spektrix event
                    setNewProdName(selectedEvent?.name ?? '')
                    setStep('create_production')
                  }}
                  className="w-full flex items-center justify-between p-3 rounded border border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-stone-300 flex items-center justify-center">
                      <Plus size={11} className="text-stone-400" />
                    </div>
                    <p className="text-sm font-medium text-stone-600">Create a new production</p>
                  </div>
                  <ChevronRight size={15} className="text-stone-400 shrink-0" />
                </button>
              </div>
            )}

            {/* Step: create_production */}
            {step === 'create_production' && (
              <div>
                <button onClick={() => setStep('pick_production')} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-4">
                  <ArrowLeft size={12} /> Back
                </button>
                <p className="text-sm text-stone-600 mb-4">Create a new StageOS production to receive this Spektrix data.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Production Name *</label>
                    <input
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="e.g. Hamilton — National Tour"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Subtitle</label>
                    <input
                      value={newProdSubtitle}
                      onChange={(e) => setNewProdSubtitle(e.target.value)}
                      placeholder="e.g. Broadway musical"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Venue</label>
                    <input
                      value={newProdVenue}
                      onChange={(e) => setNewProdVenue(e.target.value)}
                      placeholder="e.g. Richard Rodgers Theatre"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Status</label>
                      <select
                        value={newProdStatus}
                        onChange={(e) => setNewProdStatus(e.target.value as ProductionStatus)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                      >
                        <option value="pre_production">Pre-Production</option>
                        <option value="in_rehearsal">In Rehearsal</option>
                        <option value="in_performance">In Performance</option>
                        <option value="closing">Closing</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Opening Date</label>
                      <input
                        type="date"
                        value={newProdOpen}
                        onChange={(e) => setNewProdOpen(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Closing Date</label>
                      <input
                        type="date"
                        value={newProdClose}
                        onChange={(e) => setNewProdClose(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Colour</label>
                    <div className="flex gap-2">
                      {PROD_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewProdColor(c)}
                          className={`w-7 h-7 rounded-full transition-all ${newProdColor === c ? 'ring-2 ring-offset-2 ring-stone-700 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" onClick={() => setStep('pick_production')}>Cancel</Button>
                    <Button onClick={handleCreateProduction} disabled={!newProdName.trim()}>
                      Create &amp; Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: date_range */}
            {step === 'date_range' && (() => {
              const prod = useStore.getState().productions.find((p) => p.id === selectedProductionId)
              return (
                <div>
                  <button onClick={() => setStep('pick_production')} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-4">
                    <ArrowLeft size={12} /> Back
                  </button>
                  <div className="mb-4 p-3 bg-stone-50 rounded border border-stone-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500">Importing</p>
                      <p className="text-sm font-medium text-stone-800 mt-0.5">{selectedEvent?.name}</p>
                    </div>
                    <ChevronRight size={13} className="text-stone-300" />
                    <div>
                      <p className="text-xs text-stone-500">Into production</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prod?.color }} />
                        <p className="text-sm font-medium text-stone-800">{prod?.name}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-4">Select the date range of performances to import.</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">From</label>
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">To</label>
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-6">
                    {[{ label: 'Last 4 wks', days: 28 }, { label: 'Last 8 wks', days: 56 }, { label: 'Last 12 wks', days: 84 }, { label: 'All available', days: 0 }].map(({ label, days }) => (
                      <button
                        key={label}
                        onClick={() => {
                          const to = new Date('2026-06-04')
                          const from = days > 0 ? new Date(to.getTime() - days * 86400000) : new Date('2026-01-07')
                          setFromDate(from.toISOString().slice(0, 10))
                          setToDate(to.toISOString().slice(0, 10))
                        }}
                        className="px-3 py-1.5 text-xs rounded border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleFetchPreview}><Eye size={14} /> Fetch Preview</Button>
                </div>
              )
            })()}

            {/* Step: fetching */}
            {step === 'fetching' && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={24} className="animate-spin text-stone-400" />
                <p className="text-sm text-stone-500">Fetching performance data from Spektrix…</p>
                <p className="text-xs text-stone-400">Aggregating {selectedEvent?.name} instances</p>
              </div>
            )}

            {/* Step: preview */}
            {step === 'preview' && (
              <div>
                <button onClick={() => setStep('date_range')} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-4">
                  <ArrowLeft size={12} /> Back
                </button>
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Weeks', value: String(weekSummaries.length) },
                    { label: 'Performances', value: String(totalPerfs) },
                    { label: 'Tickets Sold', value: totalTickets.toLocaleString() },
                    { label: 'Gross Revenue', value: fmt(totalGross) },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-stone-50 rounded border border-stone-100">
                      <p className="text-xs text-stone-500">{label}</p>
                      <p className="text-base font-semibold text-stone-800 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {weekSummaries.length === 0 ? (
                  <p className="text-sm text-stone-500 py-4">No performances found in this date range.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-stone-200 mb-5">
                    <table className="w-full text-xs">
                      <thead className="bg-stone-50">
                        <tr>
                          {['Week Ending', 'Perfs', 'Tickets', 'Capacity', 'Gross', 'Avg ATP', 'Net'].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-stone-500 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {weekSummaries.map((w) => (
                          <tr key={w.weekEnding} className="hover:bg-stone-50">
                            <td className="px-3 py-2 text-stone-700 font-medium">{formatDate(w.weekEnding)}</td>
                            <td className="px-3 py-2 text-stone-600">{w.performances}</td>
                            <td className="px-3 py-2 text-stone-600">{w.ticketsSold.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={`font-medium ${w.capacityPct >= 85 ? 'text-emerald-700' : w.capacityPct >= 70 ? 'text-amber-700' : 'text-red-600'}`}>
                                {fmtPct(w.capacityPct)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-stone-700 font-medium">{fmt(w.grossRevenue)}</td>
                            <td className="px-3 py-2 text-stone-600">{fmt(w.avgTicketPrice)}</td>
                            <td className="px-3 py-2 text-stone-600">{fmt(w.netRevenue)}</td>
                          </tr>
                        ))}
                        <tr className="bg-stone-50 border-t-2 border-stone-200 font-medium">
                          <td className="px-3 py-2 text-stone-700">Total</td>
                          <td className="px-3 py-2 text-stone-700">{totalPerfs}</td>
                          <td className="px-3 py-2 text-stone-700">{totalTickets.toLocaleString()}</td>
                          <td className="px-3 py-2 text-stone-700">{fmtPct(avgCapacity)}</td>
                          <td className="px-3 py-2 text-stone-800">{fmt(totalGross)}</td>
                          <td className="px-3 py-2 text-stone-700">{totalTickets > 0 ? fmt(totalGross / totalTickets) : '—'}</td>
                          <td className="px-3 py-2 text-stone-700">{fmt(weekSummaries.reduce((s, w) => s + w.netRevenue, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button onClick={handleImport} disabled={weekSummaries.length === 0}>
                    <Download size={14} />
                    Import {weekSummaries.length} Week{weekSummaries.length !== 1 ? 's' : ''} to StageOS
                  </Button>
                  <p className="text-xs text-stone-400">Existing rows with matching week dates will be updated, not duplicated.</p>
                </div>
              </div>
            )}

            {/* Step: importing */}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={24} className="animate-spin text-stone-400" />
                <p className="text-sm text-stone-500">Writing revenue weeks to StageOS…</p>
              </div>
            )}

            {/* Step: complete */}
            {step === 'complete' && (() => {
              const prod = useStore.getState().productions.find((p) => p.id === selectedProductionId)
              return (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-stone-800">Import complete</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {weekSummaries.length} weeks from <strong>{selectedEvent?.name}</strong> imported into <strong>{prod?.name}</strong>
                    </p>
                    {importResult && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {importResult.created > 0 && `${importResult.created} new week${importResult.created !== 1 ? 's' : ''} created`}
                        {importResult.created > 0 && importResult.updated > 0 && ' · '}
                        {importResult.updated > 0 && `${importResult.updated} updated`}
                        {' · '}{fmt(totalGross)} gross · {fmtPct(avgCapacity)} avg capacity
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={resetWizard}>Done</Button>
                    <Link
                      href={`/revenue?prod=${selectedProductionId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm rounded hover:bg-stone-700 transition-colors"
                    >
                      View Revenue Data <ArrowRight size={13} />
                    </Link>
                    <Button onClick={startSync}><RefreshCw size={13} /> Sync Another</Button>
                  </div>
                </div>
              )
            })()}
          </CardBody>
        </Card>
      )}

      {/* Sync History */}
      <Card className="max-w-3xl">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-stone-400" />
            <CardTitle>Sync History</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {syncHistory.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CalendarDays size={20} className="mx-auto text-stone-300 mb-2" />
              <p className="text-sm text-stone-400">No syncs yet. Run your first Spektrix import above.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              <div className="grid grid-cols-6 px-4 py-2 bg-stone-50 text-xs font-medium text-stone-500 uppercase tracking-wider">
                <span>Date</span>
                <span className="col-span-2">Spektrix Event</span>
                <span>Production</span>
                <span className="text-right">Created</span>
                <span className="text-right">Updated</span>
              </div>
              {syncHistory.map((record) => (
                <div key={record.id} className="grid grid-cols-6 px-4 py-3 text-sm items-center">
                  <span className="text-stone-500 text-xs">{formatDate(record.timestamp.slice(0, 10))}</span>
                  <span className="col-span-2 text-stone-700 truncate pr-2">{record.eventName}</span>
                  <span className="text-stone-600 truncate pr-2">{record.productionName}</span>
                  <span className="text-emerald-700 text-right font-medium">{record.rowsCreated} new</span>
                  <span className="text-stone-400 text-right">{record.rowsUpdated ?? 0} upd</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
