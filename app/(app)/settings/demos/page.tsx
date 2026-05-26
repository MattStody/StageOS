'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  type DemoConfig, type DemoScenario,
  SCENARIO_LABELS, SCENARIO_DESCRIPTIONS, ACCENT_COLORS,
  encodeDemo, DEMO_SESSION_KEY,
} from '@/lib/demo'
import { getScenarioData } from '@/lib/demoScenarios'
import { Copy, Check, Trash2, ExternalLink } from 'lucide-react'

interface SavedDemo {
  id: string
  label: string
  config: DemoConfig
  createdAt: string
  url: string
}

const SAVED_DEMOS_KEY = 'stageops-saved-demos'

export default function DemoCreatorPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()

  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard')
  }, [isAdmin, router])

  const [org, setOrg] = useState('')
  const [user, setUser] = useState('')
  const [title, setTitle] = useState('General Manager')
  const [scenario, setScenario] = useState<DemoScenario>('mixed')
  const [color, setColor] = useState(ACCENT_COLORS[0].value)
  const [overrides, setOverrides] = useState<Record<string, { name: string; venue: string; subtitle: string }>>({})
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedDemos, setSavedDemos] = useState<SavedDemo[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
        const entry: { id: string; name?: string; venue?: string; subtitle?: string } = { id: p.id }
        if (ov.name && ov.name !== p.name) entry.name = ov.name
        if (ov.venue && ov.venue !== p.venue) entry.venue = ov.venue
        if (ov.subtitle && ov.subtitle !== p.subtitle) entry.subtitle = ov.subtitle
        if (!entry.name && !entry.venue && !entry.subtitle) return null
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
      ...(prodOverrides && prodOverrides.length > 0 && { overrides: prodOverrides }),
    }
  }, [org, user, title, color, scenario, overrides, scenarioProductions])

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

  function saveDemo() {
    if (!generatedUrl) return
    const config = buildConfig()
    const demo: SavedDemo = {
      id: Date.now().toString(),
      label: org || 'Demo',
      config,
      createdAt: new Date().toISOString(),
      url: generatedUrl,
    }
    const updated = [demo, ...savedDemos]
    setSavedDemos(updated)
    try {
      localStorage.setItem(SAVED_DEMOS_KEY, JSON.stringify(updated))
    } catch {}
  }

  function deleteDemo(id: string) {
    const updated = savedDemos.filter((d) => d.id !== id)
    setSavedDemos(updated)
    try {
      localStorage.setItem(SAVED_DEMOS_KEY, JSON.stringify(updated))
    } catch {}
  }

  function updateOverride(prodId: string, field: 'name' | 'venue' | 'subtitle', value: string) {
    setOverrides((prev) => {
      const existing = prev[prodId] ?? { name: '', venue: '', subtitle: '' }
      return { ...prev, [prodId]: { ...existing, [field]: value } }
    })
  }

  return (
    <div>
      <PageHeader
        title="Demo Creator"
        subtitle="Generate custom, shareable demo links for prospects"
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
            </CardBody>
          </Card>

          {/* Scenario */}
          <Card>
            <CardHeader><CardTitle>Data Scenario</CardTitle></CardHeader>
            <CardBody>
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
                <div className="flex items-center gap-2">
                  <label className="text-xs text-stone-500">Custom:</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-stone-200"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Production overrides */}
          <Card>
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
                    <input
                      value={overrides[p.id]?.name ?? ''}
                      onChange={(e) => updateOverride(p.id, 'name', e.target.value)}
                      placeholder={`Production title (default: "${p.name}")`}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={overrides[p.id]?.venue ?? ''}
                        onChange={(e) => updateOverride(p.id, 'venue', e.target.value)}
                        placeholder={`Venue (default: "${p.venue}")`}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                      />
                      <input
                        value={overrides[p.id]?.subtitle ?? ''}
                        onChange={(e) => updateOverride(p.id, 'subtitle', e.target.value)}
                        placeholder={`Subtitle (default: "${p.subtitle}")`}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="flex gap-3">
            <Button onClick={generate}>Generate Demo Link</Button>
            {generatedUrl && (
              <Button onClick={saveDemo}>Save Demo</Button>
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
                    <div key={demo.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: demo.config.color }}
                          />
                          <p className="text-sm font-medium text-stone-800 truncate">{demo.label}</p>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {SCENARIO_LABELS[demo.config.scenario]} · {new Date(demo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
