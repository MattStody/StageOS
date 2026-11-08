// Seed data for the Wardrobe Run of Show module.
// Modelled on a real wardrobe backstage running list: tracks numbered so that
// every look number carries its track prefix (track 1 → 101, 102 …), scene and
// musical-number bands interleaved with the cues the crew runs the show from.
//
// Tied to prod-1 — A Winter's Dream.

import type { CastTrack, CostumeLook, RunOfShow, RunOfShowItem } from './types'

// ── Tracks ──────────────────────────────────────────────────────────────────

export const CAST_TRACKS: CastTrack[] = [
  { id: 'track-1', productionId: 'prod-1', trackNumber: 1, roleName: 'Titania', performerIds: ['person-1'] },
  { id: 'track-2', productionId: 'prod-1', trackNumber: 2, roleName: 'Oberon', performerIds: ['person-2'] },
  { id: 'track-3', productionId: 'prod-1', trackNumber: 3, roleName: 'Cobweb', performerIds: ['person-3'] },
  {
    id: 'track-4',
    productionId: 'prod-1',
    trackNumber: 4,
    roleName: 'Puck',
    performerIds: [],
    performerLabel: 'MAYA or ROWAN (Puck)',
    isChildTrack: true,
  },
  { id: 'track-5', productionId: 'prod-1', trackNumber: 5, roleName: 'Snow Sprite', performerIds: [], performerLabel: 'JUNO (Snow Sprite)' },
  { id: 'track-6', productionId: 'prod-1', trackNumber: 6, roleName: 'Court Herald', performerIds: [], performerLabel: 'DEV (Court Herald)' },
]

// ── Look library ────────────────────────────────────────────────────────────

export const COSTUME_LOOKS: CostumeLook[] = [
  // Track 1 — Titania
  { id: 'look-101', productionId: 'prod-1', trackId: 'track-1', number: '101', name: 'court gown', pieces: ['gown', 'underskirt', 'coronet'], storageLocation: 'dressing room 2A' },
  { id: 'look-102', productionId: 'prod-1', trackId: 'track-1', number: '102', name: 'travelling cloak', pieces: ['cloak', 'boots'], storageLocation: 'SR quick-change booth' },
  { id: 'look-103', productionId: 'prod-1', trackId: 'track-1', number: '103', name: 'winter whites', pieces: ['overdress', 'fur stole'], storageLocation: 'X-OVER rail' },
  { id: 'look-104', productionId: 'prod-1', trackId: 'track-1', number: '104', name: 'thaw gown', pieces: ['gown', 'shawl'], storageLocation: 'dressing room 2A' },

  // Track 2 — Oberon
  { id: 'look-201', productionId: 'prod-1', trackId: 'track-2', number: '201', name: 'court formal', pieces: ['tailcoat', 'waistcoat'], storageLocation: 'dressing room 2B' },
  { id: 'look-202', productionId: 'prod-1', trackId: 'track-2', number: '202', name: 'hunting coat', pieces: ['coat', 'gloves'], storageLocation: 'SR rail' },
  { id: 'look-203', productionId: 'prod-1', trackId: 'track-2', number: '203', name: 'winter furs', pieces: ['fur coat', 'boots'], storageLocation: 'X-OVER rail' },
  { id: 'look-204', productionId: 'prod-1', trackId: 'track-2', number: '204', name: 'spring coat', storageLocation: 'dressing room 2B' },

  // Track 3 — Cobweb
  { id: 'look-301', productionId: 'prod-1', trackId: 'track-3', number: '301', name: 'ensemble base', storageLocation: 'dressing room 4C' },
  { id: 'look-302', productionId: 'prod-1', trackId: 'track-3', number: '302', name: 'sprite overlay', storageLocation: 'SL rail' },
  { id: 'look-303', productionId: 'prod-1', trackId: 'track-3', number: '303', name: 'market guest', storageLocation: 'dressing room 4C' },

  // Track 4 — Puck (alternating cast)
  { id: 'look-401', productionId: 'prod-1', trackId: 'track-4', number: '401', name: 'attic clothes', storageLocation: 'dressing room 6E' },
  { id: 'look-402', productionId: 'prod-1', trackId: 'track-4', number: '402', name: 'sprite green', storageLocation: 'SL quick-change booth' },
  { id: 'look-403', productionId: 'prod-1', trackId: 'track-4', number: '403', name: 'messenger coat', storageLocation: 'SR rail' },

  // Track 5 — Snow Sprite
  { id: 'look-501', productionId: 'prod-1', trackId: 'track-5', number: '501', name: 'caroller', storageLocation: 'dressing room 6B' },
  { id: 'look-502', productionId: 'prod-1', trackId: 'track-5', number: '502', name: 'snow sprite', storageLocation: 'SL rail' },

  // Track 6 — Court Herald
  { id: 'look-601', productionId: 'prod-1', trackId: 'track-6', number: '601', name: 'herald tabard', storageLocation: 'dressing room 6B' },
  { id: 'look-602', productionId: 'prod-1', trackId: 'track-6', number: '602', name: 'market guest', storageLocation: 'dressing room 6B' },
]

