'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { downloadCSV } from '@/lib/company'
import {
  lookLabel, looksLabel, cuePerformer, changeWindow, changeUrgency,
  URGENCY_STYLES, URGENCY_LABELS, detectDresserConflicts, runStats,
  sortedItems, filterForDresser, pruneEmptySections, runToCSVRows,
} from '@/lib/runOfShow'
import {
  STAGE_LOCATION_LABELS, CUE_TYPE_LABELS,
} from '@/lib/types'
import type {
  RunOfShow, RunOfShowItem, CueType, StageLocation, CostumeLook,
} from '@/lib/types'
import {
  ArrowLeft, Printer, Download, Plus, Pencil, AlertTriangle, HelpCircle,
  Zap, Trash2, Shirt,
} from 'lucide-react'

const LOCATIONS: StageLocation[] = ['SR', 'SL', 'X-OVER', 'DRS RM', 'ONSTAGE', 'OTHER']
const CUE_TYPES: CueType[] = ['quick_change', 'preset', 'standby', 'clear', 'reset', 'receive', 'note']

const inputCls =
  'w-full rounded border border-stone-300 px-2.5 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300'

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function blankCue(act: number): RunOfShowItem {
  return {
    id: uid('ros'),
    act,
    sequence: Date.now(),
    type: 'cue',
    cueType: 'quick_change',
    location: 'SR',
    offLookIds: [],
    onLookIds: [],
  }
}

