'use client'
import { useState, use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { fmt, formatDate } from '@/lib/utils'
import { STAGE_USERS, defaultAssigneeFor, deptColor } from '@/lib/team'
import {
  Check, ChevronRight, ChevronLeft, CheckCircle2, ClipboardList, RefreshCw,
} from 'lucide-react'
import type { WorkflowField, WorkflowRun } from '@/lib/types'

const inputCls = 'w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 bg-white'

function FieldInput({
  field, value, onChange,
}: {
  field: WorkflowField
  value: string | string[]
  onChange: (v: string | string[]) => void
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'select':
      return (
        <select className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'checkbox_group': {
      const selected = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-col gap-1.5 pt-1">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-stone-900"
                checked={selected.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o] : selected.filter((x) => x !== o))}
              />
              <span className="text-sm text-stone-700">{o}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'currency':
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
          <input
            type="number"
            className={`${inputCls} pl-7`}
            placeholder={field.placeholder ?? '0.00'}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )
    case 'date':
    case 'number':
    case 'email':
    case 'text':
    default:
      return (
        <input
          type={field.type === 'text' ? 'text' : field.type}
          className={inputCls}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function formatValue(field: WorkflowField, value: string | string[] | undefined): string {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (field.type === 'currency') return fmt(parseFloat(value) || 0)
  if (field.type === 'date') return formatDate(value)
  return value
}

export default function WorkflowRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { workflowTemplates, productions, addWorkflowRun, addTask } = useStore()
  const template = workflowTemplates.find((t) => t.id === id)

  const [stepIdx, setStepIdx] = useState(0) // 0..n-1 = form steps, n = review, n+1 = done
  const [productionId, setProductionId] = useState(productions[0]?.id ?? '')
  const [values, setValues] = useState<Record<string, string | string[]>>({})
  const [assignees, setAssignees] = useState<Record<number, string>>({})
  const [completedRun, setCompletedRun] = useState<WorkflowRun | null>(null)

  if (!template) return notFound()

  const formSteps = template.steps
  const reviewIdx = formSteps.length
  const doneIdx = formSteps.length + 1
  const totalBarSteps = formSteps.length + 2

  const production = productions.find((p) => p.id === productionId)
  const labelValue = template.labelFieldId ? values[template.labelFieldId] : undefined
  const runLabel = (typeof labelValue === 'string' && labelValue) || template.name

  // Seed default assignees lazily
  function assigneeFor(i: number): string {
    return assignees[i] ?? defaultAssigneeFor(template!.autoTasks[i].department)
  }

  function setValue(fieldId: string, v: string | string[]) {
    setValues((prev) => ({ ...prev, [fieldId]: v }))
  }

  function stepValid(i: number): boolean {
    return formSteps[i].fields.every((f) => {
      if (!f.required) return true
      const v = values[f.id]
      return Array.isArray(v) ? v.length > 0 : !!v
    })
  }

  function handleSubmit() {
    const now = new Date().toISOString()
    const runId = `run-${Date.now()}`

    const run: WorkflowRun = {
      id: runId,
      templateId: template!.id,
      templateName: template!.name,
      productionId,
      label: runLabel,
      values,
      tasksCreated: template!.autoTasks.length,
      createdAt: now,
    }
    addWorkflowRun(run)

    template!.autoTasks.forEach((t, i) => {
      const user = STAGE_USERS.find((u) => u.id === assigneeFor(i))
      addTask({
        id: `${runId}-t${i}`,
        productionId,
        title: `${t.title} — ${runLabel}`,
        description: t.description,
        phase: 'pre_production',
        status: 'todo',
        priority: t.priority,
        assignedTo: user?.name ?? t.department,
        dueDate: '',
        notes: `Auto-created by "${template!.name}" workflow.`,
      })
    })

    setCompletedRun(run)
    setStepIdx(doneIdx)
  }

  function resetFlow() {
    setStepIdx(0)
    setValues({})
    setAssignees({})
    setCompletedRun(null)
  }

  const depts = [...new Set(template.autoTasks.map((t) => t.department))]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
          <Link href="/workflows" className="hover:text-stone-600">Workflows</Link>
          <ChevronRight size={10} />
          <span className="text-stone-600 font-medium">{template.name}</span>
          {production && (
            <><ChevronRight size={10} /><span className="text-stone-600 font-medium">{production.name}</span></>
          )}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">{template.name}</h1>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${deptColor(template.department)}`}>{template.department}</span>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">{template.description}</p>
      </div>

      <div className="max-w-2xl">
        {/* Step bar */}
        <div className="flex items-center gap-0 mb-8">
          {Array.from({ length: totalBarSteps }).map((_, i) => {
            const label = i < formSteps.length ? formSteps[i].title : i === reviewIdx ? 'Review' : 'Confirmation'
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    done ? 'bg-stone-900 text-white' :
                    active ? 'bg-stone-900 text-white ring-4 ring-stone-900/10' :
                    'bg-stone-100 text-stone-400'
                  }`}>
                    {done ? <Check size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? 'text-stone-900' : done ? 'text-stone-500' : 'text-stone-400'}`}>
                    {label}
                  </span>
                </div>
                {i < totalBarSteps - 1 && (
                  <div className={`flex-1 h-px mx-3 ${i < stepIdx ? 'bg-stone-900' : 'bg-stone-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        <Card>
          <CardBody>
            {/* Form steps */}
            {stepIdx < formSteps.length && (
              <div className="space-y-5">
                {/* Production picker on first step */}
                {stepIdx === 0 && (
                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
                      Production<span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <select className={inputCls} value={productionId} onChange={(e) => setProductionId(e.target.value)}>
                      {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                {formSteps[stepIdx].description && (
                  <p className="text-xs text-stone-500">{formSteps[stepIdx].description}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {formSteps[stepIdx].fields.map((f) => (
                    <div key={f.id} className={f.type === 'textarea' || f.type === 'checkbox_group' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
                        {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      <FieldInput field={f} value={values[f.id] ?? (f.type === 'checkbox_group' ? [] : '')} onChange={(v) => setValue(f.id, v)} />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  {stepIdx > 0
                    ? <Button variant="secondary" onClick={() => setStepIdx(stepIdx - 1)}><ChevronLeft size={14} /> Back</Button>
                    : <span />}
                  <Button onClick={() => setStepIdx(stepIdx + 1)} disabled={!stepValid(stepIdx)}>
                    {stepIdx === formSteps.length - 1 ? 'Next: Review' : `Next: ${formSteps[stepIdx + 1].title}`} <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Review */}
            {stepIdx === reviewIdx && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Summary</p>
                  <div className="bg-stone-50 border border-stone-200 rounded-lg divide-y divide-stone-100">
                    <div className="flex px-4 py-2.5 gap-4">
                      <span className="text-xs text-stone-500 w-36 shrink-0">Production</span>
                      <span className="text-sm text-stone-800">{production?.name ?? '—'}</span>
                    </div>
                    {formSteps.flatMap((s) => s.fields).map((f) => (
                      <div key={f.id} className="flex px-4 py-2.5 gap-4">
                        <span className="text-xs text-stone-500 w-36 shrink-0">{f.label}</span>
                        <span className="text-sm text-stone-800">{formatValue(f, values[f.id])}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Tasks that will be created</p>
                    <p className="text-xs text-stone-400">Assign each task to a team member</p>
                  </div>
                  <div className="space-y-2">
                    {template.autoTasks.map((t, i) => {
                      const user = STAGE_USERS.find((u) => u.id === assigneeFor(i))
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white border border-stone-200 rounded-lg">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-semibold text-stone-500">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-stone-800">{t.title}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${deptColor(t.department)}`}>{t.department}</span>
                              <span className="text-[10px] text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded">auto-created</span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">{t.description}</p>
                          </div>
                          <div className="shrink-0 ml-2">
                            <div className="relative">
                              <select
                                value={assigneeFor(i)}
                                onChange={(e) => setAssignees((prev) => ({ ...prev, [i]: e.target.value }))}
                                className="appearance-none pl-7 pr-6 py-1.5 text-xs border border-stone-200 rounded bg-white text-stone-700 focus:outline-none focus:border-stone-400 cursor-pointer"
                              >
                                {STAGE_USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                              {user && (
                                <span
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white pointer-events-none"
                                  style={{ backgroundColor: user.color }}
                                >
                                  {user.initials}
                                </span>
                              )}
                            </div>
                            {user && <p className="text-[10px] text-stone-400 mt-0.5 text-right">{user.title}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="secondary" onClick={() => setStepIdx(reviewIdx - 1)}><ChevronLeft size={14} /> Back</Button>
                  <Button onClick={handleSubmit}><Check size={14} /> Confirm &amp; Create</Button>
                </div>
              </div>
            )}

            {/* Confirmation */}
            {stepIdx === doneIdx && completedRun && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Workflow complete</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      "{completedRun.label}" submitted for {production?.name}. {completedRun.tasksCreated} tasks dispatched.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Departments triggered</p>
                  <div className="flex flex-wrap gap-2">
                    {depts.map((dept) => {
                      const count = template.autoTasks.filter((t) => t.department === dept).length
                      return (
                        <div key={dept} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${deptColor(dept)}`}>
                          <CheckCircle2 size={13} />
                          <span className="text-xs font-semibold">{dept}</span>
                          <span className="text-xs opacity-70">{count} task{count !== 1 ? 's' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Assigned to</p>
                  <div className="space-y-1.5">
                    {template.autoTasks.map((t, i) => {
                      const user = STAGE_USERS.find((u) => u.id === assigneeFor(i))
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
                  <Button onClick={resetFlow}><RefreshCw size={13} /> Run again</Button>
                  <Link href="/tasks"><Button variant="secondary"><ClipboardList size={13} /> View tasks</Button></Link>
                  <Link href="/workflows"><Button variant="ghost">All workflows</Button></Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