// ── Running list ────────────────────────────────────────────────────────────

let seq = 0
const next = () => (seq += 10)

const ACT_ONE: RunOfShowItem[] = [
  { id: 'ros-a1-1', act: 1, sequence: next(), type: 'scene', sceneNumber: 1, title: 'The Winter Court', pageStart: 1, pageEnd: 12 },
  { id: 'ros-a1-2', act: 1, sequence: next(), type: 'number', numberLabel: '#1', title: 'Overture', page: 1, timecode: '0:00' },
  { id: 'ros-a1-3', act: 1, sequence: next(), type: 'number', numberLabel: '#2', title: 'First Frost', page: 3 },
  {
    id: 'ros-a1-4', act: 1, sequence: next(), type: 'cue', page: 5, location: 'SR',
    cueType: 'receive', trackId: 'track-2',
    body: "RECEIVE Oberon's cloak as he exits. Clear to USR X-OVER rail — he collects it himself before Scene 3.",
    assignedTo: 'Owen Brandt',
  },
  {
    id: 'ros-a1-5', act: 1, sequence: next(), type: 'cue', page: 10,
    location: 'X-OVER', locationDetail: 'or dressing room?',
    cueType: 'quick_change', trackId: 'track-1',
    offLookIds: ['look-101'], onLookIds: ['look-102'],
    reentryPage: 17, needsDecision: true,
    notes: 'Court gown DEAD after this change.',
    assignedTo: 'Sylvie Marchand',
  },
  { id: 'ros-a1-6', act: 1, sequence: next(), type: 'scene_change', numberLabel: '#2a', title: 'First Frost Transition', page: 12 },

  { id: 'ros-a1-7', act: 1, sequence: next(), type: 'scene', sceneNumber: 2, title: 'The Frozen Wood', pageStart: 13, pageEnd: 20 },
  { id: 'ros-a1-8', act: 1, sequence: next(), type: 'number', numberLabel: '#3', title: 'Ready for Winter', page: 14 },
  {
    id: 'ros-a1-9', act: 1, sequence: next(), type: 'cue', page: 16, location: 'SL',
    locationDetail: 'quick-change booth',
    cueType: 'quick_change', trackId: 'track-4',
    offLookIds: ['look-401'], onLookIds: ['look-402'],
    reentryPage: 19,
    notes: 'Child track — check which performer is on tonight before preset.',
    assignedTo: 'Nadia Rhee',
  },
  { id: 'ros-a1-10', act: 1, sequence: next(), type: 'scene_change', numberLabel: '#3a', title: 'Into the Wood', page: 20 },

  { id: 'ros-a1-11', act: 1, sequence: next(), type: 'scene', sceneNumber: 3, title: "Oberon's Hall", pageStart: 21, pageEnd: 30 },
  { id: 'ros-a1-12', act: 1, sequence: next(), type: 'number', numberLabel: '#4', title: 'Dear Winter', page: 23 },
  {
    id: 'ros-a1-13', act: 1, sequence: next(), type: 'cue', page: 25, location: 'SR',
    locationDetail: 'stair unit',
    cueType: 'quick_change', trackId: 'track-2',
    offLookIds: ['look-201'], onLookIds: ['look-202'],
    reentryPage: 28,
    assignedTo: 'Owen Brandt',
  },
  {
    id: 'ros-a1-14', act: 1, sequence: next(), type: 'cue', page: 25, location: 'SL',
    cueType: 'quick_change', trackId: 'track-3',
    offText: 'character shoes', onText: 'tap shoes',
    reentryPage: 27,
    assignedTo: 'Nadia Rhee',
  },
  {
    id: 'ros-a1-15', act: 1, sequence: next(), type: 'cue', page: 29, location: 'SR',
    cueType: 'clear',
    body: 'CLEAR character shoes from both wings (can also be done at interval).',
    assignedTo: 'Nadia Rhee',
  },
  { id: 'ros-a1-16', act: 1, sequence: next(), type: 'scene_change', numberLabel: '#4a', title: 'Dear Winter Transition', page: 30 },

  { id: 'ros-a1-17', act: 1, sequence: next(), type: 'scene', sceneNumber: 4, title: 'The Lantern Market', pageStart: 31, pageEnd: 40 },
  { id: 'ros-a1-18', act: 1, sequence: next(), type: 'number', numberLabel: '#5', title: 'What the Snow Knows', page: 33 },
  {
    id: 'ros-a1-19', act: 1, sequence: next(), type: 'cue', page: 35, location: 'X-OVER',
    cueType: 'quick_change', trackId: 'track-1',
    offLookIds: ['look-102'], onLookIds: ['look-103'],
    reentryPage: 38, isFast: true,
    notes: 'Hard change — stole pre-set open on the rail.',
    assignedTo: 'Sylvie Marchand',
  },
  {
    id: 'ros-a1-20', act: 1, sequence: next(), type: 'cue', page: 36, location: 'SL',
    cueType: 'quick_change', trackId: 'track-5',
    offLookIds: ['look-501'], onLookIds: ['look-502'],
    reentryPage: 39,
    assignedTo: 'Sylvie Marchand',
  },
  {
    id: 'ros-a1-21', act: 1, sequence: next(), type: 'cue', page: 36, location: 'SR',
    cueType: 'quick_change', trackId: 'track-6',
    offLookIds: ['look-601'], onLookIds: ['look-602'],
    reentryPage: 40,
    assignedTo: 'Owen Brandt',
  },
  { id: 'ros-a1-22', act: 1, sequence: next(), type: 'scene_change', numberLabel: '#5a', title: 'Market Transition', page: 40 },

  { id: 'ros-a1-23', act: 1, sequence: next(), type: 'scene', sceneNumber: 5, title: 'Midwinter Eve', pageStart: 41, pageEnd: 52 },
  { id: 'ros-a1-24', act: 1, sequence: next(), type: 'number', numberLabel: '#6', title: 'Hold the Light', page: 44 },
  {
    id: 'ros-a1-25', act: 1, sequence: next(), type: 'cue', page: 46, location: 'DRS RM',
    cueType: 'quick_change', trackId: 'track-4',
    offLookIds: ['look-402'], onLookIds: ['look-403'],
    reentryPage: 50,
    assignedTo: 'Nadia Rhee',
  },
  { id: 'ros-a1-26', act: 1, sequence: next(), type: 'number', numberLabel: '#7', title: 'Act One Finale', page: 50 },
  {
    id: 'ros-a1-27', act: 1, sequence: next(), type: 'cue', page: 50, location: 'X-OVER',
    cueType: 'standby',
    body: 'STANDBY for all Act One Finale changes — full company onstage to end of act.',
    assignedTo: 'Sylvie Marchand',
  },
]

