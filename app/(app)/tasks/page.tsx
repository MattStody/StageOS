'use client'
import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { formatDateShort } from '@/lib/utils'
import { STAGE_USERS } from '@/lib/team'
import {
  Plus, List, LayoutGrid, Trash2, CheckCircle2, Circle, AlertCircle,
  X, PanelRightOpen, Check, ChevronDown,
} from 'lucide-react'
import type { ProductionTask, TaskPhase, TaskStatus, TaskPriority } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASES: TaskPhase[] = ['pre_production', 'rehearsal', 'tech', 'run', 'closeout']
const PHASE_LABELS: Record<TaskPhase, string> = {
  pre_production: 'Pre-Prod', rehearsal: 'Rehearsal', tech: 'Tech', run: 'Run', closeout: 'Closeout',
}
const PHASE_CHIP: Record<TaskPhase, string> = {
  pre_production: 'text-violet-700 bg-violet-50 border-violet-200',
  rehearsal: 'text-sky-700 bg-sky-50 border-sky-200',
  tech: 'text-amber-700 bg-amber-50 border-amber-200',
  run: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  closeout: 'text-rose-700 bg-rose-50 border-rose-200',
}
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_DOT: Record<TaskStatus, string> = { todo: 'bg-stone-300', in_progress: 'bg-amber-400', done: 'bg-emerald-400' }
const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
const PRIORITY_BAR: Record<TaskPriority, string> = {
  low: 'bg-stone-300', normal: 'bg-sky-400', high: 'bg-amber-400', urgent: 'bg-red-500',
}
const PRIORITY_LABEL: Record<TaskPriority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }
const PRIORITY_CHIP: Record<TaskPriority, string> = {
  low: 'text-stone-500 bg-stone-50 border-stone-200',
  normal: 'text-sky-700 bg-sky-50 border-sky-200',
  high: 'text-amber-700 bg-amber-50 border-amber-200',
  urgent: 'text-red-700 bg-red-50 border-red-200',
}

function statusCycle(s: TaskStatus): TaskStatus {
  return s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo'
}

// ── Avatars ───────────────────────────────────────────────────────────────────

const FALLBACK_COLORS = ['#0891b2', '#7c3aed', '#dc2626', '#65a30d', '#db2777']

function avatarFor(name: string): { initials: string; color: string } {
  const known = STAGE_USERS.find((u) => u.name === name)
  if (known) return { initials: known.initials, color: known.color }
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return { initials, color: FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length] }
}

function Avatar({ name, size = 18 }: { name: string; size?: number }) {
  if (!name) return <span className="w-[18px] h-[18px] rounded-full border border-dashed border-stone-300 shrink-0" style={{ width: size, height: size }} />
  const { initials, color } = avatarFor(name)
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  )
}

// ── Inline editors ────────────────────────────────────────────────────────────

/** Click-to-edit text. Enter/blur commits, Esc cancels. */
function InlineText({
  value, onCommit, disabled, className, placeholder,
}: {
  value: string
  onCommit: (v: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onCommit(draft.trim() || value); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onCommit(draft.trim() || value); setEditing(false) }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className={cn('w-full bg-white border border-stone-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:border-stone-500', className)}
      />
    )
  }
  return (
    <span
      onClick={() => { if (!disabled) { setDraft(value); setEditing(true) } }}
      className={cn(
        'block truncate rounded px-1.5 py-0.5 -mx-1.5 border border-transparent',
        !disabled && 'cursor-text hover:border-stone-200 hover:bg-white',
        !value && 'text-stone-300',
        className,
      )}
      title={disabled ? undefined : 'Click to edit'}
    >
      {value || placeholder || '—'}
    </span>
  )
}

