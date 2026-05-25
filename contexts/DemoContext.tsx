'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type DemoConfig, DEMO_SESSION_KEY } from '@/lib/demo'

interface DemoContextValue {
  isDemo: boolean
  config: DemoConfig | null
  setDemoConfig: (config: DemoConfig) => void
  clearDemo: () => void
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  config: null,
  setDemoConfig: () => {},
  clearDemo: () => {},
})

export function DemoProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DemoConfig | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DEMO_SESSION_KEY)
      if (stored) setConfig(JSON.parse(stored))
    } catch {}
  }, [])

  function setDemoConfig(cfg: DemoConfig) {
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(cfg))
    setConfig(cfg)
  }

  function clearDemo() {
    sessionStorage.removeItem(DEMO_SESSION_KEY)
    setConfig(null)
  }

  return (
    <DemoContext.Provider value={{ isDemo: !!config, config, setDemoConfig, clearDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  return useContext(DemoContext)
}
