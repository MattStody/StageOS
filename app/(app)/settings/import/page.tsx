'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import type {
  Production, BudgetLine, RevenueWeek, Contract, PerformanceDate,
  ProductionStatus, ContractStatus, ContractType, PerformanceStatus,
} from '@/lib/types'

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseRows(text: string): { headers: string[]; rows: Record<string, string>[]; error: string | null } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [], error: 'File must have a header row and at least one data row.' }

  const splitLine = (line: string) => {
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    cols.push(cur.trim())
    return cols
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]+/g, '_'))
  const rows = lines.slice(1).map((line) => {
    const cols = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim() })
    return row
  }).filter((row) => Object.values(row).some((v) => v))

  if (rows.length === 0) return { headers, rows: [], error: 'No valid data rows found.' }
  return { headers, rows, error: null }
}

function parseNum(v: string | undefined) {
  if (!v) return 0
  const n = parseFloat(v.replace(/[$,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

// Multi-alias column getter
function g(row: Record<string, string>, ...aliases: string[]) {
  for (const a of aliases) {
    const v = row[a.toLowerCase().replace(/[\s-]+/g, '_')] ?? ''
    if (v) return v
  }
  return ''
}

// ── CSV templates ─────────────────────────────────────────────────────────────

type TabId = 'productions' | 'revenue' | 'budget' | 'performances' | 'contracts'

const TEMPLATES: Record<TabId, string[][]> = {
  productions: [
    ['name', 'subtitle', 'status', 'venue', 'openingDate', 'closingDate', 'totalBudget', 'cashOnHand', 'projectedGross', 'color'],
    ["A Winter's Dream", 'A New Musical', 'in_rehearsal', 'St. James Theatre, New York', '2026-09-15', '2026-11-05', '2800000', '412000', '3200000', '#6366f1'],
    ['The Silence Between', 'World Premiere Opera', 'pre_production', 'BAM Harvey Theater', '2026-10-14', '2026-11-08', '980000', '295000', '620000', '#0891b2'],
  ],
  revenue: [
    ['production', 'weekEnding', 'performances', 'ticketsSold', 'grossRevenue', 'avgTicketPrice', 'capacityPct', 'totalSeats'],
    ["A Winter's Dream", '2026-09-22', '8', '1820', '218400', '120', '62', '2932'],
    ["A Winter's Dream", '2026-09-29', '8', '2340', '303000', '129', '80', '2932'],
  ],
  budget: [
    ['production', 'category', 'lineItem', 'budgeted', 'committed', 'actual', 'notes'],
    ["A Winter's Dream", 'Cast', 'Lead Actor', '28000', '28000', '28000', 'AEA principal'],
    ["A Winter's Dream", 'Venue Rental', 'St. James Theatre', '320000', '320000', '320000', ''],
    ["A Winter's Dream", 'Marketing & Advertising', 'Digital Campaign', '85000', '60000', '42000', 'Q3 push'],
  ],
  performances: [
    ['production', 'date', 'time', 'status', 'notes'],
    ["A Winter's Dream", '2026-09-15', '20:00', 'scheduled', 'Opening Night'],
    ["A Winter's Dream", '2026-09-16', '14:00', 'scheduled', 'Matinee'],
    ["A Winter's Dream", '2026-09-18', '19:00', 'scheduled', ''],
  ],
  contracts: [
    ['production', 'partyName', 'contractType', 'status', 'dueDate', 'fee', 'keyObligations', 'notes'],
    ["A Winter's Dream", 'Jordan A. Mercer', 'cast', 'signed', '2026-06-01', '28000', 'Lead role, exclusive through closing', 'AEA principal'],
    ["A Winter's Dream", 'St. James Theatre', 'venue', 'signed', '2026-05-01', '320000', 'Exclusive booking Sep 15–Nov 5', ''],
  ],
}

function downloadTemplate(tabId: TabId) {
  const rows = TEMPLATES[tabId]
  const csv = rows.map((r) => r.map((v) => (v.includes(',') || v.includes('"') ? `"${v}"` : v)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stageos-${tabId}-template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tab metadata ──────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; desc: string; required: string[] }[] = [
  { id: 'productions', label: 'Productions', desc: 'Create new productions with basic details and financials.', required: ['name'] },
  { id: 'revenue', label: 'Revenue Weeks', desc: 'Weekly ticket sales data matched to an existing production.', required: ['production', 'weekEnding', 'grossRevenue'] },
  { id: 'budget', label: 'Budget Lines', desc: 'Line-item budget data for an existing production.', required: ['production', 'category', 'lineItem'] },
  { id: 'performances', label: 'Performances', desc: 'Performance schedule dates and times.', required: ['production', 'date'] },
  { id: 'contracts', label: 'Contracts', desc: 'Contracts and deal memos for cast, crew, and vendors.', required: ['production', 'partyName'] },
]

const COL_REF: Record<TabId, { name: string; req?: true; hint: string }[]> = {
  productions: [
    { name: 'name', req: true, hint: 'Production name' },
    { name: 'subtitle', hint: 'Short description or subtitle' },
    { name: 'status', hint: 'pre_production | in_rehearsal | in_performance | closing | closed' },
    { name: 'venue', hint: 'Venue name and city' },
    { name: 'openingDate', hint: 'YYYY-MM-DD' },
    { name: 'closingDate', hint: 'YYYY-MM-DD' },
    { name: 'totalBudget', hint: 'Total capitalisation ($)' },
    { name: 'cashOnHand', hint: 'Current cash balance ($)' },
    { name: 'projectedGross', hint: 'Projected total box office ($)' },
    { name: 'color', hint: 'Brand hex colour e.g. #6366f1 (auto-assigned if blank)' },
  ],
  revenue: [
    { name: 'production', req: true, hint: 'Must match an existing production name exactly' },
    { name: 'weekEnding', req: true, hint: 'YYYY-MM-DD (Saturday of the week)' },
    { name: 'grossRevenue', req: true, hint: 'Weekly gross box office ($)' },
    { name: 'performances', hint: 'Number of performances that week (0 = advance sales only)' },
    { name: 'ticketsSold', hint: 'Total tickets sold' },
    { name: 'avgTicketPrice', hint: 'Average ticket price — derived if blank' },
    { name: 'capacityPct', hint: 'Capacity fill % (0–100) — derived if blank' },
    { name: 'totalSeats', hint: 'Total available seats for the week' },
  ],
  budget: [
    { name: 'production', req: true, hint: 'Must match an existing production name exactly' },
    { name: 'category', req: true, hint: 'e.g. Cast, Set, Venue Rental, Marketing & Advertising' },
    { name: 'lineItem', req: true, hint: 'Specific line item description' },
    { name: 'budgeted', hint: 'Budgeted amount ($)' },
    { name: 'committed', hint: 'Committed amount ($)' },
    { name: 'actual', hint: 'Actual spend to date ($)' },
    { name: 'notes', hint: 'Any notes or context' },
  ],
  performances: [
    { name: 'production', req: true, hint: 'Must match an existing production name exactly' },
    { name: 'date', req: true, hint: 'YYYY-MM-DD' },
    { name: 'time', hint: 'HH:MM (24-hour format) — defaults to 20:00' },
    { name: 'status', hint: 'scheduled | completed | cancelled | postponed' },
    { name: 'notes', hint: 'e.g. Opening Night, Matinee, Press Night' },
  ],
  contracts: [
    { name: 'production', req: true, hint: 'Must match an existing production name exactly' },
    { name: 'partyName', req: true, hint: 'Person or company name' },
    { name: 'contractType', hint: 'cast | creative | vendor | venue | rights | investor | employment' },
    { name: 'status', hint: 'draft | sent | signed | expired | needs_review' },
    { name: 'dueDate', hint: 'YYYY-MM-DD' },
    { name: 'fee', hint: 'Contract fee or guarantee ($)' },
    { name: 'keyObligations', hint: 'Key deal terms' },
    { name: 'notes', hint: 'Internal notes' },
  ],
}

const PROD_COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea', '#0f172a', '#be185d']

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const {
    productions,
    addProduction, addRevenueWeek, addBudgetLine, addPerformanceDate, addContract,
  } = useStore()

  const [tab, setTab] = useState<TabId>('productions')
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const tabCfg = TABS.find((t) => t.id === tab)!
  const colRef = COL_REF[tab]

  function matchProd(name: string) {
    return productions.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { rows, error } = parseRows(ev.target?.result as string)
      if (error) { setParseErr(error); setPreview(null) } else { setParseErr(null); setPreview(rows) }
      setImportedCount(null)
      setRowErrors([])
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImport() {
    if (!preview) return
    const ts = Date.now()
    const errs: string[] = []
    let n = 0

    if (tab === 'productions') {
      preview.forEach((row, i) => {
        const name = g(row, 'name')
        if (!name) { errs.push(`Row ${i + 1}: "name" is required`); return }
        const status = g(row, 'status') as ProductionStatus
        const validStatuses: ProductionStatus[] = ['pre_production', 'in_rehearsal', 'in_performance', 'closing', 'closed']
        addProduction({
          id: `prod-csv-${ts}-${i}`,
          name,
          subtitle: g(row, 'subtitle'),
          status: validStatuses.includes(status) ? status : 'pre_production',
          venue: g(row, 'venue'),
          openingDate: g(row, 'openingDate', 'opening_date', 'opening'),
          closingDate: g(row, 'closingDate', 'closing_date', 'closing'),
          totalBudget: parseNum(g(row, 'totalBudget', 'total_budget', 'budget')),
          totalActual: 0,
          cashOnHand: parseNum(g(row, 'cashOnHand', 'cash_on_hand', 'cash')),
          projectedGross: parseNum(g(row, 'projectedGross', 'projected_gross')),
          currentGross: 0,
          color: g(row, 'color') || PROD_COLORS[i % PROD_COLORS.length],
        } satisfies Production)
        n++
      })
    }

    if (tab === 'revenue') {
      preview.forEach((row, i) => {
        const prodName = g(row, 'production')
        const weekEnding = g(row, 'weekEnding', 'week_ending', 'week')
        const grossRaw = g(row, 'grossRevenue', 'gross_revenue', 'gross')
        if (!prodName || !weekEnding || !grossRaw) { errs.push(`Row ${i + 1}: missing required field(s)`); return }
        const prod = matchProd(prodName)
        if (!prod) { errs.push(`Row ${i + 1}: production "${prodName}" not found`); return }
        const ticketsSold = parseNum(g(row, 'ticketsSold', 'tickets_sold', 'tickets'))
        const grossRevenue = parseNum(grossRaw)
        const perfs = parseNum(g(row, 'performances', 'perfs'))
        const totalSeats = parseNum(g(row, 'totalSeats', 'total_seats', 'seats'))
        const atpRaw = parseNum(g(row, 'avgTicketPrice', 'avg_ticket_price', 'atp'))
        const capRaw = parseNum(g(row, 'capacityPct', 'capacity_pct', 'capacity'))
        addRevenueWeek({
          id: `rw-csv-${ts}-${i}`,
          productionId: prod.id,
          weekEnding,
          performances: perfs,
          ticketsSold,
          grossRevenue,
          avgTicketPrice: atpRaw || (ticketsSold > 0 ? Math.round(grossRevenue / ticketsSold) : 0),
          capacityPct: capRaw || (totalSeats > 0 ? Math.round((ticketsSold / totalSeats) * 100) : 0),
          comps: parseNum(g(row, 'comps')),
          discounts: parseNum(g(row, 'discounts')),
          netRevenue: parseNum(g(row, 'netRevenue', 'net_revenue', 'net')) || grossRevenue,
          totalSeats,
        } satisfies RevenueWeek)
        n++
      })
    }

    if (tab === 'budget') {
      preview.forEach((row, i) => {
        const prodName = g(row, 'production')
        const category = g(row, 'category')
        const lineItem = g(row, 'lineItem', 'line_item', 'item')
        if (!prodName || !category || !lineItem) { errs.push(`Row ${i + 1}: missing required field(s)`); return }
        const prod = matchProd(prodName)
        if (!prod) { errs.push(`Row ${i + 1}: production "${prodName}" not found`); return }
        addBudgetLine({
          id: `bl-csv-${ts}-${i}`,
          productionId: prod.id,
          category,
          lineItem,
          budgeted: parseNum(g(row, 'budgeted', 'budget')),
          committed: parseNum(g(row, 'committed', 'commit')),
          actual: parseNum(g(row, 'actual', 'actuals')),
          notes: g(row, 'notes', 'note'),
        } satisfies BudgetLine)
        n++
      })
    }

    if (tab === 'performances') {
      preview.forEach((row, i) => {
        const prodName = g(row, 'production')
        const date = g(row, 'date')
        if (!prodName || !date) { errs.push(`Row ${i + 1}: missing required field(s)`); return }
        const prod = matchProd(prodName)
        if (!prod) { errs.push(`Row ${i + 1}: production "${prodName}" not found`); return }
        const statusRaw = g(row, 'status').toLowerCase()
        const validPerfStatuses: PerformanceStatus[] = ['scheduled', 'completed', 'cancelled', 'postponed']
        addPerformanceDate({
          id: `perf-csv-${ts}-${i}`,
          productionId: prod.id,
          date,
          time: g(row, 'time') || '20:00',
          status: validPerfStatuses.includes(statusRaw as PerformanceStatus) ? (statusRaw as PerformanceStatus) : 'scheduled',
          notes: g(row, 'notes', 'note'),
          spektrixInstanceId: g(row, 'spektrixInstanceId', 'spektrix_instance_id', 'spektrixId') || undefined,
        } satisfies PerformanceDate)
        n++
      })
    }

    if (tab === 'contracts') {
      preview.forEach((row, i) => {
        const prodName = g(row, 'production')
        const partyName = g(row, 'partyName', 'party_name', 'party', 'name')
        if (!prodName || !partyName) { errs.push(`Row ${i + 1}: missing required field(s)`); return }
        const prod = matchProd(prodName)
        if (!prod) { errs.push(`Row ${i + 1}: production "${prodName}" not found`); return }
        const typeRaw = g(row, 'contractType', 'contract_type', 'type').toLowerCase()
        const validTypes: ContractType[] = ['cast', 'creative', 'vendor', 'venue', 'rights', 'investor', 'employment']
        const statusRaw = g(row, 'status').toLowerCase()
        const validContractStatuses: ContractStatus[] = ['draft', 'sent', 'signed', 'expired', 'needs_review']
        addContract({
          id: `c-csv-${ts}-${i}`,
          productionId: prod.id,
          partyName,
          contractType: validTypes.includes(typeRaw as ContractType) ? (typeRaw as ContractType) : 'vendor',
          status: validContractStatuses.includes(statusRaw as ContractStatus) ? (statusRaw as ContractStatus) : 'draft',
          dueDate: g(row, 'dueDate', 'due_date', 'due'),
          fee: parseNum(g(row, 'fee', 'amount')),
          keyObligations: g(row, 'keyObligations', 'key_obligations', 'obligations', 'terms'),
          notes: g(row, 'notes', 'note'),
          hasFile: false,
        } satisfies Contract)
        n++
      })
    }

    setImportedCount(n)
    setRowErrors(errs)
    if (n > 0) { setPreview(null); if (fileRef.current) fileRef.current.value = '' }
  }

  function switchTab(t: TabId) {
    setTab(t)
    setPreview(null)
    setParseErr(null)
    setImportedCount(null)
    setRowErrors([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewHeaders = preview && preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <div>
      <PageHeader
        title="CSV Import"
        subtitle="Upload CSV files to add productions, revenue, budget lines, performances, or contracts"
      />

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${
              tab === t.id
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">

        {/* Left: column reference */}
        <Card>
          <CardHeader><CardTitle>Column Reference</CardTitle></CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-4 py-2 text-stone-400 font-medium">Column</th>
                  <th className="text-left px-4 py-2 text-stone-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {colRef.map(({ name, req, hint }) => (
                  <tr key={name} className="border-b border-stone-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-stone-700 whitespace-nowrap">
                      {name}{req && <span className="text-red-500 ml-0.5">*</span>}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500 leading-snug text-[11px]">{hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-stone-100">
              <button
                onClick={() => downloadTemplate(tab)}
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors"
              >
                <Download size={12} />
                Download template CSV
              </button>
            </div>
          </CardBody>
        </Card>

        {/* Right: upload + preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload {tabCfg.label} CSV</CardTitle>
              <p className="text-xs text-stone-400 mt-0.5">{tabCfg.desc}</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-[11px] text-stone-400">
                <span className="text-red-500 font-medium">*</span> Required columns: <span className="font-medium text-stone-600">{tabCfg.required.join(', ')}</span>
              </p>

              {/* Drop zone */}
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-lg py-10 px-4 cursor-pointer hover:border-stone-300 hover:bg-stone-50 transition-colors">
                <Upload size={22} className="text-stone-300" />
                <span className="text-sm font-medium text-stone-600">Click to choose a CSV file</span>
                <span className="text-xs text-stone-400">.csv — UTF-8 encoding, comma-separated</span>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
              </label>

              {parseErr && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {parseErr}
                </div>
              )}

              {importedCount !== null && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2.5">
                  <CheckCircle2 size={14} className="shrink-0" />
                  Imported <strong>{importedCount}</strong> record{importedCount !== 1 ? 's' : ''} successfully.
                  {rowErrors.length > 0 && (
                    <span className="text-amber-600 ml-1">({rowErrors.length} row{rowErrors.length !== 1 ? 's' : ''} skipped)</span>
                  )}
                </div>
              )}

              {rowErrors.length > 0 && (
                <div className="space-y-1">
                  {rowErrors.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                      <AlertCircle size={11} className="shrink-0 mt-0.5" />
                      {e}
                    </div>
                  ))}
                  {rowErrors.length > 6 && (
                    <p className="text-[11px] text-stone-400 pl-4">…and {rowErrors.length - 6} more</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <p className="text-xs text-stone-400 mt-0.5">{preview.length} row{preview.length !== 1 ? 's' : ''} ready to import</p>
                </div>
                <Button size="sm" onClick={handleImport}>
                  Import {preview.length} row{preview.length !== 1 ? 's' : ''}
                </Button>
              </CardHeader>
              <CardBody className="p-0 overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {previewHeaders.map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-stone-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-stone-50 hover:bg-stone-50">
                        {previewHeaders.map((h) => (
                          <td key={h} className="px-3 py-2 text-stone-600 max-w-[180px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr>
                        <td colSpan={previewHeaders.length} className="px-3 py-2 text-[11px] text-stone-400 text-center">
                          + {preview.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
