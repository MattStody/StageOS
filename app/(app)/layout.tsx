import { Sidebar } from '@/components/layout/Sidebar'
import { DemoProvider } from '@/contexts/DemoContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-stone-50">
            <div className="max-w-7xl mx-auto px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </DemoProvider>
  )
}
