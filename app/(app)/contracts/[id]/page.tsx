'use client'
import { useState, use } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { fmt, formatDate, daysUntil, statusLabel } from '@/lib/utils'
import {
  AlertTriangle, CheckCircle2, Clock, Sparkles, Plus, Pencil, Trash2,
  FileText, ChevronLeft, Calendar, DollarSign, Shield, RefreshCw, BookOpen,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { extractObligations, type SuggestedObligation } from '@/lib/obligationEngine'
import type {
  ContractObligation, ObligationType, ObligationStatus, ObligationRisk,
} from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  signature_required: 'Signature Required',
  payment_due: 'Payment Due',
  royalty_payment: 'Royalty Payment',
  royalty_statement: 'Royalty Statement',
  report_due: 'Report Due',
  insurance_required: 'Insurance Required',
  approval_required: 'Approval Required',
  deliverable_due: 'Deliverable Due',
  renewal_deadline: 'Renewal Deadline',
  option_deadline: 'Option Deadline',
  expiry_date: 'Expiry Date',
  termination_notice: 'Termination Notice',
  reimbursement_due: 'Reimbursement Due',
  tax_form_required: 'Tax Form Required',
  rights_restriction: 'Rights Restriction',
  publicity_credit: 'Publicity Credit',
  confidentiality: 'Confidentiality',
  compliance: 'Compliance',
  other: 'Other',
}

const STATUS_LABELS: Record<ObligationStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  waiting_on_party: 'Waiting on Party',
  completed: 'Completed',
  overdue: 'Overdue',
  waived: 'Waived',
  not_applicable: 'N/A',
}

const RISK_COLORS: Record<ObligationRisk, string> = {
  low: 'text-green-700 bg-green-50 border-green-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  critical: 'text-red-700 bg-red-50 border-red-200',
}

const STATUS_COLORS: Record<ObligationStatus, string> = {
  not_started: 'text-stone-600 bg-stone-50 border-stone-200',
  in_progress: 'text-blue-700 bg-blue-50 border-blue-200',
  waiting_on_party: 'text-purple-700 bg-purple-50 border-purple-200',
  completed: 'text-green-700 bg-green-50 border-green-200',
  overdue: 'text-red-700 bg-red-50 border-red-200',
  waived: 'text-stone-500 bg-stone-50 border-stone-200',
  not_applicable: 'text-stone-400 bg-stone-50 border-stone-200',
}

const OBLIGATION_STATUSES: ObligationStatus[] = [
  'not_started', 'in_progress', 'waiting_on_party', 'completed', 'overdue', 'waived', 'not_applicable',
]

const OBLIGATION_TYPES: ObligationType[] = [
  'signature_required', 'payment_due', 'royalty_payment', 'royalty_statement', 'report_due',
  'insurance_required', 'approval_required', 'deliverable_due', 'renewal_deadline', 'option_deadline',
  'expiry_date', 'termination_notice', 'reimbursement_due', 'tax_form_required', 'rights_restriction',
  'publicity_credit', 'confidentiality', 'compliance', 'other',
]

