import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
// Sprint 8 — A8: Global keyboard shortcuts + ? help modal
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts'

// TopBar uses cookies() — mark entire layout as dynamic so Vercel
// doesn't try to statically render it during build
export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-stone-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        {/* overflow-auto here — pages decide their own scroll strategy */}
        <main className="flex-1 overflow-auto min-h-0">{children}</main>
      </div>
      {/* Global overlays — always mounted */}
      <KeyboardShortcuts />
    </div>
  )
}
