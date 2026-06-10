'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { fmt, formatDate } from '@/lib/utils'
import {
  Check, ChevronRight, User, Ruler, ClipboardList, CheckCircle2,
  DollarSign, Shirt, Calendar, RefreshCw,
} from 'lucide-react'
import type { ActorProfile, ActorEngagement, ActorMeasurements, PaymentScheduleItem, ProductionTask } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

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
  { value: 'weekly', label: 'Weekly' },
  { value: 'closing_night_bonus', label: 'Closing night bonus' },
]

const PAYMENT_LABELS: Record<PaymentScheduleItem, string> = {
  deposit_on_signing: 'Deposit on signing',
  weekly: 'Weekly',
  closing_night_bonus: 'Closing night bonus',
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

// ── Step indicator ────────────────────────────────────────────────────────────

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
        const done = s.n < current
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

// ── Field helpers ─────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function ActorOnboardingPage() {
  const { productions, actorProfiles, addActorProfile, updateActorProfile, addActorEngagement, addTask } = useStore()

  const [step, setStep] = useState(1)
  const [contract, setContract] = useState<ContractForm>(() => blankContract(productions[0]?.id ?? ''))
  const [measurements, setMeasurements] = useState<ActorMeasurements>(blankMeasurements)
  const [completedEngagement, setCompletedEngagement] = useState<ActorEngagement | null>(null)

  const production = productions.find((p) => p.id === contract.productionId)
  const productionName = production?.name ?? contract.productionId

  // Look up existing actor profile by email for pre-fill
  function handleEmailBlur() {
    if (!contract.email) return
    const existing = actorProfiles.find((p) => p.email.toLowerCase() === contract.email.toLowerCase())
    if (existing) {
      setContract((prev) => ({ ...prev, firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone }))
      setMeasurements(existing.measurements)
    }
  }

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

  function handleSubmit() {
    const now = new Date().toISOString()
    const profileId = actorProfiles.find((p) => p.email.toLowerCase() === contract.email.toLowerCase())?.id
      ?? `actor-${Date.now()}`

    const profile: ActorProfile = {
      id: profileId,
      firstName: contract.firstName,
      lastName: contract.lastName,
      email: contract.email,
      phone: contract.phone,
      measurements,
      createdAt: actorProfiles.find((p) => p.id === profileId)?.createdAt ?? now,
      updatedAt: now,
    }

    const engagementId = `eng-${Date.now()}`
    const engagement: ActorEngagement = {
      id: engagementId,
      actorProfileId: profileId,
      productionId: contract.productionId,
      productionName: productionName,
      role: contract.role,
      startDate: contract.startDate,
      endDate: contract.endDate,
      weeklyRate: parseFloat(contract.weeklyRate) || 0,
      paymentSchedule: contract.paymentSchedule,
      notes: contract.notes,
      tasksCreated: AUTO_TASKS.length,
      createdAt: now,
    }

    // Persist actor profile (upsert) and engagement
    addActorProfile(profile)
    addActorEngagement(engagement)

    // Create auto tasks in the task store
    AUTO_TASKS.forEach((t, i) => {
      addTask({
        id: `onb-${engagementId}-${i}`,
        productionId: contract.productionId,
        title: `${t.title} — ${contract.firstName} ${contract.lastName}`,
        description: t.description,
        phase: t.phase,
        status: 'todo',
        priority: t.priority,
        assignedTo: t.dept,
        dueDate: contract.startDate,
        notes: `Auto-created during actor onboarding for ${contract.role}.`,
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
  }

  // ── Step 1 — Contract Details ─────────────────────────────────────────────

  const step1Valid = contract.firstName && contract.lastName && contract.email && contract.productionId && contract.role

  function renderStep1() {
    return (
      <div className="space-y-5">
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
              ['height',   'Height',    'e.g. 5\'10"'],
              ['weight',   'Weight',    'e.g. 165 lbs'],
              ['chestBust','Chest / Bust','inches'],
              ['waist',    'Waist',     'inches'],
              ['hips',     'Hips',      'inches'],
              ['inseam',   'Inseam',    'inches'],
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
            {[
              ['Actor',      `${contract.firstName} ${contract.lastName}`],
              ['Email',      contract.email],
              ['Phone',      contract.phone || '—'],
              ['Production', productionName],
              ['Role',       contract.role],
              ['Dates',      contract.startDate && contract.endDate ? `${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}` : contract.startDate ? formatDate(contract.startDate) : '—'],
              ['Weekly rate', contract.weeklyRate ? fmt(parseFloat(contract.weeklyRate)) : '—'],
              ['Payment schedule', contract.paymentSchedule.length ? contract.paymentSchedule.map((x) => PAYMENT_LABELS[x]).join(', ') : '—'],
              ['Notes',      contract.notes || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex px-4 py-2.5 gap-4">
                <span className="text-xs text-stone-500 w-36 shrink-0">{label}</span>
                <span className="text-sm text-stone-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto tasks */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Tasks that will be created</p>
          <div className="space-y-2">
            {AUTO_TASKS.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white border border-stone-200 rounded-lg">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-stone-500">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-800">{t.title}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${DEPT_COLORS[t.dept]}`}>
                      {t.dept}
                    </span>
                    <span className="text-[10px] text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded">auto-created</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{t.description}</p>
                </div>
              </div>
            ))}
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
        {/* Success banner */}
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Onboarding complete</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {contract.firstName} {contract.lastName} has been added to {productionName}.
            </p>
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: User,       label: 'Actor',       value: `${contract.firstName} ${contract.lastName}` },
            { icon: Calendar,   label: 'Production',  value: productionName },
            { icon: Shirt,      label: 'Role',        value: contract.role },
            { icon: ClipboardList, label: 'Tasks created', value: String(AUTO_TASKS.length) },
          ].map(({ icon: Icon, label, value }) => (
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

        {/* Actions */}
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
          <span>Onboarding</span>
          {step >= 1 && contract.productionId && (
            <>
              <ChevronRight size={10} />
              <span className="text-stone-600 font-medium">{productionName}</span>
            </>
          )}
          {step >= 1 && (contract.firstName || contract.lastName) && (
            <>
              <ChevronRight size={10} />
              <span className="text-stone-600 font-medium">{[contract.firstName, contract.lastName].filter(Boolean).join(' ')}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Actor Onboarding</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {step === 1 && 'Enter contract and engagement details.'}
          {step === 2 && 'Record measurements — saved to the actor\'s persistent profile.'}
          {step === 3 && 'Review everything before creating the record.'}
          {step === 4 && 'Onboarding complete. Tasks have been dispatched to each department.'}
        </p>
      </div>

      <div className="max-w-2xl">
        <StepBar current={step} />
        <Card>
          <CardBody>
            {stepContent()}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
