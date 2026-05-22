'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('leon@adamblanshay.com')
  const [password, setPassword] = useState('••••••••')

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
            "One connected place to manage the financial, contractual, and operational life of a production."
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
            <h1 className="text-2xl font-light text-stone-900 tracking-tight">Sign in</h1>
            <p className="text-stone-500 text-sm mt-1">Access your StageOps workspace</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); router.push('/dashboard') }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-500 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-500 text-stone-900"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-stone-900 text-white py-2.5 rounded text-sm font-medium hover:bg-stone-800 transition-colors mt-2"
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 p-4 bg-stone-100 rounded border border-stone-200">
            <p className="text-xs text-stone-500 font-medium mb-2">Demo workspace</p>
            <p className="text-xs text-stone-500">Preloaded with 3 active productions</p>
            <p className="text-xs text-stone-500">Use any credentials to sign in</p>
          </div>
        </div>
      </div>
    </div>
  )
}
