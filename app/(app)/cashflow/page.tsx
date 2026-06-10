'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { RiskAlert } from '@/components/ui/RiskAlert'
import { fmt, formatDate } from '@/lib/utils'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { CashFlowRow } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts'

const blank = (productionId: string): Omit<CashFlowRow, 'id'> => ({
  productionId,
  weekOf: '',
  startingCash: 0,
  ticketRevenue: 0,
  otherInflows: 0,
  payroll: 0,
  venueCosts: 0,
  marketing: 0,
  royalties: 0,
  vendorPayments: 0,
  otherOutflows: 0,
  closingCash: 0,
})

export default function CashFlowPage() {
  const { productions, cashFlowRows, addCashFlowRow, updateCashFlowRow, deleteCashFlowRow } = useStore()
  const { isAdmin } = useAuth()

  const [selectedProd, setSelectedProd] = useState(productions[0]?.id || '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CashFlowRow | null>(null)
  const [form, setForm] = useState<Omit<CashFlowRow, 'id'>>(blank(selectedProd))

  const isAll = selectedProd === 'all'
  const prod = productions.find((p) => p.id === selectedProd)

  const rows = isAll
    ? cashFlowRows.slice().sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())
    : cashFlowRows
        .filter((r) => r.productionId === selectedProd)
        .sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())

  // Single-production stats
  const lastRow = rows[rows.length - 1]
  const totalInflows  = rows.reduce((s, r) => s + r.ticketRevenue + r.otherInflows, 0)
  const totalOutflows = rows.reduce((s, r) => s + r.payroll + r.venueCosts + r.marketing + r.royalties + r.vendorPayments + r.otherOutflows, 0)
  const lowestBalance = rows.length ? Math.min(...rows.map((r) => r.closingCash)) : 0

  // All-productions: latest cash per production
  const currentBalanceAll = productions.reduce((sum, p) => {
    const prodRows = cashFlowRows
      .filter((r) => r.productionId === p.id)
      .sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime())
    return sum + (prodRows.at(-1)?.closingCash ?? p.cashOnHand)
  }, 0)

  // Single-production chart
  const chartData = rows.map((r) => ({
    week: formatDate(r.weekOf).replace(', 2025', '').replace(', 2026', ''),
    balance: r.closingCash,
  }))

  // All-productions chart — one entry per unique week date, one key per production
  const allWeekDates = [...new Set(cashFlowRows.map((r) => r.weekOf))].sort()
  const allChartData = allWeekDates.map((weekOf) => {
    const entry: Record<string, string | number> = {
      week: formatDate(weekOf).replace(', 2025', '').replace(', 2026', ''),
    }
    for (const p of productions) {
      const row = cashFlowRows.find((r) => r.productionId === p.id && r.weekOf === weekOf)
      if (row) entry[p.id] = row.closingCash
    }
    return entry
  })

  function calcClosing(f: typeof form) {
    const inflows = f.ticketRevenue + f.otherInflows
    const outflows = f.payroll + f.venueCosts + f.marketing + f.royalties + f.vendorPayments + f.otherOutflows
    return f.startingCash + inflows - outflows
  }

  function openAdd() {
    setEditing(null)
    const lastCash = lastRow?.closingCash || 0
    setForm({ ...blank(selectedProd), startingCash: lastCash })
    setModalOpen(true)
  }

  function openEdit(r: CashFlowRow) {
    setEditing(r)
    setForm({ ...r })
    setModalOpen(true)
  }

  function handleSave() {
    const withCalc = { ...form, closingCash: calcClosing(form) }
    if (editing) {
      updateCashFlowRow({ ...withCalc, id: editing.id })
    } else {
      addCashFlowRow({ ...withCalc, id: `cf-${Date.now()}` })
    }
    setModalOpen(false)
  }

  const fieldUpdate = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...form, [field]: Number(e.target.value) }
    setForm(updated)
  }

  return (
    <div>
      <PageHeader
        title="Cash Flow Forecast"
        subtitle="Weekly inflows, outflows, and projected balance"
        actions={isAdmin && !isAll ? <Button onClick={openAdd} size="sm"><Plus size={13} /> Add Week</Button> : undefined}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedProd('all')}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${isAll ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
        >
          All Productions
        </button>
        {productions.map((p) => (
          <button key={p.id} onClick={() => setSelectedProd(p.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* Risk */}
      {lowestBalance < 0 && <div className="mb-5"><RiskAlert message={`Cash balance projected below zero — minimum ${fmt(lowestBalance)}`} /></div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Current Balance" value={fmt(isAll ? currentBalanceAll : (lastRow?.closingCash || prod?.cashOnHand || 0))} trend="neutral" />
        <StatCard label="Total Inflows" value={fmt(totalInflows)} trend="up" />
        <StatCard label="Total Outflows" value={fmt(totalOutflows)} trend="down" />
        <StatCard label="Lowest Balance" value={fmt(lowestBalance)} alert={lowestBalance < 0} />
      </div>

      {/* Chart */}
      {(isAll ? allChartData.length > 0 : rows.length > 0) && (
        <Card className="mb-6">
          <CardHeader><CardTitle>{isAll ? 'Cash Balance by Production' : 'Projected Cash Balance'}</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={isAll ? allChartData : chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v, name) => [fmt(Number(v)), isAll ? (productions.find(p => p.id === name)?.name ?? name) : 'Cash Balance']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                {isAll ? (
                  productions.map((p) => (
                    <Line key={p.id} type="monotone" dataKey={p.id} stroke={p.color} strokeWidth={2} dot={{ r: 2, fill: p.color }} name={p.name} connectNulls={false} />
                  ))
                ) : (
                  <Line type="monotone" dataKey="balance" stroke={prod?.color || '#6366f1'} strokeWidth={2} dot={{ r: 3, fill: prod?.color || '#6366f1' }} name="Cash Balance" />
                )}
                {isAll && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              {isAll && <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Production</th>}
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Week</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Starting Cash</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-emerald-50/50">Tickets</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-emerald-50/50">Other In</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-red-50/30">Payroll</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-red-50/30">Venue</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-red-50/30">Marketing</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-red-50/30">Royalties</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-red-50/30">Vendors</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider bg-red-50/30">Other Out</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Closing Cash</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={isAll ? 13 : 12} className="px-4 py-8 text-center text-sm text-stone-400">No cash flow data yet. Add a week to get started.</td></tr>
            ) : (
              rows.map((r) => {
                const inflows = r.ticketRevenue + r.otherInflows
                const outflows = r.payroll + r.venueCosts + r.marketing + r.royalties + r.vendorPayments + r.otherOutflows
                const net = inflows - outflows
                const rowProd = isAll ? productions.find(p => p.id === r.productionId) : null
                return (
                  <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50/50 group">
                    {isAll && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rowProd?.color || '#a8a29e' }} />
                          <span className="text-xs text-stone-600">{rowProd?.name ?? '—'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDate(r.weekOf)}</td>
                    <td className="text-right px-4 py-3 text-stone-600">{fmt(r.startingCash)}</td>
                    <td className="text-right px-4 py-3 text-emerald-700 bg-emerald-50/30">{r.ticketRevenue > 0 ? fmt(r.ticketRevenue) : '—'}</td>
                    <td className="text-right px-4 py-3 text-emerald-700 bg-emerald-50/30">{r.otherInflows > 0 ? fmt(r.otherInflows) : '—'}</td>
                    <td className="text-right px-4 py-3 text-red-700 bg-red-50/20">{r.payroll > 0 ? fmt(r.payroll) : '—'}</td>
                    <td className="text-right px-4 py-3 text-red-700 bg-red-50/20">{r.venueCosts > 0 ? fmt(r.venueCosts) : '—'}</td>
                    <td className="text-right px-4 py-3 text-red-700 bg-red-50/20">{r.marketing > 0 ? fmt(r.marketing) : '—'}</td>
                    <td className="text-right px-4 py-3 text-red-700 bg-red-50/20">{r.royalties > 0 ? fmt(r.royalties) : '—'}</td>
                    <td className="text-right px-4 py-3 text-red-700 bg-red-50/20">{r.vendorPayments > 0 ? fmt(r.vendorPayments) : '—'}</td>
                    <td className="text-right px-4 py-3 text-red-700 bg-red-50/20">{r.otherOutflows > 0 ? fmt(r.otherOutflows) : '—'}</td>
                    <td className={`text-right px-4 py-3 font-semibold ${r.closingCash < 0 ? 'text-red-700' : 'text-stone-800'}`}>{fmt(r.closingCash)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        {isAdmin && <button onClick={() => openEdit(r)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                        {isAdmin && <button onClick={() => deleteCashFlowRow(r.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Cash Flow Week' : 'Add Cash Flow Week'} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Week Of</label>
              <input type="date" value={form.weekOf} onChange={(e) => setForm({ ...form, weekOf: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Starting Cash</label>
              <input type="number" value={form.startingCash} onChange={fieldUpdate('startingCash')} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Inflows</p>
          <div className="grid grid-cols-2 gap-3">
            {[['Ticket Revenue', 'ticketRevenue'], ['Other Inflows', 'otherInflows']].map(([label, field]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">{label}</label>
                <input type="number" value={form[field as keyof typeof form] as number} onChange={fieldUpdate(field as keyof typeof form)} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Outflows</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[['Payroll', 'payroll'], ['Venue', 'venueCosts'], ['Marketing', 'marketing'], ['Royalties', 'royalties'], ['Vendors', 'vendorPayments'], ['Other', 'otherOutflows']].map(([label, field]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">{label}</label>
                <input type="number" value={form[field as keyof typeof form] as number} onChange={fieldUpdate(field as keyof typeof form)} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
              </div>
            ))}
          </div>
          <div className="p-3 bg-stone-50 rounded border border-stone-200">
            <p className="text-xs text-stone-500 mb-1">Projected Closing Cash</p>
            <p className={`text-lg font-medium ${calcClosing(form) < 0 ? 'text-red-700' : 'text-stone-800'}`}>{fmt(calcClosing(form))}</p>
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
