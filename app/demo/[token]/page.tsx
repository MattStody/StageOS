'use client'
import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { decodeDemo, DEMO_SESSION_KEY } from '@/lib/demo'
import { getScenarioData, applyProductionOverrides, applyExtraProductions, stripBaseProductions } from '@/lib/demoScenarios'
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
  const navBg = config.navColor || '#0c0a09'

  function handleEnter(e: React.FormEvent) {
    e.preventDefault()
    let data = getScenarioData(config!.scenario)
    data = config!.noBaseProductions
      ? stripBaseProductions(data)
      : applyProductionOverrides(data, config!.overrides)
    const withExtras = applyExtraProductions(data, config!.extraProductions)
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
    <div className="min-h-screen flex bg-stone-50">
      {/* Left panel — purely decorative */}
      <div
        className="hidden lg:block lg:w-1/2 shrink-0"
        style={
          config.bgImageUrl
            ? { backgroundImage: `url(${config.bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { backgroundColor: navBg }
        }
      />

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.org}
                className="h-8 max-w-[160px] object-contain object-left"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-semibold text-base tracking-tight text-stone-900">StageOps</span>
                <span className="text-stone-400 text-xs ml-0.5">GM</span>
              </div>
            )}
          </div>

          {/* User */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              {config.userAvatarUrl ? (
                <img
                  src={config.userAvatarUrl}
                  alt={config.user}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  {initials}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-stone-900">{config.user}</p>
                <p className="text-sm text-stone-600 mt-0.5">{config.org}</p>
                <p className="text-xs text-stone-400">{config.title}</p>
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
              className="w-full py-2.5 rounded text-sm font-medium text-white transition-opacity hover:opacity-90"
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
