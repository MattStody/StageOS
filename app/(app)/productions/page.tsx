'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, fmtPct, formatDate, statusLabel, budgetUsedPct } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Plus, Theater } from 'lucide-react'
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
        actions={isAdmin ? (
          <Button onClick={openCreate} size="sm">
            <Plus size={13} /> New Production
          </Button>
        ) : undefined}
      />

      {/* Production poster grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {productions.map((p) => {
          const weeks = revenueWeeks.filter((w) => w.productionId === p.id)
          const cumGross = weeks.reduce((s, w) => s + w.grossRevenue, 0)
          const prodContracts = contracts.filter((c) => c.productionId === p.id)
          const signedCount = prodContracts.filter((c) => c.status === 'signed').length
          const budgetPct = budgetUsedPct(p.totalActual, p.totalBudget)
          const overdueItems = deadlines.filter((d) => d.productionId === p.id && d.status === 'overdue').length

          return (
            <Link key={p.id} href={`/productions/${p.id}`} className="group block">
              <div className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:border-stone-300 hover:shadow-md transition-all">
                {/* Poster image */}
                <ProductionPoster imageUrl={p.imageUrl} color={p.color} name={p.name} />

                {/* Info panel */}
                <div className="p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <Badge variant={p.status}>{statusLabel(p.status)}</Badge>
                    {overdueItems > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">{overdueItems} overdue</span>
                    )}
                  </div>

                  <h2 className="text-sm font-semibold text-stone-900 leading-snug mb-0.5 truncate">{p.name}</h2>
                  <p className="text-[11px] text-stone-500 truncate mb-3">{p.venue}</p>

                  {/* Budget bar */}
                  {p.totalBudget > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-stone-400">Budget used</span>
                        <span className={`font-medium ${budgetPct > 90 ? 'text-red-600' : budgetPct > 80 ? 'text-amber-600' : 'text-stone-600'}`}>
                          {fmtPct(budgetPct)}
                        </span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(budgetPct, 100)}%`,
                            backgroundColor: budgetPct > 90 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : p.color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <div>
                      <span className="text-stone-400">Gross</span>
                      <p className="font-medium text-stone-800">{fmt(cumGross || p.currentGross)}</p>
                    </div>
                    <div>
                      <span className="text-stone-400">Cash</span>
                      <p className="font-medium text-stone-800">{fmt(p.cashOnHand)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-stone-400">Contracts</span>
                      <span className="font-medium text-stone-800 ml-1">{signedCount}/{prodContracts.length} signed</span>
                    </div>
                  </div>

                  {/* Dates */}
                  {p.openingDate && (
                    <p className="text-[10px] text-stone-400 mt-2 truncate">
                      {formatDate(p.openingDate)}{p.closingDate ? ` — ${formatDate(p.closingDate)}` : ''}
                    </p>
                  )}

                  <div className="flex items-center justify-end mt-2">
                    <ArrowRight size={12} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {/* Create new card (admin only) — removed; use "New Production" button in header */}
      </div>

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
