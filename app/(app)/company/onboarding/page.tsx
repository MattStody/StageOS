'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { formatDate, daysUntil } from '@/lib/utils'
import { checklistProgress, ONBOARDING_CATEGORY_COLORS } from '@/lib/onboarding'
import { personName, avatarColor, initials, onboardingOverdueItems } from '@/lib/company'
import { STAGE_USERS } from '@/lib/team'
import {
  AlertTriangle, CheckCircle2, Circle, Clock, Users as UsersIcon,
  Sparkles, ShieldCheck, ChevronRight, Calendar, UserCircle2,
} from 'lucide-react'
import type {
  OnboardingChecklist, OnboardingItem, OnboardingCategory, Person, Production,
} from '@/lib/types'

const CATEGORY_ORDER: OnboardingCategory[] = ['Legal', 'Finance', 'Housing', 'Travel', 'Production', 'Communication']

// Assignee options: team members plus the common free-text roles the generator used.
const ROLE_ASSIGNEES = ['GM', 'Company Manager', 'Wardrobe', 'Finance']
const ASSIGNEE_OPTIONS = [...STAGE_USERS.map((u) => u.name), ...ROLE_ASSIGNEES]

// Canadian payroll items that must be visually prominent.
const PAYROLL_KEYWORDS = ['SIN', 'TD1', 'direct deposit', 'EFT', 'banking']
function isPayrollItem(item: OnboardingItem): boolean {
  const l = item.label.toLowerCase()
  return PAYROLL_KEYWORDS.some((k) => l.includes(k.toLowerCase()))
}

type StatusFilter = 'all' | 'in_progress' | 'complete' | 'not_started'
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'complete', label: 'Complete' },
  { id: 'not_started', label: 'Not Started' },
]

function isItemOverdue(item: OnboardingItem): boolean {
  return !item.completedAt && !!item.dueDate && daysUntil(item.dueDate) < 0
}

function checklistStatus(c: OnboardingChecklist): StatusFilter {
  const { done, total } = checklistProgress(c)
  if (c.completedAt || (total > 0 && done === total)) return 'complete'
  if (done === 0) return 'not_started'
  return 'in_progress'
}

// completedAt is set iff every item has completedAt.
function recompute(c: OnboardingChecklist, items: OnboardingItem[]): OnboardingChecklist {
  const allDone = items.length > 0 && items.every((i) => i.completedAt)
  return {
    ...c,
    items,
    completedAt: allDone ? (c.completedAt ?? new Date().toISOString()) : undefined,
  }
}

