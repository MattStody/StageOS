'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { fmt, formatDate } from '@/lib/utils'
import {
  Check, ChevronRight, User, Ruler, ClipboardList, CheckCircle2,
  DollarSign, Shirt, Calendar, RefreshCw, Upload, Sparkles, Loader2,
  AlertTriangle, X,
} from 'lucide-react'
import type { ActorProfile, ActorEngagement, ActorMeasurements, PaymentScheduleItem, ProductionTask } from '@/lib/types'

// ── Fake users ────────────────────────────────────────────────────────────────

interface StageUser {
  id: string
  name: string
  title: string
  initials: string
  color: string
}

const STAGE_USERS: StageUser[] = [
  { id: 'user-1', name: 'Sarah Chen',    title: 'Production Manager', initials: 'SC', color: '#6366f1' },
  { id: 'user-2', name: 'Marcus Webb',   title: 'Finance Director',   initials: 'MW', color: '#059669' },
  { id: 'user-3', name: 'Olivia Torres', title: 'Wardrobe Supervisor', initials: 'OT', color: '#d97706' },
]

// Default assignee per department
const DEPT_DEFAULT: Record<string, string> = {
  Finance:    'user-2',
  Wardrobe:   'user-3',
  Production: 'user-1',
  Admin:      'user-1',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContractForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  productionId: string
  role: string
  startDate: string
  endDate: string
  weeklyRate: string
  paymentSchedule: PaymentScheduleItem[]
  notes: string
}

const blankContract = (productionId: string): ContractForm => ({
  firstName: '', lastName: '', email: '', phone: '',
  productionId, role: '', startDate: '', endDate: '',
  weeklyRate: '', paymentSchedule: [], notes: '',
})

const blankMeasurements = (): ActorMeasurements => ({
  height: '', weight: '', chestBust: '', waist: '', hips: '', inseam: '',
  dressSuitSize: '', shoeSize: '', hatSize: '', wardrobeNotes: '',
})

const PAYMENT_OPTIONS: { value: PaymentScheduleItem; label: string }[] = [
  { value: 'deposit_on_signing', label: 'Deposit on signing' },
  { value: 'weekly',             label: 'Weekly' },
  { value: 'closing_night_bonus', label: 'Closing night bonus' },
]

const PAYMENT_LABELS: Record<PaymentScheduleItem, string> = {
  deposit_on_signing:   'Deposit on signing',
  weekly:               'Weekly',
  closing_night_bonus:  'Closing night bonus',
}

type OnboardingDept = 'Finance' | 'Wardrobe' | 'Production' | 'Admin'

interface AutoTask {
  title: string
  description: string
  dept: OnboardingDept
  phase: ProductionTask['phase']
  priority: ProductionTask['priority']
}

const AUTO_TASKS: AutoTask[] = [
  {
    title: 'Log payment schedule',
    description: 'Record and schedule all payment milestones for this engagement.',
    dept: 'Finance',
    phase: 'pre_production',
    priority: 'high',
  },
  {
    title: 'Share measurements with wardrobe',
    description: 'Send actor measurements to the wardrobe department for costume planning.',
    dept: 'Wardrobe',
    phase: 'pre_production',
    priority: 'normal',
  },
  {
    title: 'Schedule costume fitting',
    description: 'Book initial costume fitting appointment with the actor.',
    dept: 'Wardrobe',
    phase: 'pre_production',
    priority: 'normal',
  },
  {
    title: 'Add to rehearsal schedule',
    description: 'Include actor in the rehearsal calendar and share schedule.',
    dept: 'Production',
    phase: 'pre_production',
    priority: 'high',
  },
  {
    title: 'Save actor profile to roster',
    description: 'Confirm actor profile is saved and accessible in the company roster.',
    dept: 'Admin',
    phase: 'pre_production',
    priority: 'normal',
  },
]

