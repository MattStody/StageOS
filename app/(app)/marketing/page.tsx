'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { fmt, fmtPct, formatDate, formatDateShort } from '@/lib/utils'
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { MarketingBudgetLine, MarketingCampaign, MarketingChannel, CampaignStatus } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// ─── Constants ───────────────────────────────────────────────────────────────

const CHANNELS: { value: MarketingChannel; label: string; color: string }[] = [
  { value: 'digital_social', label: 'Digital / Social', color: '#6366f1' },
  { value: 'paid_search',    label: 'Paid Search',      color: '#8b5cf6' },
  { value: 'print',          label: 'Print',             color: '#0891b2' },
  { value: 'radio',          label: 'Radio',             color: '#059669' },
  { value: 'ooh',            label: 'Out of Home',       color: '#d97706' },
  { value: 'tv',             label: 'TV',                color: '#dc2626' },
  { value: 'email',          label: 'Email',             color: '#0d9488' },
  { value: 'pr_press',       label: 'PR / Press',        color: '#7c3aed' },
  { value: 'photography_video', label: 'Photo / Video', color: '#be185d' },
  { value: 'agency_fees',    label: 'Agency Fees',       color: '#475569' },
  { value: 'other',          label: 'Other',             color: '#a8a29e' },
]

const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'planned',   label: 'Planned'   },
  { value: 'active',    label: 'Active'    },
  { value: 'completed', label: 'Completed' },
  { value: 'paused',    label: 'Paused'    },
]

const channelLabel = (ch: MarketingChannel) => CHANNELS.find((c) => c.value === ch)?.label ?? ch
const channelColor = (ch: MarketingChannel) => CHANNELS.find((c) => c.value === ch)?.color ?? '#a8a29e'

const statusVariant: Record<CampaignStatus, string> = {
  planned: 'neutral', active: 'signed', completed: 'draft', paused: 'needs_review',
}

// ─── Blank forms ─────────────────────────────────────────────────────────────

const blankLine = (productionId: string): Omit<MarketingBudgetLine, 'id'> => ({
  productionId, channel: 'digital_social', lineItem: '', budgeted: 0, actual: 0, notes: '',
})

