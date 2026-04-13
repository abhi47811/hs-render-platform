'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Nav Items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Pipeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1.5"/>
        <rect width="7" height="5" x="14" y="3" rx="1.5"/>
        <rect width="7" height="9" x="14" y="12" rx="1.5"/>
        <rect width="7" height="5" x="3" y="16" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/my-work',
    label: 'My Work',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: '/projects/new',
    label: 'New Project',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    href: '/library/templates',
    label: 'Templates',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    href: '/library/vault',
    label: 'Style Vault',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: '/library/furniture',
    label: 'Furniture Refs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/>
        <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/>
        <path d="M4 18v2"/>
        <path d="M20 18v2"/>
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 16l4-6 4 4 4-8"/>
      </svg>
    ),
  },
  {
    href: '/schedule',
    label: 'Schedule',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },

]

const BOTTOM_ITEMS = [
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 220,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* ── Brand mark ──────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-5 py-5"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        {/* Wordmark row */}
        <div className="flex items-center gap-2.5 mb-0.5">
          {/* Icon mark */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #C4913A 0%, #D4A84B 100%)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-[13px] font-bold leading-none tracking-tight">Houspire</p>
          </div>
        </div>
        {/* Sub-label */}
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.12em] ml-[37px]"
          style={{ color: 'var(--sidebar-active)', opacity: 0.7 }}
        >
          Staging Ops
        </p>
      </div>

      {/* ── Main navigation ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-4 space-y-0.5 scrollbar-dark">
        {/* Section label */}
        <p
          className="text-[9px] font-bold uppercase tracking-[0.14em] px-2.5 mb-2"
          style={{ color: 'var(--sidebar-text)' }}
        >
          Workspace
        </p>

        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer min-h-[36px]',
              )}
              style={
                active
                  ? {
                      background: 'var(--sidebar-active-bg)',
                      color: 'var(--sidebar-active)',
                    }
                  : {
                      color: 'var(--sidebar-text)',
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget
                  el.style.background = 'var(--sidebar-hover)'
                  el.style.color = 'var(--sidebar-text-h)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget
                  el.style.background = ''
                  el.style.color = 'var(--sidebar-text)'
                }
              }}
            >
              <span
                className="flex-shrink-0 transition-all"
                style={{ opacity: active ? 1 : 0.65 }}
              >
                {icon}
              </span>
              <span className="leading-none">{label}</span>
              {/* Active indicator bar */}
              {active && (
                <span
                  className="ml-auto w-1 h-4 rounded-full flex-shrink-0"
                  style={{ background: 'var(--sidebar-active)', opacity: 0.7 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom section: settings + version ──────────────── */}
      <div
        className="flex-shrink-0 px-3 py-3 space-y-0.5"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        {BOTTOM_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer"
              style={
                active
                  ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active)' }
                  : { color: 'var(--sidebar-text)' }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--sidebar-hover)'
                  e.currentTarget.style.color = 'var(--sidebar-text-h)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.color = 'var(--sidebar-text)'
                }
              }}
            >
              <span style={{ opacity: 0.6 }}>{icon}</span>
              {label}
            </Link>
          )
        })}

        {/* Version tag */}
        <div className="px-2.5 pt-2 pb-0.5 flex items-center justify-between">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--sidebar-text)', opacity: 0.35 }}
          >
            v1.0 — Module 1
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: 'var(--sidebar-active)', opacity: 0.5 }}
          />
        </div>
      </div>
    </aside>
  )
}
