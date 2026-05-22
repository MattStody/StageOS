'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, variance, variancePct } from '@/lib/utils'
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import type { BudgetLine } from '@/lib/types'

const CATEGORIES = [
  'General Management', 'Cast', 'Creative Team', 'Musicians', 'Production Staff',
  'Stage Management', 'Set', 'Costumes', 'Lighting', 'Sound', 'Venue Rental',
  'Insurance', 'Marketing & Advertising', 'Press', 'Ticketing Fees', 'Royalties',
  'Legal', 'Travel & Housing', 'Contingency',
]

const blankLine = (productionId: string): Omit<BudgetLine, 'id'> => ({
  productionId,
  category: CATEGORIES[0],
  lineItem: '',
  budgeted: 0,
  committed: 0,
  actual: 0,
  notes: '',
})

export default function BudgetPage() {
  const { productions, budgetLines, addBudgetLine, updateBudgetLine, deleteBudgetLine } = useStore()

  const [selectedProd, setSelectedProd] = useState(productions[0]?.id || '')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetLine | null>(null)
  const [form, setForm] = useState<Omit<BudgetLine, 'id'>>(blankLine(selectedProd))

  const prod = productions.find((p) => p.id === selectedProd)
  const lines = budgetLines.filter((l) => l.productionId === selectedProd)

  const categories = CATEGORIES.filter((cat) => lines.some((l) => l.category === cat))

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
  const totalCommitted = lines.reduce((s, l) => s + l.committed, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)
  const totalVariance = variance(totalActual, totalBudgeted)

  function openAdd() {
    setEditing(null)
    setForm(blankLine(selectedProd))
    setModalOpen(true)
  }

  function openEdit(line: BudgetLine) {
    setEditing(line)
    setForm({ ...line })
    setModalOpen(true)
  }

  function handleSave() {
    if (editing) {
      updateBudgetLine({ ...form, id: editing.id })
    } else {
      addBudgetLine({ ...form, id: `b-${Date.now()}` })
    }
    setModalOpen(false)
  }

  function toggleCategory(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="Production Budget"
        subtitle="Track budgeted, committed, and actual costs"
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus size={13} /> Add Line
          </Button>
        }
      />

      {/* Production selector */}
      <div className="flex gap-2 mb-6">
        {productions.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProd(p.id)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Budgeted', value: fmt(totalBudgeted) },
          { label: 'Total Committed', value: fmt(totalCommitted) },
          { label: 'Total Actual', value: fmt(totalActual) },
          { label: 'Total Variance', value: fmt(totalVariance), alert: totalVariance > 0 },
        ].map(({ label, value, alert }) => (
          <div key={label} className={`bg-white border rounded-lg px-5 py-4 ${alert ? 'border-red-200 bg-red-50/30' : 'border-stone-200'}`}>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-xl font-light ${alert ? 'text-red-700' : 'text-stone-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Line Item</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Budgeted</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Committed</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Actual</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Variance</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const catLines = lines.filter((l) => l.category === cat)
              const catBudgeted = catLines.reduce((s, l) => s + l.budgeted, 0)
              const catActual = catLines.reduce((s, l) => s + l.actual, 0)
              const catVariance = variance(catActual, catBudgeted)
              const isCollapsed = collapsed.has(cat)

              return [
                <tr
                  key={`cat-${cat}`}
                  onClick={() => toggleCategory(cat)}
                  className="border-b border-stone-100 bg-stone-50/50 cursor-pointer hover:bg-stone-50"
                >
                  <td className="px-4 py-2.5 flex items-center gap-2 font-medium text-stone-700">
                    {isCollapsed ? <ChevronRight size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
                    {cat}
                  </td>
                  <td className="text-right px-4 py-2.5 text-stone-600 font-medium">{fmt(catBudgeted)}</td>
                  <td className="text-right px-4 py-2.5 text-stone-500">—</td>
                  <td className="text-right px-4 py-2.5 text-stone-600 font-medium">{fmt(catActual)}</td>
                  <td className={`text-right px-4 py-2.5 font-medium ${catVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {catVariance !== 0 ? fmt(catVariance) : '—'}
                  </td>
                  <td className="px-4 py-2.5" colSpan={2} />
                </tr>,
                ...(!isCollapsed ? catLines.map((line) => {
                  const v = variance(line.actual, line.budgeted)
                  const vPct = variancePct(line.actual, line.budgeted)
                  const overBudget = vPct > 10

                  return (
                    <tr key={line.id} className="border-b border-stone-100 hover:bg-stone-50/50 group">
                      <td className="px-4 py-2.5 pl-10 text-stone-700">{line.lineItem}</td>
                      <td className="text-right px-4 py-2.5 text-stone-600">{fmt(line.budgeted)}</td>
                      <td className="text-right px-4 py-2.5 text-stone-500">{line.committed > 0 ? fmt(line.committed) : '—'}</td>
                      <td className="text-right px-4 py-2.5 text-stone-700">{line.actual > 0 ? fmt(line.actual) : '—'}</td>
                      <td className="text-right px-4 py-2.5">
                        {line.actual > 0 ? (
                          <span className={`text-xs ${overBudget ? 'text-red-600 font-medium' : v < 0 ? 'text-emerald-600' : 'text-stone-500'}`}>
                            {fmt(v)} {overBudget && `(${fmtPct(vPct)})`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-stone-400">{line.notes}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button onClick={() => openEdit(line)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>
                          <button onClick={() => deleteBudgetLine(line.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                }) : []),
              ]
            })}

            {/* Grand total */}
            <tr className="bg-stone-50 border-t-2 border-stone-200">
              <td className="px-4 py-3 font-semibold text-stone-800">Total</td>
              <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalBudgeted)}</td>
              <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalCommitted)}</td>
              <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalActual)}</td>
              <td className={`text-right px-4 py-3 font-semibold ${totalVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(totalVariance)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Budget Line' : 'Add Budget Line'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Line Item</label>
            <input
              value={form.lineItem}
              onChange={(e) => setForm({ ...form, lineItem: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['budgeted', 'committed', 'actual'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1 capitalize">{field}</label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Line'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
