'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { UNION_AGREEMENT_TEMPLATES } from '@/lib/unionTemplates'
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import type { ObligationRisk, ContractType } from '@/lib/types'

const RISK_STYLES: Record<ObligationRisk, string> = {
  critical: 'text-red-700 bg-red-50 border-red-200',
  high:     'text-amber-700 bg-amber-50 border-amber-200',
  medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
  low:      'text-stone-500 bg-stone-50 border-stone-200',
}

const TYPE_LABELS: Record<ContractType, string> = {
  cast: 'Cast', creative: 'Creative', vendor: 'Vendor', venue: 'Venue',
  rights: 'Rights', investor: 'Investor', employment: 'Employment',
}

const ANCHOR_LABELS = {
  contract_start: 'from work start',
  opening_date:   'from opening',
  closing_date:   'from closing',
}

function offsetLabel(anchor: string, days: number): string {
  if (days === 0) return `On ${anchor === 'contract_start' ? 'work start' : anchor === 'opening_date' ? 'opening' : 'closing'}`
  const abs = Math.abs(days)
  const direction = days < 0 ? 'before' : 'after'
  const anchorName = anchor === 'contract_start' ? 'work start' : anchor === 'opening_date' ? 'opening' : 'closing'
  return `${abs}d ${direction} ${anchorName}`
}

export default function UnionAgreementsPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="Union Agreements"
        subtitle="Pre-built obligation templates from Canadian theatre collective agreements"
      />

      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 max-w-3xl">
        <BookOpen size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">Reference library</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            These templates reflect minimum standards from published collective agreements and are intended as a starting point.
            Always verify dates, rates, and clause references against your fully executed agreement.
            Templates are applied when adding a new contract — you choose which obligations to include.
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
        {UNION_AGREEMENT_TEMPLATES.map((t) => {
          const open = expanded.has(t.id)
          return (
            <Card key={t.id} className="overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-stone-50 transition-colors"
                onClick={() => toggle(t.id)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-stone-900">{t.name}</span>
                    {t.region && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                        {t.region}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mb-2">{t.union}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-1 flex-wrap">
                      {t.applicableTypes.map(type => (
                        <span key={type} className="text-[10px] font-medium px-1.5 py-0.5 bg-stone-900 text-white rounded">
                          {TYPE_LABELS[type]}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-stone-400">
                      {t.obligations.length} obligation template{t.obligations.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-stone-400">
                      Effective {t.effectiveDate}{t.expiryDate ? ` – ${t.expiryDate}` : ''}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-stone-400 mt-0.5">
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>

              {open && (
                <div className="border-t border-stone-100">
                  {/* Description */}
                  <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
                    <p className="text-xs text-stone-600 leading-relaxed">{t.description}</p>
                  </div>

                  {/* Obligations list */}
                  <div className="divide-y divide-stone-50">
                    {t.obligations.map((obl) => (
                      <div key={obl.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <p className="text-sm font-medium text-stone-800">{obl.description}</p>
                            {!obl.enabledByDefault && (
                              <span className="text-[10px] text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded">
                                Off by default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${RISK_STYLES[obl.risk]}`}>
                              {obl.risk}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap">
                              {offsetLabel(obl.anchor, obl.offsetDays)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed mb-1.5">{obl.plainEnglish}</p>
                        <p className="text-[10px] text-stone-400 font-mono">{obl.clauseRef}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