export default function RunOfShowPage() {
  const {
    productions, people, castTracks, costumeLooks, runsOfShow, updateRunOfShow,
  } = useStore()
  const { canEdit } = useAccess()

  const [runId, setRunId] = useState<string>(runsOfShow[0]?.id ?? '')
  const [actFilter, setActFilter] = useState<number | 'all'>('all')
  const [dresserFilter, setDresserFilter] = useState<string>('all')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [editing, setEditing] = useState<RunOfShowItem | null>(null)
  const [isNew, setIsNew] = useState(false)

  const run: RunOfShow | undefined = runsOfShow.find((r) => r.id === runId) ?? runsOfShow[0]
  const production = productions.find((p) => p.id === run?.productionId)

  const stats = useMemo(() => (run ? runStats(run) : null), [run])
  const conflicts = useMemo(() => (run ? detectDresserConflicts(run.items) : []), [run])

  const visible = useMemo(() => {
    if (!run) return []
    let items = sortedItems(run)
    if (actFilter !== 'all') items = items.filter((i) => i.act === actFilter)
    if (onlyOpen) items = items.filter((i) => i.needsDecision)
    if (dresserFilter !== 'all') {
      items = pruneEmptySections(filterForDresser(items, dresserFilter))
    }
    return items
  }, [run, actFilter, dresserFilter, onlyOpen])

  const looksForProduction = useMemo(
    () => costumeLooks.filter((l) => l.productionId === run?.productionId),
    [costumeLooks, run],
  )
  const tracksForProduction = useMemo(
    () => castTracks.filter((t) => t.productionId === run?.productionId),
    [castTracks, run],
  )

  if (!run) {
    return (
      <div>
        <PageHeader title="Run of Show" subtitle="Wardrobe backstage running list" />
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <Shirt size={28} className="mx-auto text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-700">No running list yet</p>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            A run of show maps every wardrobe cue — quick changes, presets, resets — against the
            script so the crew can run a performance from it.
          </p>
          <Link href="/company/wardrobe" className="inline-block mt-4 text-xs font-medium text-stone-600 border border-stone-200 rounded px-3 py-1.5 hover:bg-stone-50">
            Back to Wardrobe
          </Link>
        </div>
      </div>
    )
  }

  function saveItem(item: RunOfShowItem) {
    if (!run) return
    const items = isNew
      ? [...run.items, item]
      : run.items.map((i) => (i.id === item.id ? item : i))
    updateRunOfShow({ ...run, items, updatedAt: new Date().toISOString() })
    setEditing(null)
    setIsNew(false)
  }

  function deleteItem(id: string) {
    if (!run) return
    updateRunOfShow({ ...run, items: run.items.filter((i) => i.id !== id), updatedAt: new Date().toISOString() })
    setEditing(null)
  }

  function exportCSV() {
    if (!run) return
    const slug = (production?.name ?? 'production').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadCSV(`wardrobe-run-of-show-${slug}.csv`, runToCSVRows(run, castTracks, costumeLooks, people))
  }

  return (
    <div>
      <PageHeader
        title="Run of Show"
        subtitle={`${production?.name ?? ''} · ${run.title}`}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={13} /> Print
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <Download size={13} /> CSV
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(blankCue(actFilter === 'all' ? 1 : actFilter))
                  setIsNew(true)
                }}
              >
                <Plus size={13} /> Add cue
              </Button>
            )}
          </div>
        }
      />

      {/* Document header — mirrors the paper running list */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-stone-900 uppercase tracking-wide">{production?.name}</p>
            <p className="text-xs text-stone-500 mt-0.5">{run.title}</p>
            <p className="text-[11px] text-stone-400 mt-1">
              Created by {run.createdBy} · Updated {new Date(run.updatedAt).toLocaleDateString('en-CA')}
              {' · '}
              <span className="uppercase tracking-wide">{run.status.replace('_', ' ')}</span>
            </p>
          </div>
          {dresserFilter !== 'all' && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Copy for</p>
              <p className="text-base font-semibold text-stone-900">{dresserFilter}</p>
            </div>
          )}
        </div>

        {/* Preshow crew */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Preshow</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {run.crew.map((c) => (
              <div key={c.name} className="rounded-lg border border-stone-200 p-3">
                <p className="text-xs font-semibold text-stone-800">{c.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">{c.role}</p>
                {c.preshow && <p className="text-[11px] text-stone-600 mt-1.5 leading-snug">{c.preshow}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 print:hidden">
          <StatTile label="Quick changes" value={stats.quickChanges} />
          <StatTile label="Fast / hard changes" value={stats.fastChanges} tone={stats.fastChanges > 0 ? 'warn' : undefined} />
          <StatTile label="Open decisions" value={stats.openDecisions} tone={stats.openDecisions > 0 ? 'warn' : undefined} />
          <StatTile label="Crew conflicts" value={stats.conflicts} tone={stats.conflicts > 0 ? 'danger' : undefined} />
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 print:hidden">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-800">
                {conflicts.length} crew conflict{conflicts.length !== 1 ? 's' : ''} — one dresser needed in two places
              </p>
              <ul className="mt-1.5 space-y-1">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-[11px] text-red-700 leading-snug">
                    <strong>{c.dresser}</strong> — Act {c.act}: P.{c.a.page} ({c.a.location}) overlaps P.{c.b.page} ({c.b.location}). {c.reason}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-4 print:hidden">
        <div className="flex rounded border border-stone-200 overflow-hidden text-xs">
          {(['all', ...(stats?.acts ?? [])] as (number | 'all')[]).map((a) => (
            <button
              key={String(a)}
              onClick={() => setActFilter(a)}
              className={cn(
                'px-3 py-1.5 font-medium transition-colors',
                actFilter === a ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50',
              )}
            >
              {a === 'all' ? 'Full show' : `Act ${a}`}
            </button>
          ))}
        </div>

        <select
          value={dresserFilter}
          onChange={(e) => setDresserFilter(e.target.value)}
          className="rounded border border-stone-200 px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none"
        >
          <option value="all">All crew</option>
          {run.crew.map((c) => (
            <option key={c.name} value={c.name}>{c.name} — own copy</option>
          ))}
        </select>

        <button
          onClick={() => setOnlyOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors',
            onlyOpen
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300',
          )}
        >
          <HelpCircle size={12} />
          Open decisions only
        </button>
      </div>

      {/* The running list */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-stone-800 text-white">
              <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider w-14">Page</th>
              <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider w-32">Where</th>
              <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider">Action</th>
              <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider w-20">Window</th>
              <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider w-36">Who</th>
              {canEdit && <th className="w-10 print:hidden" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              // ── Scene band ──
              if (item.type === 'scene') {
                return (
                  <tr key={item.id} className="bg-stone-900 text-white">
                    <td colSpan={canEdit ? 6 : 5} className="px-3 py-2">
                      <span className="font-bold uppercase tracking-wide">
                        Act {item.act} · Scene {item.sceneNumber}
                      </span>
                      <span className="text-stone-300 ml-2">
                        (P. {item.pageStart}–{item.pageEnd})
                      </span>
                      <span className="ml-2 font-semibold">— {item.title}</span>
                    </td>
                  </tr>
                )
              }

              // ── Musical number ──
              if (item.type === 'number') {
                return (
                  <tr key={item.id} className="bg-stone-600 text-white">
                    <td className="px-3 py-1.5 font-medium">{item.page}</td>
                    <td colSpan={canEdit ? 5 : 4} className="px-3 py-1.5">
                      <span className="font-semibold">{item.numberLabel}</span>
                      <span className="italic ml-2">— {item.title}</span>
                      {item.timecode && <span className="ml-3 text-stone-300">{item.timecode}</span>}
                    </td>
                  </tr>
                )
              }

              // ── Scene change / transition ──
              if (item.type === 'scene_change') {
                return (
                  <tr key={item.id} className="bg-stone-300 text-stone-800">
                    <td className="px-3 py-1.5 font-medium">{item.page}</td>
                    <td colSpan={canEdit ? 5 : 4} className="px-3 py-1.5">
                      <span className="font-semibold uppercase tracking-wide text-[10px]">Scene change:</span>
                      <span className="ml-2 font-medium">{item.numberLabel}</span>
                      <span className="italic ml-1">— {item.title}</span>
                    </td>
                  </tr>
                )
              }

              // ── Cue row ──
              const urgency = changeUrgency(item)
              const window = changeWindow(item)
              const isQC = item.cueType === 'quick_change'
              const performer = cuePerformer(item, castTracks, people)

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-stone-100 align-top',
                    item.needsDecision && 'bg-amber-50/40',
                  )}
                >
                  <td className="px-3 py-2.5 font-medium text-stone-700">{item.page}</td>
                  <td className="px-3 py-2.5 text-stone-600">
                    <span className="font-semibold">{item.location}</span>
                    {item.locationDetail && (
                      <span className="block text-[10px] text-stone-400">{item.locationDetail}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isQC ? (
                      <>
                        <p className="font-bold text-stone-900 underline decoration-stone-300 underline-offset-2">
                          QC: {performer}
                          {item.isFast && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 no-underline">
                              <Zap size={9} /> FAST
                            </span>
                          )}
                        </p>
                        {(item.offLookIds?.length || item.offText) && (
                          <p className="text-stone-700 mt-0.5">
                            <span className="font-semibold">− OFF:</span>{' '}
                            {looksLabel(item.offLookIds, costumeLooks) || item.offText}
                          </p>
                        )}
                        {(item.onLookIds?.length || item.onText) && (
                          <p className="text-stone-700">
                            <span className="font-semibold">+ ON:</span>{' '}
                            {looksLabel(item.onLookIds, costumeLooks) || item.onText}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-stone-900 uppercase tracking-wide text-[11px]">
                          {CUE_TYPE_LABELS[item.cueType ?? 'note']}
                          {performer && <span className="normal-case tracking-normal">: {performer}</span>}
                        </p>
                        {item.body && <p className="text-stone-700 mt-0.5 leading-snug">{item.body}</p>}
                      </>
                    )}

                    {(item.reentryPage || item.notes || item.needsDecision) && (
                      <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                        <span className="font-semibold text-stone-600">NOTES:</span>{' '}
                        {item.reentryPage && <>re-ent P.{item.reentryPage}</>}
                        {item.reentryPage && item.notes && ' · '}
                        {item.notes}
                        {item.needsDecision && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-amber-700 font-medium">
                            <HelpCircle size={10} /> open decision
                          </span>
                        )}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {isQC && (
                      <span
                        className={cn(
                          'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap',
                          URGENCY_STYLES[urgency],
                        )}
                        title={window !== null ? `${window} script pages` : 'Re-entry unknown'}
                      >
                        {window !== null ? `${window} pp` : URGENCY_LABELS[urgency]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-stone-600">{item.assignedTo}</td>
                  {canEdit && (
                    <td className="px-2 py-2.5 print:hidden">
                      <button
                        onClick={() => { setEditing(item); setIsNew(false) }}
                        className="text-stone-300 hover:text-stone-700 transition-colors"
                        title="Edit cue"
                      >
                        <Pencil size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-stone-400">
                  Nothing matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-stone-400 mt-3 print:hidden">
        Window shows script pages between the cue and the performer&apos;s re-entry — the working
        proxy for how long the change has. One page or less counts as a hard change.
      </p>

      {/* Cue editor */}
      {editing && (
        <CueEditor
          item={editing}
          isNew={isNew}
          looks={looksForProduction}
          tracks={tracksForProduction.map((t) => ({
            id: t.id,
            label: t.performerLabel ?? `${t.roleName} (track ${t.trackNumber})`,
          }))}
          crew={run.crew.map((c) => c.name)}
          onSave={saveItem}
          onDelete={() => deleteItem(editing.id)}
          onClose={() => { setEditing(null); setIsNew(false) }}
        />
      )}
    </div>
  )
}

// ── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'danger' }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        tone === 'danger' ? 'border-red-200 bg-red-50' :
        tone === 'warn' ? 'border-amber-200 bg-amber-50' :
        'border-stone-200 bg-white',
      )}
    >
      <p className="text-2xl font-light text-stone-900">{value}</p>
      <p className="text-[11px] text-stone-500 mt-0.5">{label}</p>
    </div>
  )
}

// ── Cue editor modal ────────────────────────────────────────────────────────

interface CueEditorProps {
  item: RunOfShowItem
  isNew: boolean
  looks: CostumeLook[]
  tracks: { id: string; label: string }[]
  crew: string[]
  onSave: (item: RunOfShowItem) => void
  onDelete: () => void
  onClose: () => void
}

function CueEditor({ item, isNew, looks, tracks, crew, onSave, onDelete, onClose }: CueEditorProps) {
  const [draft, setDraft] = useState<RunOfShowItem>({ ...item })
  const patch = (p: Partial<RunOfShowItem>) => setDraft((d) => ({ ...d, ...p }))

  const trackLooks = draft.trackId ? looks.filter((l) => l.trackId === draft.trackId) : looks
  const isQC = draft.cueType === 'quick_change'

  function toggleLook(field: 'offLookIds' | 'onLookIds', id: string) {
    const current = draft[field] ?? []
    patch({ [field]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] } as Partial<RunOfShowItem>)
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Add cue' : 'Edit cue'} className="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Act">
            <input
              type="number" min={1} className={inputCls}
              value={draft.act}
              onChange={(e) => patch({ act: Number(e.target.value) })}
            />
          </Field>
          <Field label="Page">
            <input
              type="number" min={1} className={inputCls}
              value={draft.page ?? ''}
              onChange={(e) => patch({ page: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </Field>
          <Field label="Re-entry page">
            <input
              type="number" min={1} className={inputCls}
              value={draft.reentryPage ?? ''}
              onChange={(e) => patch({ reentryPage: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </Field>
          <Field label="Cue type">
            <select
              className={inputCls}
              value={draft.cueType ?? 'quick_change'}
              onChange={(e) => patch({ cueType: e.target.value as CueType })}
            >
              {CUE_TYPES.map((t) => (
                <option key={t} value={t}>{CUE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Where">
            <select
              className={inputCls}
              value={draft.location ?? 'SR'}
              onChange={(e) => patch({ location: e.target.value as StageLocation })}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{STAGE_LOCATION_LABELS[l]}</option>
              ))}
            </select>
          </Field>
          <Field label="Precise spot">
            <input
              className={inputCls}
              placeholder="stair unit"
              value={draft.locationDetail ?? ''}
              onChange={(e) => patch({ locationDetail: e.target.value })}
            />
          </Field>
          <Field label="Who">
            <select
              className={inputCls}
              value={draft.assignedTo ?? ''}
              onChange={(e) => patch({ assignedTo: e.target.value || undefined })}
            >
              <option value="">— unassigned —</option>
              {crew.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="(Self)">(Self)</option>
            </select>
          </Field>
        </div>

        <Field label="Track / performer">
          <select
            className={inputCls}
            value={draft.trackId ?? ''}
            onChange={(e) => patch({ trackId: e.target.value || undefined })}
          >
            <option value="">— none —</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>

        {isQC ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1.5">− Off</p>
              <div className="border border-stone-200 rounded max-h-36 overflow-y-auto divide-y divide-stone-100">
                {trackLooks.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={(draft.offLookIds ?? []).includes(l.id)}
                      onChange={() => toggleLook('offLookIds', l.id)}
                    />
                    {lookLabel(l)}
                  </label>
                ))}
                {trackLooks.length === 0 && <p className="px-2.5 py-2 text-xs text-stone-400">No looks for this track.</p>}
              </div>
              <input
                className={cn(inputCls, 'mt-1.5')}
                placeholder="or free text (e.g. shoes)"
                value={draft.offText ?? ''}
                onChange={(e) => patch({ offText: e.target.value })}
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1.5">+ On</p>
              <div className="border border-stone-200 rounded max-h-36 overflow-y-auto divide-y divide-stone-100">
                {trackLooks.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={(draft.onLookIds ?? []).includes(l.id)}
                      onChange={() => toggleLook('onLookIds', l.id)}
                    />
                    {lookLabel(l)}
                  </label>
                ))}
                {trackLooks.length === 0 && <p className="px-2.5 py-2 text-xs text-stone-400">No looks for this track.</p>}
              </div>
              <input
                className={cn(inputCls, 'mt-1.5')}
                placeholder="or free text (e.g. tap shoes)"
                value={draft.onText ?? ''}
                onChange={(e) => patch({ onText: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <Field label="Instruction">
            <textarea
              className={cn(inputCls, 'h-20 resize-none')}
              placeholder="CLEAR character shoes from both wings…"
              value={draft.body ?? ''}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </Field>
        )}

        <Field label="Notes">
          <input
            className={inputCls}
            value={draft.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
            <input type="checkbox" checked={!!draft.isFast} onChange={(e) => patch({ isFast: e.target.checked })} />
            Flag as fast / hard change
          </label>
          <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
            <input type="checkbox" checked={!!draft.needsDecision} onChange={(e) => patch({ needsDecision: e.target.checked })} />
            Still an open decision
          </label>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-stone-100">
          {!isNew ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
              <Trash2 size={12} /> Delete cue
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => onSave(draft)}>{isNew ? 'Add cue' : 'Save changes'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
