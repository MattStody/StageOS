'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, formatDate } from '@/lib/utils'
import {
  personName, perDiemOutstanding, perDiemOverdue, avatarColor, initials, downloadCSV,
} from '@/lib/company'
import {
  Plus, Download, AlertTriangle, Banknote, CheckCircle2, Trash2, Users,
} from 'lucide-react'
import type { PerDiemEntry, PerDiemPayment } from '@/lib/types'

type GroupDim = 'production' | 'person'

const PAY_METHODS = ['EFT', 'Cheque', 'Cash', 'E-transfer', 'EFT — batch']

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const a = new Date(start + 'T12:00:00').getTime()
  const b = new Date(end + 'T12:00:00').getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1)
}

function Avatar({ id, name, size = 30 }: { id: string; name: string; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(id), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full rounded border border-stone-300 px-2.5 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300'

export default function PerDiemLedgerPage() {
  const { people, productions, perDiemEntries, addPerDiemEntry, updatePerDiemEntry, deletePerDiemEntry } = useStore()
  const { canEdit } = useAccess()

  const [groupBy, setGroupBy] = useState<GroupDim>('production')
  const [prodFilter, setProdFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)

  // ── Filtered entries ───────────────────────────────────────────────────────
  const filtered = useMemo(
    () => perDiemEntries.filter((e) => prodFilter === 'all' || e.productionId === prodFilter),
    [perDiemEntries, prodFilter],
  )

  // ── Summary totals ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalOwed = filtered.reduce((s, e) => s + e.totalOwed, 0)
    const totalPaid = filtered.reduce((s, e) => s + e.totalPaid, 0)
    const outstanding = filtered.reduce((s, e) => s + perDiemOutstanding(e), 0)
    const overdue = filtered.filter((e) => perDiemOverdue(e))
    const overdueTotal = overdue.reduce((s, e) => s + perDiemOutstanding(e), 0)
    return { totalOwed, totalPaid, outstanding, overdueCount: overdue.length, overdueTotal }
  }, [filtered])

  // ── Grouping ───────────────────────────────────────────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; color?: string; entries: PerDiemEntry[] }>()
    for (const e of filtered) {
      const key = groupBy === 'production' ? e.productionId : e.personId
      if (!map.has(key)) {
        const label =
          groupBy === 'production'
            ? (productions.find((p) => p.id === key)?.name ?? 'Unknown production')
            : personName(people, key)
        const color = groupBy === 'production' ? productions.find((p) => p.id === key)?.color : undefined
        map.set(key, { key, label, color, entries: [] })
      }
      map.get(key)!.entries.push(e)
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [filtered, groupBy, productions, people])

  const open = perDiemEntries.find((e) => e.id === openId) ?? null

  // ── Batch mark-as-paid ───────────────────────────────────────────────────────
  const batchTargets = useMemo(() => filtered.filter((e) => perDiemOutstanding(e) > 0), [filtered])
  const batchTotal = batchTargets.reduce((s, e) => s + perDiemOutstanding(e), 0)
  const batchPeople = new Set(batchTargets.map((e) => e.personId)).size

  function runBatch() {
    for (const e of batchTargets) {
      const amount = perDiemOutstanding(e)
      const payment: PerDiemPayment = {
        id: uid('pdp'),
        date: todayISO(),
        amount,
        method: 'EFT — batch',
        notes: 'Batch settlement',
      }
      updatePerDiemEntry({ ...e, totalPaid: e.totalOwed, payments: [...e.payments, payment] })
    }
    setBatchOpen(false)
  }

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows: (string | number)[][] = [
      ['Person', 'Production', 'Daily Rate (CAD)', 'Period', 'Owed (CAD)', 'Paid (CAD)', 'Outstanding (CAD)'],
    ]
    for (const e of filtered) {
      rows.push([
        personName(people, e.personId),
        productions.find((p) => p.id === e.productionId)?.name ?? 'Unknown',
        e.dailyRate,
        `${formatDate(e.periodStart)} – ${formatDate(e.periodEnd)}`,
        e.totalOwed,
        e.totalPaid,
        perDiemOutstanding(e),
      ])
    }
    downloadCSV('per-diems.csv', rows)
  }

  return (
    <div>
      <PageHeader
        title="Per Diem Ledger"
        subtitle="Track every per diem obligation across the company — all amounts in CAD"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> Add entry
              </Button>
            )}
          </>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Total per diems owed" value={fmt(summary.totalOwed)} />
        <SummaryCard label="Total paid to date" value={fmt(summary.totalPaid)} />
        <SummaryCard
          label="Outstanding balance"
          value={fmt(summary.outstanding)}
          emphasize={summary.outstanding > 0}
        />
        <SummaryCard
          label="Overdue"
          value={String(summary.overdueCount)}
          danger={summary.overdueCount > 0}
        />
      </div>

      {/* Overdue alert banner */}
      {summary.overdueCount > 0 && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{summary.overdueCount}</strong> per diem {summary.overdueCount === 1 ? 'entry is' : 'entries are'} overdue —{' '}
            <strong>{fmt(summary.overdueTotal)}</strong> outstanding past the start of the pay period.
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Group toggle */}
          <div className="inline-flex rounded border border-stone-300 overflow-hidden text-xs">
            {(['production', 'person'] as GroupDim[]).map((d) => (
              <button
                key={d}
                onClick={() => setGroupBy(d)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors cursor-pointer',
                  groupBy === d ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-50',
                )}
              >
                {d === 'production' ? 'By Production' : 'By Person'}
              </button>
            ))}
          </div>

          {/* Production filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill active={prodFilter === 'all'} onClick={() => setProdFilter('all')}>
              All
            </FilterPill>
            {productions.map((p) => (
              <FilterPill key={p.id} active={prodFilter === p.id} onClick={() => setProdFilter(p.id)}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Batch pay — key demo feature */}
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setBatchOpen(true)}
            disabled={batchTargets.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Banknote size={14} /> Mark batch as paid
            {batchTargets.length > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{fmt(batchTotal)}</span>
            )}
          </Button>
        )}
      </div>

      {/* Ledger table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Production</th>
                <th className="px-4 py-2.5 text-right">Daily rate</th>
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5 text-right">Owed</th>
                <th className="px-4 py-2.5 text-right">Paid</th>
                <th className="px-4 py-2.5 text-right">Outstanding</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400 text-sm">
                    No per diem entries for this filter.
                  </td>
                </tr>
              )}
              {groups.map((g) => {
                const gOwed = g.entries.reduce((s, e) => s + e.totalOwed, 0)
                const gPaid = g.entries.reduce((s, e) => s + e.totalPaid, 0)
                const gOut = g.entries.reduce((s, e) => s + perDiemOutstanding(e), 0)
                return (
                  <GroupBlock key={g.key}>
                    {/* Group header */}
                    <tr className="bg-stone-50 border-y border-stone-200">
                      <td colSpan={4} className="px-4 py-2">
                        <span className="flex items-center gap-2 font-semibold text-stone-700 text-sm">
                          {g.color && (
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                          )}
                          {g.label}
                          <span className="text-xs font-normal text-stone-400">
                            ({g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'})
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-stone-600 text-xs">{fmt(gOwed)}</td>
                      <td className="px-4 py-2 text-right font-medium text-stone-600 text-xs">{fmt(gPaid)}</td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right font-semibold text-xs',
                          gOut > 0 ? 'text-amber-800' : 'text-stone-400',
                        )}
                      >
                        {fmt(gOut)}
                      </td>
                      <td />
                    </tr>

                    {/* Entry rows */}
                    {g.entries.map((e) => {
                      const overdue = perDiemOverdue(e)
                      const out = perDiemOutstanding(e)
                      const prod = productions.find((p) => p.id === e.productionId)
                      return (
                        <tr
                          key={e.id}
                          onClick={() => setOpenId(e.id)}
                          className={cn(
                            'group border-b border-stone-100 last:border-0 cursor-pointer hover:bg-stone-50 transition-colors',
                            overdue && 'border-l-2 border-l-red-400',
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2.5">
                              <Avatar id={e.personId} name={personName(people, e.personId)} />
                              <span className="font-medium text-stone-800">{personName(people, e.personId)}</span>
                              {overdue && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-stone-600">
                            <span className="flex items-center gap-1.5">
                              {prod?.color && (
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prod.color }} />
                              )}
                              {prod?.name ?? 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-stone-600 tabular-nums">{fmt(e.dailyRate)}</td>
                          <td className="px-4 py-2.5 text-stone-600 whitespace-nowrap">
                            {formatDate(e.periodStart)} – {formatDate(e.periodEnd)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-stone-700 tabular-nums">{fmt(e.totalOwed)}</td>
                          <td className="px-4 py-2.5 text-right text-stone-700 tabular-nums">{fmt(e.totalPaid)}</td>
                          <td
                            className={cn(
                              'px-4 py-2.5 text-right tabular-nums font-bold',
                              out > 0 ? (overdue ? 'text-red-600' : 'text-amber-700') : 'text-stone-400',
                            )}
                          >
                            {fmt(out)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {canEdit && (
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  if (confirm('Delete this per diem entry?')) deletePerDiemEntry(e.id)
                                }}
                                className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </GroupBlock>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {open && (
        <DetailModal
          entry={open}
          personLabel={personName(people, open.personId)}
          productionLabel={productions.find((p) => p.id === open.productionId)?.name ?? 'Unknown'}
          canEdit={canEdit}
          onClose={() => setOpenId(null)}
          onAddPayment={(payment) =>
            updatePerDiemEntry({
              ...open,
              totalPaid: open.totalPaid + payment.amount,
              payments: [...open.payments, payment],
            })
          }
        />
      )}

      {/* Add entry modal */}
      {addOpen && (
        <AddEntryModal
          onClose={() => setAddOpen(false)}
          onSave={(entry) => {
            addPerDiemEntry(entry)
            setAddOpen(false)
          }}
        />
      )}

      {/* Batch confirm modal */}
      <Modal open={batchOpen} onClose={() => setBatchOpen(false)} title="Mark batch as paid" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            This will settle every outstanding per diem in the current view by recording an{' '}
            <span className="font-medium text-stone-800">EFT — batch</span> payment for the full outstanding amount.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Batch total</div>
              <div className="text-2xl font-light text-emerald-700 mt-0.5">{fmt(batchTotal)}</div>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">People</div>
              <div className="text-2xl font-light text-stone-800 mt-0.5 flex items-center gap-1.5">
                <Users size={18} className="text-stone-400" />
                {batchPeople}
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400">
            {batchTargets.length} {batchTargets.length === 1 ? 'entry' : 'entries'} will be marked fully paid.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setBatchOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={runBatch}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={batchTargets.length === 0}
            >
              <CheckCircle2 size={14} /> Pay {fmt(batchTotal)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// GroupBlock keeps grouped <tr>s valid inside <tbody> via a fragment.
function GroupBlock({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SummaryCard({
  label,
  value,
  emphasize,
  danger,
}: {
  label: string
  value: string
  emphasize?: boolean
  danger?: boolean
}) {
  return (
    <div
      className={cn(
        'bg-white border border-stone-200 rounded-lg px-5 py-4',
        emphasize && 'border-amber-300 bg-amber-50/30',
        danger && 'border-red-300 bg-red-50/40',
      )}
    >
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</div>
      <div
        className={cn(
          'text-2xl font-light mt-1 text-stone-900',
          emphasize && 'text-amber-800',
          danger && 'text-red-700',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
        active
          ? 'border-stone-900 bg-stone-900 text-white'
          : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50',
      )}
    >
      {children}
    </button>
  )
}

function DetailModal({
  entry,
  personLabel,
  productionLabel,
  canEdit,
  onClose,
  onAddPayment,
}: {
  entry: PerDiemEntry
  personLabel: string
  productionLabel: string
  canEdit: boolean
  onClose: () => void
  onAddPayment: (p: PerDiemPayment) => void
}) {
  const out = perDiemOutstanding(entry)
  const overdue = perDiemOverdue(entry)
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState<number>(out)
  const [method, setMethod] = useState('EFT')
  const [notes, setNotes] = useState('')

  function submit() {
    if (amount <= 0) return
    onAddPayment({ id: uid('pdp'), date, amount, method, notes: notes || undefined })
    setAmount(0)
    setNotes('')
  }

  return (
    <Modal open onClose={onClose} title="Per diem detail" className="max-w-2xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar id={entry.personId} name={personLabel} size={40} />
            <div>
              <div className="font-semibold text-stone-800">{personLabel}</div>
              <div className="text-xs text-stone-500">
                {productionLabel} · {formatDate(entry.periodStart)} – {formatDate(entry.periodEnd)}
              </div>
            </div>
          </div>
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              <AlertTriangle size={12} /> Overdue
            </span>
          )}
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="Daily rate" value={fmt(entry.dailyRate)} />
          <Stat label="Owed" value={fmt(entry.totalOwed)} />
          <Stat label="Paid" value={fmt(entry.totalPaid)} />
          <Stat label="Outstanding" value={fmt(out)} accent={out > 0} />
        </div>

        {/* Payment history */}
        <div>
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Payment history</div>
          {entry.payments.length === 0 ? (
            <div className="text-sm text-stone-400 italic py-3">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto rounded border border-stone-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider border-b border-stone-200 bg-stone-50">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.payments.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="px-3 py-2 text-right text-stone-700 tabular-nums">{fmt(p.amount)}</td>
                      <td className="px-3 py-2 text-stone-600">{p.method}</td>
                      <td className="px-3 py-2 text-stone-500">{p.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add payment form */}
        {canEdit && (
          <div className="border-t border-stone-100 pt-4">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Record a payment</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Amount (CAD)">
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Method">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                  {PAY_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="primary" size="sm" onClick={submit} disabled={amount <= 0}>
                <Plus size={14} /> Add payment
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2.5">
      <div className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</div>
      <div className={cn('text-base font-light mt-0.5', accent ? 'text-amber-800' : 'text-stone-800')}>{value}</div>
    </div>
  )
}

function AddEntryModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (entry: PerDiemEntry) => void
}) {
  const { people, productions } = useStore()
  const [personId, setPersonId] = useState(people[0]?.id ?? '')
  const [productionId, setProductionId] = useState(productions[0]?.id ?? '')
  const [dailyRate, setDailyRate] = useState<number>(75)
  const [periodStart, setPeriodStart] = useState(todayISO())
  const [periodEnd, setPeriodEnd] = useState(todayISO())
  const [owedEdited, setOwedEdited] = useState(false)
  const [totalOwed, setTotalOwed] = useState<number>(0)

  const suggested = dailyRate * daysBetween(periodStart, periodEnd)
  const effectiveOwed = owedEdited ? totalOwed : suggested

  function save() {
    if (!personId || !productionId) return
    onSave({
      id: uid('pd'),
      personId,
      productionId,
      dailyRate,
      periodStart,
      periodEnd,
      totalOwed: effectiveOwed,
      totalPaid: 0,
      payments: [],
    })
  }

  return (
    <Modal open onClose={onClose} title="Add per diem entry" className="max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Person">
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} className={inputCls}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Production">
            <select value={productionId} onChange={(e) => setProductionId(e.target.value)} className={inputCls}>
              {productions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Daily rate (CAD)">
            <input
              type="number"
              min={0}
              value={dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Days">
            <div className="px-2.5 py-1.5 text-sm text-stone-500">{daysBetween(periodStart, periodEnd)} days</div>
          </Field>
          <Field label="Period start">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Period end">
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Total owed (CAD)">
          <input
            type="number"
            min={0}
            value={effectiveOwed}
            onChange={(e) => {
              setOwedEdited(true)
              setTotalOwed(Number(e.target.value))
            }}
            className={inputCls}
          />
          {!owedEdited && (
            <p className="text-xs text-stone-400 mt-1">
              Auto-suggested: {fmt(dailyRate)} × {daysBetween(periodStart, periodEnd)} days = {fmt(suggested)}. Editable.
            </p>
          )}
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!personId || !productionId}>
            <Plus size={14} /> Add entry
          </Button>
        </div>
      </div>
    </Modal>
  )
}
