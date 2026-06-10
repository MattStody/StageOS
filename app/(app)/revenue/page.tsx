'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { fmt, fmtPct, fmtNum, formatDate } from '@/lib/utils'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { RevenueWeek } from '@/lib/types'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const blank = (productionId: string): Omit<RevenueWeek, 'id'> => ({
  productionId,
  weekEnding: '',
  performances: 8,
  ticketsSold: 0,
  grossRevenue: 0,
  avgTicketPrice: 0,
  capacityPct: 0,
  comps: 0,
  discounts: 0,
  netRevenue: 0,
  totalSeats: 0,
})

export default function RevenuePage() {
  const { productions, revenueWeeks, performanceDates, addRevenueWeek, updateRevenueWeek, deleteRevenueWeek } = useStore()
  const { isAdmin } = useAuth()

  const [selectedProd, setSelectedProd] = useState(productions[0]?.id || '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RevenueWeek | null>(null)
  const [form, setForm] = useState<Omit<RevenueWeek, 'id'>>(blank(selectedProd))

  const prod = productions.find((p) => p.id === selectedProd)
  const weeks = revenueWeeks
    .filter((w) => w.productionId === selectedProd)
    .sort((a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime())

  const totalGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
  const totalTickets = weeks.reduce((s, w) => s + w.ticketsSold, 0)
  const totalNet = weeks.reduce((s, w) => s + w.netRevenue, 0)
  const avgCap = weeks.length ? weeks.reduce((s, w) => s + w.capacityPct, 0) / weeks.length : 0
  const avgATP = totalTickets > 0 ? totalGross / totalTickets : 0

  // Chart data
  let cum = 0
  const chartData = weeks.map((w) => {
    cum += w.grossRevenue
    return {
      week: formatDate(w.weekEnding).replace(', 2025', '').replace(', 2026', ''),
      gross: w.grossRevenue,
      net: w.netRevenue,
      cumulative: cum,
      capacity: w.capacityPct,
    }
  })

  function openAdd() {
    setEditing(null)
    setForm(blank(selectedProd))
    setModalOpen(true)
  }

  function openEdit(w: RevenueWeek) {
    setEditing(w)
    setForm({ ...w })
    setModalOpen(true)
  }

  function handleSave() {
    const updated = {
      ...form,
      avgTicketPrice: form.ticketsSold > 0 ? form.grossRevenue / form.ticketsSold : 0,
    }
    if (editing) {
      updateRevenueWeek({ ...updated, id: editing.id })
    } else {
      addRevenueWeek({ ...updated, id: `r-${Date.now()}` })
    }
    setModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Revenue Tracker"
        subtitle="Weekly ticket sales and cumulative gross"
        actions={isAdmin ? <Button onClick={openAdd} size="sm"><Plus size={13} /> Add Week</Button> : undefined}
      />

      {/* Production tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {productions.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProd(p.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Cumulative Gross" value={fmt(totalGross)} trend="up" />
        <StatCard label="Net Revenue" value={fmt(totalNet)} />
        <StatCard label="Total Tickets" value={fmtNum(totalTickets)} />
        <StatCard label="Avg Ticket Price" value={fmt(avgATP, 2)} />
        <StatCard label="Avg Capacity" value={fmtPct(avgCap)} alert={avgCap < 70} />
      </div>

      {/* Charts */}
      {weeks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <Card>
            <CardHeader><CardTitle>Cumulative Gross</CardTitle></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={prod?.color || '#6366f1'} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={prod?.color || '#6366f1'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }} />
                  <Area type="monotone" dataKey="cumulative" stroke={prod?.color || '#6366f1'} strokeWidth={1.5} fill="url(#cumGrad)" name="Cumulative Gross" />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Weekly Gross vs Net</CardTitle></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barGap={2}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }} />
                  <Bar dataKey="gross" fill={prod?.color || '#6366f1'} opacity={0.5} radius={[2, 2, 0, 0]} name="Gross" />
                  <Bar dataKey="net" fill={prod?.color || '#6366f1'} radius={[2, 2, 0, 0]} name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              {['Week Ending', 'Perfs', 'Tickets Sold', 'Gross Revenue', 'Avg Ticket', 'Capacity', 'Comps', 'Discounts', 'Net Revenue', ''].map((h) => (
                <th key={h} className="text-right first:text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-stone-400">No revenue data yet. Add a week to get started.</td></tr>
            ) : (
              weeks.map((w) => (
                <tr key={w.id} className="border-b border-stone-100 hover:bg-stone-50/50 group">
                  <td className="px-4 py-3 text-stone-700">{formatDate(w.weekEnding)}</td>
                  <td className="text-right px-4 py-3 text-stone-600">{w.performances}</td>
                  <td className="text-right px-4 py-3 text-stone-600">{fmtNum(w.ticketsSold)}</td>
                  <td className="text-right px-4 py-3 text-stone-800 font-medium">{fmt(w.grossRevenue)}</td>
                  <td className="text-right px-4 py-3 text-stone-600">{fmt(w.avgTicketPrice, 2)}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`text-xs font-medium ${w.capacityPct >= 90 ? 'text-emerald-600' : w.capacityPct >= 70 ? 'text-stone-700' : 'text-amber-600'}`}>
                      {fmtPct(w.capacityPct)}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-stone-500">{fmtNum(w.comps)}</td>
                  <td className="text-right px-4 py-3 text-stone-500">{w.discounts > 0 ? fmt(w.discounts) : '—'}</td>
                  <td className="text-right px-4 py-3 text-stone-800 font-medium">{fmt(w.netRevenue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      {isAdmin && <button onClick={() => openEdit(w)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                      {isAdmin && <button onClick={() => deleteRevenueWeek(w.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {weeks.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-50">
                <td className="px-4 py-3 font-semibold text-stone-800">Total</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{weeks.reduce((s, w) => s + w.performances, 0)}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmtNum(totalTickets)}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalGross)}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(avgATP, 2)}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmtPct(avgCap)}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmtNum(weeks.reduce((s, w) => s + w.comps, 0))}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(weeks.reduce((s, w) => s + w.discounts, 0))}</td>
                <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalNet)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Performance Summary — all productions */}
      {productions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">Performance Schedule Summary</h2>
          <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Production', 'Scheduled', 'Completed', 'Cancelled', 'Total Performances', 'Avg Tickets/Show', 'Avg ATP', 'Total Gross'].map((h) => (
                    <th key={h} className="text-right first:text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productions.map((p) => {
                  const pPerfs = performanceDates.filter(d => d.productionId === p.id)
                  const scheduled  = pPerfs.filter(d => d.status === 'scheduled').length
                  const completed  = pPerfs.filter(d => d.status === 'completed').length
                  const cancelled  = pPerfs.filter(d => d.status === 'cancelled').length
                  const pWeeks = revenueWeeks.filter(w => w.productionId === p.id && w.performances > 0)
                  const totalPerfs = pWeeks.reduce((s, w) => s + w.performances, 0)
                  const totalTix   = pWeeks.reduce((s, w) => s + w.ticketsSold, 0)
                  const totalGrossP = pWeeks.reduce((s, w) => s + w.grossRevenue, 0)
                  const avgTix = totalPerfs > 0 ? Math.round(totalTix / totalPerfs) : null
                  const avgATPP = totalTix > 0 ? totalGrossP / totalTix : null
                  return (
                    <tr key={p.id} className={`border-b border-stone-100 hover:bg-stone-50/50 ${p.id === selectedProd ? 'bg-stone-50' : ''}`}
                      onClick={() => setSelectedProd(p.id)} style={{ cursor: 'pointer' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-medium text-stone-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-blue-700 font-medium">{scheduled || '—'}</td>
                      <td className="text-right px-4 py-3 text-emerald-700 font-medium">{completed || '—'}</td>
                      <td className="text-right px-4 py-3 text-red-600">{cancelled || '—'}</td>
                      <td className="text-right px-4 py-3 text-stone-700">{totalPerfs || '—'}</td>
                      <td className="text-right px-4 py-3 text-stone-600">{avgTix != null ? fmtNum(avgTix) : '—'}</td>
                      <td className="text-right px-4 py-3 text-stone-600">{avgATPP != null ? fmt(avgATPP, 0) : '—'}</td>
                      <td className="text-right px-4 py-3 font-medium text-stone-800">{totalGrossP > 0 ? fmt(totalGrossP) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50">
                  <td className="px-4 py-3 font-semibold text-stone-800">All Productions</td>
                  <td className="text-right px-4 py-3 font-semibold text-stone-800">{performanceDates.filter(d => d.status === 'scheduled').length || '—'}</td>
                  <td className="text-right px-4 py-3 font-semibold text-stone-800">{performanceDates.filter(d => d.status === 'completed').length || '—'}</td>
                  <td className="text-right px-4 py-3 font-semibold text-stone-800">{performanceDates.filter(d => d.status === 'cancelled').length || '—'}</td>
                  <td className="text-right px-4 py-3 font-semibold text-stone-800">{revenueWeeks.filter(w => w.performances > 0).reduce((s, w) => s + w.performances, 0) || '—'}</td>
                  <td className="text-right px-4 py-3 text-stone-500">—</td>
                  <td className="text-right px-4 py-3 text-stone-500">—</td>
                  <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(revenueWeeks.filter(w => w.performances > 0).reduce((s, w) => s + w.grossRevenue, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Revenue Week' : 'Add Revenue Week'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Week Ending</label>
              <input type="date" value={form.weekEnding} onChange={(e) => setForm({ ...form, weekEnding: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Performances</label>
              <input type="number" value={form.performances} onChange={(e) => setForm({ ...form, performances: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tickets Sold', field: 'ticketsSold' },
              { label: 'Total Seats', field: 'totalSeats' },
              { label: 'Gross Revenue', field: 'grossRevenue' },
              { label: 'Net Revenue', field: 'netRevenue' },
              { label: 'Comps', field: 'comps' },
              { label: 'Discounts', field: 'discounts' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">{label}</label>
                <input
                  type="number"
                  value={form[field as keyof typeof form] as number}
                  onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Week'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
