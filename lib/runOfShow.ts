// Wardrobe run-of-show logic: labels, change windows, and the conflict checks
// that a paper running list cannot give you.

import type {
  CastTrack, CostumeLook, Person, RunOfShow, RunOfShowItem, CueType,
} from './types'

// ── Labels ──────────────────────────────────────────────────────────────────

/** "101 tux" — the way wardrobe writes a look on a running list. */
export function lookLabel(look: CostumeLook | undefined): string {
  if (!look) return ''
  return `${look.number} ${look.name}`.trim()
}

export function looksLabel(ids: string[] | undefined, looks: CostumeLook[]): string {
  if (!ids || ids.length === 0) return ''
  return ids.map((id) => lookLabel(looks.find((l) => l.id === id))).filter(Boolean).join(', ')
}

/**
 * How a track is named on the list. An alternating cast reads
 * "Maya or Rowan (Puck)", matching how running lists handle swing/child tracks.
 */
export function trackLabel(track: CastTrack | undefined, people: Person[]): string {
  if (!track) return ''
  if (track.performerLabel) return track.performerLabel
  const names = track.performerIds
    .map((id) => people.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[]
  if (names.length === 0) return track.roleName
  const firsts = names.map((n) => n.split(' ')[0])
  if (firsts.length === 1) return `${firsts[0]} (${track.roleName})`
  return `${firsts.join(' or ')} (${track.roleName})`
}

/** The performer shown on a cue row, whatever the data source. */
export function cuePerformer(item: RunOfShowItem, tracks: CastTrack[], people: Person[]): string {
  if (item.performerLabel) return item.performerLabel
  return trackLabel(tracks.find((t) => t.id === item.trackId), people)
}

// ── Change windows ──────────────────────────────────────────────────────────

/**
 * Script pages between leaving the stage and being back on. This is the
 * proxy wardrobe uses for "how long have we got" before timings exist.
 * Returns null when the re-entry page is unknown.
 */
export function changeWindow(item: RunOfShowItem): number | null {
  if (item.page == null || item.reentryPage == null) return null
  return Math.max(0, item.reentryPage - item.page)
}

export type ChangeUrgency = 'fast' | 'tight' | 'comfortable' | 'unknown'

/** A change of one page or less is a true quick change; flagged ones always are. */
export function changeUrgency(item: RunOfShowItem): ChangeUrgency {
  if (item.isFast) return 'fast'
  const w = changeWindow(item)
  if (w === null) return 'unknown'
  if (w <= 1) return 'fast'
  if (w <= 3) return 'tight'
  return 'comfortable'
}

export const URGENCY_STYLES: Record<ChangeUrgency, string> = {
  fast: 'text-red-700 bg-red-50 border-red-200',
  tight: 'text-amber-700 bg-amber-50 border-amber-200',
  comfortable: 'text-stone-500 bg-stone-50 border-stone-200',
  unknown: 'text-stone-400 bg-stone-50 border-stone-100',
}

export const URGENCY_LABELS: Record<ChangeUrgency, string> = {
  fast: 'Fast',
  tight: 'Tight',
  comfortable: 'OK',
  unknown: '—',
}

// ── Conflict detection ──────────────────────────────────────────────────────

export interface DresserConflict {
  dresser: string
  act: number
  a: RunOfShowItem
  b: RunOfShowItem
  reason: string
}

const CUE_TYPES_NEEDING_HANDS: CueType[] = ['quick_change', 'receive', 'preset', 'clear', 'reset']

function pageSpan(item: RunOfShowItem): [number, number] | null {
  if (item.page == null) return null
  return [item.page, item.reentryPage ?? item.page]
}

/**
 * A dresser cannot be in two places at once. Flags cues assigned to the same
 * crew member whose page windows overlap — a double-booking that is nearly
 * invisible on paper but obvious once the data is structured.
 */
export function detectDresserConflicts(items: RunOfShowItem[]): DresserConflict[] {
  const conflicts: DresserConflict[] = []
  const cues = items.filter(
    (i) =>
      i.type === 'cue' &&
      i.assignedTo &&
      i.assignedTo !== '(Self)' &&
      i.cueType &&
      CUE_TYPES_NEEDING_HANDS.includes(i.cueType),
  )

  for (let x = 0; x < cues.length; x++) {
    for (let y = x + 1; y < cues.length; y++) {
      const a = cues[x]
      const b = cues[y]
      if (a.assignedTo !== b.assignedTo) continue
      if (a.act !== b.act) continue

      const spanA = pageSpan(a)
      const spanB = pageSpan(b)
      if (!spanA || !spanB) continue

      const overlaps = spanA[0] <= spanB[1] && spanB[0] <= spanA[1]
      if (!overlaps) continue

      const differentPlaces = a.location !== b.location
      conflicts.push({
        dresser: a.assignedTo as string,
        act: a.act,
        a,
        b,
        reason: differentPlaces
          ? `Overlapping cues in two places (${a.location} and ${b.location})`
          : 'Overlapping cues at the same time',
      })
    }
  }
  return conflicts
}

// ── Stats ───────────────────────────────────────────────────────────────────

export interface RunStats {
  quickChanges: number
  fastChanges: number
  openDecisions: number
  conflicts: number
  acts: number[]
  dressers: string[]
}

export function runStats(run: RunOfShow): RunStats {
  const cues = run.items.filter((i) => i.type === 'cue')
  const dressers = Array.from(
    new Set(
      cues
        .map((c) => c.assignedTo)
        .filter((d): d is string => !!d && d !== '(Self)'),
    ),
  ).sort()
  return {
    quickChanges: cues.filter((c) => c.cueType === 'quick_change').length,
    fastChanges: cues.filter((c) => changeUrgency(c) === 'fast').length,
    openDecisions: run.items.filter((i) => i.needsDecision).length,
    conflicts: detectDresserConflicts(run.items).length,
    acts: Array.from(new Set(run.items.map((i) => i.act))).sort((a, b) => a - b),
    dressers,
  }
}

// ── Ordering ────────────────────────────────────────────────────────────────

export function sortedItems(run: RunOfShow): RunOfShowItem[] {
  return [...run.items].sort((a, b) => a.act - b.act || a.sequence - b.sequence)
}

/**
 * Items for a dresser's own copy. Structural rows (scenes, numbers,
 * transitions) are always kept so the list still reads in running order.
 */
export function filterForDresser(items: RunOfShowItem[], dresser: string | 'all'): RunOfShowItem[] {
  if (dresser === 'all') return items
  return items.filter((i) => i.type !== 'cue' || i.assignedTo === dresser)
}

/** Drop structural rows that no longer have any cue under them. */
export function pruneEmptySections(items: RunOfShowItem[]): RunOfShowItem[] {
  const keep: RunOfShowItem[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type === 'cue') {
      keep.push(item)
      continue
    }
    // Keep a structural row only if a cue follows before the next scene row.
    let hasCue = false
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].type === 'scene') break
      if (items[j].type === 'cue') {
        hasCue = true
        break
      }
    }
    if (hasCue) keep.push(item)
  }
  return keep
}

