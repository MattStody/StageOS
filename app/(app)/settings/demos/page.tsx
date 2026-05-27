'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  type DemoConfig, type DemoScenario, type DemoExtraProduction,
  SCENARIO_LABELS, SCENARIO_DESCRIPTIONS, ACCENT_COLORS, NAV_COLORS,
  encodeDemo, DEMO_SESSION_KEY,
} from '@/lib/demo'
import { getScenarioData } from '@/lib/demoScenarios'
import { Copy, Check, Trash2, ExternalLink, Plus, Pencil } from 'lucide-react'

interface SavedDemo {
  id: string
  label: string
  config: DemoConfig
  createdAt: string
  url: string
}

const SAVED_DEMOS_KEY = 'stageops-saved-demos'

function HexColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  const prevValue = useRef(value)
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value
      setText(value)
    }
  }, [value])
  function handleText(raw: string) {
    setText(raw)
    const clean = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean)
  }
  return (
    <div className="flex items-center border border-stone-300 rounded overflow-hidden">
      <input
        type="color"
        value={value}
        onChange={(e) => { prevValue.current = e.target.value; onChange(e.target.value) }}
        className="w-9 h-9 cursor-pointer border-0 bg-transparent p-0.5 shrink-0"
      />
      <input
        type="text"
        value={text}
        onChange={(e) => handleText(e.target.value)}
        className="w-20 text-xs font-mono bg-transparent border-0 outline-none px-2 py-1"
        maxLength={7}
        spellCheck={false}
      />
    </div>
  )
}

