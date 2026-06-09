'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, variance, variancePct } from '@/lib/utils'
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { BudgetLine } from '@/lib/types'

type CsvRow = {
  category: string
  lineItem: string
  budgeted: number
  committed: number
  actual: number
  notes: string
}

function parseCSV(text: string): { rows: CsvRow[]; error: string | null } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row.' }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const colIdx = (names: string[]) => headers.findIndex((h) => names.includes(h))

  const catIdx = colIdx(['category'])
  const itemIdx = colIdx(['line item', 'lineitem', 'item'])
  const budIdx = colIdx(['budgeted', 'budget'])
  const comIdx = colIdx(['committed', 'commit'])
  const actIdx = colIdx(['actual', 'actuals'])
  const notesIdx = colIdx(['notes', 'note'])

  if (catIdx === -1 || itemIdx === -1) {
    return { rows: [], error: 'CSV must include "Category" and "Line Item" columns.' }
  }

  const parseNum = (val: string | undefined) => {
    if (!val) return 0
    const clean = val.replace(/^"|"$/g, '').replace(/[$,\s]/g, '')
    const n = parseFloat(clean)
    return isNaN(n) ? 0 : n
  }

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g) ?? []
    const get = (idx: number) => (idx >= 0 ? (cols[idx] ?? '').trim().replace(/^"|"$/g, '') : '')
    const lineItem = get(itemIdx)
    if (!lineItem) continue
    rows.push({
      category: get(catIdx) || CATEGORIES[0],
      lineItem,
      budgeted: parseNum(get(budIdx)),
      committed: parseNum(get(comIdx)),
      actual: parseNum(get(actIdx)),
      notes: get(notesIdx),
    })
  }

  if (rows.length === 0) return { rows: [], error: 'No valid rows found in CSV.' }
  return { rows, error: null }
}

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
  const { isAdmin } = useAuth()

  const [selectedProd, setSelectedProd] = useState(productions[0]?.id || '')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetLine | null>(null)
  const [form, setForm] = useState<Omit<BudgetLine, 'id'>>(blankLine(selectedProd))

  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvImported, setCsvImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows, error } = parseCSV(text)
      setCsvRows(rows)
      setCsvError(error)
      setCsvImported(false)
      setCsvModalOpen(true)
    }
    reader.readAsText(file)
  }

  function handleCsvImport() {
    csvRows.forEach((row, i) => {
      addBudgetLine({
        ...row,
        id: `b-csv-${Date.now()}-${i}`,
        productionId: selectedProd,
      })
    })
    setCsvImported(true)
  }

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
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCsvFile(file)
                e.target.value = ''
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} /> Import CSV
            </Button>
            <Button onClick={openAdd} size="sm">
              <Plus size={13} /> Add Line
            </Button>
          </div>
        ) : undefined
        }
      />

      {/* Production selector */}
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

      {/* Totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
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
                          {isAdmin && <button onClick={() => openEdit(line)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                          {isAdmin && <button onClick={() => deleteBudgetLine(line.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
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

      {/* CSV Import Modal */}
      <Modal open={csvModalOpen} onClose={() => setCsvModalOpen(false)} title="Import Budget from CSV">
        {csvError ? (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Could not parse CSV</p>
              <p className="text-xs text-red-600 mt-0.5">{csvError}</p>
            </div>
          </div>
        ) : csvImported ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700">{csvRows.length} line{csvRows.length !== 1 ? 's' : ''} imported successfully.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-3">
              Preview — {csvRows.length} row{csvRows.length !== 1 ? 's' : ''} detected. All will be added to <strong className="text-stone-700">{prod?.name}</strong>.
            </p>
            <div className="overflow-x-auto rounded border border-stone-200 mb-4 max-h-72 overflow-y-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="sticky top-0 bg-stone-50">
                  <tr className="border-b border-stone-200">
                    {['Category', 'Line Item', 'Budgeted', 'Committed', 'Actual', 'Notes'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, i) => (
                    <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-3 py-2 text-stone-600">{row.category}</td>
                      <td className="px-3 py-2 text-stone-800">{row.lineItem}</td>
                      <td className="px-3 py-2 text-stone-600 text-right">{fmt(row.budgeted)}</td>
                      <td className="px-3 py-2 text-stone-600 text-right">{row.committed > 0 ? fmt(row.committed) : '—'}</td>
                      <td className="px-3 py-2 text-stone-600 text-right">{row.actual > 0 ? fmt(row.actual) : '—'}</td>
                      <td className="px-3 py-2 text-stone-400">{row.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-2 mb-3 p-3 bg-stone-50 rounded text-xs text-stone-500 border border-stone-200">
          <strong className="text-stone-600">Expected columns:</strong> Category, Line Item, Budgeted, Committed, Actual, Notes
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => setCsvModalOpen(false)}>
            {csvImported ? 'Close' : 'Cancel'}
          </Button>
          {!csvError && !csvImported && (
            <Button onClick={handleCsvImport}>
              Import {csvRows.length} Line{csvRows.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </Modal>

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