function blankObligation(contractId: string, productionId: string, partyName: string): Omit<ContractObligation, 'id'> {
  return {
    contractId,
    productionId,
    partyName,
    type: 'other',
    description: '',
    dueDate: '',
    status: 'not_started',
    owner: 'General Manager',
    risk: 'medium',
    source: 'manual',
    notes: '',
    syncedToCalendar: false,
    syncedToCashFlow: false,
    createdAt: new Date().toISOString(),
  }
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { productions, contracts, obligations, addObligation, updateObligation, deleteObligation } = useStore()

  const [extractModalOpen, setExtractModalOpen] = useState(false)
  const [extractPhase, setExtractPhase] = useState<'idle' | 'analyzing' | 'review'>('idle')
  const [suggestions, setSuggestions] = useState<SuggestedObligation[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingObligation, setEditingObligation] = useState<ContractObligation | null>(null)
  const [oblForm, setOblForm] = useState<Omit<ContractObligation, 'id'>>(blankObligation('', '', ''))

  const contract = contracts.find((c) => c.id === id)
  if (!contract) return notFound()

  const production = productions.find((p) => p.id === contract.productionId)
  const contractObligations = obligations.filter((o) => o.contractId === id)

  const criticalCount = contractObligations.filter((o) => o.risk === 'critical' || o.risk === 'high').length
  const overdueCount = contractObligations.filter((o) => {
    return o.status !== 'completed' && o.status !== 'waived' && o.status !== 'not_applicable' && o.dueDate && daysUntil(o.dueDate) < 0
  }).length

  function openExtract() {
    if (!contract) return
    const c = contract
    setExtractPhase('analyzing')
    setExtractModalOpen(true)
    setTimeout(() => {
      const extracted = extractObligations(c)
      setSuggestions(extracted)
      setSelectedSuggestions(new Set(extracted.map((_, i) => i)))
      setExtractPhase('review')
    }, 2000)
  }

  function confirmExtract() {
    if (!contract) return
    const c = contract
    const now = new Date().toISOString()
    suggestions.forEach((s, i) => {
      if (!selectedSuggestions.has(i)) return
      addObligation({
        id: `obl-${c.id}-${Date.now()}-${i}`,
        contractId: c.id,
        productionId: c.productionId,
        partyName: c.partyName,
        type: s.type,
        description: s.description,
        dueDate: s.dueDate,
        amount: s.amount,
        status: 'not_started',
        owner: s.owner,
        risk: s.risk,
        source: 'ai_extracted',
        notes: '',
        syncedToCalendar: false,
        syncedToCashFlow: false,
        confidence: s.confidence,
        createdAt: now,
      })
    })
    setExtractModalOpen(false)
    setExtractPhase('idle')
  }

  function openAdd() {
    if (!contract) return
    setEditingObligation(null)
    setOblForm(blankObligation(contract.id, contract.productionId, contract.partyName))
    setAddModalOpen(true)
  }

  function openEditObl(o: ContractObligation) {
    setEditingObligation(o)
    setOblForm({ ...o })
    setAddModalOpen(true)
  }

  function saveObligation() {
    if (!contract) return
    if (editingObligation) {
      updateObligation({ ...oblForm, id: editingObligation.id })
    } else {
      addObligation({ ...oblForm, id: `obl-${contract.id}-${Date.now()}` })
    }
    setAddModalOpen(false)
  }

  const daysLeft = daysUntil(contract.dueDate)
  const contractOverdue = contract.status !== 'signed' && contract.status !== 'expired' && contract.dueDate && daysLeft < 0

  return (
    <div>
      <PageHeader
        title={contract.partyName}
        subtitle={`${TYPE_LABELS[contract.contractType] ?? contract.contractType} · ${production?.name ?? ''}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.back()}>
              <ChevronLeft size={13} /> Back
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={openExtract}>
                <Sparkles size={13} /> Extract Obligations
              </Button>
            )}
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={openAdd}>
                <Plus size={13} /> Add Obligation
              </Button>
            )}
          </div>
        }
      />

      {/* Contract summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Status</p>
          <Badge variant={contract.status}>{statusLabel(contract.status)}</Badge>
          {contractOverdue && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={10} /> {Math.abs(daysLeft)}d overdue
            </p>
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Fee</p>
          <p className="text-lg font-semibold text-stone-800">{contract.fee > 0 ? fmt(contract.fee) : '—'}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Due Date</p>
          <p className="text-sm font-medium text-stone-800">{contract.dueDate ? formatDate(contract.dueDate) : '—'}</p>
          {contract.dueDate && !contractOverdue && daysLeft >= 0 && (
            <p className="text-xs text-stone-400 mt-0.5">{daysLeft}d remaining</p>
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Obligations</p>
          <p className="text-lg font-semibold text-stone-800">{contractObligations.length}</p>
          {(criticalCount > 0 || overdueCount > 0) && (
            <p className="text-xs text-red-600 mt-0.5">
              {overdueCount > 0 ? `${overdueCount} overdue` : `${criticalCount} high risk`}
            </p>
          )}
        </div>
      </div>

      {/* Key obligations / notes */}
      {(contract.keyObligations || contract.notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {contract.keyObligations && (
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText size={11} /> Key Obligations
              </p>
              <p className="text-sm text-stone-700">{contract.keyObligations}</p>
            </div>
          )}
          {contract.notes && (
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-stone-600">{contract.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Obligations table */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Tracked Obligations</h3>
      </div>

      {contractObligations.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
          <Shield size={28} className="mx-auto text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-700 mb-1">No obligations tracked yet</p>
          <p className="text-xs text-stone-400 mb-4">Use Extract Obligations to automatically identify key terms, or add manually.</p>
          {isAdmin && (
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={openExtract}><Sparkles size={12} /> Extract Obligations</Button>
              <Button variant="secondary" size="sm" onClick={openAdd}><Plus size={12} /> Add Manually</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Obligation</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Risk</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Owner</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Amount</th>
                {isAdmin && <th className="px-4 py-2.5 w-16" />}
              </tr>
            </thead>
            <tbody>
              {contractObligations.map((o) => {
                const isOverdue = o.status !== 'completed' && o.status !== 'waived' && o.status !== 'not_applicable' && o.dueDate && daysUntil(o.dueDate) < 0
                const effectiveStatus: ObligationStatus = isOverdue ? 'overdue' : o.status
                return (
                  <tr key={o.id} className={`border-b border-stone-100 hover:bg-stone-50/50 group ${isOverdue ? 'bg-red-50/20' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-800">{o.description}</p>
                      {o.notes && <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">{o.notes}</p>}
                      {o.source === 'ai_extracted' && o.confidence && (
                        <span className="text-[10px] text-purple-600 flex items-center gap-1 mt-0.5">
                          <Sparkles size={9} /> AI · {o.confidence} confidence
                        </span>
                      )}
                      {o.source === 'union_template' && (
                        <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <BookOpen size={9} /> From union template
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-600">{TYPE_LABELS[o.type] ?? o.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs border font-medium ${STATUS_COLORS[effectiveStatus]}`}>
                        {STATUS_LABELS[effectiveStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {o.dueDate ? (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {formatDate(o.dueDate)}
                          {isOverdue && <span className="block text-[10px]">{Math.abs(daysUntil(o.dueDate))}d ago</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs border font-medium capitalize ${RISK_COLORS[o.risk]}`}>
                        {o.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">{o.owner || '—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-700 font-medium">
                      {o.amount ? fmt(o.amount) : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button onClick={() => openEditObl(o)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>
                          <button onClick={() => deleteObligation(o.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Extract Obligations Modal */}
      <Modal
        open={extractModalOpen}
        onClose={() => { setExtractModalOpen(false); setExtractPhase('idle') }}
        title="Extract Obligations"
        className="max-w-2xl"
      >
        {extractPhase === 'analyzing' && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-900 flex items-center justify-center">
              <Sparkles size={20} className="text-white animate-pulse" />
            </div>
            <p className="text-sm font-medium text-stone-700 mb-1">Analyzing contract…</p>
            <p className="text-xs text-stone-400">Identifying obligations from contract type and key terms</p>
          </div>
        )}

        {extractPhase === 'review' && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Found <span className="font-semibold text-stone-800">{suggestions.length}</span> suggested obligations.
              Select which to add to this contract.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {suggestions.map((s, i) => (
                <label
                  key={i}
                  className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSuggestions.has(i)
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.has(i)}
                    onChange={(e) => {
                      const next = new Set(selectedSuggestions)
                      e.target.checked ? next.add(i) : next.delete(i)
                      setSelectedSuggestions(next)
                    }}
                    className="mt-0.5 accent-stone-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-stone-700">{TYPE_LABELS[s.type] ?? s.type}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${RISK_COLORS[s.risk]}`}>{s.risk}</span>
                      <span className="text-[10px] text-purple-600 flex items-center gap-0.5 ml-auto">
                        <Sparkles size={9} /> {s.confidence} confidence
                      </span>
                    </div>
                    <p className="text-sm text-stone-800">{s.description}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Calendar size={9} /> {s.dueDate ? formatDate(s.dueDate) : 'No date'}
                      </span>
                      {s.amount && (
                        <span className="text-xs text-stone-400 flex items-center gap-1">
                          <DollarSign size={9} /> {fmt(s.amount)}
                        </span>
                      )}
                      <span className="text-xs text-stone-400">Owner: {s.owner}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 italic">{s.reasoning}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                onClick={() => {
                  if (selectedSuggestions.size === suggestions.length) {
                    setSelectedSuggestions(new Set())
                  } else {
                    setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))
                  }
                }}
                className="text-xs text-stone-500 hover:text-stone-700 underline"
              >
                {selectedSuggestions.size === suggestions.length ? 'Deselect all' : 'Select all'}
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setExtractModalOpen(false); setExtractPhase('idle') }}>Cancel</Button>
                <Button onClick={confirmExtract} disabled={selectedSuggestions.size === 0}>
                  Add {selectedSuggestions.size} Obligation{selectedSuggestions.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Obligation Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editingObligation ? 'Edit Obligation' : 'Add Obligation'}
        className="max-w-xl"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Description</label>
            <input
              value={oblForm.description}
              onChange={(e) => setOblForm({ ...oblForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Type</label>
              <select
                value={oblForm.type}
                onChange={(e) => setOblForm({ ...oblForm, type: e.target.value as ObligationType })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              >
                {OBLIGATION_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select
                value={oblForm.status}
                onChange={(e) => setOblForm({ ...oblForm, status: e.target.value as ObligationStatus })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              >
                {OBLIGATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Due Date</label>
              <input
                type="date"
                value={oblForm.dueDate}
                onChange={(e) => setOblForm({ ...oblForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Risk</label>
              <select
                value={oblForm.risk}
                onChange={(e) => setOblForm({ ...oblForm, risk: e.target.value as ObligationRisk })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Amount</label>
              <input
                type="number"
                value={oblForm.amount ?? ''}
                onChange={(e) => setOblForm({ ...oblForm, amount: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Owner</label>
            <input
              value={oblForm.owner}
              onChange={(e) => setOblForm({ ...oblForm, owner: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input
              value={oblForm.notes}
              onChange={(e) => setOblForm({ ...oblForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={saveObligation}>{editingObligation ? 'Save Changes' : 'Add Obligation'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
