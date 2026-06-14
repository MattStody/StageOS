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
  Search, Plus, X, Mail, Phone, MapPin, Shield, Briefcase, AlertTriangle,
  User, FileText, Ruler, Heart, Users as UsersIcon,
} from 'lucide-react'
import type { Person, PersonRoleType, UnionAffiliation } from '@/lib/types'

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

  function openAdd() {
    setForm(blankPerson())
    setDupWarning(null)
    setAddOpen(true)
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

  return (
    <div>
      <PageHeader
        title="Company Roster"
        subtitle="Every artist, creative, and crew member — their history follows them across every show"
        actions={canEdit ? <Button onClick={openAdd} size="sm"><Plus size={13} /> Add Person</Button> : undefined}
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
        <button
          onClick={() => setProdFilter('all')}
          className={cn('px-3 py-1.5 rounded text-xs transition-colors', prodFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400')}
        >
          All Productions
        </button>
        {productions.map((p) => (
          <button
            key={p.id}
            onClick={() => setProdFilter(p.id)}
            className={cn('px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5', prodFilter === p.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400')}
          >
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
                <tr
                  key={p.id}
                  onClick={() => setOpenId(p.id)}
                  className={cn('border-b border-stone-50 last:border-b-0 hover:bg-stone-50/70 cursor-pointer transition-colors', openId === p.id && 'bg-indigo-50/40')}
                >
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
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-xs text-stone-400">{p.email}</span>
                  </td>
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
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] bg-white border-l border-stone-200 shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Profile</span>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button onClick={() => { deletePerson(open.id); setOpenId(null) }} className="text-[11px] text-stone-400 hover:text-red-500 cursor-pointer">Delete</button>
              )}
              <button onClick={() => setOpenId(null)} className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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

            {/* Contact */}
            <Section icon={Mail} title="Contact">
              <Row label="Email" value={open.email} />
              <Row label="Phone" value={open.phone} />
              <Row label="Location" value={open.city ? `${open.city}, ${open.province ?? ''}`.replace(/, $/, '') : undefined} />
              {open.emergencyContact && (
                <Row label="Emergency" value={`${open.emergencyContact.name} · ${open.emergencyContact.phone} (${open.emergencyContact.relationship})`} />
              )}
            </Section>

            {/* Union & rep */}
            <Section icon={Shield} title="Union & Representation">
              <Row label="Affiliation" value={UNION_LABELS[open.unionAffiliation]} />
              <Row label="Member #" value={open.unionMemberNumber} />
              <Row label="Agent" value={open.agentName} />
              <Row label="Agent email" value={open.agentEmail} />
            </Section>

            {/* Production history */}
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

            {/* Measurements */}
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
                <p className="text-[10px] text-stone-400 mt-2">Saved to profile · last updated {open.measurements.lastUpdated}</p>
              </Section>
            )}

            {/* Needs */}
            {(open.dietaryRestrictions || open.accessibilityNeeds) && (
              <Section icon={Heart} title="Dietary & Accessibility">
                <Row label="Dietary" value={open.dietaryRestrictions} />
                <Row label="Accessibility" value={open.accessibilityNeeds} />
              </Section>
            )}

            {/* Documents */}
            <Section icon={FileText} title={`Documents (${open.documents.length})`}>
              {open.documents.length === 0 ? (
                <p className="text-xs text-stone-400">No documents on file</p>
              ) : (
                <div className="space-y-1">
                  {open.documents.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-xs text-stone-600">
                      <FileText size={11} className="text-stone-400" />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="text-[10px] text-stone-400 uppercase">{d.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* Add Person modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Person" className="max-w-lg">
        <div className="space-y-3">
          {dupWarning && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span><strong>{dupWarning.name}</strong> already exists in the roster ({UNION_LABELS[dupWarning.unionAffiliation]}). Check before creating a duplicate.</span>
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
