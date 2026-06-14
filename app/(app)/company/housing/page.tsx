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
  HOUSING_BADGE, TRAVEL_BADGE, personName,
  housingNeedsAttention, travelNeedsAttention, downloadCSV,
} from '@/lib/company'
import {
  Plus, AlertTriangle, CheckCircle2, Download, Pencil, Trash2,
  Home, Plane, PlaneLanding, PlaneTakeoff, ArrowRight,
} from 'lucide-react'
import type {
  Production, HousingAssignment, HousingStatus,
  TravelLeg, TravelStatus, TravelDirection,
} from '@/lib/types'

const HOUSING_STATUSES: HousingStatus[] = ['Searching', 'Confirmed', 'Checked In', 'Checked Out']
const TRAVEL_STATUSES: TravelStatus[] = ['Not Booked', 'Booked', 'Confirmed', 'Completed']
const TRAVEL_DIRECTIONS: TravelDirection[] = ['Inbound', 'Outbound']
const BOOKED_BY: TravelLeg['bookedBy'][] = ['Company', 'Self']

function blankHousing(): Omit<HousingAssignment, 'id'> {
  return {
    personId: '', productionId: '', address: '', unit: '', landlordContact: '',
    leaseStart: '', leaseEnd: '', monthlyCost: undefined, status: 'Searching', notes: '',
  }
}

function blankTravel(): Omit<TravelLeg, 'id'> {
  return {
    personId: '', productionId: '', direction: 'Inbound',
    date: new Date().toISOString().slice(0, 10),
    carrier: '', flightTrainNumber: '', departureCity: '', arrivalCity: '',
    bookedBy: 'Company', status: 'Not Booked', cost: undefined,
    reimbursementAmount: undefined, reimbursementDate: '',
  }
}

// Reimbursement still owed: self-booked legs with a cost and no reimbursement date logged.
function reimbursementOwed(t: TravelLeg): number {
  if (t.bookedBy !== 'Self') return 0
  if (t.reimbursementDate) return 0
  const owed = t.reimbursementAmount ?? t.cost ?? 0
  return owed
}

const inputClass =
  'w-full border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-stone-400'
const labelClass = 'block text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