export default function DemoCreatorPage() {
  const router = useRouter()
  const { isAdmin, isAuthLoading } = useAuth()

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, isAuthLoading, router])

  const [org, setOrg] = useState('')
  const [user, setUser] = useState('')
  const [title, setTitle] = useState('General Manager')
  const [scenario, setScenario] = useState<DemoScenario>('mixed')
  const [color, setColor] = useState(ACCENT_COLORS[0].value)
  const [navColor, setNavColor] = useState(NAV_COLORS[0].value)
  const [logoUrl, setLogoUrl] = useState('')
  const [userAvatarUrl, setUserAvatarUrl] = useState('')
  const [bgImageUrl, setBgImageUrl] = useState('')
  const [overrides, setOverrides] = useState<Record<string, { name: string; venue: string; subtitle: string; openingDate: string; closingDate: string }>>({})
  const [extraProductions, setExtraProductions] = useState<DemoExtraProduction[]>([])
  const [noBaseProductions, setNoBaseProductions] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedDemos, setSavedDemos] = useState<SavedDemo[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_DEMOS_KEY)
      if (stored) setSavedDemos(JSON.parse(stored))
    } catch {}
  }, [])

  const scenarioProductions = getScenarioData(scenario).productions

  const buildConfig = useCallback((): DemoConfig => {
    const prodOverrides = scenarioProductions
      .map((p) => {
        const ov = overrides[p.id]
        if (!ov) return null
        const entry: { id: string; name?: string; venue?: string; subtitle?: string; openingDate?: string; closingDate?: string } = { id: p.id }
        if (ov.name && ov.name !== p.name) entry.name = ov.name
        if (ov.venue && ov.venue !== p.venue) entry.venue = ov.venue
        if (ov.subtitle && ov.subtitle !== p.subtitle) entry.subtitle = ov.subtitle
        if (ov.openingDate && ov.openingDate !== p.openingDate) entry.openingDate = ov.openingDate
        if (ov.closingDate && ov.closingDate !== p.closingDate) entry.closingDate = ov.closingDate
        if (!entry.name && !entry.venue && !entry.subtitle && !entry.openingDate && !entry.closingDate) return null
        return entry
      })
      .filter(Boolean) as DemoConfig['overrides']

    return {
      v: 1,
      org: org || 'Demo Organization',
      user: user || 'Demo User',
      title,
      color,
      scenario,
      ...(navColor && navColor !== NAV_COLORS[0].value && { navColor }),
      ...(logoUrl.trim() && { logoUrl: logoUrl.trim() }),
      ...(userAvatarUrl.trim() && { userAvatarUrl: userAvatarUrl.trim() }),
      ...(bgImageUrl.trim() && { bgImageUrl: bgImageUrl.trim() }),
      ...(prodOverrides && prodOverrides.length > 0 && { overrides: prodOverrides }),
      ...(extraProductions.length > 0 && { extraProductions }),
      ...(noBaseProductions && { noBaseProductions: true }),
    }
  }, [org, user, title, color, navColor, logoUrl, userAvatarUrl, bgImageUrl, scenario, overrides, scenarioProductions, extraProductions, noBaseProductions])

  function generate() {
    const config = buildConfig()
    const token = encodeDemo(config)
    const url = `${window.location.origin}/demo/${token}`
    setGeneratedUrl(url)
  }

  async function copyUrl(url: string, id?: string) {
    await navigator.clipboard.writeText(url)
    if (id) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function loadDemoForEditing(demo: SavedDemo) {
    const c = demo.config
    setOrg(c.org === 'Demo Organization' ? '' : c.org)
    setUser(c.user === 'Demo User' ? '' : c.user)
    setTitle(c.title)
    setScenario(c.scenario)
    setColor(c.color)
    setNavColor(c.navColor ?? NAV_COLORS[0].value)
    setLogoUrl(c.logoUrl ?? '')
    setUserAvatarUrl(c.userAvatarUrl ?? '')
    setBgImageUrl(c.bgImageUrl ?? '')
    const ovRecord: Record<string, { name: string; venue: string; subtitle: string; openingDate: string; closingDate: string }> = {}
    for (const ov of c.overrides ?? []) {
      ovRecord[ov.id] = {
        name: ov.name ?? '',
        venue: ov.venue ?? '',
        subtitle: ov.subtitle ?? '',
        openingDate: ov.openingDate ?? '',
        closingDate: ov.closingDate ?? '',
      }
    }
    setOverrides(ovRecord)
    setExtraProductions(c.extraProductions ?? [])
    setNoBaseProductions(c.noBaseProductions ?? false)
    setGeneratedUrl(demo.url)
    setEditingId(demo.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function saveDemo() {
    if (!generatedUrl) return
    const config = buildConfig()
    const token = encodeDemo(config)
    const url = `${window.location.origin}/demo/${token}`
    let updated: SavedDemo[]
    if (editingId) {
      updated = savedDemos.map((d) =>
        d.id === editingId ? { ...d, label: org || 'Demo', config, url } : d
      )
      setEditingId(null)
    } else {
      updated = [{ id: Date.now().toString(), label: org || 'Demo', config, createdAt: new Date().toISOString(), url }, ...savedDemos]
    }
    setSavedDemos(updated)
    setGeneratedUrl(url)
    try {
      localStorage.setItem(SAVED_DEMOS_KEY, JSON.stringify(updated))
    } catch {}
  }

  function cancelEdit() {
    setEditingId(null)
    setOrg('')
    setUser('')
    setTitle('General Manager')
    setScenario('mixed')
    setColor(ACCENT_COLORS[0].value)
    setNavColor(NAV_COLORS[0].value)
    setLogoUrl('')
    setUserAvatarUrl('')
    setBgImageUrl('')
    setOverrides({})
    setExtraProductions([])
    setNoBaseProductions(false)
    setGeneratedUrl('')
  }

  function deleteDemo(id: string) {
    const updated = savedDemos.filter((d) => d.id !== id)
    setSavedDemos(updated)
    try {
      localStorage.setItem(SAVED_DEMOS_KEY, JSON.stringify(updated))
    } catch {}
  }

  function updateOverride(prodId: string, field: 'name' | 'venue' | 'subtitle' | 'openingDate' | 'closingDate', value: string) {
    setOverrides((prev) => {
      const existing = prev[prodId] ?? { name: '', venue: '', subtitle: '', openingDate: '', closingDate: '' }
      return { ...prev, [prodId]: { ...existing, [field]: value } }
    })
  }

  if (isAuthLoading) return null

  return (
    <div>
      <PageHeader
        title={editingId ? 'Editing Demo' : 'Demo Creator'}
        subtitle={editingId ? `Editing "${org || 'Demo'}" — changes will update the saved link` : 'Generate custom, shareable demo links for prospects'}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="xl:col-span-2 space-y-5">
          {/* Organization */}
          <Card>
            <CardHeader><CardTitle>Prospect Details</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Organization Name
                  </label>
                  <input
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="e.g. Roundabout Theater Co."
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Contact Name
                  </label>
                  <input
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                  Contact Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. General Manager"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                  Contact Avatar URL <span className="normal-case text-stone-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    value={userAvatarUrl}
                    onChange={(e) => setUserAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                  />
                  {userAvatarUrl.trim() && (
                    <img
                      src={userAvatarUrl}
                      alt="Avatar preview"
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-stone-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Scenario */}
          <Card>
            <CardHeader><CardTitle>Data Scenario</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(SCENARIO_LABELS) as DemoScenario[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setScenario(s); setOverrides({}) }}
                    className={`text-left p-3 rounded border transition-colors ${
                      scenario === s
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-stone-900 mb-0.5">{SCENARIO_LABELS[s]}</p>
                    <p className="text-xs text-stone-500 leading-snug">{SCENARIO_DESCRIPTIONS[s]}</p>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div
                  onClick={() => setNoBaseProductions((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${noBaseProductions ? 'bg-stone-900' : 'bg-stone-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${noBaseProductions ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-stone-700">Hide the 3 default productions — use only my custom ones</span>
              </label>
            </CardBody>
          </Card>

          {/* Accent Color */}
          <Card>
            <CardHeader><CardTitle>Accent Color</CardTitle></CardHeader>
            <CardBody>
              <div className="flex gap-3 flex-wrap">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className="w-9 h-9 rounded-full transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: c.value }}
                  >
                    {color === c.value && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-white opacity-90" />
                      </span>
                    )}
                  </button>
                ))}
                <HexColorInput value={color} onChange={setColor} />
              </div>
            </CardBody>
          </Card>

          {/* Nav Color */}
          <Card>
            <CardHeader><CardTitle>Navigation Color</CardTitle></CardHeader>
            <CardBody>
              <div className="flex gap-3 flex-wrap items-center">
                {NAV_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNavColor(c.value)}
                    title={c.label}
                    className="w-9 h-9 rounded transition-transform hover:scale-110 relative border-2"
                    style={{
                      backgroundColor: c.value,
                      borderColor: navColor === c.value ? '#e7e5e4' : 'transparent',
                    }}
                  >
                    {navColor === c.value && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-white opacity-80" />
                      </span>
                    )}
                  </button>
                ))}
                <HexColorInput value={navColor} onChange={setNavColor} />
                <div
                  className="ml-auto flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: navColor }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  Preview
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Logo</CardTitle>
              <span className="text-xs text-stone-400">Optional — replaces &quot;StageOps&quot; text in the sidebar</span>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                  Logo URL
                </label>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
                <p className="text-xs text-stone-400 mt-1.5">Use a publicly accessible PNG, SVG, or WebP. Works best on dark backgrounds (white or light-coloured logo).</p>
              </div>
              {logoUrl.trim() && (
                <div
                  className="flex items-center gap-3 p-3 rounded"
                  style={{ backgroundColor: navColor }}
                >
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-8 max-w-[140px] object-contain object-left"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-xs text-white/50">Sidebar preview</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                  Login Page Background Image <span className="normal-case text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  placeholder="https://example.com/theatre-bg.jpg"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
                <p className="text-xs text-stone-400 mt-1.5">Fills the left half of the demo login page. If blank, the navigation colour is used instead.</p>
              </div>
              {bgImageUrl.trim() && (
                <div
                  className="h-24 rounded overflow-hidden border border-stone-200"
                  style={{ backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
              )}
            </CardBody>
          </Card>

          {/* Production overrides */}
          {!noBaseProductions && <Card>
            <CardHeader>
              <CardTitle>Production Name Overrides</CardTitle>
              <span className="text-xs text-stone-400">Optional — leave blank to use default names</span>
            </CardHeader>
            <CardBody className="space-y-5">
              {scenarioProductions.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <p className="text-xs font-medium text-stone-600 uppercase tracking-wider">{p.name}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={overrides[p.id]?.name ?? ''}
                        onChange={(e) => updateOverride(p.id, 'name', e.target.value)}
                        placeholder={`Title (default: "${p.name}")`}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                      />
                      <input
                        value={overrides[p.id]?.subtitle ?? ''}
                        onChange={(e) => updateOverride(p.id, 'subtitle', e.target.value)}
                        placeholder={`Subtitle (default: "${p.subtitle}")`}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                      />
                    </div>
                    <input
                      value={overrides[p.id]?.venue ?? ''}
                      onChange={(e) => updateOverride(p.id, 'venue', e.target.value)}
                      placeholder={`Venue (default: "${p.venue}")`}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Opening date (default: {p.openingDate})</label>
                        <input
                          type="date"
                          value={overrides[p.id]?.openingDate ?? ''}
                          onChange={(e) => updateOverride(p.id, 'openingDate', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Closing date (default: {p.closingDate})</label>
                        <input
                          type="date"
                          value={overrides[p.id]?.closingDate ?? ''}
                          onChange={(e) => updateOverride(p.id, 'closingDate', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>}

          {/* Additional productions */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Productions</CardTitle>
              <span className="text-xs text-stone-400">Add productions beyond the scenario&apos;s defaults</span>
            </CardHeader>
            <CardBody className="space-y-4">
              {extraProductions.map((ep, i) => (
                <div key={i} className="border border-stone-200 rounded p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HexColorInput
                        value={ep.color}
                        onChange={(v) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, color: v } : x))}
                      />
                      <span className="text-xs text-stone-500 font-medium">Production {i + 1}</span>
                    </div>
                    <button
                      onClick={() => setExtraProductions((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={ep.name}
                      onChange={(e) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Production title *"
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                    />
                    <input
                      value={ep.subtitle}
                      onChange={(e) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, subtitle: e.target.value } : x))}
                      placeholder="Subtitle"
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                    />
                  </div>
                  <input
                    value={ep.venue}
                    onChange={(e) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, venue: e.target.value } : x))}
                    placeholder="Venue"
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Opening date</label>
                      <input
                        type="date"
                        value={ep.openingDate}
                        onChange={(e) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, openingDate: e.target.value } : x))}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Closing date</label>
                      <input
                        type="date"
                        value={ep.closingDate}
                        onChange={(e) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, closingDate: e.target.value } : x))}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Status</label>
                      <select
                        value={ep.status}
                        onChange={(e) => setExtraProductions((prev) => prev.map((x, j) => j === i ? { ...x, status: e.target.value as DemoExtraProduction['status'] } : x))}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500 bg-white"
                      >
                        <option value="pre_production">Pre-Production</option>
                        <option value="in_rehearsal">In Rehearsal</option>
                        <option value="in_performance">In Performance</option>
                        <option value="closing">Closing</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setExtraProductions((prev) => [...prev, {
                  name: '', subtitle: '', venue: '',
                  status: 'pre_production',
                  openingDate: '', closingDate: '',
                  color: ACCENT_COLORS[extraProductions.length % ACCENT_COLORS.length].value,
                }])}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-500 border border-dashed border-stone-300 rounded hover:border-stone-400 hover:text-stone-700 transition-colors w-full justify-center"
              >
                <Plus size={14} />
                Add Production
              </button>
            </CardBody>
          </Card>

          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <Button onClick={generate}>{editingId ? 'Regenerate Link' : 'Generate Demo Link'}</Button>
              {generatedUrl && (
                <Button onClick={saveDemo}>{editingId ? 'Save Changes' : 'Save Demo'}</Button>
              )}
              {editingId && (
                <Button variant="ghost" onClick={cancelEdit}>Cancel Edit</Button>
              )}
            </div>
            {generatedUrl && (
              <div className="p-3 bg-stone-100 rounded border border-stone-200 flex items-center gap-3">
                <p className="text-xs font-mono text-stone-600 flex-1 break-all leading-relaxed">{generatedUrl}</p>
                <button
                  onClick={() => copyUrl(generatedUrl)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs rounded hover:bg-stone-800 transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: output + saved demos */}
        <div className="space-y-5">
          {/* Generated link */}
          {generatedUrl ? (
            <Card>
              <CardHeader><CardTitle>Demo Link</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                <div className="p-3 bg-stone-100 rounded border border-stone-200 break-all">
                  <p className="text-xs text-stone-600 font-mono leading-relaxed">{generatedUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyUrl(generatedUrl)}
                    className="flex items-center gap-2 flex-1 justify-center px-3 py-2 bg-stone-900 text-white text-sm rounded hover:bg-stone-800 transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Preview
                  </a>
                </div>
                <div
                  className="flex items-center gap-2 p-2.5 rounded text-xs"
                  style={{ backgroundColor: `${color}11`, color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  Scenario: {SCENARIO_LABELS[scenario]}
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="py-8 text-center">
                  <p className="text-sm text-stone-400">Fill in the form and click</p>
                  <p className="text-sm font-medium text-stone-600 mt-1">"Generate Demo Link"</p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Saved demos */}
          {savedDemos.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Saved Demos</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-stone-100">
                  {savedDemos.map((demo) => (
                    <div
                      key={demo.id}
                      className={`flex items-center justify-between px-5 py-3 gap-3 ${editingId === demo.id ? 'bg-stone-50' : ''}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: demo.config.color }}
                          />
                          <p className="text-sm font-medium text-stone-800 truncate">{demo.label}</p>
                          {editingId === demo.id && (
                            <span className="text-xs text-stone-400 italic">editing</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {SCENARIO_LABELS[demo.config.scenario]} · {new Date(demo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => loadDemoForEditing(demo)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => copyUrl(demo.url, demo.id)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                          title="Copy link"
                        >
                          {copiedId === demo.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                        <a
                          href={demo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                          title="Preview"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => deleteDemo(demo.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
