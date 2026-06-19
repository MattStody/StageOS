'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { initials, avatarColor } from '@/lib/company'
import {
  Ruler, Shirt, Search, Check, ChevronRight, AlertCircle, X,
} from 'lucide-react'
import type { Person, PersonMeasurements, Production } from '@/lib/types'

// ── Measurement fields ────────────────────────────────────────────────────────

const MEAS_FIELDS: { key: keyof Omit<PersonMeasurements, 'lastUpdated' | 'notes'>; label: string; short: string }[] = [
  { key: 'height',       label: 'Height',      short: 'Ht' },
  { key: 'weight',       label: 'Weight',      short: 'Wt' },
  { key: 'chest',        label: 'Chest/Bust',  short: 'Ch' },
  { key: 'waist',        label: 'Waist',       short: 'Wa' },
  { key: 'hips',         label: 'Hips',        short: 'Hi' },
  { key: 'inseam',       label: 'Inseam',      short: 'In' },
  { key: 'dressSuitSize',label: 'Dress/Suit',  short: 'Dr' },
  { key: 'shoeSize',     label: 'Shoe',        short: 'Sh' },
  { key: 'hatSize',      label: 'Hat',         short: 'Ha' },
]

function completeness(m?: PersonMeasurements): number {
  if (!m) return 0
  const filled = MEAS_FIELDS.filter((f) => !!(m as unknown as Record<string, string | undefined>)[f.key]).length
  return Math.round((filled / MEAS_FIELDS.length) * 100)
}

function CompletenessPill({ pct }: { pct: number }) {
  const cls =
    pct === 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    pct >= 50   ? 'text-amber-700 bg-amber-50 border-amber-200' :
    pct > 0     ? 'text-orange-700 bg-orange-50 border-orange-200' :
                  'text-stone-400 bg-stone-100 border-stone-200'
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border', cls)}>
      {pct === 100 && <Check size={9} />}
      {pct === 0 ? 'Missing' : `${pct}%`}
    </span>
  )
}

function Avatar({ person, size = 32 }: { person: Person; size?: number }) {
  if (person.headshotUrl) {
    return (
      <img
        src={person.headshotUrl}
        alt={person.name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(person.id), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(person.name)}
    </span>
  )
}

// ── Measurements form (shared between modal + inline) ─────────────────────────

const inputCls = 'w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'

interface MeasFormProps {
  person: Person
  onSave: (patch: Partial<Person>) => void
  onCancel: () => void
  canEdit: boolean
}

function MeasForm({ person, onSave, onCancel, canEdit }: MeasFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [draft, setDraft] = useState<PersonMeasurements>({
    lastUpdated: today,
    ...person.measurements,
  })

  function patch(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value, lastUpdated: today }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
        <Avatar person={person} size={40} />
        <div>
          <p className="text-sm font-semibold text-stone-900">{person.name}</p>
          <p className="text-xs text-stone-500">{person.roleType}</p>
        </div>
        <CompletenessPill pct={completeness(person.measurements)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MEAS_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-[11px] text-stone-500 font-medium mb-1">{label}</label>
            <input
              className={inputCls}
              value={(draft as unknown as Record<string, string | undefined>)[key] ?? ''}
              onChange={(e) => patch(key, e.target.value)}
              disabled={!canEdit}
              placeholder="—"
            />
          </div>
        ))}
        <div className="col-span-3">
          <label className="block text-[11px] text-stone-500 font-medium mb-1">Notes</label>
          <input
            className={inputCls}
            value={draft.notes ?? ''}
            onChange={(e) => patch('notes', e.target.value)}
            disabled={!canEdit}
            placeholder="Wardrobe notes, fabric preferences…"
          />
        </div>
      </div>

      {draft.lastUpdated && (
        <p className="text-[10px] text-stone-400">Last updated {draft.lastUpdated}</p>
      )}

      {canEdit && (
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={() => onSave({ measurements: draft })}>Save measurements</Button>
        </div>
      )}
    </div>
  )
}

// ── Person picker (step 1 of quick-entry modal) ───────────────────────────────

