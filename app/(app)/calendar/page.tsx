'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate, daysUntil, statusLabel } from '@/lib/utils'
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Deadline, DeadlineType, DeadlineStatus } from '@/lib/types'

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

const blank = (productionId: string): Omit<Deadline, 'id'> => ({
  productionId,
  title: '',
  date: '',
  type: 'general',
  status: 'upcoming',
  notes: '',
  assignedTo: '',
})

export default function CalendarPage() {
  const { productions, deadlines, addDeadline, updateDeadline, deleteDeadline } = useStore()
  const { isAdmin } = useAuth()

  const [selectedProd, setSelectedProd] = useState('all')
  const [filterType, setFilterType] = useState<DeadlineType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<DeadlineStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Deadline | null>(null)
  const [form, setForm] = useState<Omit<Deadline, 'id'>>(blank(productions[0]?.id || ''))

  const filtered = deadlines
    .filter((d) => {
      if (selectedProd !== 'all' && d.productionId !== selectedProd) return false
      if (filterType !== 'all' && d.type !== filterType) return false
      if (filterStatus !== 'all' && d.status !== filterStatus) return false
      return true
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const overdue = filtered.filter((d) => d.status === 'overdue')
  const atRisk = filtered.filter((d) => d.status === 'at_risk')
  const upcoming = filtered.filter((d) => d.status === 'upcoming')
  const completed = filtered.filter((d) => d.status === 'completed')

  function openAdd() {
    setEditing(null)
    setForm(blank(selectedProd !== 'all' ? selectedProd : productions[0]?.id || ''))
    setModalOpen(true)
  }

  function openEdit(d: Deadline) {
    setEditing(d)
    setForm({ ...d })
    setModalOpen(true)
  }

  function handleSave() {
    if (editing) {
      updateDeadline({ ...form, id: editing.id })
    } else {
      addDeadline({ ...form, id: `d-${Date.now()}` })
    }
    setModalOpen(false)
  }

  function DeadlineRow({ d }: { d: Deadline }) {
    const days = daysUntil(d.date)
    const prod = productions.find((p) => p.id === d.productionId)
    return (
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 hover:bg-stone-50/50 group last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-8 text-center shrink-0">
            {d.status === 'overdue' ? (
              <AlertTriangle size={14} className="text-red-500 mx-auto" />
            ) : days <= 7 && d.status !== 'completed' ? (
              <AlertTriangle size={14} className="text-amber-500 mx-auto" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ backgroundColor: prod?.color || '#a8a29e' }} />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className={`text-sm font-medium ${d.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{d.title}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[d.type]}`}>{typeLabel[d.type]}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              {selectedProd === 'all' && <span>{prod?.name}</span>}
              {selectedProd === 'all' && d.assignedTo && <span>·</span>}
              {d.assignedTo && <span>{d.assignedTo}</span>}
              {d.notes && <><span>·</span><span className="truncate max-w-xs">{d.notes}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="text-right">
            <p className="text-xs text-stone-700 font-medium">{formatDate(d.date)}</p>
            <p className={`text-xs ${d.status === 'completed' ? 'text-stone-400' : days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-stone-500'}`}>
              {d.status === 'completed' ? 'Done' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
            </p>
          </div>
          <Badge variant={d.status}>{statusLabel(d.status)}</Badge>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin && <button onClick={() => openEdit(d)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
            {isAdmin && <button onClick={() => deleteDeadline(d.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Production Calendar"
        subtitle="Deadlines, milestones, and key dates"
        actions={isAdmin ? <Button onClick={openAdd} size="sm"><Plus size={13} /> Add Deadline</Button> : undefined}
      />

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setSelectedProd('all')} className={`px-3 py-1.5 rounded text-xs transition-colors ${selectedProd === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>All</button>
        {productions.map((p) => (
          <button key={p.id} onClick={() => setSelectedProd(p.id)} className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {DEADLINE_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)} className={`px-3 py-1 rounded text-xs transition-colors ${filterStatus === s ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-400'}`}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Sections */}
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

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Deadline' : 'Add Deadline'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Production</label>
            <select value={form.productionId} onChange={(e) => setForm({ ...form, productionId: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
              {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DeadlineType })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DeadlineStatus })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {DEADLINE_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Assigned To</label>
              <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Deadline'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
