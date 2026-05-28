import { SidebarContainer } from '@/components/layout/SidebarContainer'
import { DemoProvider } from '@/contexts/DemoContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="flex h-screen overflow-hidden">
        <SidebarContainer />
        <main className="flex-1 min-w-0 overflow-y-auto bg-stone-50 pt-14 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </DemoProvider>
  )
}