/** A chip that is secretly a <select>. */
function ChipSelect<T extends string>({
  value, options, labels, chipClass, onChange, disabled,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  chipClass: string
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className="relative inline-flex items-center group/chip">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'appearance-none text-[10px] font-medium pl-1.5 pr-4 py-0.5 rounded-full border focus:outline-none',
          chipClass,
          disabled ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        {options.map((o) => <option key={o} value={o}>{labels[o]}</option>)}
      </select>
      {!disabled && (
        <ChevronDown size={8} className="absolute right-1.5 pointer-events-none opacity-0 group-hover/chip:opacity-60" />
      )}
    </div>
  )
}

/** Assignee picker with avatar. */
function AssigneeSelect({
  value, options, onChange, disabled,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="relative flex items-center gap-1.5 min-w-0 group/asg">
      <Avatar name={value} size={18} />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none flex-1 min-w-0 truncate text-xs bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-stone-300',
          value ? 'text-stone-600' : 'text-stone-300',
          disabled ? 'cursor-default' : 'cursor-pointer hover:border-stone-200',
        )}
      >
        <option value="">Unassigned</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

/** Inline due date. */
function DueDate({ value, overdue, onChange, disabled }: {
  value: string
  overdue: boolean
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {overdue && <AlertCircle size={11} className="text-red-500 shrink-0" />}
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'text-xs bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-stone-300 w-full',
          overdue ? 'text-red-600 font-medium' : value ? 'text-stone-500' : 'text-stone-300',
          disabled ? 'cursor-default' : 'cursor-pointer hover:border-stone-200',
        )}
      />
    </div>
  )
}

