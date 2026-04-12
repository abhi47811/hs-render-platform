import React, { ReactNode } from 'react'

interface ShareLayoutProps {
  children: ReactNode
}

/**
 * Clean minimal layout for share links
 * No sidebar, no topbar — just Houspire branding
 */
export default function ShareLayout({ children }: ShareLayoutProps) {
  return (
    <div className="h-dvh bg-white flex flex-col">
      {/* Header with logo */}
      <header className="border-b border-stone-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-stone-800">Houspire</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-100 px-6 py-3 bg-stone-50 flex-shrink-0">
        <p className="text-center text-xs text-stone-400">Powered by Houspire</p>
      </footer>
    </div>
  )
}
