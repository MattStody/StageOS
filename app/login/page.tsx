'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('matt@boldlymedia.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const ok = login(email, password)
    if (ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid credentials. Demo users should use their personalized demo link.')
    }
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
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-light text-stone-900 tracking-tight">Admin sign in</h1>
            <p className="text-stone-500 text-sm mt-1">Access your StageOps workspace</p>
          </div>

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
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-stone-900 text-white py-2.5 rounded text-sm font-medium hover:bg-stone-800 transition-colors mt-2"
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 p-4 bg-stone-100 rounded border border-stone-200">
            <p className="text-xs text-stone-500 font-medium mb-1">Demo access</p>
            <p className="text-xs text-stone-500">Prospects access StageOps through a personalized demo link — not this page.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
