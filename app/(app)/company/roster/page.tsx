'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useAccess } from '@/lib/useAccess'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, formatDate } from '@/lib/utils'
import {
  UNION_LABELS, UNION_BADGE, ROLE_BADGE, initials, avatarColor,
} from '@/lib/company'
import {
  Search, Plus, X, Mail, Shield, Briefcase,
  FileText, Ruler, Heart, Pencil, Save, ExternalLink,
} from 'lucide-react'
import type { Person, PersonRoleType, UnionAffiliation, PersonDocument } from '@/lib/types'

const ROLE_TYPES: PersonRoleType[] = ['Principal', 'Ensemble', 'Creative', 'Production Staff', 'Vendor', 'Crew']
const UNIONS: UnionAffiliation[] = ['CAEA', 'ACTRA', 'AFM', 'IATSE', 'CUPE', 'Non-union', 'Other']

function blankPerson(): Omit<Person, 'id'> {
  return {
    name: '', pronouns: '', roleType: 'Principal', email: '', phone: '',
    unionAffiliation: 'CAEA', unionMemberNumber: '', city: '', province: '',
    measurements: { lastUpdated: new Date().toISOString().slice(0, 10) },
    productionHistory: [], documents: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

function Avatar({ person, size = 36 }: { person: Person; size?: number }) {
  if (person.headshotUrl) {
    return (
      <img
        src={person.headshotUrl}
        alt={person.name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(person.id), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(person.name)}
    </span>
  )
}

export default function RosterPage() {
  const { people, productions, addPerson, updatePerson, deletePerson } = useStore()
  const { canEdit } = useAccess()

  const [query, setQuery] = useState('')
  const [unionFilter, setUnionFilter] = useState<UnionAffiliation | 'all'>('all')
  const [roleFilter, setRoleFilter] = useState<PersonRoleType | 'all'>('all')
  const [prodFilter, setProdFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<Person | null>(null)
  const [previewDoc, setPreviewDoc] = useState<PersonDocument | null>(null)

  // Add person flow
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<Omit<Person, 'id'>>(blankPerson())
  const [dupWarning, setDupWarning] = useState<Person | null>(null)

  const open = people.find((p) => p.id === openId) ?? null

  const filtered = useMemo(() => people.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.email.toLowerCase().includes(query.toLowerCase())) return false
    if (unionFilter !== 'all' && p.unionAffiliation !== unionFilter) return false
    if (roleFilter !== 'all' && p.roleType !== roleFilter) return false
    if (prodFilter !== 'all' && !p.productionHistory.some((c) => c.productionId === prodFilter)) return false
    return true
  }), [people, query, unionFilter, roleFilter, prodFilter])

  function openProfile(id: string) {
    setOpenId(id)
    setEditing(false)
    setEditDraft(null)
  }

  function startEdit() {
    if (!open) return
    setEditDraft({ ...open, measurements: { lastUpdated: open.measurements?.lastUpdated ?? new Date().toISOString().slice(0, 10), ...open.measurements }, emergencyContact: open.emergencyContact ? { ...open.emergencyContact } : undefined })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditDraft(null)
  }

  function saveEdit() {
    if (!editDraft) return
    updatePerson({ ...editDraft, updatedAt: new Date().toISOString() })
    setEditing(false)
    setEditDraft(null)
  }

  function patchDraft(patch: Partial<Person>) {
    setEditDraft((d) => d ? { ...d, ...patch } : d)
  }

  function checkDuplicate(name: string) {
    const match = people.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())
    setDupWarning(match ?? null)
  }

  function saveNew() {
    if (!form.name.trim() || !form.email.trim()) return
    addPerson({ ...form, id: `person-${Date.now()}` })
    setAddOpen(false)
  }

  const draft = editDraft

  return (
    <div>
      <PageHeader
        title="Company Roster"
        subtitle="Every artist, creative, and crew member — their history follows them across every show"
        actions={canEdit ? <Button onClick={() => { setForm(blankPerson()); setDupWarning(null); setAddOpen(true) }} size="sm"><Plus size={13} /> Add Person</Button> : undefined}
      />

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-400"
          />
        </div>
        <select value={unionFilter} onChange={(e) => setUnionFilter(e.target.value as UnionAffiliation | 'all')} className="border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-stone-400">
          <option value="all">All unions</option>
          {UNIONS.map((u) => <option key={u} value={u}>{UNION_LABELS[u]}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as PersonRoleType | 'all')} className="border border-stone-200 rounded px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-stone-400">
          <option value="all">All roles</option>
          {ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Production filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setProdFilter('all')} className={cn('px-3 py-1.5 rounded text-xs transition-colors', prodFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400')}>
          All Productions
        </button>
        {productions.map((p) => (
          <button key={p.id} onClick={() => setProdFilter(p.id)} className={cn('px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5', prodFilter === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400')}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={cn(open && 'lg:pr-[416px] transition-all')}>
        <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Person</th>
                <th className="text-left px-4 py-2.5">Role</th>
                <th className="text-left px-4 py-2.5">Union</th>
                <th className="text-left px-4 py-2.5">Location</th>
                <th className="text-left px-4 py-2.5">Shows</th>
                <th className="text-right px-4 py-2.5">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => openProfile(p.id)} className={cn('border-b border-stone-50 last:border-b-0 hover:bg-stone-50/70 cursor-pointer transition-colors', openId === p.id && 'bg-indigo-50/40')}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar person={p} size={32} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                        {p.pronouns && <p className="text-[11px] text-stone-400">{p.pronouns}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', ROLE_BADGE[p.roleType])}>{p.roleType}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', UNION_BADGE[p.unionAffiliation])}>{UNION_LABELS[p.unionAffiliation]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-stone-500">{p.city ? `${p.city}, ${p.province ?? ''}`.replace(/, $/, '') : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-stone-500">{p.productionHistory.length}</td>
                  <td className="px-4 py-2.5 text-right"><span className="text-xs text-stone-400">{p.email}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-sm">No people match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile drawer */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white border-l border-stone-200 shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 shrink-0">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {editing ? 'Edit Profile' : 'Profile'}
            </span>
            <div className="flex items-center gap-2">
              {!editing && canEdit && (
                <button onClick={startEdit} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded px-2 py-1 transition-colors">
                  <Pencil size={11} /> Edit
                </button>
              )}
              {editing && (
                <>
                  <button onClick={cancelEdit} className="text-xs text-stone-400 hover:text-stone-700 border border-stone-200 rounded px-2 py-1">Cancel</button>
                  <button onClick={saveEdit} className="flex items-center gap-1 text-xs text-white bg-stone-800 hover:bg-stone-900 rounded px-2 py-1 transition-colors">
                    <Save size={11} /> Save
                  </button>
                </>
              )}
              {!editing && canEdit && (
                <button onClick={() => { deletePerson(open.id); setOpenId(null) }} className="text-[11px] text-stone-400 hover:text-red-500 cursor-pointer">Delete</button>
              )}
              <button onClick={() => { setOpenId(null); setEditing(false) }} className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {editing && draft ? (
              /* ── Edit form ── */
              <div className="space-y-5">
                {/* Identity */}
                <FieldGroup title="Identity">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name" required>
                      <input className={inputCls} value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} />
                    </Field>
                    <Field label="Pronouns">
                      <input className={inputCls} value={draft.pronouns ?? ''} onChange={(e) => patchDraft({ pronouns: e.target.value })} />
                    </Field>
                    <Field label="Role type">
                      <select className={inputCls} value={draft.roleType} onChange={(e) => patchDraft({ roleType: e.target.value as PersonRoleType })}>
                        {ROLE_TYPES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Union">
                      <select className={inputCls} value={draft.unionAffiliation} onChange={(e) => patchDraft({ unionAffiliation: e.target.value as UnionAffiliation })}>
                        {UNIONS.map((u) => <option key={u} value={u}>{UNION_LABELS[u]}</option>)}
                      </select>
                    </Field>
                    <Field label="Member #">
                      <input className={inputCls} value={draft.unionMemberNumber ?? ''} onChange={(e) => patchDraft({ unionMemberNumber: e.target.value })} />
                    </Field>
                  </div>
                </FieldGroup>

                {/* Contact */}
                <FieldGroup title="Contact">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" required>
                      <input type="email" className={inputCls} value={draft.email} onChange={(e) => patchDraft({ email: e.target.value })} />
                    </Field>
                    <Field label="Phone">
                      <input className={inputCls} value={draft.phone ?? ''} onChange={(e) => patchDraft({ phone: e.target.value })} />
                    </Field>
                    <Field label="City">
                      <input className={inputCls} value={draft.city ?? ''} onChange={(e) => patchDraft({ city: e.target.value })} />
                    </Field>
                    <Field label="Province">
                      <input className={inputCls} value={draft.province ?? ''} onChange={(e) => patchDraft({ province: e.target.value })} />
                    </Field>
                  </div>
                </FieldGroup>

                {/* Agent */}
                <FieldGroup title="Agent / Representative">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Agency name">
                      <input className={inputCls} value={draft.agentName ?? ''} onChange={(e) => patchDraft({ agentName: e.target.value })} />
                    </Field>
                    <Field label="Agent email">
                      <input type="email" className={inputCls} value={draft.agentEmail ?? ''} onChange={(e) => patchDraft({ agentEmail: e.target.value })} />
                    </Field>
                    <Field label="Agent phone">
                      <input className={inputCls} value={draft.agentPhone ?? ''} onChange={(e) => patchDraft({ agentPhone: e.target.value })} />
                    </Field>
                  </div>
                </FieldGroup>

                {/* Emergency contact */}
                <FieldGroup title="Emergency Contact">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name">
                      <input className={inputCls} value={draft.emergencyContact?.name ?? ''} onChange={(e) => patchDraft({ emergencyContact: { ...draft.emergencyContact, name: e.target.value, phone: draft.emergencyContact?.phone ?? '', relationship: draft.emergencyContact?.relationship ?? '' } })} />
                    </Field>
                    <Field label="Relationship">
                      <input className={inputCls} value={draft.emergencyContact?.relationship ?? ''} onChange={(e) => patchDraft({ emergencyContact: { ...draft.emergencyContact, name: draft.emergencyContact?.name ?? '', phone: draft.emergencyContact?.phone ?? '', relationship: e.target.value } })} />
                    </Field>
                    <Field label="Phone">
                      <input className={inputCls} value={draft.emergencyContact?.phone ?? ''} onChange={(e) => patchDraft({ emergencyContact: { ...draft.emergencyContact, name: draft.emergencyContact?.name ?? '', relationship: draft.emergencyContact?.relationship ?? '', phone: e.target.value } })} />
                    </Field>
                  </div>
                </FieldGroup>

                {/* Dietary & Accessibility */}
                <FieldGroup title="Dietary & Accessibility">
                  <div className="space-y-3">
                    <Field label="Dietary restrictions">
                      <input className={inputCls} value={draft.dietaryRestrictions ?? ''} onChange={(e) => patchDraft({ dietaryRestrictions: e.target.value })} />
                    </Field>
                    <Field label="Accessibility needs">
                      <input className={inputCls} value={draft.accessibilityNeeds ?? ''} onChange={(e) => patchDraft({ accessibilityNeeds: e.target.value })} />
                    </Field>
                  </div>
                </FieldGroup>

                {/* Measurements */}
                <FieldGroup title="Measurements">
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ['Height', 'height'], ['Weight', 'weight'], ['Chest', 'chest'],
                      ['Waist', 'waist'], ['Hips', 'hips'], ['Inseam', 'inseam'],
                      ['Dress/Suit', 'dressSuitSize'], ['Shoe', 'shoeSize'], ['Hat', 'hatSize'],
                    ] as [string, string][]).map(([label, key]) => (
                      <Field key={key} label={label}>
                        <input
                          className={inputCls}
                          value={(draft.measurements as unknown as Record<string, string | undefined>)[key] ?? ''}
                          onChange={(e) => patchDraft({ measurements: { lastUpdated: draft.measurements?.lastUpdated ?? new Date().toISOString().slice(0, 10), ...draft.measurements, [key]: e.target.value } })}
                        />
                      </Field>
                    ))}
                    <div className="col-span-3">
                      <Field label="Notes">
                        <input className={inputCls} value={draft.measurements?.notes ?? ''} onChange={(e) => patchDraft({ measurements: { lastUpdated: draft.measurements?.lastUpdated ?? new Date().toISOString().slice(0, 10), ...draft.measurements, notes: e.target.value } })} />
                      </Field>
                    </div>
                  </div>
                </FieldGroup>
              </div>
            ) : (
              /* ── Read-only view ── */
              <>
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar person={open} size={52} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-stone-900 leading-tight truncate">{open.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {open.pronouns && <span className="text-[11px] text-stone-400">{open.pronouns}</span>}
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', ROLE_BADGE[open.roleType])}>{open.roleType}</span>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', UNION_BADGE[open.unionAffiliation])}>{UNION_LABELS[open.unionAffiliation]}</span>
                    </div>
                  </div>
                </div>

                <Section icon={Mail} title="Contact">
                  <Row label="Email" value={open.email} />
                  <Row label="Phone" value={open.phone} />
                  <Row label="Location" value={open.city ? `${open.city}, ${open.province ?? ''}`.replace(/, $/, '') : undefined} />
                  {open.emergencyContact && (
                    <Row label="Emergency" value={`${open.emergencyContact.name} · ${open.emergencyContact.phone} (${open.emergencyContact.relationship})`} />
                  )}
                </Section>

                <Section icon={Shield} title="Union & Representation">
                  <Row label="Affiliation" value={UNION_LABELS[open.unionAffiliation]} />
                  <Row label="Member #" value={open.unionMemberNumber} />
                  <Row label="Agent" value={open.agentName} />
                  <Row label="Agent email" value={open.agentEmail} />
                </Section>

                <Section icon={Briefcase} title={`Production History (${open.productionHistory.length})`}>
                  {open.productionHistory.length === 0 ? (
                    <p className="text-xs text-stone-400">No credits yet</p>
                  ) : (
                    <div className="space-y-2">
                      {open.productionHistory.map((c, i) => {
                        const prod = productions.find((p) => p.id === c.productionId)
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded border border-stone-100 bg-stone-50/50">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: prod?.color ?? '#a8a29e' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-stone-800">{c.productionName}</p>
                              <p className="text-[11px] text-stone-500">{c.role}</p>
                              <p className="text-[10px] text-stone-400">{formatDate(c.startDate)}{c.endDate ? ` – ${formatDate(c.endDate)}` : ''}</p>
                            </div>
                            {c.fee != null && <span className="text-[11px] text-stone-600 font-medium shrink-0">{fmt(c.fee)}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Section>

                {open.measurements && (open.measurements.height || open.measurements.chest) && (
                  <Section icon={Ruler} title="Measurements">
                    <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                      {([['Height', open.measurements.height], ['Weight', open.measurements.weight], ['Chest', open.measurements.chest], ['Waist', open.measurements.waist], ['Hips', open.measurements.hips], ['Inseam', open.measurements.inseam], ['Dress/Suit', open.measurements.dressSuitSize], ['Shoe', open.measurements.shoeSize], ['Hat', open.measurements.hatSize]] as [string, string | undefined][]).filter(([, v]) => v).map(([label, v]) => (
                        <div key={label}>
                          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</p>
                          <p className="text-xs text-stone-700">{v}</p>
                        </div>
                      ))}
                    </div>
                    {open.measurements.lastUpdated && (
                      <p className="text-[10px] text-stone-400 mt-2">Last updated {open.measurements.lastUpdated}</p>
                    )}
                  </Section>
                )}

                {(open.dietaryRestrictions || open.accessibilityNeeds) && (
                  <Section icon={Heart} title="Dietary & Accessibility">
                    <Row label="Dietary" value={open.dietaryRestrictions} />
                    <Row label="Accessibility" value={open.accessibilityNeeds} />
                  </Section>
                )}

                <Section icon={FileText} title={`Documents (${open.documents.length})`}>
                  {open.documents.length === 0 ? (
                    <p className="text-xs text-stone-400">No documents on file</p>
                  ) : (
                    <div className="space-y-1.5">
                      {open.documents.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setPreviewDoc(d)}
                          className="w-full flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-50 px-2 py-1.5 rounded-md transition-colors group"
                        >
                          <FileText size={13} className="text-stone-400 group-hover:text-stone-600 shrink-0" />
                          <span className="flex-1 text-left truncate">{d.name}</span>
                          <span className="text-[10px] text-stone-400 uppercase shrink-0">{d.type}</span>
                          <ExternalLink size={11} className="text-stone-300 group-hover:text-stone-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        </div>
      )}

      {/* Document preview modal */}
      {previewDoc && (
        <Modal open onClose={() => setPreviewDoc(null)} title={previewDoc.name} className="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">Type</p><p className="text-stone-700 uppercase font-medium">{previewDoc.type}</p></div>
              <div><p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">Category</p><p className="text-stone-700 capitalize">{previewDoc.category.replace('_', ' ')}</p></div>
              <div><p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">Size</p><p className="text-stone-700">{previewDoc.size}</p></div>
              <div className="col-span-3"><p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">Uploaded</p><p className="text-stone-700">{formatDate(previewDoc.uploadedAt)}</p></div>
            </div>
            {previewDoc.url ? (
              ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewDoc.type.toLowerCase()) ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="w-full rounded-lg border border-stone-200 object-contain max-h-[60vh]" />
              ) : (
                <iframe src={previewDoc.url} title={previewDoc.name} className="w-full h-[60vh] rounded-lg border border-stone-200" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-stone-200 text-stone-400 gap-2">
                <FileText size={28} className="text-stone-300" />
                <p className="text-sm">No preview available</p>
                <p className="text-xs">File stored externally — no URL on record</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add Person modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Person" className="max-w-lg">
        <div className="space-y-3">
          {dupWarning && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <span><strong>{dupWarning.name}</strong> already exists. Check before creating a duplicate.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" required>
              <input className={inputCls} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); checkDuplicate(e.target.value) }} />
            </Field>
            <Field label="Pronouns">
              <input className={inputCls} value={form.pronouns} onChange={(e) => setForm({ ...form, pronouns: e.target.value })} />
            </Field>
            <Field label="Email" required>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Role type">
              <select className={inputCls} value={form.roleType} onChange={(e) => setForm({ ...form, roleType: e.target.value as PersonRoleType })}>
                {ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Union">
              <select className={inputCls} value={form.unionAffiliation} onChange={(e) => setForm({ ...form, unionAffiliation: e.target.value as UnionAffiliation })}>
                {UNIONS.map((u) => <option key={u} value={u}>{UNION_LABELS[u]}</option>)}
              </select>
            </Field>
            <Field label="Member #">
              <input className={inputCls} value={form.unionMemberNumber} onChange={(e) => setForm({ ...form, unionMemberNumber: e.target.value })} />
            </Field>
            <Field label="City">
              <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Province">
              <input className={inputCls} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveNew} disabled={!form.name.trim() || !form.email.trim()}>Add to Roster</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Small components ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-stone-400" />
        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-0.5">
      <span className="text-[11px] text-stone-400 w-24 shrink-0">{label}</span>
      <span className="text-xs text-stone-700 flex-1">{value}</span>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-stone-600 uppercase tracking-wider mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 bg-white'