export default function HousingTravelPage() {
  const {
    people, productions,
    housingAssignments, addHousingAssignment, updateHousingAssignment, deleteHousingAssignment,
    travelLegs, addTravelLeg, updateTravelLeg, deleteTravelLeg,
  } = useStore()
  const { canEdit } = useAccess()

  const [prodFilter, setProdFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState<'both' | 'housing' | 'travel'>('both')

  const [housingForm, setHousingForm] = useState<Omit<HousingAssignment, 'id'> & { id?: string } | null>(null)
  const [travelForm, setTravelForm] = useState<Omit<TravelLeg, 'id'> & { id?: string } | null>(null)

  const prodById = useMemo(() => {
    const m = new Map<string, Production>()
    for (const p of productions) m.set(p.id, p)
    return m
  }, [productions])

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  )

  const filteredHousing = useMemo(() => housingAssignments.filter((h) => {
    if (prodFilter !== 'all' && h.productionId !== prodFilter) return false
    if (statusFilter !== 'all' && h.status !== statusFilter) return false
    return true
  }), [housingAssignments, prodFilter, statusFilter])

  const filteredTravel = useMemo(() => travelLegs.filter((t) => {
    if (prodFilter !== 'all' && t.productionId !== prodFilter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  }), [travelLegs, prodFilter, statusFilter])

  // Summary metrics (over filtered data)
  const totalHousingCost = filteredHousing.reduce((s, h) => s + (h.monthlyCost ?? 0), 0)
  const peopleSearching = filteredHousing.filter((h) => h.status === 'Searching').length
  const totalTravelCost = filteredTravel.reduce((s, t) => s + (t.cost ?? 0), 0)
  const totalReimbursements = filteredTravel.reduce((s, t) => s + reimbursementOwed(t), 0)

  // Alerts (over filtered data)
  const housingAlerts = filteredHousing.filter((h) => housingNeedsAttention(h)).length
  const travelAlerts = filteredTravel.filter((t) => travelNeedsAttention(t)).length

  const showHousing = view === 'both' || view === 'housing'
  const showTravel = view === 'both' || view === 'travel'

  // ── CSV export ──────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows: (string | number)[][] = []
    rows.push(['Type', 'Person', 'Production', 'Detail', 'Date / Lease', 'Status', 'Cost (CAD)', 'Reimbursement (CAD)'])
    for (const h of filteredHousing) {
      const addr = [h.address, h.unit].filter(Boolean).join(' ')
      const lease = [h.leaseStart, h.leaseEnd].filter(Boolean).join(' → ')
      rows.push([
        'Housing', personName(people, h.personId), prodById.get(h.productionId)?.name ?? '',
        addr, lease, h.status, h.monthlyCost ?? '', '',
      ])
    }
    for (const t of filteredTravel) {
      const detail = `${t.direction}: ${t.departureCity} → ${t.arrivalCity}${t.carrier ? ` (${t.carrier} ${t.flightTrainNumber ?? ''})` : ''}`.trim()
      rows.push([
        'Travel', personName(people, t.personId), prodById.get(t.productionId)?.name ?? '',
        detail, t.date, t.status, t.cost ?? '', reimbursementOwed(t) || '',
      ])
    }
    downloadCSV('housing-travel.csv', rows)
  }

  // ── Housing save / delete ─────────────────────────────────────────────────────
  function saveHousing() {
    if (!housingForm) return
    if (!housingForm.personId || !housingForm.productionId) return
    const { id, ...rest } = housingForm
    if (id) updateHousingAssignment({ id, ...rest })
    else addHousingAssignment({ id: `housing-${Date.now()}`, ...rest })
    setHousingForm(null)
  }

  function saveTravel() {
    if (!travelForm) return
    if (!travelForm.personId || !travelForm.productionId || !travelForm.departureCity || !travelForm.arrivalCity) return
    const { id, ...rest } = travelForm
    if (id) updateTravelLeg({ id, ...rest })
    else addTravelLeg({ id: `travel-${Date.now()}`, ...rest })
    setTravelForm(null)
  }

  return (
    <div>
      <PageHeader
        title="Housing & Travel"
        subtitle="Accommodation and travel for every out-of-town artist and crew member"
        actions={
          <>
            <Button onClick={exportCSV} variant="secondary" size="sm"><Download size={13} /> Export CSV</Button>
            {canEdit && (
              <Button onClick={() => setHousingForm(blankHousing())} size="sm"><Plus size={13} /> Add Housing</Button>
            )}
            {canEdit && (
              <Button onClick={() => setTravelForm(blankTravel())} variant="secondary" size="sm"><Plus size={13} /> Add Travel</Button>
            )}
          </>
        }
      />

      {/* Alert banner */}
      {(housingAlerts > 0 || travelAlerts > 0) ? (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 mb-5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {[
              housingAlerts > 0 && `${housingAlerts} ${housingAlerts === 1 ? 'person' : 'people'} without confirmed housing within 30 days of rehearsal`,
              travelAlerts > 0 && `${travelAlerts} unbooked travel ${travelAlerts === 1 ? 'leg' : 'legs'} within 14 days`,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 mb-5">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>All housing confirmed and travel booked for upcoming dates.</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Housing Cost', value: fmt(totalHousingCost), sub: '/ month' },
          { label: 'People Needing Housing', value: String(peopleSearching), sub: 'searching' },
          { label: 'Total Travel Cost', value: fmt(totalTravelCost), sub: 'booked + planned' },
          { label: 'Reimbursements Owed', value: fmt(totalReimbursements), sub: 'self-booked' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-stone-200 rounded-lg px-5 py-4">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-light mt-1.5 text-stone-900">{c.value}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex rounded border border-stone-200 overflow-hidden">
          {(['both', 'housing', 'travel'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-xs capitalize transition-colors',
                view === v ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-50',
              )}
            >
              {v === 'both' ? 'All' : v}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-stone-400"
        >
          <option value="all">All statuses</option>
          <optgroup label="Housing">
            {HOUSING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Travel">
            {TRAVEL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </optgroup>
        </select>
      </div>

      {/* Production filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setProdFilter('all')}
          className={cn('px-3 py-1.5 rounded text-xs transition-colors', prodFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400')}
        >
          All Productions
        </button>
        {productions.map((p) => (
          <button
            key={p.id}
            onClick={() => setProdFilter(p.id)}
            className={cn('px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5', prodFilter === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400')}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Housing table */}
      {showHousing && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Home size={15} className="text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-800">Housing</h2>
            <span className="text-xs text-stone-400">{filteredHousing.length}</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Person</th>
                  <th className="text-left px-4 py-2.5">Production</th>
                  <th className="text-left px-4 py-2.5">Address / Unit</th>
                  <th className="text-left px-4 py-2.5">Lease</th>
                  <th className="text-right px-4 py-2.5">Monthly</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 w-px" />
                </tr>
              </thead>
              <tbody>
                {filteredHousing.map((h) => {
                  const prod = prodById.get(h.productionId)
                  const attn = housingNeedsAttention(h)
                  return (
                    <tr key={h.id} className="group border-b border-stone-50 last:border-b-0 hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {attn && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                          <span className="font-medium text-stone-800">{personName(people, h.personId)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-stone-600">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prod?.color ?? '#a8a29e' }} />
                          {prod?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-stone-600">
                        {h.address ? (
                          <span>{h.address}{h.unit ? `, ${h.unit}` : ''}</span>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-stone-600 text-xs">
                        {h.leaseStart || h.leaseEnd ? (
                          <span>{h.leaseStart ? formatDate(h.leaseStart) : '?'} → {h.leaseEnd ? formatDate(h.leaseEnd) : '?'}</span>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">
                        {h.monthlyCost != null ? fmt(h.monthlyCost) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit ? (
                          <select
                            value={h.status}
                            onChange={(e) => updateHousingAssignment({ ...h, status: e.target.value as HousingStatus })}
                            className={cn('text-xs font-medium border rounded-full px-2.5 py-1 cursor-pointer focus:outline-none', HOUSING_BADGE[h.status])}
                          >
                            {HOUSING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={cn('inline-block text-xs font-medium border rounded-full px-2.5 py-1', HOUSING_BADGE[h.status])}>{h.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setHousingForm({ ...h })} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer" title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deleteHousingAssignment(h.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredHousing.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-400">No housing assignments match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Travel table */}
      {showTravel && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Plane size={15} className="text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-800">Travel</h2>
            <span className="text-xs text-stone-400">{filteredTravel.length}</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Person</th>
                  <th className="text-left px-4 py-2.5">Production</th>
                  <th className="text-left px-4 py-2.5">Direction</th>
                  <th className="text-left px-4 py-2.5">Date</th>
                  <th className="text-left px-4 py-2.5">Carrier</th>
                  <th className="text-left px-4 py-2.5">Route</th>
                  <th className="text-left px-4 py-2.5">Booked By</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-right px-4 py-2.5">Cost</th>
                  <th className="text-right px-4 py-2.5">Reimburse</th>
                  <th className="px-4 py-2.5 w-px" />
                </tr>
              </thead>
              <tbody>
                {filteredTravel.map((t) => {
                  const prod = prodById.get(t.productionId)
                  const attn = travelNeedsAttention(t)
                  const owed = reimbursementOwed(t)
                  return (
                    <tr key={t.id} className="group border-b border-stone-50 last:border-b-0 hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {attn && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                          <span className="font-medium text-stone-800">{personName(people, t.personId)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-stone-600">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prod?.color ?? '#a8a29e' }} />
                          {prod?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs text-stone-600">
                          {t.direction === 'Inbound'
                            ? <PlaneLanding size={13} className="text-sky-500" />
                            : <PlaneTakeoff size={13} className="text-amber-500" />}
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-stone-600 text-xs whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-4 py-2.5 text-stone-600 text-xs">
                        {t.carrier ? (
                          <span>{t.carrier}{t.flightTrainNumber ? ` ${t.flightTrainNumber}` : ''}</span>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-stone-600 text-xs">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          {t.departureCity} <ArrowRight size={11} className="text-stone-400" /> {t.arrivalCity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-stone-600">{t.bookedBy}</td>
                      <td className="px-4 py-2.5">
                        {canEdit ? (
                          <select
                            value={t.status}
                            onChange={(e) => updateTravelLeg({ ...t, status: e.target.value as TravelStatus })}
                            className={cn('text-xs font-medium border rounded-full px-2.5 py-1 cursor-pointer focus:outline-none', TRAVEL_BADGE[t.status])}
                          >
                            {TRAVEL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={cn('inline-block text-xs font-medium border rounded-full px-2.5 py-1', TRAVEL_BADGE[t.status])}>{t.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">
                        {t.cost != null ? fmt(t.cost) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                        {owed > 0
                          ? <span className="text-amber-700">{fmt(owed)} owed</span>
                          : t.reimbursementDate
                            ? <span className="text-emerald-600">paid {formatDate(t.reimbursementDate)}</span>
                            : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setTravelForm({ ...t })} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer" title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deleteTravelLeg(t.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredTravel.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-stone-400">No travel legs match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Housing modal */}
      <Modal
        open={housingForm !== null}
        onClose={() => setHousingForm(null)}
        title={housingForm?.id ? 'Edit Housing Assignment' : 'Add Housing Assignment'}
      >
        {housingForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Person">
                <select className={inputClass} value={housingForm.personId} onChange={(e) => setHousingForm({ ...housingForm, personId: e.target.value })}>
                  <option value="">Select person…</option>
                  {sortedPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Production">
                <select className={inputClass} value={housingForm.productionId} onChange={(e) => setHousingForm({ ...housingForm, productionId: e.target.value })}>
                  <option value="">Select production…</option>
                  {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Address">
                  <input className={inputClass} value={housingForm.address ?? ''} onChange={(e) => setHousingForm({ ...housingForm, address: e.target.value })} placeholder="123 Main St" />
                </Field>
              </div>
              <Field label="Unit">
                <input className={inputClass} value={housingForm.unit ?? ''} onChange={(e) => setHousingForm({ ...housingForm, unit: e.target.value })} placeholder="Apt 4B" />
              </Field>
            </div>
            <Field label="Landlord Contact">
              <input className={inputClass} value={housingForm.landlordContact ?? ''} onChange={(e) => setHousingForm({ ...housingForm, landlordContact: e.target.value })} placeholder="Name / phone / email" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Lease Start">
                <input type="date" className={inputClass} value={housingForm.leaseStart ?? ''} onChange={(e) => setHousingForm({ ...housingForm, leaseStart: e.target.value })} />
              </Field>
              <Field label="Lease End">
                <input type="date" className={inputClass} value={housingForm.leaseEnd ?? ''} onChange={(e) => setHousingForm({ ...housingForm, leaseEnd: e.target.value })} />
              </Field>
              <Field label="Monthly (CAD)">
                <input type="number" className={inputClass} value={housingForm.monthlyCost ?? ''} onChange={(e) => setHousingForm({ ...housingForm, monthlyCost: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" />
              </Field>
            </div>
            <Field label="Status">
              <select className={inputClass} value={housingForm.status} onChange={(e) => setHousingForm({ ...housingForm, status: e.target.value as HousingStatus })}>
                {HOUSING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className={cn(inputClass, 'min-h-[64px] resize-y')} value={housingForm.notes ?? ''} onChange={(e) => setHousingForm({ ...housingForm, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setHousingForm(null)}>Cancel</Button>
              <Button size="sm" onClick={saveHousing} disabled={!housingForm.personId || !housingForm.productionId}>
                {housingForm.id ? 'Save Changes' : 'Add Housing'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Travel modal */}
      <Modal
        open={travelForm !== null}
        onClose={() => setTravelForm(null)}
        title={travelForm?.id ? 'Edit Travel Leg' : 'Add Travel Leg'}
      >
        {travelForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Person">
                <select className={inputClass} value={travelForm.personId} onChange={(e) => setTravelForm({ ...travelForm, personId: e.target.value })}>
                  <option value="">Select person…</option>
                  {sortedPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Production">
                <select className={inputClass} value={travelForm.productionId} onChange={(e) => setTravelForm({ ...travelForm, productionId: e.target.value })}>
                  <option value="">Select production…</option>
                  {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Direction">
                <select className={inputClass} value={travelForm.direction} onChange={(e) => setTravelForm({ ...travelForm, direction: e.target.value as TravelDirection })}>
                  {TRAVEL_DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" className={inputClass} value={travelForm.date} onChange={(e) => setTravelForm({ ...travelForm, date: e.target.value })} />
              </Field>
              <Field label="Booked By">
                <select className={inputClass} value={travelForm.bookedBy} onChange={(e) => setTravelForm({ ...travelForm, bookedBy: e.target.value as TravelLeg['bookedBy'] })}>
                  {BOOKED_BY.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carrier">
                <input className={inputClass} value={travelForm.carrier ?? ''} onChange={(e) => setTravelForm({ ...travelForm, carrier: e.target.value })} placeholder="Air Canada, VIA Rail…" />
              </Field>
              <Field label="Flight / Train #">
                <input className={inputClass} value={travelForm.flightTrainNumber ?? ''} onChange={(e) => setTravelForm({ ...travelForm, flightTrainNumber: e.target.value })} placeholder="AC123" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departure City">
                <input className={inputClass} value={travelForm.departureCity} onChange={(e) => setTravelForm({ ...travelForm, departureCity: e.target.value })} placeholder="Toronto" />
              </Field>
              <Field label="Arrival City">
                <input className={inputClass} value={travelForm.arrivalCity} onChange={(e) => setTravelForm({ ...travelForm, arrivalCity: e.target.value })} placeholder="Stratford" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select className={inputClass} value={travelForm.status} onChange={(e) => setTravelForm({ ...travelForm, status: e.target.value as TravelStatus })}>
                  {TRAVEL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Cost (CAD)">
                <input type="number" className={inputClass} value={travelForm.cost ?? ''} onChange={(e) => setTravelForm({ ...travelForm, cost: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reimbursement (CAD)">
                <input type="number" className={inputClass} value={travelForm.reimbursementAmount ?? ''} onChange={(e) => setTravelForm({ ...travelForm, reimbursementAmount: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" />
              </Field>
              <Field label="Reimbursement Date">
                <input type="date" className={inputClass} value={travelForm.reimbursementDate ?? ''} onChange={(e) => setTravelForm({ ...travelForm, reimbursementDate: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setTravelForm(null)}>Cancel</Button>
              <Button size="sm" onClick={saveTravel} disabled={!travelForm.personId || !travelForm.productionId || !travelForm.departureCity || !travelForm.arrivalCity}>
                {travelForm.id ? 'Save Changes' : 'Add Travel'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
