'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, formatDate, statusLabel, budgetUsedPct } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Plus, Theater, LayoutGrid, List } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Production, ProductionStatus } from '@/lib/types'

const PROD_COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea', '#0f172a', '#be185d']

const STATUS_OPTIONS: ProductionStatus[] = ['pre_production', 'in_rehearsal', 'in_performance', 'closing', 'closed']

const STATUS_LABELS: Record<ProductionStatus, string> = {
  pre_production: 'Pre-Production',
  in_rehearsal: 'In Rehearsal',
  in_performance: 'In Performance',
  closing: 'Closing',
  closed: 'Closed',
}

function blankProduction(): Omit<Production, 'id'> {
  return {
    name: '',
    subtitle: '',
    status: 'pre_production',
    venue: '',
    openingDate: '',
    closingDate: '',
    totalBudget: 0,
    totalActual: 0,
    cashOnHand: 0,
    projectedGross: 0,
    currentGross: 0,
    color: PROD_COLORS[0],
    imageUrl: undefined,
  }
}

// ── Portrait poster with blurred backdrop ─────────────────────────────────────

function ProductionPoster({
  imageUrl,
  color,
  name,
}: {
  imageUrl?: string
  color: string
  name: string
}) {
  return (
    <div className="relative overflow-hidden bg-stone-900 rounded-t-lg" style={{ aspectRatio: '5/4' }}>
      {imageUrl ? (
        <>
          {/* Blurred background fill */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(28px)',
              transform: 'scale(1.2)',
              opacity: 0.65,
            }}
          />
          {/* Actual image on top */}
          <img
            src={imageUrl}
            alt={name}
            className="relative z-10 w-full h-full object-contain"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              const parent = el.parentElement
              if (parent) {
                const prev = parent.previousElementSibling as HTMLElement | null
                if (prev) prev.style.opacity = '1'
              }
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 flex items-end p-4"
          style={{ background: `linear-gradient(160deg, ${color}22 0%, ${color}66 100%)` }}
        >
          <Theater size={28} className="opacity-20" style={{ color }} />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductionsPage() {
  const { productions, contracts, deadlines, revenueWeeks, addProduction } = useStore()
  const { isAdmin } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Omit<Production, 'id'>>(blankProduction())
  const [imagePreview, setImagePreview] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  function openCreate() {
    setForm(blankProduction())
    setImagePreview('')
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    addProduction({
      ...form,
      id: `prod-${Date.now()}`,
      imageUrl: imagePreview.trim() || undefined,
    })
    setModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Productions"
        subtitle={`${productions.filter((p) => p.status !== 'closed').length} active · ${productions.length} total`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-stone-200 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'}`}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'}`}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>
            {isAdmin && (
              <Button onClick={openCreate} size="sm">
                <Plus size={13} /> New Production
              </Button>
            )}
          </div>
        }
      />

      {/* Production grid / list */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productions.map((p) => {
            const weeks = revenueWeeks.filter((w) => w.productionId === p.id)
            const cumGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
            const prodContracts = contracts.filter((c) => c.productionId === p.id)
            const signedCount = prodContracts.filter((c) => c.status === 'signed').length
            const overdueItems = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length
            const grossActual = cumGross || p.currentGross
            const weeksRemaining = p.closingDate
              ? Math.max(0, Math.ceil((new Date(p.closingDate + 'T12:00:00').getTime() - Date.now()) / (7 * 86_400_000)))
              : 0
            const avgATP = weeks.length > 0 ? weeks.reduce((s, w) => s + w.avgTicketPrice, 0) / weeks.length : 0
            const avgPerfsPerWk = weeks.length > 0 ? weeks.reduce((s, w) => s + w.performances, 0) / weeks.length : 0
            const seatsHouse = weeks.length > 0 ? Math.max(...weeks.map((w) => w.totalSeats)) : 0
            const grossNeeded = Math.max(0, p.totalBudget - grossActual)
            const isProfitable = p.totalBudget > 0 && grossActual >= p.totalBudget
            const profitPct = isProfitable && p.totalBudget > 0 ? Math.round(((grossActual - p.totalBudget) / p.totalBudget) * 100) : 0
            const beCap = weeksRemaining > 0 && avgATP > 0 && seatsHouse > 0 && avgPerfsPerWk > 0
              ? (grossNeeded / (weeksRemaining * avgPerfsPerWk * seatsHouse * avgATP)) * 100
              : null
            const beLabel = isProfitable
              ? `+${profitPct}% above B/E`
              : beCap === null ? '—'
              : beCap > 110 ? 'SRO+ needed'
              : `${Math.ceil(beCap)}% avg cap`

            return (
              <Link key={p.id} href={`/productions/${p.id}`} className="group block">
                <div className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:border-stone-300 hover:shadow-md transition-all">
                  <ProductionPoster imageUrl={p.imageUrl} color={p.color} name={p.name} />
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                      {overdueItems > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">{overdueItems} overdue</span>
                      )}
                    </div>
                    <h2 className="text-sm font-semibold text-stone-900 leading-snug mb-0.5 truncate">{p.name}</h2>
                    <p className="text-[11px] text-stone-500 truncate mb-3">{p.venue}</p>
                    {p.totalBudget > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-stone-400">{isProfitable ? 'Profitability' : 'Break-even'}</span>
                          <span className={`font-medium ${isProfitable ? 'text-emerald-600' : beCap === null ? 'text-stone-400' : beCap > 90 ? 'text-red-600' : beCap > 65 ? 'text-amber-600' : 'text-stone-700'}`}>{beLabel}</span>
                        </div>
                        {isProfitable ? (
                          <div className="h-1 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(profitPct * (100 / 30), 100)}%` }} />
                          </div>
                        ) : beCap !== null && beCap > 0 && beCap <= 110 ? (
                          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(beCap, 100)}%`, backgroundColor: beCap > 90 ? '#ef4444' : beCap > 65 ? '#f59e0b' : '#10b981' }} />
                          </div>
                        ) : null}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] mb-2">
                      <div><span className="text-stone-400">Gross</span><p className="font-medium text-stone-800">{fmt(cumGross || p.currentGross)}</p></div>
                      <div><span className="text-stone-400">Cash</span><p className="font-medium text-stone-800">{fmt(p.cashOnHand)}</p></div>
                      <div className="col-span-2"><span className="text-stone-400">Contracts</span><span className="font-medium text-stone-800 ml-1">{signedCount}/{prodContracts.length} signed</span></div>
                    </div>
                    {p.openingDate && <p className="text-[10px] text-stone-400 truncate">{formatDate(p.openingDate)}{p.closingDate ? ` — ${formatDate(p.closingDate)}` : ''}</p>}
                    <div className="flex items-center justify-end mt-2">
                      <ArrowRight size={12} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {productions.map((p) => {
            const weeks = revenueWeeks.filter((w) => w.productionId === p.id)
            const cumGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
            const prodContracts = contracts.filter((c) => c.productionId === p.id)
            const signedCount = prodContracts.filter((c) => c.status === 'signed').length
            const budgetPct = budgetUsedPct(p.totalActual, p.totalBudget)
            const overdueItems = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length
            const lastWeek = weeks.sort((a, b) => b.weekEnding.localeCompare(a.weekEnding))[0]

            return (
              <Link key={p.id} href={`/productions/${p.id}`} className="group block">
                <div className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:border-stone-300 hover:shadow-sm transition-all flex">
                  {/* Thumbnail */}
                  <div className="w-28 shrink-0 relative overflow-hidden bg-stone-900" style={{ minHeight: '80px' }}>
                    {p.imageUrl ? (
                      <>
                        <div className="absolute inset-0" style={{ backgroundImage: `url(${p.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px)', transform: 'scale(1.2)', opacity: 0.6 }} />
                        <img src={p.imageUrl} alt={p.name} className="relative z-10 w-full h-full object-contain" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(160deg, ${p.color}22 0%, ${p.color}66 100%)` }}>
                        <Theater size={20} className="opacity-20" style={{ color: p.color }} />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <h2 className="text-sm font-semibold text-stone-900 truncate">{p.name}</h2>
                          <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                          {overdueItems > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">{overdueItems} overdue</span>}
                        </div>
                        <p className="text-xs text-stone-400 truncate">{p.venue}{p.openingDate ? ` · ${formatDate(p.openingDate)}${p.closingDate ? ` – ${formatDate(p.closingDate)}` : ''}` : ''}</p>
                      </div>
                      <ArrowRight size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors shrink-0 mt-0.5" />
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-5 mt-2.5 text-xs">
                      <div><span className="text-stone-400">Gross </span><span className="font-medium text-stone-700">{fmt(cumGross || p.currentGross)}</span></div>
                      <div><span className="text-stone-400">Cash </span><span className="font-medium text-stone-700">{fmt(p.cashOnHand)}</span></div>
                      {p.totalBudget > 0 && <div><span className="text-stone-400">Budget </span><span className={`font-medium ${budgetPct > 90 ? 'text-red-600' : budgetPct > 80 ? 'text-amber-600' : 'text-stone-700'}`}>{fmtPct(budgetPct)}</span></div>}
                      <div><span className="text-stone-400">Contracts </span><span className="font-medium text-stone-700">{signedCount}/{prodContracts.length}</span></div>
                      {lastWeek && <div><span className="text-stone-400">Last wk cap </span><span className={`font-medium ${lastWeek.capacityPct >= 85 ? 'text-emerald-600' : lastWeek.capacityPct >= 65 ? 'text-amber-600' : 'text-red-600'}`}>{lastWeek.capacityPct.toFixed(0)}%</span></div>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create production modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Production" className="max-w-lg">
        <div className="space-y-4">
          {/* Image preview */}
          {imagePreview && (
            <div className="w-48 mx-auto">
              <ProductionPoster imageUrl={imagePreview} color={form.color} name={form.name || 'Preview'} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Production Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Into the Woods"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Subtitle</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. Broadway revival · 2026"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Venue</label>
            <input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="e.g. St. James Theatre, New York"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductionStatus })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Opening</label>
              <input
                type="date"
                value={form.openingDate}
                onChange={(e) => setForm({ ...form, openingDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Closing</label>
              <input
                type="date"
                value={form.closingDate}
                onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Total Budget</label>
            <input
              type="number"
              value={form.totalBudget || ''}
              onChange={(e) => setForm({ ...form, totalBudget: Number(e.target.value) })}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Image URL</label>
            <input
              value={imagePreview}
              onChange={(e) => setImagePreview(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
            />
            <p className="text-[11px] text-stone-400 mt-1">Any aspect ratio works — we'll apply a blurred background to fill the 4:5 frame.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-2">Colour</label>
            <div className="flex gap-2">
              {PROD_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-stone-700 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Create Production</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
