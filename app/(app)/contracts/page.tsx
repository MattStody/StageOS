'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { RiskAlert } from '@/components/ui/RiskAlert'
import { fmt, formatDate, daysUntil, statusLabel } from '@/lib/utils'
import { Plus, Trash2, Pencil, FileText, AlertTriangle, File } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Contract, ContractType, ContractStatus } from '@/lib/types'

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

export default function ContractsPage() {
  const { productions, contracts, addContract, updateContract, deleteContract } = useStore()
  const { isAdmin } = useAuth()

  const [selectedProd, setSelectedProd] = useState('all')
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ContractType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [form, setForm] = useState<Omit<Contract, 'id'>>(blank(productions[0]?.id || ''))

  const filtered = contracts.filter((c) => {
    if (selectedProd !== 'all' && c.productionId !== selectedProd) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterType !== 'all' && c.contractType !== filterType) return false
    return true
  })

  const risks = filtered.filter(
    (c) => c.status !== 'signed' && c.status !== 'expired' && daysUntil(c.dueDate) < 0
  )

  function openAdd() {
    setEditing(null)
    setForm(blank(selectedProd !== 'all' ? selectedProd : productions[0]?.id || ''))
    setModalOpen(true)
  }

  function openEdit(c: Contract) {
    setEditing(c)
    setForm({ ...c })
    setModalOpen(true)
  }

  function handleSave() {
    if (editing) {
      updateContract({ ...form, id: editing.id })
    } else {
      addContract({ ...form, id: `c-${Date.now()}` })
    }
    setModalOpen(false)
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
        actions={isAdmin ? <Button onClick={openAdd} size="sm"><Plus size={13} /> Add Contract</Button> : undefined}
      />

      {/* Risk alerts */}
      {risks.length > 0 && (
        <div className="mb-5 space-y-2">
          {risks.map((c) => (
            <RiskAlert key={c.id} message={`${c.partyName} — ${statusLabel(c.status)} contract past due date (${formatDate(c.dueDate)})`} />
          ))}
        </div>
      )}

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
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
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
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Party</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Due Date</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Fee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Key Obligations</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-2.5 w-20" />
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
                              <p className="text-stone-800 font-medium">{c.partyName}</p>
                              {selectedProd === 'all' && <p className="text-xs text-stone-400">{prod?.name}</p>}
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
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            {isAdmin && <button onClick={() => openEdit(c)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                            {isAdmin && <button onClick={() => deleteContract(c.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
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

      {/* Modal */}
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
                onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })}
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContractStatus })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Due Date</label>
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
    </div>
  )
}
