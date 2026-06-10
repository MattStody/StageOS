'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils'
import { Plus, List, LayoutGrid, Pencil, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import type { ProductionTask, TaskPhase, TaskStatus, TaskPriority } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<TaskPhase, string> = {
  pre_production: 'Pre-Prod',
  rehearsal: 'Rehearsal',
  tech: 'Tech',
  run: 'Run',
  closeout: 'Closeout',
}
const PHASE_CHIP: Record<TaskPhase, string> = {
  pre_production: 'text-violet-700 bg-violet-50 border-violet-200',
  rehearsal: 'text-sky-700 bg-sky-50 border-sky-200',
  tech: 'text-amber-700 bg-amber-50 border-amber-200',
  run: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  closeout: 'text-rose-700 bg-rose-50 border-rose-200',
}
const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_DOT: Record<TaskStatus, string> = { todo: 'bg-stone-300', in_progress: 'bg-amber-400', done: 'bg-emerald-400' }
const PRIORITY_BAR: Record<TaskPriority, string> = {
  low: 'bg-stone-300', normal: 'bg-sky-400', high: 'bg-amber-400', urgent: 'bg-red-500',
}
const PRIORITY_LABEL: Record<TaskPriority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }

function blankTask(productionId = ''): Omit<ProductionTask, 'id'> {
  return { productionId, title: '', description: '', phase: 'pre_production', status: 'todo', priority: 'normal', assignedTo: '', dueDate: '', notes: '' }
}

function statusCycle(s: TaskStatus): TaskStatus {
  return s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo'
}

