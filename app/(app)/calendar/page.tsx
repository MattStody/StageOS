'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate, daysUntil, statusLabel } from '@/lib/utils'
import { Plus, Trash2, Pencil, AlertTriangle, CalendarDays } from 'lucide-react'
import { useAccess } from '@/lib/useAccess'
import type { Deadline, DeadlineType, DeadlineStatus, CustomEvent } from '@/lib/types'

const DEADLINE_TYPES: DeadlineType[] = [
  'contract', 'rehearsal', 'tech', 'preview', 'opening', 'press',
  'payroll', 'royalty', 'marketing', 'settlement', 'closing', 'general',
]

const DEADLINE_STATUSES: DeadlineStatus[] = ['upcoming', 'completed', 'overdue', 'at_risk']

const typeLabel: Record<DeadlineType, string> = {
  contract: 'Contract', rehearsal: 'Rehearsal', tech: 'Tech', preview: 'Preview',
  opening: 'Opening', press: 'Press Night', payroll: 'Payroll', royalty: 'Royalty',
  marketing: 'Marketing', settlement: 'Settlement', closing: 'Closing', general: 'General',
}

const typeColor: Record<DeadlineType, string> = {
  contract: 'bg-violet-100 text-violet-700', rehearsal: 'bg-sky-100 text-sky-700',
  tech: 'bg-indigo-100 text-indigo-700', preview: 'bg-amber-100 text-amber-700',
  opening: 'bg-emerald-100 text-emerald-700', press: 'bg-pink-100 text-pink-700',
  payroll: 'bg-red-100 text-red-700', royalty: 'bg-orange-100 text-orange-700',
  marketing: 'bg-cyan-100 text-cyan-700', settlement: 'bg-teal-100 text-teal-700',
  closing: 'bg-stone-200 text-stone-700', general: 'bg-stone-100 text-stone-600',
}

const blankDeadline = (productionId: string): Omit<Deadline, 'id'> => ({
  productionId, title: '', date: '', type: 'general', status: 'upcoming', notes: '', assignedTo: '',
})

const blankEvent = (productionId: string): Omit<CustomEvent, 'id'> => ({
  productionId, title: '', date: '', color: '#6366f1', category: '', notes: '',
})

function HexColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)

  function handleTextChange(raw: string) {
    const v = raw.startsWith('#') ? raw : '#' + raw
    setText(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  function syncText() {
    setText(value)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => { onChange(e.target.value); setText(e.target.value) }}
        className="w-9 h-9 rounded cursor-pointer border border-stone-200 shrink-0"
      />
      <input
        type="text"
        value={text === value ? value : text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={syncText}
        placeholder="#000000"
        maxLength={7}
        className="w-24 px-2 py-1.5 text-xs font-mono border border-stone-300 rounded focus:outline-none focus:border-stone-500"
      />
    </div>
  )
}

export default function CalendarPage() {
  const { productions, deadlines, addDeadline, updateDeadline, deleteDeadline, customEvents, addCustomEvent, updateCustomEvent, deleteCustomEvent } = useStore()
  const { canEdit } = useAccess()

  const [tab, setTab] = useState<'deadlines' | 'events' | 'calendar'>('deadlines')
  const [selectedProd, setSelectedProd] = useState('all')

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth()) // 0-indexed

  // Deadline state
  const [filterStatus, setFilterStatus] = useState<DeadlineStatus | 'all'>('all')
  const [deadlineModal, setDeadlineModal] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null)
  const [deadlineForm, setDeadlineForm] = useState<Omit<Deadline, 'id'>>(blankDeadline(productions[0]?.id || ''))

  // Custom event state
  const [eventModal, setEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null)
  const [eventForm, setEventForm] = useState<Omit<CustomEvent, 'id'>>(blankEvent(productions[0]?.id || ''))

  // ── Filtered deadlines ──
  const filteredDeadlines = deadlines
    .filter((d) => {
      if (selectedProd !== 'all' && d.productionId !== selectedProd) return false
      if (filterStatus !== 'all' && d.status !== filterStatus) return false
      return true
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const overdue = filteredDeadlines.filter((d) => d.status === 'overdue')
  const atRisk = filteredDeadlines.filter((d) => d.status === 'at_risk')
  const upcoming = filteredDeadlines.filter((d) => d.status === 'upcoming')
  const completed = filteredDeadlines.filter((d) => d.status === 'completed')

  // ── Filtered custom events ──
  const filteredEvents = customEvents
    .filter((e) => selectedProd === 'all' || e.productionId === selectedProd)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // ── Deadline handlers ──
  function openAddDeadline() {
    setEditingDeadline(null)
    setDeadlineForm(blankDeadline(selectedProd !== 'all' ? selectedProd : productions[0]?.id || ''))
    setDeadlineModal(true)
  }

  function openEditDeadline(d: Deadline) {
    setEditingDeadline(d)
    setDeadlineForm({ ...d })
    setDeadlineModal(true)
  }

  function saveDeadline() {
    if (editingDeadline) {
      updateDeadline({ ...deadlineForm, id: editingDeadline.id })
    } else {
      addDeadline({ ...deadlineForm, id: `d-${Date.now()}` })
    }
    setDeadlineModal(false)
  }

  // ── Custom event handlers ──
  function openAddEvent() {
    setEditingEvent(null)
    setEventForm(blankEvent(selectedProd !== 'all' ? selectedProd : productions[0]?.id || ''))
    setEventModal(true)
  }

  function openEditEvent(e: CustomEvent) {
    setEditingEvent(e)
    setEventForm({ ...e })
    setEventModal(true)
  }

  function saveEvent() {
    if (editingEvent) {
      updateCustomEvent({ ...eventForm, id: editingEvent.id })
    } else {
      addCustomEvent({ ...eventForm, id: `ce-${Date.now()}` })
    }
    setEventModal(false)
  }

  // ── Sub-components ──
  function DeadlineRow({ d }: { d: Deadline }) {
    const days = daysUntil(d.date)
    const prod = productions.find((p) => p.id === d.productionId)
    return (
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-stone-100 hover:bg-stone-50/50 group last:border-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-6 sm:w-8 text-center shrink-0">
            {d.status === 'overdue' ? (
              <AlertTriangle size={14} className="text-red-500 mx-auto" />
            ) : days <= 7 && d.status !== 'completed' ? (
              <AlertTriangle size={14} className="text-amber-500 mx-auto" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ backgroundColor: prod?.color || '#a8a29e' }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className={`text-sm font-medium truncate ${d.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{d.title}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 hidden sm:inline ${typeColor[d.type]}`}>{typeLabel[d.type]}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              {selectedProd === 'all' && <span className="truncate">{prod?.name}</span>}
              {selectedProd === 'all' && d.assignedTo && <span>·</span>}
              {d.assignedTo && <span className="truncate">{d.assignedTo}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
          <div className="text-right">
            <p className="text-xs text-stone-700 font-medium whitespace-nowrap">{formatDate(d.date)}</p>
            <p className={`text-xs ${d.status === 'completed' ? 'text-stone-400' : days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-stone-500'}`}>
              {d.status === 'completed' ? 'Done' : days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'Today' : `${days}d`}
            </p>
          </div>
          <Badge variant={d.status} className="hidden sm:inline-flex">{statusLabel(d.status)}</Badge>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {canEdit && <button onClick={() => openEditDeadline(d)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
            {canEdit && <button onClick={() => deleteDeadline(d.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
          </div>
        </div>
      </div>
    )
  }

  function EventRow({ e }: { e: CustomEvent }) {
    const prod = productions.find((p) => p.id === e.productionId)
    const days = daysUntil(e.date)
    return (
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-stone-100 hover:bg-stone-50/50 group last:border-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-6 sm:w-8 text-center shrink-0">
            <div className="w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: e.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-sm font-medium text-stone-800 truncate">{e.title}</p>
              {e.category && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium text-white shrink-0 hidden sm:inline"
                  style={{ backgroundColor: e.color }}
                >
                  {e.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              {selectedProd === 'all' && <span className="truncate">{prod?.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
          <div className="text-right">
            <p className="text-xs text-stone-700 font-medium whitespace-nowrap">{formatDate(e.date)}</p>
            <p className={`text-xs ${days < 0 ? 'text-stone-400' : days === 0 ? 'text-emerald-600' : days <= 7 ? 'text-amber-600' : 'text-stone-500'}`}>
              {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `in ${days}d`}
            </p>
          </div>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {canEdit && <button onClick={() => openEditEvent(e)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
            {canEdit && <button onClick={() => deleteCustomEvent(e.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
          </div>
        </div>
      </div>
    )
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(calYear, calMonth, 1))
    const lastDay = new Date(Date.UTC(calYear, calMonth + 1, 0))
    // Start grid on Monday
    let startDow = firstDay.getUTCDay() // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1 // convert to Mon=0
    const days: Array<{ date: string | null; day: number | null }> = []
    for (let i = 0; i < startDow; i++) days.push({ date: null, day: null })
    for (let d = 1; d <= lastDay.getUTCDate(); d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: dateStr, day: d })
    }
    // Pad to fill last row
    while (days.length % 7 !== 0) days.push({ date: null, day: null })
    return days
  }, [calYear, calMonth])

  const calDeadlines = deadlines.filter((d) => selectedProd === 'all' || d.productionId === selectedProd)
  const calEvents = customEvents.filter((e) => selectedProd === 'all' || e.productionId === selectedProd)

  function getItemsForDate(dateStr: string) {
    const dl = calDeadlines.filter((d) => d.date === dateStr)
    const ev = calEvents.filter((e) => e.date === dateStr)
    return { dl, ev }
  }

  const addAction = canEdit
    ? tab === 'deadlines'
      ? <Button onClick={openAddDeadline} size="sm"><Plus size={13} /> Add Deadline</Button>
      : tab === 'events' ? <Button onClick={openAddEvent} size="sm"><Plus size={13} /> Add Event</Button>
      : undefined
    : undefined

  return (
    <div>
      <PageHeader
        title="Production Calendar"
        subtitle="Deadlines, milestones, and custom events"
        actions={addAction}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-stone-200">
        {(['deadlines', 'events'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              tab === t ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t === 'deadlines' ? 'Deadlines' : 'Custom Events'}
            <span className="ml-1.5 text-xs font-normal text-stone-400">
              ({t === 'deadlines' ? deadlines.filter(d => selectedProd === 'all' || d.productionId === selectedProd).length : customEvents.filter(e => selectedProd === 'all' || e.productionId === selectedProd).length})
            </span>
          </button>
        ))}
        <button key="calendar" onClick={() => setTab('calendar')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'calendar' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
          Calendar
        </button>
      </div>

      {/* Production filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setSelectedProd('all')} className={`px-3 py-1.5 rounded text-xs transition-colors ${selectedProd === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>All</button>
        {productions.map((p) => (
          <button key={p.id} onClick={() => setSelectedProd(p.id)} className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* ── Deadlines tab ── */}
      {tab === 'deadlines' && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {DEADLINE_STATUSES.map((s) => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)} className={`px-3 py-1 rounded text-xs transition-colors ${filterStatus === s ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-400'}`}>
                {statusLabel(s)}
              </button>
            ))}
          </div>
          {[
            { label: 'Overdue', items: overdue, headerClass: 'text-red-700' },
            { label: 'At Risk', items: atRisk, headerClass: 'text-amber-700' },
            { label: 'Upcoming', items: upcoming, headerClass: 'text-stone-700' },
            { label: 'Completed', items: completed, headerClass: 'text-stone-400' },
          ].map(({ label, items, headerClass }) => {
            if (items.length === 0) return null
            return (
              <div key={label} className="mb-6">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${headerClass}`}>{label} <span className="text-stone-400 font-normal">({items.length})</span></h3>
                <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                  {items.map((d) => <DeadlineRow key={d.id} d={d} />)}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── Custom events tab ── */}
      {tab === 'events' && (
        <>
          {filteredEvents.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-lg py-12 text-center">
              <p className="text-sm text-stone-400">No custom events yet.</p>
              {canEdit && <p className="text-xs text-stone-400 mt-1">Click &quot;Add Event&quot; to create one.</p>}
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              {filteredEvents.map((e) => <EventRow key={e.id} e={e} />)}
            </div>
          )}
        </>
      )}

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && (
        <div>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
              className="px-3 py-1.5 text-sm border border-stone-200 rounded hover:border-stone-400 transition-colors bg-white"
            >
              ← Prev
            </button>
            <h3 className="text-sm font-semibold text-stone-800">{MONTH_NAMES[calMonth]} {calYear}</h3>
            <button
              onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
              className="px-3 py-1.5 text-sm border border-stone-200 rounded hover:border-stone-400 transition-colors bg-white"
            >
              Next →
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-l border-t border-stone-200 rounded-lg overflow-hidden">
            {calendarDays.map((cell, idx) => {
              if (!cell.date) {
                return <div key={`empty-${idx}`} className="min-h-[80px] bg-stone-50 border-r border-b border-stone-200" />
              }
              const { dl, ev } = getItemsForDate(cell.date)
              const isToday = cell.date === new Date().toISOString().split('T')[0]
              const total = dl.length + ev.length
              const showItems = [...dl.slice(0, 2).map(d => ({ type: 'dl' as const, item: d })), ...ev.slice(0, Math.max(0, 3 - dl.length)).map(e => ({ type: 'ev' as const, item: e }))]
              const overflow = total - showItems.length
              return (
                <div key={cell.date} className={`min-h-[80px] border-r border-b border-stone-200 p-1.5 ${isToday ? 'bg-stone-50 ring-1 ring-inset ring-stone-400' : 'bg-white hover:bg-stone-50/50'}`}>
                  <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {showItems.map(({ type, item }) => {
                      const prod = productions.find(p => p.id === item.productionId)
                      const color = type === 'ev' ? (item as CustomEvent).color : prod?.color || '#a8a29e'
                      return (
                        <div
                          key={item.id}
                          title={item.title}
                          className="text-xs px-1 py-0.5 rounded truncate text-white leading-tight"
                          style={{ backgroundColor: color }}
                        >
                          {item.title}
                        </div>
                      )
                    })}
                    {overflow > 0 && (
                      <div className="text-xs text-stone-400 pl-1">+{overflow} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Deadline modal ── */}
      <Modal open={deadlineModal} onClose={() => setDeadlineModal(false)} title={editingDeadline ? 'Edit Deadline' : 'Add Deadline'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Production</label>
            <select value={deadlineForm.productionId} onChange={(e) => setDeadlineForm({ ...deadlineForm, productionId: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
              {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Title</label>
            <input value={deadlineForm.title} onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={deadlineForm.date} onChange={(e) => setDeadlineForm({ ...deadlineForm, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Type</label>
              <select value={deadlineForm.type} onChange={(e) => setDeadlineForm({ ...deadlineForm, type: e.target.value as DeadlineType })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select value={deadlineForm.status} onChange={(e) => setDeadlineForm({ ...deadlineForm, status: e.target.value as DeadlineStatus })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {DEADLINE_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Assigned To</label>
              <input value={deadlineForm.assignedTo} onChange={(e) => setDeadlineForm({ ...deadlineForm, assignedTo: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
              <input value={deadlineForm.notes} onChange={(e) => setDeadlineForm({ ...deadlineForm, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeadlineModal(false)}>Cancel</Button>
            <Button onClick={saveDeadline}>{editingDeadline ? 'Save Changes' : 'Add Deadline'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Custom event modal ── */}
      <Modal open={eventModal} onClose={() => setEventModal(false)} title={editingEvent ? 'Edit Event' : 'Add Custom Event'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Production</label>
            <select value={eventForm.productionId} onChange={(e) => setEventForm({ ...eventForm, productionId: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
              {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Event Title</label>
            <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Investor Reception, Photo Call, Meet & Greet" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Category Label</label>
              <input value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} placeholder="e.g. Investor, Fan Event, Media" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Event Color</label>
            <HexColorInput value={eventForm.color} onChange={(v) => setEventForm({ ...eventForm, color: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEventModal(false)}>Cancel</Button>
            <Button onClick={saveEvent}>{editingEvent ? 'Save Changes' : 'Add Event'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
