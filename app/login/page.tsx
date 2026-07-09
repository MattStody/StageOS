'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_USERS } from '@/lib/auth'
import { editionAllows } from '@/lib/edition'
import { cn } from '@/lib/cn'

// Role users only appear if this edition includes at least one of their
// working sections (dashboard alone doesn't count).
const VISIBLE_ROLE_USERS = ROLE_USERS.filter((u) =>
  u.sections.some((s) => s !== 'dashboard' && editionAllows(s)),
)

const SECTION_COLORS: Record<string, string> = {
  company: '#0ea5e9',
  production: '#8b5cf6',
  finance: '#10b981',
  danielle: '#f59e0b',
}

export default function LoginPage() {
  const { login, loginAsRole } = useAuth()
  const [email, setEmail] = useState('matt@boldlymedia.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Full page loads (not router.push) so the data store rehydrates from the
  // signed-in user's storage partition.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const ok = login(email, password)
    if (ok) {
      window.location.assign('/dashboard')
    } else {
      setError('Invalid credentials.')
    }
  }

  function handleRoleLogin(userId: string) {
    loginAsRole(userId)
    const user = ROLE_USERS.find((u) => u.id === userId)
    window.location.assign(user?.defaultHref ?? '/dashboard')
  }

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
          <blockquote className="text-stone-400 text-lg font-light leading-relaxed max-w-sm">
            &ldquo;One connected place to manage the financial, contractual, and operational life of a production.&rdquo;
          </blockquote>
          <div className="mt-12 space-y-4">
            {[
              { label: 'Productions Managed', value: '24' },
              { label: 'Total Gross Tracked', value: '$48M+' },
              { label: 'Contracts Monitored', value: '340+' },
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
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-light text-stone-900 tracking-tight">Sign in</h1>
            <p className="text-stone-500 text-sm mt-1">Access your StageOps workspace</p>
          </div>

          {/* Admin form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-500 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Enter your password"
                className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-500 text-stone-900"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-stone-900 text-white py-2.5 rounded text-sm font-medium hover:bg-stone-800 transition-colors mt-2"
            >
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400">or sign in as</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Role user cards */}
          <div className="space-y-2">
            {VISIBLE_ROLE_USERS.map((user) => {
              const color = SECTION_COLORS[user.id] ?? '#6b7280'
              return (
                <button
                  key={user.id}
                  onClick={() => handleRoleLogin(user.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-lg hover:border-stone-400 hover:shadow-sm transition-all text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">{user.name}</p>
                    <p className="text-xs text-stone-500">{user.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {user.freshWorkspace ? (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        blank workspace
                      </span>
                    ) : (
                      user.sections.filter((s) => s !== 'dashboard').map((s) => (
                        <span
                          key={s}
                          className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize')}
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-stone-400 mt-4 text-center">
            Role accounts have view access to their assigned section only.
          </p>
        </div>
      </div>
    </div>
  )
}
