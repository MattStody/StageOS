'use client'
import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { decodeDemo, DEMO_SESSION_KEY } from '@/lib/demo'
import { getScenarioData, applyProductionOverrides, applyExtraProductions } from '@/lib/demoScenarios'
import { useStore } from '@/lib/store'
import { ADMIN_SESSION_KEY } from '@/lib/auth'

export default function DemoEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const loadScenario = useStore((s) => s.loadScenario)
  const [name, setName] = useState('')

  const config = useMemo(() => decodeDemo(token), [token])

  if (!config) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-sm">This demo link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const accent = config.color || '#6366f1'

  function handleEnter(e: React.FormEvent) {
    e.preventDefault()
    const data = getScenarioData(config!.scenario)
    const withOverrides = applyProductionOverrides(data, config!.overrides)
    const withExtras = applyExtraProductions(withOverrides, config!.extraProductions)
    loadScenario(withExtras)
    try {
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(config))
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {}
    router.push('/dashboard')
  }

  const initials = config.user
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-stone-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 p-16 bg-stone-950 justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-semibold text-xl tracking-tight">StageOps</span>
            <span className="text-stone-500 text-sm">GM</span>
          </div>
        </div>

        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ backgroundColor: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
            Personalized for {config.org}
          </div>

          <h2 className="text-stone-200 text-2xl font-light leading-snug mb-3">
            {config.org}&apos;s<br />StageOps workspace
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
            Explore a live demo tailored to your organization —
            real production data, budgets, contracts, and cash flow.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { label: 'Productions loaded', value: (getScenarioData(config.scenario).productions.length + (config.extraProductions?.length ?? 0)).toString() },
              { label: 'Data scenario', value: scenarioShortLabel(config.scenario) },
              { label: 'Interactive', value: 'Fully editable' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline gap-4">
                <span className="text-2xl font-light text-white">{value}</span>
                <span className="text-stone-500 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-stone-700 text-xs">© 2026 StageOps. Built for theatre.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">{config.user}</p>
                <p className="text-xs text-stone-500">{config.title} · {config.org}</p>
              </div>
            </div>
            <h1 className="text-2xl font-light text-stone-900 tracking-tight">Your demo is ready</h1>
            <p className="text-stone-500 text-sm mt-1">Enter your name to personalize the experience</p>
          </div>

          <form onSubmit={handleEnter} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={config.user}
                className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-500 text-stone-900"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded text-sm font-medium text-white transition-opacity hover:opacity-90 mt-2"
              style={{ backgroundColor: accent }}
            >
              Enter Demo Workspace
            </button>
          </form>

          <div className="mt-8 p-4 bg-stone-100 rounded border border-stone-200">
            <p className="text-xs text-stone-500 font-medium mb-1">About this demo</p>
            <p className="text-xs text-stone-500">All data is pre-loaded and fully interactive. Changes are temporary and reset when you close the tab.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function scenarioShortLabel(scenario: string): string {
  const map: Record<string, string> = {
    broadway: 'Broadway',
    nonprofit: 'Nonprofit',
    tour: 'National Tour',
    mixed: 'Full Portfolio',
  }
  return map[scenario] ?? scenario
}