export default function CompanyOnboardingPage() {
  const { people, productions, onboardingChecklists, updateOnboardingChecklist } = useStore()
  const { canEdit } = useAccess()

  const [prodFilter, setProdFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const prodById = useMemo(() => new Map(productions.map((p) => [p.id, p])), [productions])

  // ── Summary stats (across all checklists, unfiltered) ──
  const stats = useMemo(() => {
    let complete = 0, inProgress = 0, notStarted = 0, overdueItems = 0
    let overduePeople = 0
    for (const c of onboardingChecklists) {
      const s = checklistStatus(c)
      if (s === 'complete') complete++
      else if (s === 'in_progress') inProgress++
      else notStarted++
      const od = onboardingOverdueItems(c)
      overdueItems += od
      if (od > 0) overduePeople++
    }
    return { total: onboardingChecklists.length, complete, inProgress, notStarted, overdueItems, overduePeople }
  }, [onboardingChecklists])

  // ── Filtered + grouped by production ──
  const groups = useMemo(() => {
    const filtered = onboardingChecklists.filter((c) => {
      if (prodFilter !== 'all' && c.productionId !== prodFilter) return false
      if (statusFilter !== 'all' && checklistStatus(c) !== statusFilter) return false
      return true
    })
    const byProd = new Map<string, OnboardingChecklist[]>()
    for (const c of filtered) {
      const arr = byProd.get(c.productionId) ?? []
      arr.push(c)
      byProd.set(c.productionId, arr)
    }
    // preserve production order
    return productions
      .filter((p) => byProd.has(p.id))
      .map((p) => ({
        production: p,
        checklists: (byProd.get(p.id) ?? []).sort((a, b) => {
          // incomplete first, then by overdue desc
          const sa = checklistStatus(a) === 'complete' ? 1 : 0
          const sb = checklistStatus(b) === 'complete' ? 1 : 0
          if (sa !== sb) return sa - sb
          return onboardingOverdueItems(b) - onboardingOverdueItems(a)
        }),
      }))
  }, [onboardingChecklists, productions, prodFilter, statusFilter])

  const openChecklist = onboardingChecklists.find((c) => c.id === openId) ?? null

  // ── Item mutations ──
  function toggleItem(checklist: OnboardingChecklist, item: OnboardingItem) {
    if (!canEdit) return
    const now = item.completedAt ? undefined : new Date().toISOString()
    const by = now ? 'You' : undefined
    const items = checklist.items.map((i) =>
      i.id === item.id ? { ...i, completedAt: now, completedBy: by } : i,
    )
    updateOnboardingChecklist(recompute(checklist, items))
  }

  function setAssignee(checklist: OnboardingChecklist, item: OnboardingItem, assignedTo: string) {
    if (!canEdit) return
    const items = checklist.items.map((i) => (i.id === item.id ? { ...i, assignedTo } : i))
    updateOnboardingChecklist(recompute(checklist, items))
  }

  function setDueDate(checklist: OnboardingChecklist, item: OnboardingItem, dueDate: string) {
    if (!canEdit) return
    const items = checklist.items.map((i) => (i.id === item.id ? { ...i, dueDate: dueDate || undefined } : i))
    updateOnboardingChecklist(recompute(checklist, items))
  }

  return (
    <div>
      <PageHeader
        title="Artist Onboarding"
        subtitle="Everything that needs to happen to get a signed artist ready to work"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard icon={UsersIcon} label="In Onboarding" value={stats.total} hint="active checklists" />
        <SummaryCard icon={CheckCircle2} label="Fully Complete" value={stats.complete} hint="ready to work" accent="emerald" />
        <SummaryCard icon={Clock} label="In Progress" value={stats.inProgress} hint="partially done" accent="amber" />
        <SummaryCard
          icon={AlertTriangle}
          label="Overdue Items"
          value={stats.overdueItems}
          hint={stats.overdueItems > 0 ? `across ${stats.overduePeople} ${stats.overduePeople === 1 ? 'person' : 'people'}` : 'all on track'}
          accent={stats.overdueItems > 0 ? 'red' : undefined}
        />
      </div>

      {/* Alert banner */}
      {stats.overdueItems > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            <strong>{stats.overdueItems}</strong> onboarding {stats.overdueItems === 1 ? 'item is' : 'items are'} overdue across{' '}
            <strong>{stats.overduePeople}</strong> {stats.overduePeople === 1 ? 'person' : 'people'}.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <FilterPill active={prodFilter === 'all'} onClick={() => setProdFilter('all')}>All Productions</FilterPill>
          {productions.map((p) => (
            <FilterPill key={p.id} active={prodFilter === p.id} onClick={() => setProdFilter(p.id)}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              {p.name}
            </FilterPill>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <FilterPill key={s.id} active={statusFilter === s.id} onClick={() => setStatusFilter(s.id)} subtle>
              {s.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm bg-white border border-stone-200 rounded-lg">
          No onboarding checklists match your filters.
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map(({ production, checklists }) => (
            <div key={production.id}>
              {/* Group header */}
              <div className="flex items-center gap-2.5 mb-3 pl-0.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: production.color }} />
                <h2 className="text-sm font-semibold text-stone-800">{production.name}</h2>
                <span className="text-[11px] font-medium text-stone-400 px-1.5 py-0.5 rounded-full bg-stone-100">
                  {checklists.length}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {checklists.map((c) => (
                  <PersonCard
                    key={c.id}
                    checklist={c}
                    person={peopleById.get(c.personId)}
                    fallbackName={personName(people, c.personId)}
                    onOpen={() => setOpenId(c.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <ChecklistModal
        checklist={openChecklist}
        person={openChecklist ? peopleById.get(openChecklist.personId) : undefined}
        production={openChecklist ? prodById.get(openChecklist.productionId) : undefined}
        fallbackName={openChecklist ? personName(people, openChecklist.personId) : ''}
        canEdit={canEdit}
        onClose={() => setOpenId(null)}
        onToggle={toggleItem}
        onAssignee={setAssignee}
        onDueDate={setDueDate}
      />
    </div>
  )
}

// ── Summary card ───────────────────────────────────────────────────────────────

const ACCENTS: Record<string, { text: string; icon: string }> = {
  emerald: { text: 'text-emerald-600', icon: 'text-emerald-500' },
  amber: { text: 'text-amber-600', icon: 'text-amber-500' },
  red: { text: 'text-red-600', icon: 'text-red-500' },
}

function SummaryCard({ icon: Icon, label, value, hint, accent }: {
  icon: React.ElementType; label: string; value: number; hint: string; accent?: string
}) {
  const a = accent ? ACCENTS[accent] : undefined
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-5 py-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className={a?.icon ?? 'text-stone-400'} />
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn('text-2xl font-semibold leading-none', a?.text ?? 'text-stone-900')}>{value}</p>
      <p className="text-[11px] text-stone-400 mt-1.5">{hint}</p>
    </div>
  )
}

// ── Filter pill ────────────────────────────────────────────────────────────────

function FilterPill({ active, onClick, children, subtle }: {
  active: boolean; onClick: () => void; children: React.ReactNode; subtle?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5',
        active
          ? subtle ? 'bg-stone-700 text-white' : 'bg-stone-900 text-white'
          : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400',
      )}
    >
      {children}
    </button>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(id), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ pct, complete }: { pct: number; complete?: boolean }) {
  return (
    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-500' : 'bg-emerald-500')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Person card ────────────────────────────────────────────────────────────────

function PersonCard({ checklist, person, fallbackName, onOpen }: {
  checklist: OnboardingChecklist; person?: Person; fallbackName: string; onOpen: () => void
}) {
  const { done, total, pct } = checklistProgress(checklist)
  const overdue = onboardingOverdueItems(checklist)
  const isComplete = checklistStatus(checklist) === 'complete'
  const name = person?.name ?? fallbackName
  const sub = person ? `${person.roleType} · ${person.unionAffiliation}` : 'Artist'

  return (
    <button
      onClick={onOpen}
      className={cn(
        'text-left w-full rounded-lg border px-4 py-3.5 transition-colors group',
        isComplete
          ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar id={checklist.personId} name={name} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-stone-800 truncate">{name}</p>
            {isComplete && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
          </div>
          <p className="text-[11px] text-stone-400 truncate">{sub}</p>
        </div>
        <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-400 shrink-0 mt-0.5" />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn('text-[11px] font-medium', isComplete ? 'text-emerald-600' : 'text-stone-500')}>
            {isComplete ? 'All complete' : `${done}/${total} complete`}
          </span>
          <div className="flex items-center gap-1.5">
            {overdue > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
                {overdue} overdue
              </span>
            )}
            <span className="text-[10px] text-stone-400">{pct}%</span>
          </div>
        </div>
        <ProgressBar pct={pct} complete={isComplete} />
      </div>

      {isComplete && checklist.completedAt && (
        <p className="text-[10px] text-emerald-600/80 mt-2 flex items-center gap-1">
          <Sparkles size={10} /> Ready to work · completed {formatDate(checklist.completedAt)}
        </p>
      )}
    </button>
  )
}

// ── Detail modal ───────────────────────────────────────────────────────────────

function ChecklistModal({
  checklist, person, production, fallbackName, canEdit, onClose, onToggle, onAssignee, onDueDate,
}: {
  checklist: OnboardingChecklist | null
  person?: Person
  production?: Production
  fallbackName: string
  canEdit: boolean
  onClose: () => void
  onToggle: (c: OnboardingChecklist, i: OnboardingItem) => void
  onAssignee: (c: OnboardingChecklist, i: OnboardingItem, v: string) => void
  onDueDate: (c: OnboardingChecklist, i: OnboardingItem, v: string) => void
}) {
  const name = person?.name ?? fallbackName

  if (!checklist) return null
  const { done, total, pct } = checklistProgress(checklist)
  const isComplete = checklistStatus(checklist) === 'complete'

  // group items by category, preserving CATEGORY_ORDER
  const byCategory = CATEGORY_ORDER
    .map((cat) => ({ cat, items: checklist.items.filter((i) => i.category === cat) }))
    .filter((g) => g.items.length > 0)

  return (
    <Modal open onClose={onClose} title="Onboarding Checklist" className="max-w-2xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar id={checklist.personId} name={name} size={46} />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-stone-900 leading-tight truncate">{name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] text-stone-500">
              {person && <span>{person.roleType} · {person.unionAffiliation}</span>}
              {production && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: production.color }} />
                  {production.name}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={cn('text-sm font-semibold', isComplete ? 'text-emerald-600' : 'text-stone-700')}>{done}/{total}</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">complete</p>
          </div>
        </div>

        <ProgressBar pct={pct} complete={isComplete} />

        {/* Celebration banner */}
        {isComplete && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">All complete — ready to work</p>
              <p className="text-[11px] text-emerald-600/90">
                Every onboarding item is done{checklist.completedAt ? ` · completed ${formatDate(checklist.completedAt)}` : ''}. This checklist is archived.
              </p>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-4">
          {byCategory.map(({ cat, items }) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider', ONBOARDING_CATEGORY_COLORS[cat])}>
                  {cat}
                </span>
                <span className="text-[10px] text-stone-400">
                  {items.filter((i) => i.completedAt).length}/{items.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    checklist={checklist}
                    canEdit={canEdit}
                    onToggle={onToggle}
                    onAssignee={onAssignee}
                    onDueDate={onDueDate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ── Item row ───────────────────────────────────────────────────────────────────

function ItemRow({ item, checklist, canEdit, onToggle, onAssignee, onDueDate }: {
  item: OnboardingItem
  checklist: OnboardingChecklist
  canEdit: boolean
  onToggle: (c: OnboardingChecklist, i: OnboardingItem) => void
  onAssignee: (c: OnboardingChecklist, i: OnboardingItem, v: string) => void
  onDueDate: (c: OnboardingChecklist, i: OnboardingItem, v: string) => void
}) {
  const done = !!item.completedAt
  const overdue = isItemOverdue(item)
  const payroll = isPayrollItem(item)

  // assignee select may include a value not in the standard list (free text)
  const assigneeOptions = item.assignedTo && !ASSIGNEE_OPTIONS.includes(item.assignedTo)
    ? [item.assignedTo, ...ASSIGNEE_OPTIONS]
    : ASSIGNEE_OPTIONS

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-colors',
        done
          ? 'bg-emerald-50/40 border-emerald-100'
          : overdue
            ? 'bg-red-50/50 border-red-200'
            : payroll
              ? 'bg-white border-emerald-200 ring-1 ring-emerald-100'
              : 'bg-white border-stone-200',
      )}
    >
      {/* toggle */}
      <button
        onClick={() => onToggle(checklist, item)}
        disabled={!canEdit}
        className={cn('mt-0.5 shrink-0', canEdit ? 'cursor-pointer' : 'cursor-default')}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done
          ? <CheckCircle2 size={17} className="text-emerald-500" />
          : <Circle size={17} className={overdue ? 'text-red-400' : 'text-stone-300 hover:text-stone-400'} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className={cn('text-[13px] leading-snug', done ? 'text-stone-400 line-through' : overdue ? 'text-red-700 font-medium' : 'text-stone-700')}>
            {item.label}
          </span>
          {payroll && !done && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide shrink-0">
              CA Payroll
            </span>
          )}
          {item.required && (
            <span className={cn('text-[9px] font-semibold px-1 py-0.5 rounded uppercase tracking-wide shrink-0', done ? 'text-stone-300' : 'text-amber-600')}>
              Required
            </span>
          )}
        </div>

        {/* meta row: assignee + due date */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <UserCircle2 size={12} className="text-stone-400 shrink-0" />
            {canEdit ? (
              <select
                value={item.assignedTo ?? ''}
                onChange={(e) => onAssignee(checklist, item, e.target.value)}
                className="bg-transparent text-[11px] text-stone-600 border border-stone-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-stone-400 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            ) : (
              <span>{item.assignedTo ?? 'Unassigned'}</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <Calendar size={12} className={cn('shrink-0', overdue ? 'text-red-400' : 'text-stone-400')} />
            {canEdit ? (
              <input
                type="date"
                value={item.dueDate ?? ''}
                onChange={(e) => onDueDate(checklist, item, e.target.value)}
                className={cn(
                  'bg-transparent text-[11px] border rounded px-1.5 py-0.5 focus:outline-none focus:border-stone-400 cursor-pointer',
                  overdue ? 'text-red-600 border-red-200' : 'text-stone-600 border-stone-200',
                )}
              />
            ) : (
              item.dueDate
                ? <span className={overdue ? 'text-red-600 font-medium' : 'text-stone-500'}>{formatDate(item.dueDate)}</span>
                : <span className="text-stone-400">No due date</span>
            )}
          </div>

          {overdue && (
            <span className="text-[10px] font-semibold text-red-600">
              {Math.abs(daysUntil(item.dueDate!))}d overdue
            </span>
          )}
          {done && item.completedBy && (
            <span className="text-[10px] text-emerald-600/80">✓ by {item.completedBy}</span>
          )}
        </div>
      </div>
    </div>
  )
}