export default function TasksPage() {
  const { productions, tasks, addTask, updateTask, deleteTask } = useStore()
  const { canEdit } = useAccess()

  const [view, setView] = useState<'list' | 'board'>('list')
  const [prodFilter, setProdFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState<TaskPhase | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductionTask | null>(null)
  const [form, setForm] = useState<Omit<ProductionTask, 'id'>>(blankTask())

  // Derived
  const filtered = tasks
    .filter((t) => prodFilter === 'all' || t.productionId === prodFilter)
    .filter((t) => phaseFilter === 'all' || t.phase === phaseFilter)

  const prodMap = Object.fromEntries(productions.map((p) => [p.id, p]))

  // Modal helpers
  function openAdd(productionId?: string, status: TaskStatus = 'todo') {
    setEditing(null)
    setForm(blankTask(productionId ?? (productions[0]?.id ?? '')))
    setForm((f) => ({ ...f, status }))
    setModalOpen(true)
  }
  function openEdit(t: ProductionTask) {
    setEditing(t)
    setForm({ ...t })
    setModalOpen(true)
  }
  function save() {
    if (!form.title.trim() || !form.productionId) return
    if (editing) {
      updateTask({ ...form, id: editing.id })
    } else {
      addTask({ ...form, id: `task-global-${Date.now()}` })
    }
    setModalOpen(false)
  }
  function cycleStatus(t: ProductionTask) {
    updateTask({ ...t, status: statusCycle(t.status) })
  }

  const isOverdue = (t: ProductionTask) =>
    t.dueDate && t.status !== 'done' && new Date(t.dueDate + 'T12:00:00') < new Date()

  // ── List view ───────────────────────────────────────────────────────────────
  function renderList() {
    if (filtered.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-stone-400 text-sm mb-3">No tasks match your filters</p>
          {canEdit && <Button onClick={() => openAdd()}>Add First Task</Button>}
        </div>
      )
    }

    // Group by production
    const groups: { prod: typeof productions[0] | undefined; items: ProductionTask[] }[] = []
    if (prodFilter === 'all') {
      productions.forEach((p) => {
        const items = filtered.filter((t) => t.productionId === p.id)
        if (items.length > 0) groups.push({ prod: p, items })
      })
      // Tasks with no matching production
      const orphans = filtered.filter((t) => !productions.find((p) => p.id === t.productionId))
      if (orphans.length > 0) groups.push({ prod: undefined, items: orphans })
    } else {
      groups.push({ prod: productions.find((p) => p.id === prodFilter), items: filtered })
    }

    return (
      <div className="space-y-4">
        {groups.map(({ prod, items }, gi) => (
          <div key={gi} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            {/* Group header */}
            {prodFilter === 'all' && (
              <div
                className="flex items-center gap-3 px-5 py-3 border-b border-stone-100"
                style={{ borderLeftWidth: 3, borderLeftColor: prod?.color ?? '#a8a29e' }}
              >
                <span className="text-sm font-semibold text-stone-800">{prod?.name ?? 'Unassigned'}</span>
                <span className="text-xs text-stone-400">{items.length} task{items.length !== 1 ? 's' : ''}</span>
                <div className="ml-auto flex gap-2 text-xs text-stone-400">
                  <span className="text-emerald-600 font-medium">{items.filter(t => t.status === 'done').length} done</span>
                  <span>·</span>
                  <span>{items.filter(t => t.status !== 'done').length} open</span>
                </div>
              </div>
            )}

            {/* Column headers */}
            <div className="grid grid-cols-[28px_1fr_120px_100px_80px_130px_110px_60px] gap-x-3 px-4 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              <div />
              <div>Task</div>
              <div>Phase</div>
              <div>Priority</div>
              <div>Assigned To</div>
              <div className="col-span-2">Due Date</div>
              <div />
            </div>

            {/* Rows */}
            {items.map((task) => {
              const overdue = isOverdue(task)
              return (
                <div
                  key={task.id}
                  className={cn(
                    'group grid grid-cols-[28px_1fr_120px_100px_80px_130px_110px_60px] gap-x-3 items-center px-4 py-2.5 border-b border-stone-50 last:border-b-0 hover:bg-stone-50 transition-colors',
                    task.status === 'done' && 'opacity-60'
                  )}
                >
                  {/* Status toggle */}
                  <button
                    onClick={() => canEdit && cycleStatus(task)}
                    className={cn('w-5 h-5 flex items-center justify-center rounded-full transition-colors shrink-0', canEdit ? 'cursor-pointer' : 'cursor-default')}
                    title={STATUS_LABELS[task.status]}
                  >
                    {task.status === 'done'
                      ? <CheckCircle2 size={16} className="text-emerald-500" />
                      : task.status === 'in_progress'
                        ? <Circle size={16} className="text-amber-400" />
                        : <Circle size={16} className="text-stone-300 group-hover:text-stone-400" />
                    }
                  </button>

                  {/* Title */}
                  <div className="min-w-0">
                    <span
                      className={cn(
                        'text-sm text-stone-800 truncate cursor-pointer hover:text-stone-900',
                        task.status === 'done' && 'line-through text-stone-400'
                      )}
                      onClick={() => canEdit && openEdit(task)}
                    >
                      {task.title}
                    </span>
                    {prodFilter === 'all' && prod && (
                      <span className="hidden" />
                    )}
                  </div>

                  {/* Phase */}
                  <div>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', PHASE_CHIP[task.phase])}>
                      {PHASE_LABELS[task.phase]}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_BAR[task.priority])} />
                    <span className="text-xs text-stone-500">{PRIORITY_LABEL[task.priority]}</span>
                  </div>

                  {/* Assigned */}
                  <div className="text-xs text-stone-500 truncate">{task.assignedTo || '—'}</div>

                  {/* Due date */}
                  <div className="flex items-center gap-1.5 col-span-2">
                    {task.dueDate ? (
                      <>
                        {overdue && <AlertCircle size={11} className="text-red-500 shrink-0" />}
                        <span className={cn('text-xs', overdue ? 'text-red-600 font-medium' : 'text-stone-500')}>
                          {formatDateShort(task.dueDate)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(task)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>
                      <button onClick={() => deleteTask(task.id)} className="p-1 text-stone-400 hover:text-red-500 cursor-pointer"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add task row */}
            {canEdit && (
              <button
                onClick={() => openAdd(prod?.id)}
                className="w-full text-left px-4 py-2.5 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-50 flex items-center gap-2 transition-colors"
              >
                <Plus size={12} /> Add task{prod ? ` to ${prod.name}` : ''}
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ── Board view ──────────────────────────────────────────────────────────────
  function renderBoard() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {(['todo', 'in_progress', 'done'] as const).map((status) => {
          const colTasks = filtered.filter((t) => t.status === status)
          return (
            <div key={status} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100">
                <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[status])} />
                <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex-1">{STATUS_LABELS[status]}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">{colTasks.length}</span>
              </div>
              <div className="p-3 space-y-2 min-h-[120px]">
                {colTasks.map((task) => {
                  const prod = prodMap[task.productionId]
                  const overdue = isOverdue(task)
                  return (
                    <div
                      key={task.id}
                      className="group bg-white border border-stone-200 rounded-md overflow-hidden hover:border-stone-300 hover:shadow-sm transition-all"
                    >
                      {/* Production color bar */}
                      {prod && <div className="h-0.5 w-full" style={{ backgroundColor: prod.color }} />}
                      <div className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <div className={cn('w-1 h-4 rounded-full shrink-0 mt-0.5', PRIORITY_BAR[task.priority])} />
                            <p className={cn('text-xs font-medium text-stone-800 leading-snug', task.status === 'done' && 'line-through text-stone-400')}>
                              {task.title}
                            </p>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(task)} className="text-stone-400 hover:text-stone-600 cursor-pointer"><Pencil size={10} /></button>
                              <button onClick={() => deleteTask(task.id)} className="text-stone-400 hover:text-red-500 cursor-pointer"><Trash2 size={10} /></button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {prod && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-stone-500 bg-stone-100">
                              {prod.name.length > 18 ? prod.name.slice(0, 18) + '…' : prod.name}
                            </span>
                          )}
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium border', PHASE_CHIP[task.phase])}>
                            {PHASE_LABELS[task.phase]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {task.assignedTo && (
                            <span className="text-[10px] text-stone-400 truncate max-w-[100px]">{task.assignedTo}</span>
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
                  <button
                    onClick={() => openAdd(prodFilter !== 'all' ? prodFilter : undefined, status)}
                    className="w-full text-left text-[11px] text-stone-400 hover:text-stone-600 py-1.5 px-2 rounded hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Stats bar ───────────────────────────────────────────────────────────────
  const allFiltered = filtered
  const totalOpen = allFiltered.filter((t) => t.status !== 'done').length
  const totalDone = allFiltered.filter((t) => t.status === 'done').length
  const totalOverdue = allFiltered.filter(isOverdue).length
  const totalInProgress = allFiltered.filter((t) => t.status === 'in_progress').length

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
          {/* View toggle */}
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
            <Button onClick={() => openAdd()}>
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
          {(['all', 'pre_production', 'rehearsal', 'tech', 'run', 'closeout'] as const).map((ph) => (
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

      {/* Content */}
      {view === 'list' ? renderList() : renderBoard()}

      {/* Task modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Title</label>
            <input
              className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Production</label>
            <select
              className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
              value={form.productionId}
              onChange={(e) => setForm((f) => ({ ...f, productionId: e.target.value }))}
            >
              <option value="">Select production…</option>
              {productions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Phase</label>
              <select
                className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
                value={form.phase}
                onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value as TaskPhase }))}
              >
                {(['pre_production', 'rehearsal', 'tech', 'run', 'closeout'] as const).map((p) => (
                  <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Priority</label>
              <select
                className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Status</label>
              <select
                className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Assigned To</label>
            <input
              className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              placeholder="Name or role"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Notes</label>
            <textarea
              className="w-full border border-stone-200 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-stone-400"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || !form.productionId}>
              {editing ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