function PersonPicker({
  people,
  onPick,
}: {
  people: Person[]
  onPick: (p: Person) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() =>
    q.trim() ? people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : people,
    [people, q]
  )
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">Who needs measurements updated?</p>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className="w-full rounded border border-stone-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.map((p) => {
          const pct = completeness(p.measurements)
          return (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-stone-50 text-left transition-colors"
            >
              <Avatar person={p} size={30} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                <p className="text-[11px] text-stone-500">{p.roleType}</p>
              </div>
              <CompletenessPill pct={pct} />
              <ChevronRight size={14} className="text-stone-300 shrink-0" />
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-stone-400 py-4 text-center">No results</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WardrobePage() {
  const { people, productions, updatePerson } = useStore()
  const { canEdit } = useAccess()

  const [prodFilter, setProdFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [modalPerson, setModalPerson] = useState<Person | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickPicked, setQuickPicked] = useState<Person | null>(null)

  // People relevant to active productions (those with productionHistory)
  const activePeople = useMemo(() => {
    let list = [...people].filter((p) => p.productionHistory.length > 0)
    if (prodFilter !== 'all') {
      list = list.filter((p) => p.productionHistory.some((h) => h.productionId === prodFilter))
    }
    if (search.trim()) {
      list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [people, prodFilter, search])

  const missingCount = activePeople.filter((p) => completeness(p.measurements) < 100).length

  function saveAndClose(person: Person, patch: Partial<Person>) {
    updatePerson({ ...person, ...patch, updatedAt: new Date().toISOString() })
    setModalPerson(null)
    setQuickPicked(null)
    setQuickOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Wardrobe"
        subtitle={`${activePeople.length} company members · ${missingCount} incomplete`}
        actions={
          canEdit && (
            <Button size="sm" onClick={() => { setQuickPicked(null); setQuickOpen(true) }}>
              <Ruler size={14} className="mr-1.5" />
              Update measurements
            </Button>
          )
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Production tabs */}
          <div className="flex rounded border border-stone-200 overflow-hidden text-xs">
            {[{ id: 'all', name: 'All productions' }, ...productions].map((prod) => (
              <button
                key={prod.id}
                onClick={() => setProdFilter(prod.id)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  prodFilter === prod.id
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-50',
                )}
              >
                {'color' in prod && (
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: prod.color }}
                  />
                )}
                {prod.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className="rounded border border-stone-200 pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-48"
              placeholder="Search names…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Missing measurements alert */}
        {missingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertCircle size={13} />
            <span>{missingCount} company member{missingCount !== 1 ? 's' : ''} have incomplete measurements.</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-stone-500">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                {MEAS_FIELDS.map((f) => (
                  <th key={f.key} className="text-center px-2 py-2.5 font-medium w-14">{f.short}</th>
                ))}
                <th className="text-center px-3 py-2.5 font-medium">Complete</th>
                <th className="text-right px-4 py-2.5 font-medium">Updated</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {activePeople.map((person, i) => {
                const m = person.measurements
                const pct = completeness(m)
                return (
                  <tr
                    key={person.id}
                    className={cn(
                      'border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer transition-colors',
                      i % 2 === 1 ? 'bg-stone-50/30' : '',
                    )}
                    onClick={() => setModalPerson(person)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar person={person} size={28} />
                        <div className="min-w-0">
                          <p className="font-medium text-stone-800 truncate">{person.name}</p>
                          <p className="text-[10px] text-stone-400">{person.roleType}</p>
                        </div>
                      </div>
                    </td>
                    {MEAS_FIELDS.map((f) => {
                      const val = m ? (m as unknown as Record<string, string | undefined>)[f.key] : undefined
                      return (
                        <td key={f.key} className="text-center px-2 py-2.5 text-stone-600">
                          {val
                            ? <span className="font-medium">{val}</span>
                            : <span className="text-stone-300">—</span>
                          }
                        </td>
                      )
                    })}
                    <td className="text-center px-3 py-2.5">
                      <CompletenessPill pct={pct} />
                    </td>
                    <td className="text-right px-4 py-2.5 text-stone-400">
                      {m?.lastUpdated ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <ChevronRight size={13} className="text-stone-300 inline" />
                    </td>
                  </tr>
                )
              })}
              {activePeople.length === 0 && (
                <tr>
                  <td colSpan={MEAS_FIELDS.length + 4} className="text-center py-12 text-stone-400">
                    No company members match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row click: edit measurements for a specific person */}
      {modalPerson && (
        <Modal
          open
          onClose={() => setModalPerson(null)}
          title={`Measurements — ${modalPerson.name}`}
          className="max-w-lg"
        >
          <MeasForm
            person={modalPerson}
            canEdit={canEdit}
            onSave={(patch) => saveAndClose(modalPerson, patch)}
            onCancel={() => setModalPerson(null)}
          />
        </Modal>
      )}

      {/* Quick "Update Measurements" button: step 1 pick person, step 2 edit */}
      {quickOpen && (
        <Modal
          open
          onClose={() => { setQuickOpen(false); setQuickPicked(null) }}
          title={quickPicked ? `Measurements — ${quickPicked.name}` : 'Update Measurements'}
          className="max-w-lg"
        >
          {quickPicked ? (
            <MeasForm
              person={quickPicked}
              canEdit={canEdit}
              onSave={(patch) => saveAndClose(quickPicked, patch)}
              onCancel={() => setQuickPicked(null)}
            />
          ) : (
            <PersonPicker
              people={people.filter((p) => p.productionHistory.length > 0)}
              onPick={setQuickPicked}
            />
          )}
        </Modal>
      )}
    </>
  )
}