const DEPT_COLORS: Record<OnboardingDept, string> = {
  Finance:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  Wardrobe:   'text-violet-700 bg-violet-50 border-violet-200',
  Production: 'text-sky-700 bg-sky-50 border-sky-200',
  Admin:      'text-stone-700 bg-stone-100 border-stone-300',
}

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Contract details', icon: ClipboardList },
  { n: 2, label: 'Measurements',     icon: Ruler },
  { n: 3, label: 'Review',           icon: User },
  { n: 4, label: 'Confirmation',     icon: CheckCircle2 },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done   = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                done   ? 'bg-stone-900 text-white' :
                active ? 'bg-stone-900 text-white ring-4 ring-stone-900/10' :
                         'bg-stone-100 text-stone-400'
              }`}>
                {done ? <Check size={13} /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-stone-900' : done ? 'text-stone-500' : 'text-stone-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${s.n < current ? 'bg-stone-900' : 'bg-stone-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 bg-white'

// ── User avatar chip ──────────────────────────────────────────────────────────

function UserChip({ user }: { user: StageUser }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        style={{ backgroundColor: user.color }}
      >
        {user.initials}
      </span>
      <span className="text-sm text-stone-800">{user.name}</span>
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActorOnboardingPage() {
  const { productions, actorProfiles, addActorProfile, addActorEngagement, addTask } = useStore()

  const [step, setStep]               = useState(1)
  const [contract, setContract]       = useState<ContractForm>(() => blankContract(productions[0]?.id ?? ''))
  const [measurements, setMeasurements] = useState<ActorMeasurements>(blankMeasurements)
  const [completedEngagement, setCompletedEngagement] = useState<ActorEngagement | null>(null)

  // Per-task assignee state (index → user id), pre-seeded from dept defaults
  const [assignees, setAssignees] = useState<Record<number, string>>(
    () => Object.fromEntries(AUTO_TASKS.map((t, i) => [i, DEPT_DEFAULT[t.dept] ?? 'user-1']))
  )

  // AI extraction state (step 1)
  type AiState = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'
  const [aiState, setAiState]   = useState<AiState>('idle')
  const [aiError, setAiError]   = useState('')
  const [aiIsDemo, setAiIsDemo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const production    = productions.find((p) => p.id === contract.productionId)
  const productionName = production?.name ?? contract.productionId

  // ── Returning actor lookup ────────────────────────────────────────────────

  function handleEmailBlur() {
    if (!contract.email) return
    const existing = actorProfiles.find((p) => p.email.toLowerCase() === contract.email.toLowerCase())
    if (existing) {
      setContract((prev) => ({ ...prev, firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone }))
      setMeasurements(existing.measurements)
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  function patchContract<K extends keyof ContractForm>(k: K, v: ContractForm[K]) {
    setContract((prev) => ({ ...prev, [k]: v }))
  }

  function togglePayment(val: PaymentScheduleItem) {
    setContract((prev) => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.includes(val)
        ? prev.paymentSchedule.filter((x) => x !== val)
        : [...prev.paymentSchedule, val],
    }))
  }

  // ── AI contract extraction ────────────────────────────────────────────────

  async function handleAiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAiState('uploading')
    setAiError('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunk = 8192
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      const fileBase64 = btoa(binary)

      setAiState('extracting')

      const res = await fetch('/api/extract-actor-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mediaType: file.type || 'application/pdf' }),
      })

      if (!res.ok) throw new Error('Extraction failed')
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      const d = json.data
      setAiIsDemo(!!json.demo)

      // Merge extracted values into form (only overwrite blank fields)
      setContract((prev) => ({
        ...prev,
        firstName:       d.firstName       || prev.firstName,
        lastName:        d.lastName        || prev.lastName,
        email:           d.email           || prev.email,
        phone:           d.phone           || prev.phone,
        role:            d.role            || prev.role,
        startDate:       d.startDate       || prev.startDate,
        endDate:         d.endDate         || prev.endDate,
        weeklyRate:      d.weeklyRate != null ? String(d.weeklyRate) : prev.weeklyRate,
        paymentSchedule: d.paymentSchedule?.length ? d.paymentSchedule : prev.paymentSchedule,
        notes:           d.notes           || prev.notes,
      }))

      // If we got a production name, try to match it
      if (d.productionName) {
        const match = productions.find((p) =>
          p.name.toLowerCase().includes(d.productionName.toLowerCase()) ||
          d.productionName.toLowerCase().includes(p.name.toLowerCase())
        )
        if (match) setContract((prev) => ({ ...prev, productionId: match.id }))
      }

      setAiState('done')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error')
      setAiState('error')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    const now = new Date().toISOString()
    const profileId = actorProfiles.find((p) => p.email.toLowerCase() === contract.email.toLowerCase())?.id
      ?? `actor-${Date.now()}`

    const profile: ActorProfile = {
      id: profileId,
      firstName: contract.firstName,
      lastName:  contract.lastName,
      email:     contract.email,
      phone:     contract.phone,
      measurements,
      createdAt: actorProfiles.find((p) => p.id === profileId)?.createdAt ?? now,
      updatedAt: now,
    }

    const engagementId = `eng-${Date.now()}`
    const engagement: ActorEngagement = {
      id:              engagementId,
      actorProfileId:  profileId,
      productionId:    contract.productionId,
      productionName:  productionName,
      role:            contract.role,
      startDate:       contract.startDate,
      endDate:         contract.endDate,
      weeklyRate:      parseFloat(contract.weeklyRate) || 0,
      paymentSchedule: contract.paymentSchedule,
      notes:           contract.notes,
      tasksCreated:    AUTO_TASKS.length,
      createdAt:       now,
    }

    addActorProfile(profile)
    addActorEngagement(engagement)

    AUTO_TASKS.forEach((t, i) => {
      const assignedUser = STAGE_USERS.find((u) => u.id === assignees[i])
      addTask({
        id:          `onb-${engagementId}-${i}`,
        productionId: contract.productionId,
        title:        `${t.title} — ${contract.firstName} ${contract.lastName}`,
        description:  t.description,
        phase:        t.phase,
        status:       'todo',
        priority:     t.priority,
        assignedTo:   assignedUser?.name ?? t.dept,
        dueDate:      contract.startDate,
        notes:        `Auto-created during actor onboarding for ${contract.role}.`,
      })
    })

    setCompletedEngagement(engagement)
    setStep(4)
  }

  function resetFlow() {
    setStep(1)
    setContract(blankContract(productions[0]?.id ?? ''))
    setMeasurements(blankMeasurements())
    setCompletedEngagement(null)
    setAiState('idle')
    setAiError('')
    setAssignees(Object.fromEntries(AUTO_TASKS.map((t, i) => [i, DEPT_DEFAULT[t.dept] ?? 'user-1'])))
  }

  // ── Step 1 — Contract Details ─────────────────────────────────────────────

  const step1Valid = contract.firstName && contract.lastName && contract.email && contract.productionId && contract.role

  function renderStep1() {
    return (
      <div className="space-y-5">

        {/* AI upload banner */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles size={15} className="text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-900">Auto-fill from contract</p>
                <p className="text-xs text-indigo-600 mt-0.5">Upload a signed PDF and Claude will extract the details below.</p>
              </div>
            </div>
            {aiState === 'idle' || aiState === 'error' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Upload size={12} /> Upload PDF
              </Button>
            ) : aiState === 'uploading' || aiState === 'extracting' ? (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 shrink-0">
                <Loader2 size={13} className="animate-spin" />
                {aiState === 'uploading' ? 'Reading…' : 'Extracting…'}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-xs text-emerald-700">
                  <Check size={12} /> Fields filled
                </span>
                <button onClick={() => setAiState('idle')} className="text-stone-400 hover:text-stone-600">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
          {aiIsDemo && aiState === 'done' && (
            <p className="text-[10px] text-amber-600 mt-2">Demo mode — AI key not configured. Fields were not changed.</p>
          )}
          {aiState === 'error' && aiError && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
              <AlertTriangle size={11} /> {aiError}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png"
            className="hidden"
            onChange={handleAiUpload}
          />
        </div>

        {/* Actor info */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Actor Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" required>
              <input className={inputCls} value={contract.firstName} onChange={(e) => patchContract('firstName', e.target.value)} />
            </Field>
            <Field label="Last name" required>
              <input className={inputCls} value={contract.lastName} onChange={(e) => patchContract('lastName', e.target.value)} />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className={inputCls}
                value={contract.email}
                onChange={(e) => patchContract('email', e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="Will pre-fill for returning actors"
              />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={contract.phone} onChange={(e) => patchContract('phone', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Engagement */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Engagement</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Production" required>
              <select className={inputCls} value={contract.productionId} onChange={(e) => patchContract('productionId', e.target.value)}>
                {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Role" required>
              <input className={inputCls} value={contract.role} onChange={(e) => patchContract('role', e.target.value)} placeholder="e.g. Hamlet, Ensemble" />
            </Field>
            <Field label="Start date">
              <input type="date" className={inputCls} value={contract.startDate} onChange={(e) => patchContract('startDate', e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="date" className={inputCls} value={contract.endDate} onChange={(e) => patchContract('endDate', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Compensation */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Compensation</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Weekly rate">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <input
                  type="number"
                  className={`${inputCls} pl-7`}
                  value={contract.weeklyRate}
                  onChange={(e) => patchContract('weeklyRate', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </Field>
            <Field label="Payment schedule">
              <div className="flex flex-col gap-1.5 pt-1">
                {PAYMENT_OPTIONS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-stone-900"
                      checked={contract.paymentSchedule.includes(value)}
                      onChange={() => togglePayment(value)}
                    />
                    <span className="text-sm text-stone-700">{label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <Field label="Notes">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={contract.notes}
            onChange={(e) => patchContract('notes', e.target.value)}
            placeholder="Any additional contract notes…"
          />
        </Field>

        <div className="flex justify-end pt-2">
          <Button onClick={() => setStep(2)} disabled={!step1Valid}>
            Next: Measurements <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 2 — Measurements ─────────────────────────────────────────────────

  function patchM<K extends keyof ActorMeasurements>(k: K, v: string) {
    setMeasurements((prev) => ({ ...prev, [k]: v }))
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Body Measurements</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ['height',    'Height',     "e.g. 5'10\""],
              ['weight',    'Weight',     'e.g. 165 lbs'],
              ['chestBust', 'Chest / Bust', 'inches'],
              ['waist',     'Waist',      'inches'],
              ['hips',      'Hips',       'inches'],
              ['inseam',    'Inseam',     'inches'],
            ] as [keyof ActorMeasurements, string, string][]).map(([key, label, ph]) => (
              <Field key={key} label={label}>
                <input className={inputCls} placeholder={ph} value={measurements[key]} onChange={(e) => patchM(key, e.target.value)} />
              </Field>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Clothing Sizes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ['dressSuitSize', 'Dress / Suit', 'e.g. 10 / 42R'],
              ['shoeSize',      'Shoe',         'e.g. 10W'],
              ['hatSize',       'Hat',          'e.g. 7¼'],
            ] as [keyof ActorMeasurements, string, string][]).map(([key, label, ph]) => (
              <Field key={key} label={label}>
                <input className={inputCls} placeholder={ph} value={measurements[key]} onChange={(e) => patchM(key, e.target.value)} />
              </Field>
            ))}
          </div>
        </div>

        <Field label="Wardrobe notes">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={measurements.wardrobeNotes}
            onChange={(e) => patchM('wardrobeNotes', e.target.value)}
            placeholder="Allergies, fit preferences, special requirements…"
          />
        </Field>

        <p className="text-xs text-stone-400">
          Measurements are saved to the actor's persistent profile and will pre-fill for future productions.
        </p>

        <div className="flex justify-between pt-2">
          <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
          <Button onClick={() => setStep(3)}>
            Next: Review <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 3 — Review ───────────────────────────────────────────────────────

  function renderStep3() {
    return (
      <div className="space-y-6">
        {/* Contract summary */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Contract Summary</p>
          <div className="bg-stone-50 border border-stone-200 rounded-lg divide-y divide-stone-100">
            {([
              ['Actor',            `${contract.firstName} ${contract.lastName}`],
              ['Email',            contract.email],
              ['Phone',            contract.phone || '—'],
              ['Production',       productionName],
              ['Role',             contract.role],
              ['Dates',            contract.startDate && contract.endDate
                                    ? `${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}`
                                    : contract.startDate ? formatDate(contract.startDate) : '—'],
              ['Weekly rate',      contract.weeklyRate ? fmt(parseFloat(contract.weeklyRate)) : '—'],
              ['Payment schedule', contract.paymentSchedule.length
                                    ? contract.paymentSchedule.map((x) => PAYMENT_LABELS[x]).join(', ')
                                    : '—'],
              ['Notes',            contract.notes || '—'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex px-4 py-2.5 gap-4">
                <span className="text-xs text-stone-500 w-36 shrink-0">{label}</span>
                <span className="text-sm text-stone-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto tasks with assignee */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Tasks that will be created</p>
            <p className="text-xs text-stone-400">Assign each task to a team member</p>
          </div>
          <div className="space-y-2">
            {AUTO_TASKS.map((t, i) => {
              const assignedUser = STAGE_USERS.find((u) => u.id === assignees[i])
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-white border border-stone-200 rounded-lg">
                  {/* Number */}
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-stone-500">{i + 1}</span>
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-stone-800">{t.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${DEPT_COLORS[t.dept]}`}>
                        {t.dept}
                      </span>
                      <span className="text-[10px] text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded">
                        auto-created
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{t.description}</p>
                  </div>

                  {/* Assignee */}
                  <div className="shrink-0 ml-2">
                    <div className="relative">
                      <select
                        value={assignees[i] ?? ''}
                        onChange={(e) => setAssignees((prev) => ({ ...prev, [i]: e.target.value }))}
                        className="appearance-none pl-7 pr-6 py-1.5 text-xs border border-stone-200 rounded bg-white text-stone-700 focus:outline-none focus:border-stone-400 cursor-pointer"
                      >
                        {STAGE_USERS.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {/* Avatar overlay */}
                      {assignedUser && (
                        <span
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white pointer-events-none"
                          style={{ backgroundColor: assignedUser.color }}
                        >
                          {assignedUser.initials}
                        </span>
                      )}
                    </div>
                    {assignedUser && (
                      <p className="text-[10px] text-stone-400 mt-0.5 text-right">{assignedUser.title}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
          <Button onClick={handleSubmit}>
            <Check size={14} /> Confirm &amp; Create
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 4 — Confirmation ─────────────────────────────────────────────────

  function renderStep4() {
    if (!completedEngagement) return null
    const depts = [...new Set(AUTO_TASKS.map((t) => t.dept))]
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Onboarding complete</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {contract.firstName} {contract.lastName} has been added to {productionName}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { icon: User,          label: 'Actor',         value: `${contract.firstName} ${contract.lastName}` },
            { icon: Calendar,      label: 'Production',    value: productionName },
            { icon: Shirt,         label: 'Role',          value: contract.role },
            { icon: ClipboardList, label: 'Tasks created', value: String(AUTO_TASKS.length) },
          ] as { icon: React.ElementType; label: string; value: string }[]).map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-stone-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-stone-400" />
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</p>
              </div>
              <p className="text-sm font-semibold text-stone-800 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Departments notified */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Departments triggered</p>
          <div className="flex flex-wrap gap-2">
            {depts.map((dept) => {
              const count = AUTO_TASKS.filter((t) => t.dept === dept).length
              return (
                <div key={dept} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${DEPT_COLORS[dept]}`}>
                  <CheckCircle2 size={13} />
                  <span className="text-xs font-semibold">{dept}</span>
                  <span className="text-xs opacity-70">{count} task{count !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Assignees summary */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Assigned to</p>
          <div className="space-y-1.5">
            {AUTO_TASKS.map((t, i) => {
              const user = STAGE_USERS.find((u) => u.id === assignees[i])
              return (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-stone-50 rounded border border-stone-100">
                  <span className="text-xs text-stone-600">{t.title}</span>
                  {user && (
                    <span className="flex items-center gap-1.5 text-xs text-stone-700">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.initials}
                      </span>
                      {user.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={resetFlow}>
            <RefreshCw size={13} /> Onboard another actor
          </Button>
          <Button variant="secondary" onClick={() => window.location.href = '/tasks'}>
            View tasks
          </Button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4][step - 1]

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
          <span>Onboarding</span>
          {contract.productionId && (
            <><ChevronRight size={10} /><span className="text-stone-600 font-medium">{productionName}</span></>
          )}
          {(contract.firstName || contract.lastName) && (
            <><ChevronRight size={10} /><span className="text-stone-600 font-medium">{[contract.firstName, contract.lastName].filter(Boolean).join(' ')}</span></>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Actor Onboarding</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {step === 1 && 'Enter contract and engagement details, or upload a PDF to auto-fill.'}
          {step === 2 && "Record measurements — saved to the actor's persistent profile."}
          {step === 3 && 'Review and assign tasks before creating the record.'}
          {step === 4 && 'Onboarding complete. Tasks have been dispatched to each department.'}
        </p>
      </div>

      <div className="max-w-2xl">
        <StepBar current={step} />
        <Card>
          <CardBody>{stepContent()}</CardBody>
        </Card>
      </div>
    </div>
  )
}