/** "+ Add task" that turns into an input; Enter creates and stays open. */
function InlineAdd({ onAdd, label = 'Add task' }: { onAdd: (title: string) => void; label?: string }) {
  const [active, setActive] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (active) inputRef.current?.focus() }, [active])

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="w-full text-left px-4 py-2.5 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
      >
        <Plus size={12} /> {label}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-stone-50/50">
      <Circle size={16} className="text-stone-300 shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) { onAdd(title.trim()); setTitle('') }
          if (e.key === 'Escape') { setTitle(''); setActive(false) }
        }}
        onBlur={() => { if (title.trim()) onAdd(title.trim()); setTitle(''); setActive(false) }}
        placeholder="Write a task name, then press Enter"
        className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { productions, tasks, addTask, updateTask, deleteTask } = useStore()
  const { canEdit } = useAccess()

  const [view, setView] = useState<'list' | 'board'>('list')
  const [prodFilter, setProdFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState<TaskPhase | 'all'>('all')
  const [panelTaskId, setPanelTaskId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)

  const filtered = tasks
    .filter((t) => prodFilter === 'all' || t.productionId === prodFilter)
    .filter((t) => phaseFilter === 'all' || t.phase === phaseFilter)

  const prodMap = Object.fromEntries(productions.map((p) => [p.id, p]))
  const panelTask = tasks.find((t) => t.id === panelTaskId) ?? null

  // Assignee options: team roster + anything already used on tasks
  const assigneeOptions = [...new Set([
    ...STAGE_USERS.map((u) => u.name),
    ...tasks.map((t) => t.assignedTo).filter(Boolean),
  ])]

  const isOverdue = (t: ProductionTask) =>
    !!t.dueDate && t.status !== 'done' && new Date(t.dueDate + 'T12:00:00') < new Date()

  function patch(t: ProductionTask, changes: Partial<ProductionTask>) {
    updateTask({ ...t, ...changes })
  }

  function quickAdd(title: string, productionId: string, status: TaskStatus = 'todo') {
    addTask({
      id: `task-global-${Date.now()}`,
      productionId,
      title,
      description: '',
      phase: phaseFilter === 'all' ? 'pre_production' : phaseFilter,
      status,
      priority: 'normal',
      assignedTo: '',
      dueDate: '',
      notes: '',
    })
  }

  function newTaskViaPanel() {
    const id = `task-global-${Date.now()}`
    addTask({
      id,
      productionId: prodFilter !== 'all' ? prodFilter : (productions[0]?.id ?? ''),
      title: '',
      description: '',
      phase: phaseFilter === 'all' ? 'pre_production' : phaseFilter,
      status: 'todo',
      priority: 'normal',
      assignedTo: '',
      dueDate: '',
      notes: '',
    })
    setPanelTaskId(id)
  }

  function closePanel() {
    // Discard empty drafts created via "New Task"
    if (panelTask && !panelTask.title.trim()) deleteTask(panelTask.id)
    setPanelTaskId(null)
  }

  // ── List view ──────────────────────────────────────────────────────────────

  const GRID = 'grid grid-cols-[28px_minmax(180px,1fr)_110px_96px_minmax(130px,150px)_118px_56px] gap-x-3'

  function renderRow(task: ProductionTask) {
    const overdue = isOverdue(task)
    return (
      <div
        key={task.id}
        className={cn(
          GRID,
          'group items-center px-4 py-2 border-b border-stone-50 last:border-b-0 hover:bg-stone-50/70 transition-colors',
          task.status === 'done' && 'opacity-60',
          panelTaskId === task.id && 'bg-indigo-50/40',
        )}
      >
        {/* Status toggle */}
        <button
          onClick={() => canEdit && patch(task, { status: statusCycle(task.status) })}
          className={cn('w-5 h-5 flex items-center justify-center rounded-full shrink-0', canEdit ? 'cursor-pointer' : 'cursor-default')}
          title={STATUS_LABELS[task.status]}
        >
          {task.status === 'done'
            ? <CheckCircle2 size={16} className="text-emerald-500" />
            : task.status === 'in_progress'
              ? <Circle size={16} className="text-amber-400" />
              : <Circle size={16} className="text-stone-300 group-hover:text-stone-400" />}
        </button>

        {/* Title — inline editable */}
        <div className="min-w-0">
          <InlineText
            value={task.title}
            disabled={!canEdit}
            onCommit={(v) => patch(task, { title: v })}
            className={cn('text-sm text-stone-800', task.status === 'done' && 'line-through text-stone-400')}
          />
        </div>

        {/* Phase chip select */}
        <div>
          <ChipSelect
            value={task.phase}
            options={PHASES}
            labels={PHASE_LABELS}
            chipClass={PHASE_CHIP[task.phase]}
            disabled={!canEdit}
            onChange={(v) => patch(task, { phase: v })}
          />
        </div>

        {/* Priority chip select */}
        <div>
          <ChipSelect
            value={task.priority}
            options={PRIORITIES}
            labels={PRIORITY_LABEL}
            chipClass={PRIORITY_CHIP[task.priority]}
            disabled={!canEdit}
            onChange={(v) => patch(task, { priority: v })}
          />
        </div>

        {/* Assignee */}
        <AssigneeSelect
          value={task.assignedTo}
          options={assigneeOptions}
          disabled={!canEdit}
          onChange={(v) => patch(task, { assignedTo: v })}
        />

        {/* Due date */}
        <DueDate
          value={task.dueDate}
          overdue={overdue}
          disabled={!canEdit}
          onChange={(v) => patch(task, { dueDate: v })}
        />

        {/* Actions */}
        <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setPanelTaskId(task.id)}
            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
            title="Open details"
          >
            <PanelRightOpen size={13} />
          </button>
          {canEdit && (
            <button
              onClick={() => { if (panelTaskId === task.id) setPanelTaskId(null); deleteTask(task.id) }}
              className="p-1 text-stone-400 hover:text-red-500 cursor-pointer"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    )
  }

  function renderList() {
    if (filtered.length === 0 && !canEdit) {
      return <div className="text-center py-16 text-stone-400 text-sm">No tasks match your filters</div>
    }

    const groups: { prod: typeof productions[0] | undefined; items: ProductionTask[] }[] = []
    if (prodFilter === 'all') {
      productions.forEach((p) => {
        const items = filtered.filter((t) => t.productionId === p.id)
        if (items.length > 0) groups.push({ prod: p, items })
      })
      const orphans = filtered.filter((t) => !productions.find((p) => p.id === t.productionId))
      if (orphans.length > 0) groups.push({ prod: undefined, items: orphans })
    } else {
      groups.push({ prod: productions.find((p) => p.id === prodFilter), items: filtered })
    }
    if (groups.length === 0 && canEdit) {
      groups.push({ prod: prodFilter !== 'all' ? productions.find((p) => p.id === prodFilter) : productions[0], items: [] })
    }

    return (
      <div className="space-y-4">
        {groups.map(({ prod, items }, gi) => {
          const done = items.filter((t) => t.status === 'done').length
          const pct = items.length ? Math.round((done / items.length) * 100) : 0
          return (
            <div key={gi} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              {/* Group header with progress */}
              <div
                className="px-5 py-3 border-b border-stone-100"
                style={{ borderLeftWidth: 3, borderLeftColor: prod?.color ?? '#a8a29e' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-stone-800">{prod?.name ?? 'Unassigned'}</span>
                  <span className="text-xs text-stone-400">{items.length} task{items.length !== 1 ? 's' : ''}</span>
                  <div className="ml-auto flex items-center gap-2 text-xs text-stone-400">
                    <span className="text-emerald-600 font-medium">{done} done</span>
                    <span>·</span>
                    <span>{items.length - done} open</span>
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>

              {/* Column headers */}
              <div className={cn(GRID, 'px-4 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-semibold text-stone-400 uppercase tracking-wider')}>
                <div />
                <div>Task</div>
                <div>Phase</div>
                <div>Priority</div>
                <div>Assignee</div>
                <div>Due Date</div>
                <div />
              </div>

              {items.map(renderRow)}

              {canEdit && (
                <InlineAdd
                  label={`Add task${prod ? ` to ${prod.name}` : ''}`}
                  onAdd={(title) => quickAdd(title, prod?.id ?? productions[0]?.id ?? '')}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Board view (drag & drop) ───────────────────────────────────────────────

  function renderBoard() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {STATUSES.map((status) => {
          const colTasks = filtered.filter((t) => t.status === status)
          return (
            <div
              key={status}
              onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDragOverCol(status) } }}
              onDragLeave={() => setDragOverCol((c) => (c === status ? null : c))}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverCol(null)
                const id = e.dataTransfer.getData('text/plain')
                const task = tasks.find((t) => t.id === id)
                if (task && task.status !== status) patch(task, { status })
              }}
              className={cn(
                'bg-white rounded-lg border overflow-hidden transition-colors',
                dragOverCol === status ? 'border-indigo-300 bg-indigo-50/30' : 'border-stone-200',
              )}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100">
                <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[status])} />
                <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex-1">{STATUS_LABELS[status]}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">{colTasks.length}</span>
              </div>
              <div className="p-3 space-y-2 min-h-[140px]">
                {colTasks.map((task) => {
                  const prod = prodMap[task.productionId]
                  const overdue = isOverdue(task)
                  return (
                    <div
                      key={task.id}
                      draggable={canEdit}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                      onClick={() => setPanelTaskId(task.id)}
                      className={cn(
                        'group bg-white border border-stone-200 rounded-md overflow-hidden hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer',
                        canEdit && 'active:cursor-grabbing',
                        panelTaskId === task.id && 'border-indigo-300 ring-1 ring-indigo-200',
                      )}
                    >
                      {prod && <div className="h-0.5 w-full" style={{ backgroundColor: prod.color }} />}
                      <div className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); canEdit && patch(task, { status: statusCycle(task.status) }) }}
                              className="shrink-0 mt-px cursor-pointer"
                            >
                              {task.status === 'done'
                                ? <CheckCircle2 size={13} className="text-emerald-500" />
                                : <Circle size={13} className={task.status === 'in_progress' ? 'text-amber-400' : 'text-stone-300'} />}
                            </button>
                            <p className={cn('text-xs font-medium text-stone-800 leading-snug', task.status === 'done' && 'line-through text-stone-400')}>
                              {task.title || <span className="text-stone-300 italic">Untitled</span>}
                            </p>
                          </div>
                          {canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); if (panelTaskId === task.id) setPanelTaskId(null); deleteTask(task.id) }}
                              className="text-stone-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {prod && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-stone-500 bg-stone-100">
                              {prod.name.length > 18 ? prod.name.slice(0, 18) + '…' : prod.name}
                            </span>
                          )}
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium border', PHASE_CHIP[task.phase])}>
                            {PHASE_LABELS[task.phase]}
                          </span>
                          <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_BAR[task.priority])} title={PRIORITY_LABEL[task.priority]} />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {task.assignedTo && (
                            <span className="flex items-center gap-1 min-w-0">
                              <Avatar name={task.assignedTo} size={15} />
                              <span className="text-[10px] text-stone-400 truncate max-w-[90px]">{task.assignedTo}</span>
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={cn('text-[10px] ml-auto shrink-0', overdue ? 'text-red-500 font-medium' : 'text-stone-400')}>
                              {formatDateShort(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {canEdit && (
                  <InlineAdd
                    label="Add task"
                    onAdd={(title) => quickAdd(title, prodFilter !== 'all' ? prodFilter : (productions[0]?.id ?? ''), status)}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Detail side panel (auto-saves) ─────────────────────────────────────────

  function renderPanel() {
    if (!panelTask) return null
    const t = panelTask
    const prod = prodMap[t.productionId]
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] bg-white border-l border-stone-200 shadow-xl flex flex-col">
        {/* Panel header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
          <button
            onClick={() => canEdit && patch(t, { status: t.status === 'done' ? 'todo' : 'done' })}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors',
              t.status === 'done'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-600',
              canEdit ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <Check size={12} /> {t.status === 'done' ? 'Completed' : 'Mark complete'}
          </button>
          <div className="ml-auto flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => { deleteTask(t.id); setPanelTaskId(null) }}
                className="p-1.5 text-stone-400 hover:text-red-500 cursor-pointer"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={closePanel} className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title */}
          <textarea
            value={t.title}
            disabled={!canEdit}
            onChange={(e) => patch(t, { title: e.target.value })}
            placeholder="Task name"
            rows={2}
            className="w-full text-lg font-semibold text-stone-900 placeholder:text-stone-300 resize-none focus:outline-none leading-snug"
            autoFocus={!t.title}
          />

          {/* Properties */}
          <div className="space-y-3">
            {([
              ['Production', (
                <select
                  key="prod"
                  value={t.productionId}
                  disabled={!canEdit}
                  onChange={(e) => patch(t, { productionId: e.target.value })}
                  className="w-full text-sm text-stone-700 border border-transparent hover:border-stone-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:border-stone-300 cursor-pointer"
                >
                  {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )],
              ['Status', (
                <select
                  key="status"
                  value={t.status}
                  disabled={!canEdit}
                  onChange={(e) => patch(t, { status: e.target.value as TaskStatus })}
                  className="w-full text-sm text-stone-700 border border-transparent hover:border-stone-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:border-stone-300 cursor-pointer"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              )],
              ['Phase', (
                <select
                  key="phase"
                  value={t.phase}
                  disabled={!canEdit}
                  onChange={(e) => patch(t, { phase: e.target.value as TaskPhase })}
                  className="w-full text-sm text-stone-700 border border-transparent hover:border-stone-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:border-stone-300 cursor-pointer"
                >
                  {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
                </select>
              )],
              ['Priority', (
                <select
                  key="pri"
                  value={t.priority}
                  disabled={!canEdit}
                  onChange={(e) => patch(t, { priority: e.target.value as TaskPriority })}
                  className="w-full text-sm text-stone-700 border border-transparent hover:border-stone-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:border-stone-300 cursor-pointer"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              )],
              ['Assignee', (
                <div key="asg" className="flex items-center gap-2 px-1.5">
                  <Avatar name={t.assignedTo} size={20} />
                  <select
                    value={t.assignedTo}
                    disabled={!canEdit}
                    onChange={(e) => patch(t, { assignedTo: e.target.value })}
                    className="flex-1 text-sm text-stone-700 border border-transparent hover:border-stone-200 rounded px-1 py-1 bg-transparent focus:outline-none focus:border-stone-300 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )],
              ['Due date', (
                <input
                  key="due"
                  type="date"
                  value={t.dueDate}
                  disabled={!canEdit}
                  onChange={(e) => patch(t, { dueDate: e.target.value })}
                  className={cn(
                    'w-full text-sm border border-transparent hover:border-stone-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:border-stone-300 cursor-pointer',
                    isOverdue(t) ? 'text-red-600 font-medium' : 'text-stone-700',
                  )}
                />
              )],
            ] as [string, React.ReactNode][]).map(([label, control]) => (
              <div key={label} className="grid grid-cols-[90px_1fr] items-center gap-2">
                <span className="text-xs text-stone-400">{label}</span>
                {control}
              </div>
            ))}
          </div>

          {prod && (
            <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prod.color }} />
              {prod.name}
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1.5">Description</p>
            <textarea
              value={t.description}
              disabled={!canEdit}
              onChange={(e) => patch(t, { description: e.target.value })}
              placeholder="What is this task about?"
              rows={4}
              className="w-full text-sm text-stone-700 placeholder:text-stone-300 border border-stone-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1.5">Notes</p>
            <textarea
              value={t.notes}
              disabled={!canEdit}
              onChange={(e) => patch(t, { notes: e.target.value })}
              placeholder="Internal notes…"
              rows={3}
              className="w-full text-sm text-stone-700 placeholder:text-stone-300 border border-stone-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>

        {/* Panel footer */}
        <div className="px-5 py-3 border-t border-stone-100 text-[11px] text-stone-400">
          Changes save automatically
        </div>
      </div>
    )
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalOpen = filtered.filter((t) => t.status !== 'done').length
  const totalDone = filtered.filter((t) => t.status === 'done').length
  const totalOverdue = filtered.filter(isOverdue).length
  const totalInProgress = filtered.filter((t) => t.status === 'in_progress').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Tasks</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {totalOpen} open · {totalInProgress} in progress · {totalDone} done
            {totalOverdue > 0 && <span className="text-red-500 ml-1">· {totalOverdue} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-stone-200 rounded-md overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors cursor-pointer', view === 'list' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-700')}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setView('board')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs border-l border-stone-200 transition-colors cursor-pointer', view === 'board' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-700')}
            >
              <LayoutGrid size={13} /> Board
            </button>
          </div>
          {canEdit && (
            <Button onClick={newTaskViaPanel}>
              <Plus size={13} /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          className="border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-stone-400"
          value={prodFilter}
          onChange={(e) => setProdFilter(e.target.value)}
        >
          <option value="all">All productions</option>
          {productions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', ...PHASES] as const).map((ph) => (
            <button
              key={ph}
              onClick={() => setPhaseFilter(ph)}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer',
                phaseFilter === ph
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'text-stone-500 border-stone-200 hover:border-stone-400'
              )}
            >
              {ph === 'all' ? 'All phases' : PHASE_LABELS[ph]}
            </button>
          ))}
        </div>
      </div>

      {/* Content — pad right when panel open on desktop */}
      <div className={cn(panelTask && 'lg:pr-[416px] transition-all')}>
        {view === 'list' ? renderList() : renderBoard()}
      </div>

      {renderPanel()}
    </div>
  )
}
