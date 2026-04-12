'use client'

// ─── A4: cmd+K Project Search (Command Palette) ───────────────────────────
// Global keyboard-triggered command palette.
// Activated by: Cmd+K (Mac) / Ctrl+K (Win/Linux)
// Features:
//   • Fuzzy search across projects and rooms
//   • Recent items (last 5 projects visited — stored in localStorage)
//   • Quick actions: New Project, Analytics, Library
//   • Instant navigation on selection
//   • Keyboard nav: ↑↓ (highlight) · Enter (select) · Esc (close)
//
// Mounted in the dashboard layout — always available across the app.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

type ItemType = 'project' | 'room' | 'action' | 'recent'

interface PaletteItem {
  id: string
  type: ItemType
  label: string
  sublabel?: string
  href: string
  icon?: string
}

const QUICK_ACTIONS: PaletteItem[] = [
  { id: 'new-project', type: 'action', label: 'New Project',     sublabel: 'Create a new staging project', href: '/projects/new',      icon: '➕' },
  { id: 'analytics',   type: 'action', label: 'Analytics',        sublabel: 'View usage and cost analytics',  href: '/analytics',          icon: '📊' },
  { id: 'library',     type: 'action', label: 'Asset Library',    sublabel: 'Browse moodboards and templates', href: '/library/vault',      icon: '🗂' },
  { id: 'templates',   type: 'action', label: 'Templates',        sublabel: 'Style templates and presets',     href: '/library/templates',  icon: '🎨' },
]

const RECENT_PROJECTS_KEY = 'houspire_recent_projects'

function getRecentProjects(): PaletteItem[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PaletteItem[]
  } catch {
    return []
  }
}

export function addRecentProject(item: PaletteItem) {
  try {
    const existing = getRecentProjects().filter(p => p.id !== item.id)
    const updated = [item, ...existing].slice(0, 5)
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PaletteItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PaletteItem[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load all projects + rooms once
  const loadItems = useCallback(async () => {
    try {
      const [{ data: projects }, { data: rooms }] = await Promise.all([
        supabase.from('projects').select('id, client_name, city, status').order('created_at', { ascending: false }).limit(50),
        supabase.from('rooms').select('id, room_name, room_type, project_id').limit(100),
      ])

      const projectItems: PaletteItem[] = (projects ?? []).map(p => ({
        id: p.id,
        type: 'project',
        label: p.client_name,
        sublabel: `${p.city || ''} · ${p.status || ''}`,
        href: `/projects/${p.id}`,
        icon: '🏠',
      }))

      const roomItems: PaletteItem[] = (rooms ?? []).map(r => ({
        id: r.id,
        type: 'room',
        label: r.room_name,
        sublabel: r.room_type,
        href: `/projects/${r.project_id}/rooms/${r.id}`,
        icon: '🚪',
      }))

      setItems([...QUICK_ACTIONS, ...projectItems, ...roomItems])
    } catch {
      setItems(QUICK_ACTIONS)
    }
  }, [supabase])

  // Open/close
  const open = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    setHighlightedIndex(0)
    loadItems()
  }, [loadItems])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  // Global keyboard shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) close()
        else open()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, open, close])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Filter items based on query
  useEffect(() => {
    if (!query.trim()) {
      // Show recent + quick actions when no query
      const recent = getRecentProjects().map(r => ({ ...r, type: 'recent' as ItemType }))
      setFilteredItems([...recent, ...QUICK_ACTIONS])
      setHighlightedIndex(0)
      return
    }

    const q = query.toLowerCase()
    const matched = items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.sublabel?.toLowerCase().includes(q)
    ).slice(0, 12)

    setFilteredItems(matched)
    setHighlightedIndex(0)
  }, [query, items])

  // Arrow key navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(i => Math.min(i + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[highlightedIndex]
      if (item) selectItem(item)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const highlighted = list.querySelector('[data-highlighted="true"]')
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const selectItem = useCallback((item: PaletteItem) => {
    if (item.type === 'project' || item.type === 'recent') {
      addRecentProject({ ...item, type: 'recent' })
    }
    close()
    router.push(item.href)
  }, [close, router])

  if (!isOpen) {
    return (
      // Trigger hint in TopBar (non-blocking)
      <button
        onClick={open}
        className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-700 rounded-lg text-xs transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline px-1 py-0.5 bg-stone-200 text-stone-400 rounded text-[9px]">⌘K</kbd>
      </button>
    )
  }

  const TYPE_LABELS: Record<ItemType, string> = {
    project: 'Project',
    room:    'Room',
    action:  'Action',
    recent:  'Recent',
  }

  const groupedItems: { label: string; items: PaletteItem[] }[] = []

  if (!query.trim()) {
    const recent = filteredItems.filter(i => i.type === 'recent')
    const actions = filteredItems.filter(i => i.type === 'action')
    if (recent.length > 0) groupedItems.push({ label: 'Recent', items: recent })
    if (actions.length > 0) groupedItems.push({ label: 'Quick Actions', items: actions })
  } else {
    const projects = filteredItems.filter(i => i.type === 'project')
    const rooms    = filteredItems.filter(i => i.type === 'room')
    const actions  = filteredItems.filter(i => i.type === 'action')
    if (projects.length > 0) groupedItems.push({ label: 'Projects', items: projects })
    if (rooms.length > 0)    groupedItems.push({ label: 'Rooms', items: rooms })
    if (actions.length > 0)  groupedItems.push({ label: 'Actions', items: actions })
  }

  let runningIndex = 0

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
          <svg className="text-stone-400 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search projects, rooms, actions…"
            className="flex-1 text-sm text-stone-900 placeholder-stone-400 outline-none bg-transparent"
          />
          <kbd className="px-2 py-0.5 bg-stone-100 text-stone-400 rounded text-[10px]">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-stone-400">No results for "{query}"</p>
            </div>
          ) : (
            groupedItems.map(group => {
              const groupStart = runningIndex
              runningIndex += group.items.length
              return (
                <div key={group.label}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((item, itemIdx) => {
                    const absIdx = groupStart + itemIdx
                    const isHighlighted = absIdx === highlightedIndex
                    return (
                      <button
                        key={item.id}
                        data-highlighted={isHighlighted}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setHighlightedIndex(absIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isHighlighted ? 'bg-stone-100' : 'hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-base flex-shrink-0 w-6 text-center">{item.icon ?? '•'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{item.label}</p>
                          {item.sublabel && (
                            <p className="text-[10px] text-stone-400 truncate">{item.sublabel}</p>
                          )}
                        </div>
                        {isHighlighted && (
                          <kbd className="flex-shrink-0 px-1.5 py-0.5 bg-stone-200 text-stone-500 text-[10px] rounded">↵</kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-stone-100 flex items-center gap-3">
          <span className="text-[10px] text-stone-400">↑↓ navigate</span>
          <span className="text-[10px] text-stone-400">↵ select</span>
          <span className="text-[10px] text-stone-400">Esc close</span>
        </div>
      </div>
    </div>
  )
}