const ACT_TWO: RunOfShowItem[] = [
  { id: 'ros-a2-1', act: 2, sequence: next(), type: 'scene', sceneNumber: 1, title: 'The Thaw Begins', pageStart: 53, pageEnd: 64 },
  { id: 'ros-a2-2', act: 2, sequence: next(), type: 'number', numberLabel: '#8', title: "Entr'acte", page: 53 },
  {
    id: 'ros-a2-3', act: 2, sequence: next(), type: 'cue', page: 55, location: 'SR',
    cueType: 'quick_change', trackId: 'track-1',
    offLookIds: ['look-103'], onLookIds: ['look-104'],
    reentryPage: 60,
    assignedTo: 'Sylvie Marchand',
  },
  {
    id: 'ros-a2-4', act: 2, sequence: next(), type: 'cue', page: 57, location: 'X-OVER',
    cueType: 'reset', trackId: 'track-1',
    body: 'RESET 103 winter whites to the X-OVER rail — needed again for the Finale.',
    assignedTo: 'Owen Brandt',
  },
  { id: 'ros-a2-5', act: 2, sequence: next(), type: 'scene_change', numberLabel: '#8a', title: 'Thaw Transition', page: 64 },

  { id: 'ros-a2-6', act: 2, sequence: next(), type: 'scene', sceneNumber: 2, title: 'The Reconciliation', pageStart: 65, pageEnd: 78 },
  { id: 'ros-a2-7', act: 2, sequence: next(), type: 'number', numberLabel: '#9', title: 'What You Kept', page: 68 },
  {
    id: 'ros-a2-8', act: 2, sequence: next(), type: 'cue', page: 70, location: 'SL',
    cueType: 'quick_change', trackId: 'track-2',
    offLookIds: ['look-203'], onLookIds: ['look-204'],
    reentryPage: 74, needsDecision: true,
    notes: 'Spring coat colour not locked — green or red tones?',
    assignedTo: 'Owen Brandt',
  },
  {
    id: 'ros-a2-9', act: 2, sequence: next(), type: 'cue', page: 72, location: 'DRS RM',
    cueType: 'quick_change', trackId: 'track-3',
    offLookIds: ['look-302'], onLookIds: ['look-303'],
    reentryPage: 77,
    assignedTo: 'Nadia Rhee',
  },
  { id: 'ros-a2-10', act: 2, sequence: next(), type: 'scene_change', numberLabel: '#9a', title: 'Homeward Transition', page: 78 },

  { id: 'ros-a2-11', act: 2, sequence: next(), type: 'scene', sceneNumber: 3, title: 'Return to Court', pageStart: 79, pageEnd: 90 },
  { id: 'ros-a2-12', act: 2, sequence: next(), type: 'number', numberLabel: '#10', title: 'Different This Spring', page: 84 },
  {
    id: 'ros-a2-13', act: 2, sequence: next(), type: 'cue', page: 86, location: 'SR',
    cueType: 'quick_change', trackId: 'track-4',
    onLookIds: ['look-403'],
    reentryPage: 87, isFast: true,
    notes: 'Coat only — straight back on.',
    assignedTo: 'Nadia Rhee',
  },
  { id: 'ros-a2-14', act: 2, sequence: next(), type: 'scene_change', numberLabel: '#10a', title: 'Court Transition', page: 90 },

  { id: 'ros-a2-15', act: 2, sequence: next(), type: 'scene', sceneNumber: 4, title: 'Finale', pageStart: 91, pageEnd: 98 },
  {
    id: 'ros-a2-16', act: 2, sequence: next(), type: 'cue', page: 92, location: 'X-OVER',
    cueType: 'quick_change', trackId: 'track-1',
    offLookIds: ['look-104'], onLookIds: ['look-103'],
    reentryPage: 95,
    notes: 'Back into winter whites for Bows.',
    assignedTo: 'Sylvie Marchand',
  },
  { id: 'ros-a2-17', act: 2, sequence: next(), type: 'number', numberLabel: '#11', title: 'Bows', page: 96 },
  { id: 'ros-a2-18', act: 2, sequence: next(), type: 'number', numberLabel: '#11a', title: 'Playoff', page: 98 },
  {
    id: 'ros-a2-19', act: 2, sequence: next(), type: 'cue', page: 98, location: 'DRS RM',
    cueType: 'note',
    body: 'Post-show: all looks to laundry except 103 winter whites (spot clean only).',
    assignedTo: 'Sylvie Marchand',
  },
]

export const RUNS_OF_SHOW: RunOfShow[] = [
  {
    id: 'ros-prod1',
    productionId: 'prod-1',
    department: 'wardrobe',
    title: 'Wardrobe Backstage Running List',
    createdBy: 'Koh Lauren Quan (ASM)',
    updatedAt: '2026-08-14T10:00:00Z',
    status: 'dress_run',
    crew: [
      { name: 'Sylvie Marchand', role: 'Head of Wardrobe', preshow: 'Check all quick-change booths are preset and lit.' },
      { name: 'Owen Brandt', role: 'Dresser', preshow: 'Preset SR rail: 202, 403, 602.' },
      { name: 'Nadia Rhee', role: 'Dresser', preshow: 'Preset SL booth: 402, 502. Confirm which Puck is on.' },
    ],
    items: [...ACT_ONE, ...ACT_TWO],
  },
]
