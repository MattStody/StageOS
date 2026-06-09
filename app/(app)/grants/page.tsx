'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import { fmt, formatDate, daysUntil } from '@/lib/utils'
import type { Grant, GrantStatus, GrantType } from '@/lib/types'
import { Plus, X, AlertCircle, Clock, CheckCircle2, ChevronDown } from 'lucide-react'

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<GrantStatus, { label: string; cls: string; dot: string }> = {
  identified:       { label: 'Identified',       cls: 'text-stone-500 bg-stone-50 border-stone-200',     dot: 'bg-stone-300'   },
  drafting:         { label: 'Drafting',          cls: 'text-blue-700 bg-blue-50 border-blue-200',        dot: 'bg-blue-400'    },
  submitted:        { label: 'Submitted',         cls: 'text-violet-700 bg-violet-50 border-violet-200',  dot: 'bg-violet-500'  },
  under_review:     { label: 'Under Review',      cls: 'text-amber-700 bg-amber-50 border-amber-200',     dot: 'bg-amber-400'   },
  awarded:          { label: 'Awarded',           cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  declined:         { label: 'Declined',          cls: 'text-red-700 bg-red-50 border-red-200',           dot: 'bg-red-400'     },
  report_due:       { label: 'Report Due',        cls: 'text-orange-700 bg-orange-50 border-orange-200',  dot: 'bg-orange-400'  },
  report_submitted: { label: 'Report Submitted',  cls: 'text-teal-700 bg-teal-50 border-teal-200',        dot: 'bg-teal-500'    },
  complete:         { label: 'Complete',          cls: 'text-stone-400 bg-stone-50 border-stone-100',     dot: 'bg-stone-300'   },
}

const TYPE_LABELS: Record<GrantType, string> = {
  operating:    'Operating',
  project:      'Project',
  touring:      'Touring',
  capital:      'Capital',
  commissioning:'Commissioning',
  emergency:    'Emergency',
  other:        'Other',
}

const PIPELINE_STATUSES: GrantStatus[] = ['identified', 'drafting', 'submitted', 'under_review']
const AWARDED_STATUSES:  GrantStatus[] = ['awarded', 'report_due', 'report_submitted', 'complete']

// ── Helpers ─────────────────────────────────────────────────────────────────────

function uid() { return 'grant-' + Date.now().toString(36) }

const EMPTY_FORM: Omit<Grant, 'id'> = {
  funder: '', programName: '', grantType: 'project', status: 'identified',
  amountRequested: 0, amountAwarded: undefined, applicationDeadline: '',
  awardedDate: undefined, reportDeadline: undefined, year: '', productionId: undefined, notes: '',
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GrantsPage() {
  const { grants, productions, addGrant, updateGrant, deleteGrant } = useStore()

  const [filterStatus, setFilterStatus] = useState<GrantStatus | 'all'>('all')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<Grant | null>(null)
  const [form, setForm]                 = useState<Omit<Grant, 'id'>>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, year: `${new Date().getFullYear()}–${String(new Date().getFullYear() + 1).slice(2)}` })
    setModalOpen(true)
  }

  function openEdit(g: Grant) {
    setEditing(g)
    setForm({ ...g })
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.funder.trim() || !form.programName.trim() || !form.applicationDeadline) return
    if (editing) {
      updateGrant({ ...form, id: editing.id })
    } else {
      addGrant({ ...form, id: uid() })
    }
    setModalOpen(false)
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const displayed = filterStatus === 'all' ? grants : grants.filter(g => g.status === filterStatus)
  const sorted    = [...displayed].sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime())

  // ── Summary figures ────────────────────────────────────────────────────────
  const totalRequested  = grants.reduce((s, g) => s + g.amountRequested, 0)
  const totalAwarded    = grants.filter(g => g.amountAwarded != null).reduce((s, g) => s + (g.amountAwarded ?? 0), 0)
  const totalPipeline   = grants.filter(g => PIPELINE_STATUSES.includes(g.status)).reduce((s, g) => s + g.amountRequested, 0)
  const reportsOverdue  = grants.filter(g => g.status === 'report_due' && g.reportDeadline && daysUntil(g.reportDeadline) < 0).length
  const reportsDueSoon  = grants.filter(g => g.status === 'report_due' && g.reportDeadline && daysUntil(g.reportDeadline) >= 0 && daysUntil(g.reportDeadline) <= 30).length

  const statusCounts = Object.fromEntries(
    (Object.keys(STATUS_CFG) as GrantStatus[]).map(s => [s, grants.filter(g => g.status === s).length])
  ) as Record<GrantStatus, number>

  const FILTER_TABS: Array<{ value: GrantStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'identified', label: 'Identified' },
    { value: 'drafting', label: 'Drafting' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'awarded', label: 'Awarded' },
    { value: 'report_due', label: 'Report Due' },
    { value: 'declined', label: 'Declined' },
  ]

  return (
    <div>
      <PageHeader
        title="Grants & Subsidies"
        subtitle="Funder pipeline, award tracking, and reporting obligations"
        actions={
          <Button onClick={openNew} size="sm">
            <Plus size={14} /> Add Grant
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Requested', value: fmt(totalRequested), sub: `${grants.length} application${grants.length !== 1 ? 's' : ''}` },
          { label: 'Total Awarded', value: fmt(totalAwarded), sub: `${grants.filter(g => AWARDED_STATUSES.includes(g.status)).length} grants confirmed` },
          { label: 'In Pipeline', value: fmt(totalPipeline), sub: `${grants.filter(g => PIPELINE_STATUSES.includes(g.status)).length} pending decision` },
          {
            label: 'Report Obligations',
            value: String(reportsOverdue + reportsDueSoon),
            sub: reportsOverdue > 0 ? `${reportsOverdue} overdue` : reportsDueSoon > 0 ? `${reportsDueSoon} due within 30 days` : 'All current',
            alert: reportsOverdue > 0,
          },
        ].map(({ label, value, sub, alert }) => (
          <div key={label} className={`bg-white border rounded-lg p-4 ${alert ? 'border-red-200' : 'border-stone-100'}`}>
            <p className="text-xs text-stone-400 mb-0.5">{label}</p>
            <p className={`text-lg font-semibold ${alert ? 'text-red-600' : 'text-stone-900'}`}>{value}</p>
            <p className={`text-xs mt-0.5 ${alert ? 'text-red-500' : 'text-stone-400'}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {FILTER_TABS.map(({ value, label }) => {
          const count = value === 'all' ? grants.length : statusCounts[value as GrantStatus]
          if (count === 0 && value !== 'all' && value !== filterStatus) return null
          const active = filterStatus === value
          return (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                active
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-stone-100 text-stone-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {sorted.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-stone-400">No grants match this filter.</p>
              <button onClick={openNew} className="mt-3 text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2">
                Add your first grant
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['Funder / Program', 'Type', 'Year', 'Requested', 'Awarded', 'Deadline', 'Report Due', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {sorted.map(g => {
                    const sc    = STATUS_CFG[g.status]
                    const prod  = productions.find(p => p.id === g.productionId)
                    const appDays = daysUntil(g.applicationDeadline)
                    const repDays = g.reportDeadline ? daysUntil(g.reportDeadline) : null
                    return (
                      <tr key={g.id} className="hover:bg-stone-50/70 transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-stone-800 leading-tight">{g.funder}</p>
                          <p className="text-xs text-stone-400 mt-0.5 leading-tight">{g.programName}</p>
                          {prod && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-stone-400">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prod.color }} />
                              {prod.name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-stone-500 px-1.5 py-0.5 bg-stone-100 rounded">
                            {TYPE_LABELS[g.grantType]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-stone-500 whitespace-nowrap">{g.year}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-stone-800 whitespace-nowrap">{fmt(g.amountRequested)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {g.amountAwarded != null
                            ? <span className="text-sm font-semibold text-emerald-700">{fmt(g.amountAwarded)}</span>
                            : <span className="text-xs text-stone-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {g.applicationDeadline ? (
                            <>
                              <p className="text-xs text-stone-700">{formatDate(g.applicationDeadline)}</p>
                              {appDays < 0
                                ? <p className="text-[10px] text-stone-300">Passed</p>
                                : appDays <= 14
                                ? <p className="text-[10px] text-amber-600 font-medium">in {appDays}d</p>
                                : <p className="text-[10px] text-stone-400">in {appDays}d</p>
                              }
                            </>
                          ) : <span className="text-xs text-stone-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {g.reportDeadline ? (
                            <>
                              <p className="text-xs text-stone-700">{formatDate(g.reportDeadline)}</p>
                              {repDays !== null && repDays < 0
                                ? <p className="text-[10px] text-red-600 font-medium">{Math.abs(repDays)}d overdue</p>
                                : repDays !== null && repDays <= 30
                                ? <p className="text-[10px] text-amber-600 font-medium">in {repDays}d</p>
                                : repDays !== null
                                ? <p className="text-[10px] text-stone-400">in {repDays}d</p>
                                : null
                              }
                            </>
                          ) : <span className="text-xs text-stone-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${sc.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(g)}
                              className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDelete(g.id)}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <p className="text-sm font-semibold text-stone-900 mb-2">Delete this grant?</p>
            <p className="text-xs text-stone-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button
                onClick={() => { deleteGrant(confirmDelete); setConfirmDelete(null) }}
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-stone-900">{editing ? 'Edit Grant' : 'Add Grant'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Funder */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Funder *</label>
                <input
                  value={form.funder}
                  onChange={e => set('funder', e.target.value)}
                  placeholder="e.g. Canada Council for the Arts"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
              </div>

              {/* Program name */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Program Name *</label>
                <input
                  value={form.programName}
                  onChange={e => set('programName', e.target.value)}
                  placeholder="e.g. Explore and Create — Creation Projects"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
              </div>

              {/* Type + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Grant Type</label>
                  <div className="relative">
                    <select
                      value={form.grantType}
                      onChange={e => set('grantType', e.target.value as GrantType)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 appearance-none"
                    >
                      {(Object.entries(TYPE_LABELS) as [GrantType, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Status</label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={e => set('status', e.target.value as GrantStatus)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 appearance-none"
                    >
                      {(Object.entries(STATUS_CFG) as [GrantStatus, { label: string }][]).map(([v, { label }]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Amount Requested *</label>
                  <input
                    type="number"
                    value={form.amountRequested || ''}
                    onChange={e => set('amountRequested', Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Amount Awarded</label>
                  <input
                    type="number"
                    value={form.amountAwarded ?? ''}
                    onChange={e => set('amountAwarded', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="leave blank if pending"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Application Deadline *</label>
                  <input
                    type="date"
                    value={form.applicationDeadline}
                    onChange={e => set('applicationDeadline', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Awarded Date</label>
                  <input
                    type="date"
                    value={form.awardedDate ?? ''}
                    onChange={e => set('awardedDate', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>

              {/* Report deadline + year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Report Deadline</label>
                  <input
                    type="date"
                    value={form.reportDeadline ?? ''}
                    onChange={e => set('reportDeadline', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Fiscal Year</label>
                  <input
                    value={form.year}
                    onChange={e => set('year', e.target.value)}
                    placeholder="e.g. 2026–27"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>

              {/* Linked production */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Linked Production</label>
                <div className="relative">
                  <select
                    value={form.productionId ?? ''}
                    onChange={e => set('productionId', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 appearance-none"
                  >
                    <option value="">— None (general operating) —</option>
                    {productions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Decision timeline, contact, conditions..."
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!form.funder.trim() || !form.programName.trim() || !form.applicationDeadline}
              >
                {editing ? 'Save Changes' : 'Add Grant'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
