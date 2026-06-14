'use client'
import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { fmt, formatDate, daysUntil, statusLabel } from '@/lib/utils'
import {
  Plus, Trash2, Pencil, FileText, AlertTriangle, File, Shield,
  BookOpen, FileCheck2, Check, Upload, Sparkles, CheckSquare, Square, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useAccess } from '@/lib/useAccess'
import type { Contract, ContractType, ContractStatus, ContractObligation, ObligationType, ObligationRisk, Person, PersonRoleType, UnionAffiliation } from '@/lib/types'
import { UNION_AGREEMENT_TEMPLATES, getTemplatesForType, resolveObligationDate } from '@/lib/unionTemplates'
import { generateOnboardingChecklist } from '@/lib/onboarding'

// Map a contract type to a roster role + default union affiliation
const CONTRACT_ROLE_MAP: Record<ContractType, { roleType: PersonRoleType; union: UnionAffiliation }> = {
  cast: { roleType: 'Principal', union: 'CAEA' },
  creative: { roleType: 'Creative', union: 'CAEA' },
  employment: { roleType: 'Production Staff', union: 'Non-union' },
  vendor: { roleType: 'Vendor', union: 'Non-union' },
  venue: { roleType: 'Vendor', union: 'Non-union' },
  rights: { roleType: 'Vendor', union: 'Non-union' },
  investor: { roleType: 'Vendor', union: 'Non-union' },
}

const CONTRACT_TYPES: ContractType[] = ['cast', 'creative', 'vendor', 'venue', 'rights', 'investor', 'employment']
const CONTRACT_STATUSES: ContractStatus[] = ['draft', 'sent', 'signed', 'expired', 'needs_review']

const blank = (productionId: string): Omit<Contract, 'id'> => ({
  productionId,
  partyName: '',
  contractType: 'cast',
  status: 'draft',
  dueDate: '',
  fee: 0,
  keyObligations: '',
  notes: '',
  hasFile: false,
})

const typeLabel: Record<ContractType, string> = {
  cast: 'Cast', creative: 'Creative', vendor: 'Vendor', venue: 'Venue',
  rights: 'Rights/Licensing', investor: 'Investor/Co-Producer', employment: 'Employment',
}

const RISK_STYLES: Record<string, string> = {
  critical: 'text-red-700 bg-red-50 border-red-200',
  high:     'text-amber-700 bg-amber-50 border-amber-200',
  medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
  low:      'text-stone-500 bg-stone-50 border-stone-200',
}

const RISK_COLORS: Record<ObligationRisk, string> = {
  low: 'text-green-700 bg-green-50 border border-green-200',
  medium: 'text-amber-700 bg-amber-50 border border-amber-200',
  high: 'text-orange-700 bg-orange-50 border border-orange-200',
  critical: 'text-red-700 bg-red-50 border border-red-200',
}

const TYPE_LABELS: Partial<Record<ObligationType, string>> = {
  signature_required: 'Signature',
  payment_due: 'Payment',
  royalty_payment: 'Royalty',
  royalty_statement: 'Statement',
  report_due: 'Report',
  insurance_required: 'Insurance',
  approval_required: 'Approval',
  deliverable_due: 'Deliverable',
  renewal_deadline: 'Renewal',
  option_deadline: 'Option',
  expiry_date: 'Expiry',
  termination_notice: 'Termination',
  reimbursement_due: 'Reimbursement',
  tax_form_required: 'Tax Form',
  rights_restriction: 'Rights',
  publicity_credit: 'Credit',
  confidentiality: 'Confidentiality',
  compliance: 'Compliance',
  other: 'Other',
}

function offsetLabel(anchor: string, days: number): string {
  if (days === 0) {
    const name = anchor === 'contract_start' ? 'work start' : anchor === 'opening_date' ? 'opening' : 'closing'
    return `On ${name}`
  }
  const abs = Math.abs(days)
  const dir = days < 0 ? 'before' : 'after'
  const name = anchor === 'contract_start' ? 'work start' : anchor === 'opening_date' ? 'opening' : 'closing'
  return `${abs}d ${dir} ${name}`
}

interface ExtractedObligation {
  title: string
  description: string
  type: ObligationType
  dueDate: string | null
  amount: number | null
  risk: ObligationRisk
  owner: string
  notes: string
  selected: boolean
}

type ExtractionStep = 'upload' | 'extracting' | 'review'

