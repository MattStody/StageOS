'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { Upload, FileText, File, FileSpreadsheet, FolderOpen, Search } from 'lucide-react'

const CATEGORIES = [
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'budgets', label: 'Budgets', icon: FileSpreadsheet },
  { id: 'reports', label: 'Reports', icon: File },
  { id: 'marketing', label: 'Marketing Assets', icon: FolderOpen },
  { id: 'legal', label: 'Legal', icon: FileText },
  { id: 'insurance', label: 'Insurance', icon: File },
  { id: 'production', label: 'Production Documents', icon: FolderOpen },
]

const typeIcon: Record<string, string> = {
  pdf: '📄',
  xlsx: '📊',
  docx: '📝',
  jpg: '🖼',
  png: '🖼',
}

export default function DocumentsPage() {
  const { productions, documents } = useStore()
  const [selectedProd, setSelectedProd] = useState('all')
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = documents.filter((d) => {
    if (selectedProd !== 'all' && d.productionId !== selectedProd) return false
    if (selectedCat !== 'all' && d.category !== selectedCat) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categorized = CATEGORIES.map((cat) => ({
    ...cat,
    docs: filtered.filter((d) => d.category === cat.id),
  })).filter((c) => c.docs.length > 0 || selectedCat === c.id || selectedCat === 'all')

  return (
    <div>
      <PageHeader
        title="Document Vault"
        subtitle="Production files, contracts, and assets"
        actions={
          <Button size="sm" variant="secondary">
            <Upload size={13} /> Upload File
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setSelectedProd('all')} className={`px-3 py-1.5 rounded text-xs transition-colors ${selectedProd === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>All Productions</button>
        {productions.map((p) => (
          <button key={p.id} onClick={() => setSelectedProd(p.id)} className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Search + cat filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedCat('all')} className={`px-3 py-1.5 rounded text-xs transition-colors ${selectedCat === 'all' ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setSelectedCat(c.id)} className={`px-3 py-1.5 rounded text-xs transition-colors ${selectedCat === c.id ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* Document grid by category */}
      {CATEGORIES.map((cat) => {
        const catDocs = filtered.filter((d) => d.category === cat.id)
        if (catDocs.length === 0 && selectedCat !== cat.id) return null
        const Icon = cat.icon

        return (
          <div key={cat.id} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} className="text-stone-400" />
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{cat.label}</h3>
              <span className="text-xs text-stone-400">({catDocs.length})</span>
            </div>

            {catDocs.length === 0 ? (
              <div className="border-2 border-dashed border-stone-200 rounded-lg p-6 text-center">
                <p className="text-sm text-stone-400">No {cat.label.toLowerCase()} uploaded yet.</p>
                <button className="mt-2 text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 mx-auto">
                  <Upload size={11} /> Upload file
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {catDocs.map((doc) => {
                  const prod = productions.find((p) => p.id === doc.productionId)
                  return (
                    <a
                      key={doc.id}
                      href={doc.type === 'pdf' ? '/template-agreement.html' : '#'}
                      target={doc.type === 'pdf' ? '_blank' : undefined}
                      rel={doc.type === 'pdf' ? 'noopener noreferrer' : undefined}
                      onClick={doc.type !== 'pdf' ? (e) => e.preventDefault() : undefined}
                      className="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition-colors cursor-pointer group block no-underline"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-stone-100 flex items-center justify-center text-lg shrink-0">
                          {typeIcon[doc.type] || '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate group-hover:text-stone-900">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {selectedProd === 'all' && (
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prod?.color }} />
                                <span className="text-xs text-stone-400 truncate">{prod?.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-stone-400">{doc.size}</span>
                            <span className="text-stone-300">·</span>
                            <span className="text-xs text-stone-400">{formatDate(doc.uploadedAt)}</span>
                          </div>
                          {doc.type === 'pdf' && (
                            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1 group-hover:text-stone-600 transition-colors">
                              <span>↗</span> Open
                            </p>
                          )}
                        </div>
                      </div>
                    </a>
                  )
                })}

                {/* Upload placeholder */}
                <div className="border-2 border-dashed border-stone-200 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:border-stone-300 transition-colors">
                  <div className="text-center">
                    <Upload size={16} className="text-stone-300 mx-auto mb-1" />
                    <p className="text-xs text-stone-400">Upload file</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