const blankCampaign = (productionId: string): Omit<MarketingCampaign, 'id'> => ({
  productionId, title: '', channel: 'digital_social',
  startDate: '', endDate: '', status: 'planned', budget: 0, notes: '',
})

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const {
    productions,
    marketingBudgetLines, addMarketingBudgetLine, updateMarketingBudgetLine, deleteMarketingBudgetLine,
    marketingCampaigns, addMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign,
  } = useStore()
  const { isAdmin } = useAuth()

  const [selectedProd, setSelectedProd] = useState(productions[0]?.id || '')
  const [tab, setTab] = useState<'budget' | 'campaigns'>('budget')

  // budget modal
  const [budgetModal, setBudgetModal] = useState(false)
  const [editingLine, setEditingLine] = useState<MarketingBudgetLine | null>(null)
  const [lineForm, setLineForm] = useState<Omit<MarketingBudgetLine, 'id'>>(blankLine(selectedProd))

  // campaign modal
  const [campaignModal, setCampaignModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null)
  const [campaignForm, setCampaignForm] = useState<Omit<MarketingCampaign, 'id'>>(blankCampaign(selectedProd))

  const [collapsedChannels, setCollapsedChannels] = useState<Set<string>>(new Set())

  const prod = productions.find((p) => p.id === selectedProd)
  const lines = marketingBudgetLines.filter((l) => l.productionId === selectedProd)
  const campaigns = marketingCampaigns
    .filter((c) => c.productionId === selectedProd)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  // ── Budget stats ──
  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual   = lines.reduce((s, l) => s + l.actual,   0)
  const totalVariance = totalActual - totalBudgeted

  // Chart data — by channel
  const channelsPresent = CHANNELS.filter((ch) => lines.some((l) => l.channel === ch.value))
  const chartData = channelsPresent.map((ch) => {
    const chLines = lines.filter((l) => l.channel === ch.value)
    return {
      name: ch.label,
      budgeted: chLines.reduce((s, l) => s + l.budgeted, 0),
      actual:   chLines.reduce((s, l) => s + l.actual,   0),
      color: ch.color,
    }
  })

  // ── Budget handlers ──
  function openAddLine() {
    setEditingLine(null)
    setLineForm(blankLine(selectedProd))
    setBudgetModal(true)
  }
  function openEditLine(l: MarketingBudgetLine) {
    setEditingLine(l)
    setLineForm({ ...l })
    setBudgetModal(true)
  }
  function saveLineForm() {
    editingLine
      ? updateMarketingBudgetLine({ ...lineForm, id: editingLine.id })
      : addMarketingBudgetLine({ ...lineForm, id: `mb-${Date.now()}` })
    setBudgetModal(false)
  }

  // ── Campaign handlers ──
  function openAddCampaign() {
    setEditingCampaign(null)
    setCampaignForm(blankCampaign(selectedProd))
    setCampaignModal(true)
  }
  function openEditCampaign(c: MarketingCampaign) {
    setEditingCampaign(c)
    setCampaignForm({ ...c })
    setCampaignModal(true)
  }
  function saveCampaignForm() {
    editingCampaign
      ? updateMarketingCampaign({ ...campaignForm, id: editingCampaign.id })
      : addMarketingCampaign({ ...campaignForm, id: `mc-${Date.now()}` })
    setCampaignModal(false)
  }

  function toggleChannel(ch: string) {
    setCollapsedChannels((prev) => {
      const next = new Set(prev)
      next.has(ch) ? next.delete(ch) : next.add(ch)
      return next
    })
  }

  // campaign status breakdown
  const statusCounts = STATUSES.map((s) => ({
    ...s,
    count: campaigns.filter((c) => c.status === s.value).length,
  }))

  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle="Channel budget and campaign tracker"
        actions={isAdmin ? (
          tab === 'budget'
            ? <Button onClick={openAddLine} size="sm"><Plus size={13} /> Add Line</Button>
            : <Button onClick={openAddCampaign} size="sm"><Plus size={13} /> Add Campaign</Button>
        ) : undefined}
      />

      {/* Production tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {productions.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProd(p.id)}
            className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5 ${selectedProd === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Budget" value={fmt(totalBudgeted)} />
        <StatCard label="Total Spent" value={fmt(totalActual)} sub={totalBudgeted > 0 ? `${fmtPct((totalActual / totalBudgeted) * 100)} of budget` : ''} />
        <StatCard
          label="Variance"
          value={fmt(Math.abs(totalVariance))}
          sub={totalVariance > 0 ? 'over budget' : totalVariance < 0 ? 'under budget' : 'on budget'}
          alert={totalVariance > 0}
        />
        <StatCard label="Campaigns" value={String(campaigns.length)} sub={`${statusCounts.find(s => s.value === 'active')?.count ?? 0} active`} />
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-stone-200 mb-6">
        {(['budget', 'campaigns'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${tab === t ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
          >
            {t === 'budget' ? 'Budget by Channel' : 'Campaign Calendar'}
          </button>
        ))}
      </div>

      {/* ── BUDGET TAB ── */}
      {tab === 'budget' && (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="mb-6">
              <CardHeader><CardTitle>Spend by Channel</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barGap={4}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 6 }} />
                    <Bar dataKey="budgeted" name="Budgeted" radius={[2, 2, 0, 0]} opacity={0.4}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                    <Bar dataKey="actual" name="Actual" radius={[2, 2, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-stone-400 text-center mt-1">Light = budgeted · Dark = actual</p>
              </CardBody>
            </Card>
          )}

          {/* Table */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Line Item</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Budgeted</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Actual</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Variance</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-400">No budget lines yet. Add one to get started.</td></tr>
                ) : (
                  channelsPresent.map((ch) => {
                    const chLines = lines.filter((l) => l.channel === ch.value)
                    if (chLines.length === 0) return null
                    const chBudgeted = chLines.reduce((s, l) => s + l.budgeted, 0)
                    const chActual   = chLines.reduce((s, l) => s + l.actual,   0)
                    const chVariance = chActual - chBudgeted
                    const isCollapsed = collapsedChannels.has(ch.value)

                    return [
                      <tr key={`ch-${ch.value}`} onClick={() => toggleChannel(ch.value)} className="border-b border-stone-100 bg-stone-50/50 hover:bg-stone-50 cursor-pointer">
                        <td className="px-4 py-2.5 flex items-center gap-2 font-medium text-stone-700">
                          {isCollapsed ? <ChevronRight size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                          {ch.label}
                        </td>
                        <td className="text-right px-4 py-2.5 font-medium text-stone-600">{fmt(chBudgeted)}</td>
                        <td className="text-right px-4 py-2.5 font-medium text-stone-600">{fmt(chActual)}</td>
                        <td className={`text-right px-4 py-2.5 font-medium ${chVariance > 0 ? 'text-red-600' : chVariance < 0 ? 'text-emerald-600' : 'text-stone-500'}`}>
                          {chVariance !== 0 ? `${chVariance > 0 ? '+' : ''}${fmt(chVariance)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5" colSpan={2} />
                      </tr>,
                      ...(!isCollapsed ? chLines.map((line) => {
                        const v = line.actual - line.budgeted
                        const overBudget = line.budgeted > 0 && (v / line.budgeted) > 0.1
                        return (
                          <tr key={line.id} className="border-b border-stone-100 hover:bg-stone-50/40 group">
                            <td className="px-4 py-2.5 pl-10 text-stone-700">{line.lineItem}</td>
                            <td className="text-right px-4 py-2.5 text-stone-600">{fmt(line.budgeted)}</td>
                            <td className="text-right px-4 py-2.5 text-stone-700">{line.actual > 0 ? fmt(line.actual) : '—'}</td>
                            <td className="text-right px-4 py-2.5">
                              {line.actual > 0
                                ? <span className={`text-xs ${overBudget ? 'text-red-600 font-medium' : v < 0 ? 'text-emerald-600' : 'text-stone-500'}`}>{v !== 0 ? `${v > 0 ? '+' : ''}${fmt(v)}` : '—'}</span>
                                : '—'
                              }
                            </td>
                            <td className="px-4 py-2.5 text-xs text-stone-400">{line.notes}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                {isAdmin && <button onClick={() => openEditLine(line)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                                {isAdmin && <button onClick={() => deleteMarketingBudgetLine(line.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
                              </div>
                            </td>
                          </tr>
                        )
                      }) : []),
                    ]
                  })
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800">Total</td>
                    <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalBudgeted)}</td>
                    <td className="text-right px-4 py-3 font-semibold text-stone-800">{fmt(totalActual)}</td>
                    <td className={`text-right px-4 py-3 font-semibold ${totalVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {totalVariance !== 0 ? `${totalVariance > 0 ? '+' : ''}${fmt(totalVariance)}` : '—'}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* ── CAMPAIGNS TAB ── */}
      {tab === 'campaigns' && (
        <>
          {/* Status summary chips */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {statusCounts.filter((s) => s.count > 0).map((s) => (
              <div key={s.value} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded text-xs text-stone-600">
                <span className={`w-1.5 h-1.5 rounded-full ${s.value === 'active' ? 'bg-emerald-500' : s.value === 'planned' ? 'bg-stone-400' : s.value === 'completed' ? 'bg-stone-300' : 'bg-amber-400'}`} />
                {s.label} <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>

          {/* Campaign rows grouped by status */}
          {(['active', 'planned', 'completed', 'paused'] as CampaignStatus[]).map((status) => {
            const group = campaigns.filter((c) => c.status === status)
            if (group.length === 0) return null
            const statusMeta = STATUSES.find((s) => s.value === status)!
            return (
              <div key={status} className="mb-6">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">{statusMeta.label}</h3>
                <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Campaign</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Channel</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Dates</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Budget</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                        <th className="w-16 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((c) => (
                        <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50/50 group last:border-0">
                          <td className="px-5 py-3 font-medium text-stone-800">{c.title}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-xs text-stone-600">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: channelColor(c.channel) }} />
                              {channelLabel(c.channel)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">
                            {c.startDate ? formatDateShort(c.startDate) : '—'}
                            {c.endDate && c.endDate !== c.startDate ? ` – ${formatDateShort(c.endDate)}` : ''}
                          </td>
                          <td className="text-right px-4 py-3 text-stone-700">{c.budget > 0 ? fmt(c.budget) : '—'}</td>
                          <td className="px-4 py-3 text-xs text-stone-400 max-w-xs truncate">{c.notes}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              {isAdmin && <button onClick={() => openEditCampaign(c)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"><Pencil size={12} /></button>}
                              {isAdmin && <button onClick={() => deleteMarketingCampaign(c.id)} className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {campaigns.length === 0 && (
            <div className="text-center py-12 text-sm text-stone-400">No campaigns yet. Add one to get started.</div>
          )}
        </>
      )}

      {/* ── BUDGET MODAL ── */}
      <Modal open={budgetModal} onClose={() => setBudgetModal(false)} title={editingLine ? 'Edit Budget Line' : 'Add Budget Line'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Channel</label>
            <select value={lineForm.channel} onChange={(e) => setLineForm({ ...lineForm, channel: e.target.value as MarketingChannel })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Line Item</label>
            <input value={lineForm.lineItem} onChange={(e) => setLineForm({ ...lineForm, lineItem: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Budgeted</label>
              <input type="number" value={lineForm.budgeted} onChange={(e) => setLineForm({ ...lineForm, budgeted: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Actual</label>
              <input type="number" value={lineForm.actual} onChange={(e) => setLineForm({ ...lineForm, actual: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input value={lineForm.notes} onChange={(e) => setLineForm({ ...lineForm, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setBudgetModal(false)}>Cancel</Button>
            <Button onClick={saveLineForm}>{editingLine ? 'Save Changes' : 'Add Line'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── CAMPAIGN MODAL ── */}
      <Modal open={campaignModal} onClose={() => setCampaignModal(false)} title={editingCampaign ? 'Edit Campaign' : 'Add Campaign'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Title</label>
            <input value={campaignForm.title} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Channel</label>
              <select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value as MarketingChannel })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Status</label>
              <select value={campaignForm.status} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value as CampaignStatus })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Start Date</label>
              <input type="date" value={campaignForm.startDate} onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">End Date</label>
              <input type="date" value={campaignForm.endDate} onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Budget</label>
            <input type="number" value={campaignForm.budget} onChange={(e) => setCampaignForm({ ...campaignForm, budget: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Notes</label>
            <input value={campaignForm.notes} onChange={(e) => setCampaignForm({ ...campaignForm, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCampaignModal(false)}>Cancel</Button>
            <Button onClick={saveCampaignForm}>{editingCampaign ? 'Save Changes' : 'Add Campaign'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