export default function ContractsPage() {
  const { productions, contracts, obligations, addContract, updateContract, deleteContract, addObligation,
    people, addPerson, updatePerson, onboardingChecklists, addOnboardingChecklist,
    housingAssignments, addHousingAssignment, perDiemEntries, addPerDiemEntry } = useStore()
  const { canEdit } = useAccess()

  const [selectedProd, setSelectedProd] = useState('all')
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ContractType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [form, setForm] = useState<Omit<Contract, 'id'>>(blank(productions[0]?.id || ''))

  const [extractedIds, setExtractedIds] = useState<Set<string>>(new Set())

  // Union template state — only relevant for new contracts
  const [selectedUnionId, setSelectedUnionId] = useState<string | null>(null)
  const [enabledOblIds, setEnabledOblIds] = useState<Set<string>>(new Set())

  // AI PDF extraction state
  const [aiContract, setAiContract] = useState<Contract | null>(null)
  const [aiStep, setAiStep] = useState<ExtractionStep>('upload')
  const [aiItems, setAiItems] = useState<ExtractedObligation[]>([])
  const [aiError, setAiError] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedUnionId) { setEnabledOblIds(new Set()); return }
    const t = UNION_AGREEMENT_TEMPLATES.find(t => t.id === selectedUnionId)
    if (t) setEnabledOblIds(new Set(t.obligations.filter(o => o.enabledByDefault).map(o => o.id)))
  }, [selectedUnionId])

  const filtered = contracts.filter((c) => {
    if (selectedProd !== 'all' && c.productionId !== selectedProd) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterType !== 'all' && c.contractType !== filterType) return false
    return true
  })

  function openAdd() {
    setEditing(null)
    setForm(blank(selectedProd !== 'all' ? selectedProd : productions[0]?.id || ''))
    setSelectedUnionId(null)
    setModalOpen(true)
  }

  function openEdit(c: Contract) {
    setEditing(c)
    setForm({ ...c })
    setSelectedUnionId(null)
    setModalOpen(true)
  }

  // ── Company integration ──────────────────────────────────────────────────
  // When a contract is signed, sync the person into the Roster, generate their
  // onboarding checklist (Canadian tax/payroll forms included), and draft
  // housing / per diem entries if the contract references them.
  function syncSignedContract(contract: Contract) {
    if (contract.status !== 'signed') return
    const production = productions.find((p) => p.id === contract.productionId)
    const map = CONTRACT_ROLE_MAP[contract.contractType]
    const credit = {
      productionId: contract.productionId,
      productionName: production?.name ?? '',
      role: typeLabel[contract.contractType],
      contractId: contract.id,
      startDate: contract.startDate || production?.openingDate || '',
      endDate: production?.closingDate,
      fee: contract.fee,
    }

    // 1. Upsert person by name
    const existing = people.find((p) => p.name.trim().toLowerCase() === contract.partyName.trim().toLowerCase())
    let person: Person
    const ts = new Date().toISOString()
    if (existing) {
      person = existing
      if (!existing.productionHistory.some((c) => c.contractId === contract.id)) {
        person = { ...existing, productionHistory: [...existing.productionHistory, credit], updatedAt: ts }
        updatePerson(person)
      }
    } else {
      person = {
        id: `person-${Date.now()}`,
        name: contract.partyName,
        roleType: map.roleType,
        email: '',
        unionAffiliation: map.union,
        measurements: { lastUpdated: ts.slice(0, 10) },
        productionHistory: [credit],
        documents: [],
        createdAt: ts,
        updatedAt: ts,
      }
      addPerson(person)
    }

    // 2. Onboarding checklist (once per contract)
    if (!onboardingChecklists.some((c) => c.contractId === contract.id)) {
      addOnboardingChecklist(generateOnboardingChecklist(person, contract.productionId, contract.id, ts))
    }

    // 3. Housing / per diem drafts when the contract references them
    const text = `${contract.keyObligations} ${contract.notes}`.toLowerCase()
    const hasHousing = /housing|accommodation|lodging/.test(text)
    const hasPerDiem = /per ?diem/.test(text)
    if (hasHousing && !housingAssignments.some((h) => h.personId === person.id && h.productionId === contract.productionId)) {
      addHousingAssignment({
        id: `house-${Date.now()}`,
        personId: person.id,
        productionId: contract.productionId,
        status: 'Searching',
        leaseStart: contract.startDate || production?.openingDate,
        leaseEnd: production?.closingDate,
        notes: 'Draft created from signed contract — confirm details',
      })
    }
    if (hasPerDiem && !perDiemEntries.some((e) => e.personId === person.id && e.productionId === contract.productionId)) {
      addPerDiemEntry({
        id: `perdiem-${Date.now()}`,
        personId: person.id,
        productionId: contract.productionId,
        dailyRate: 0,
        periodStart: contract.startDate || production?.openingDate || '',
        periodEnd: production?.closingDate || '',
        totalOwed: 0,
        totalPaid: 0,
        payments: [],
      })
    }
  }

  function handleSave() {
    const contractId = editing ? editing.id : `c-${Date.now()}`
    const saved: Contract = { ...form, id: contractId }
    if (editing) {
      updateContract(saved)
      syncSignedContract(saved)
    } else {
      addContract({ ...form, id: contractId })
      syncSignedContract(saved)
      if (selectedUnionId && form.startDate) {
        const template = UNION_AGREEMENT_TEMPLATES.find(t => t.id === selectedUnionId)
        const production = productions.find(p => p.id === form.productionId)
        if (template && production) {
          for (const obl of template.obligations) {
            if (!enabledOblIds.has(obl.id)) continue
            const dueDate = resolveObligationDate(
              obl.anchor, obl.offsetDays,
              form.startDate!, production.openingDate, production.closingDate,
            )
            addObligation({
              id: `obl-${contractId}-${obl.id}`,
              productionId: form.productionId,
              contractId,
              partyName: form.partyName,
              type: obl.type,
              description: obl.description,
              dueDate,
              status: 'not_started',
              owner: obl.defaultOwner,
              risk: obl.risk,
              source: 'union_template',
              notes: obl.clauseRef,
              syncedToCalendar: false,
              syncedToCashFlow: false,
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
    }
    setModalOpen(false)
  }

  function extractObligations(c: Contract) {
    const existingIds = new Set(obligations.filter((o) => o.contractId === c.id).map((o) => o.id))
    const prod = productions.find((p) => p.id === c.productionId)
    const toCreate: ContractObligation[] = []
    const now = new Date().toISOString()

    if (['draft', 'sent', 'needs_review'].includes(c.status) && c.dueDate) {
      const id = `obl-cs-${c.id}`
      if (!existingIds.has(id)) toCreate.push({
        id, productionId: c.productionId, contractId: c.id,
        partyName: c.partyName, type: 'signature_required',
        description: `Signature required — ${c.partyName}`,
        dueDate: c.dueDate, status: 'not_started',
        owner: 'GM', risk: 'high', source: 'manual', notes: '',
        syncedToCalendar: false, syncedToCashFlow: false, createdAt: now,
      })
    }

    if (c.contractType === 'rights' && c.status === 'signed' && prod?.closingDate) {
      const d = new Date(prod.closingDate + 'T12:00:00')
      d.setDate(d.getDate() + 30)
      const id = `obl-cr-${c.id}`
      if (!existingIds.has(id)) toCreate.push({
        id, productionId: c.productionId, contractId: c.id,
        partyName: c.partyName, type: 'royalty_statement',
        description: `Royalty statement — ${c.partyName}`,
        dueDate: d.toISOString().slice(0, 10), status: 'not_started',
        owner: 'GM', risk: 'high', source: 'manual', notes: '',
        syncedToCalendar: false, syncedToCashFlow: false, createdAt: now,
      })
    }

    if (c.contractType === 'venue' && c.status === 'signed' && prod?.closingDate) {
      const d = new Date(prod.closingDate + 'T12:00:00')
      d.setDate(d.getDate() + 14)
      const id = `obl-cve-${c.id}`
      if (!existingIds.has(id)) toCreate.push({
        id, productionId: c.productionId, contractId: c.id,
        partyName: c.partyName, type: 'payment_due',
        description: `Venue settlement — ${c.partyName}`,
        dueDate: d.toISOString().slice(0, 10), status: 'not_started',
        owner: 'Finance', risk: 'high', source: 'manual', notes: '',
        syncedToCalendar: false, syncedToCashFlow: false, createdAt: now,
      })
    }

    if (c.contractType === 'investor' && c.status === 'signed' && prod?.closingDate) {
      const d = new Date(prod.closingDate + 'T12:00:00')
      d.setDate(d.getDate() + 60)
      const id = `obl-ci-${c.id}`
      if (!existingIds.has(id)) toCreate.push({
        id, productionId: c.productionId, contractId: c.id,
        partyName: c.partyName, type: 'report_due',
        description: `Investor closing report — ${c.partyName}`,
        dueDate: d.toISOString().slice(0, 10), status: 'not_started',
        owner: 'GM', risk: 'medium', source: 'manual', notes: '',
        syncedToCalendar: false, syncedToCashFlow: false, createdAt: now,
      })
    }

    if (['cast', 'creative', 'employment'].includes(c.contractType) && c.status === 'signed' && prod?.closingDate) {
      const d = new Date(prod.closingDate + 'T12:00:00')
      d.setDate(d.getDate() + 7)
      const id = `obl-cp-${c.id}`
      if (!existingIds.has(id)) toCreate.push({
        id, productionId: c.productionId, contractId: c.id,
        partyName: c.partyName, type: 'payment_due',
        description: `Final payment / closeout — ${c.partyName}`,
        dueDate: d.toISOString().slice(0, 10), status: 'not_started',
        owner: 'Finance', risk: 'medium', source: 'manual', notes: '',
        syncedToCalendar: false, syncedToCashFlow: false, createdAt: now,
      })
    }

    toCreate.forEach((o) => addObligation(o))
    if (toCreate.length > 0 || existingIds.size > 0) {
      setExtractedIds((prev) => new Set([...prev, c.id]))
      setTimeout(() => setExtractedIds((prev) => { const n = new Set(prev); n.delete(c.id); return n }), 2500)
    }
  }

  // AI PDF extraction
  function openAiExtract(c: Contract) {
    setAiContract(c)
    setAiStep('upload')
    setAiItems([])
    setAiError('')
    setIsDemo(false)
  }

  function closeAiExtract() {
    setAiContract(null)
    setAiStep('upload')
    setAiItems([])
    setAiError('')
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !aiContract) return
    setAiStep('extracting')
    setAiError('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunk = 8192
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      const base64 = btoa(binary)
      const prod = productions.find((p) => p.id === aiContract.productionId)

      const res = await fetch('/api/extract-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mediaType: file.type || 'application/pdf',
          contractInfo: {
            partyName: aiContract.partyName,
            contractType: aiContract.contractType,
            productionName: prod?.name ?? '',
            fee: aiContract.fee,
          },
        }),
      })

      if (!res.ok) throw new Error('Extraction request failed')
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setAiItems((data.obligations as Omit<ExtractedObligation, 'selected'>[]).map((o) => ({ ...o, selected: true })))
      setIsDemo(!!data.demo)
      setAiStep('review')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error')
      setAiStep('upload')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function toggleAiItem(i: number) {
    setAiItems((prev) => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item))
  }

  function handleCreateAiObligations() {
    if (!aiContract) return
    aiItems.filter((i) => i.selected).forEach((item) => {
      addObligation({
        id: `obl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productionId: aiContract.productionId,
        contractId: aiContract.id,
        partyName: aiContract.partyName,
        type: item.type,
        description: item.description,
        dueDate: item.dueDate ?? '',
        amount: item.amount ?? undefined,
        status: 'not_started',
        owner: item.owner,
        risk: item.risk,
        source: 'ai_extracted',
        notes: item.notes,
        syncedToCalendar: false,
        syncedToCashFlow: false,
        confidence: 'high',
        createdAt: new Date().toISOString(),
      })
    })
    closeAiExtract()
  }

  const statusCounts = CONTRACT_STATUSES.map((s) => ({
    status: s,
    count: contracts.filter((c) => c.status === s && (selectedProd === 'all' || c.productionId === selectedProd)).length,
  }))

  return (
    <div>
      <PageHeader
        title="Contract Tracker"
        subtitle="Manage all production agreements"
        actions={canEdit ? <Button onClick={openAdd} size="sm"><Plus size={13} /> Add Contract</Button> : undefined}
      />

      {/* Status summary */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {statusCounts.map(({ status, count }) => (
          count > 0 && (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-colors ${filterStatus === status ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
            >
              {statusLabel(status)} <span className="font-semibold">{count}</span>
            </button>
          )
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setSelectedProd('all')}
          className={`px-3 py-1.5 rounded text-xs transition-colors ${selectedProd === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
        >
          All Productions
        </button>
        {productions.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProd(p.id)}
            className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* Contract cards grouped by type */}
      {CONTRACT_TYPES.map((type) => {
        const typeContracts = filtered.filter((c) => c.contractType === type)
        if (typeContracts.length === 0) return null
        return (
          <div key={type} className="mb-6">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">{typeLabel[type]}</h3>
            <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Party</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Due Date</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Fee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Key Obligations</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-2.5 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {typeContracts.map((c) => {
                    const prod = productions.find((p) => p.id === c.productionId)
                    const overdue = c.status !== 'signed' && c.status !== 'expired' && daysUntil(c.dueDate) < 0
                    return (
                      <tr key={c.id} className={`border-b border-stone-100 hover:bg-stone-50/50 group ${overdue ? 'bg-red-50/20' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {c.hasFile
                              ? <File size={12} className="text-stone-400 shrink-0" />
                              : <FileText size={12} className="text-stone-300 shrink-0" />
                            }
                            <div>
                              <Link href={`/contracts/${c.id}`} className="text-stone-800 font-medium hover:text-stone-600 hover:underline">
                                {c.partyName}
                              </Link>
                              {selectedProd === 'all' && <p className="text-xs text-stone-400">{prod?.name}</p>}
                              {(() => {
                                const oblCount = obligations.filter((o) => o.contractId === c.id).length
                                const critCount = obligations.filter((o) => o.contractId === c.id && (o.risk === 'critical' || o.risk === 'high')).length
                                if (oblCount === 0) return null
                                return (
                                  <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                                    <Shield size={8} />
                                    {oblCount} obligation{oblCount !== 1 ? 's' : ''}
                                    {critCount > 0 && <span className="text-orange-600">· {critCount} high risk</span>}
                                  </p>
                                )
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {overdue && <AlertTriangle size={11} className="text-red-500" />}
                            <Badge variant={c.status}>{statusLabel(c.status)}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-600 text-xs">{c.dueDate ? formatDate(c.dueDate) : '—'}</td>
                        <td className="text-right px-4 py-3 text-stone-700 font-medium">{c.fee > 0 ? fmt(c.fee) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-stone-500 max-w-xs truncate">{c.keyObligations}</td>
                        <td className="px-4 py-3 text-xs text-stone-400 max-w-xs truncate">{c.notes}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end items-center">
                            {canEdit && (
                              <button
                                onClick={() => openAiExtract(c)}
                                title="Upload PDF & extract obligations with AI"
                                className="p-1 text-stone-400 hover:text-indigo-600 cursor-pointer"
                              >
                                <Sparkles size={12} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); extractObligations(c) }}
                                className="p-1 text-stone-400 hover:text-emerald-600 cursor-pointer"
                                title="Quick-extract obligations (rule-based)"
                              >
                                {extractedIds.has(c.id) ? <Check size={12} className="text-emerald-600" /> : <FileCheck2 size={12} />}
                              </button>
                            )}
                            {canEdit && <button onClick={() => openEdit(c)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                            {canEdit && <button onClick={() => deleteContract(c.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Add/Edit Contract Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Contract' : 'Add Contract'} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Production</label>
              <select
                value={form.productionId}
                onChange={(e) => setForm({ ...form, productionId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              >
                {productions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Contract Type</label>
              <select
                value={form.contractType}
                onChange={(e) => {
                  setForm({ ...form, contractType: e.target.value as ContractType })
                  setSelectedUnionId(null)
                }}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              >
                {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Party Name</label>
            <input value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>

          {/* Union agreement — new contracts only */}
          {!editing && (() => {
            const unionOptions = getTemplatesForType(form.contractType)
            if (unionOptions.length === 0) return null
            return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
                    Union Agreement <span className="normal-case text-stone-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={selectedUnionId ?? ''}
                    onChange={(e) => setSelectedUnionId(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  >
                    <option value="">— Non-union / skip —</option>
                    {unionOptions.map(t => <option key={t.id} value={t.id}>{t.shortName} — {t.union}</option>)}
                  </select>
                </div>
                {selectedUnionId && (
                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">
                      Work Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.startDate ?? ''}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">First rehearsal or engagement day</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Obligation preview */}
          {!editing && selectedUnionId && form.startDate && (() => {
            const template = UNION_AGREEMENT_TEMPLATES.find(t => t.id === selectedUnionId)
            const production = productions.find(p => p.id === form.productionId)
            if (!template || !production) return null
            const selectedCount = template.obligations.filter(o => enabledOblIds.has(o.id)).length
            return (
              <div className="rounded-lg border border-stone-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-stone-400" />
                    <span className="text-xs font-semibold text-stone-700">{template.shortName} obligations</span>
                  </div>
                  <span className="text-xs text-stone-500">{selectedCount} of {template.obligations.length} selected</span>
                </div>
                <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto">
                  {template.obligations.map((obl) => {
                    const enabled = enabledOblIds.has(obl.id)
                    const resolved = resolveObligationDate(
                      obl.anchor, obl.offsetDays,
                      form.startDate!, production.openingDate, production.closingDate,
                    )
                    return (
                      <label key={obl.id} className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors ${!enabled ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => {
                            setEnabledOblIds(prev => {
                              const next = new Set(prev)
                              e.target.checked ? next.add(obl.id) : next.delete(obl.id)
                              return next
                            })
                          }}
                          className="mt-0.5 shrink-0 accent-stone-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-stone-800 leading-snug">{obl.description}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5 font-mono">{obl.clauseRef}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${RISK_STYLES[obl.risk]}`}>
                            {obl.risk}
                          </span>
                          <span className="text-[10px] text-stone-500 whitespace-nowrap">{formatDate(resolved)}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div className="px-4 py-2 bg-stone-50 border-t border-stone-100">
                  <p className="text-[10px] text-stone-400">Obligations are created immediately on save. Edit from the contract detail page.</p>
                </div>
              </div>
            )
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContractStatus })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Signature Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Fee / Amount</label>
              <input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Key Obligations</label>
            <input value={form.keyObligations} onChange={(e) => setForm({ ...form, keyObligations: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Contract'}</Button>
          </div>
        </div>
      </Modal>

      {/* AI PDF Extraction Modal */}
      <Modal
        open={!!aiContract}
        onClose={closeAiExtract}
        title={
          aiStep === 'upload' ? 'Extract Obligations from PDF'
          : aiStep === 'extracting' ? 'Analyzing Contract…'
          : 'Review Extracted Obligations'
        }
        className="max-w-2xl"
      >
        {aiStep === 'upload' && (
          <div className="space-y-5">
            <p className="text-sm text-stone-600">
              Upload the signed PDF for <span className="font-semibold text-stone-800">{aiContract?.partyName}</span>. Claude AI will read it and identify all obligations, deadlines, and payment requirements.
            </p>
            {aiError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertTriangle size={14} className="shrink-0" />
                {aiError}
              </div>
            )}
            <div
              className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={28} className="mx-auto mb-3 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">Click to upload PDF</p>
              <p className="text-xs text-stone-400 mt-1">PDF, JPG, or PNG — max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={closeAiExtract}>Cancel</Button>
            </div>
          </div>
        )}

        {aiStep === 'extracting' && (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-stone-700">Claude is reading your contract…</p>
            <p className="text-xs text-stone-400">Identifying obligations, deadlines, and payment terms</p>
          </div>
        )}

        {aiStep === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-600">
                Found <span className="font-semibold text-stone-800">{aiItems.length}</span> obligation{aiItems.length !== 1 ? 's' : ''}.
                {isDemo && <span className="ml-2 text-xs text-amber-600">(Demo — AI key not configured)</span>}
              </p>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setAiItems((p) => p.map((i) => ({ ...i, selected: true })))} className="text-indigo-600 hover:underline">Select all</button>
                <span className="text-stone-300">·</span>
                <button onClick={() => setAiItems((p) => p.map((i) => ({ ...i, selected: false })))} className="text-stone-500 hover:underline">Deselect all</button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {aiItems.map((item, i) => (
                <div
                  key={i}
                  onClick={() => toggleAiItem(i)}
                  className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${item.selected ? 'bg-indigo-50 border-indigo-200' : 'bg-stone-50 border-stone-200 opacity-60'}`}
                >
                  <div className="mt-0.5 shrink-0 text-indigo-500">
                    {item.selected ? <CheckSquare size={15} /> : <Square size={15} className="text-stone-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800 leading-snug">{item.title}</p>
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${RISK_COLORS[item.risk]}`}>
                        {item.risk}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-400">
                      <span className="bg-stone-100 px-1.5 py-0.5 rounded">{TYPE_LABELS[item.type] ?? item.type}</span>
                      {item.dueDate && <span>Due {formatDate(item.dueDate)}</span>}
                      {item.amount != null && <span>{fmt(item.amount)}</span>}
                      <span>→ {item.owner}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-100">
              <p className="text-xs text-stone-400">
                {aiItems.filter((i) => i.selected).length} of {aiItems.length} selected
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={closeAiExtract}>Cancel</Button>
                <Button
                  onClick={handleCreateAiObligations}
                  disabled={aiItems.filter((i) => i.selected).length === 0}
                >
                  <Sparkles size={13} />
                  Create {aiItems.filter((i) => i.selected).length} Obligation{aiItems.filter((i) => i.selected).length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