// ── Export ──────────────────────────────────────────────────────────────────

export function runToCSVRows(
  run: RunOfShow,
  tracks: CastTrack[],
  looks: CostumeLook[],
  people: Person[],
): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['Act', 'Page', 'Where', 'Type', 'Performer', 'Off', 'On', 'Notes', 'Who'],
  ]
  for (const item of sortedItems(run)) {
    if (item.type === 'scene') {
      rows.push([item.act, item.pageStart ?? '', '', 'SCENE', `Scene ${item.sceneNumber} — ${item.title ?? ''}`, '', '', '', ''])
      continue
    }
    if (item.type === 'number' || item.type === 'scene_change') {
      const prefix = item.type === 'scene_change' ? 'SCENE CHANGE' : 'NUMBER'
      rows.push([item.act, item.page ?? '', '', prefix, `${item.numberLabel ?? ''} ${item.title ?? ''}`.trim(), '', '', '', ''])
      continue
    }
    rows.push([
      item.act,
      item.page ?? '',
      [item.location, item.locationDetail].filter(Boolean).join(' '),
      item.cueType === 'quick_change' ? 'QC' : (item.cueType ?? '').toUpperCase(),
      cuePerformer(item, tracks, people) || item.body || '',
      looksLabel(item.offLookIds, looks) || item.offText || '',
      looksLabel(item.onLookIds, looks) || item.onText || '',
      [item.reentryPage ? `re-ent P.${item.reentryPage}` : '', item.notes ?? '', item.isDead ? 'DEAD' : '']
        .filter(Boolean)
        .join(' · '),
      item.assignedTo ?? '',
    ])
  }
  return rows
}
