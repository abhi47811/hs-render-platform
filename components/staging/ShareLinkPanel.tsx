'use client'

// ─── Sec 25: Shareable Preview Link — creation, expiry control, revocation ──
// Used inside CheckpointPanel (status: 'shared' state) and on the staging page.
//
// Features:
//  • Create share link with expiry: 3 / 7 / 14 / 30 days
//  • Display active links with expiry countdown
//  • Revoke individual links (fire-and-forget)
//  • Copy link to clipboard
//  • Presentation mode toggle (is_presentation_mode)

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ShareLink {
  id: string
  url_token: string
  expires_at: string
  is_revoked: boolean
  opened_at: string | null
  is_presentation_mode: boolean
  created_at: string
}

interface ShareLinkPanelProps {
  projectId: string
  roomId: string
  checkpointNumber: 1 | 2 | 3
  onLinkCreated?: (url: string) => void
}

const EXPIRY_OPTIONS = [
  { days: 3,  label: '3 days' },
  { days: 7,  label: '7 days (default)' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function expiryLabel(days: number): { text: string; color: string } {
  if (days < 0) return { text: 'Expired', color: 'text-stone-400' }
  if (days === 0) return { text: 'Expires today', color: 'text-red-600' }
  if (days <= 2) return { text: `${days}d left`, color: 'text-red-500' }
  if (days <= 5) return { text: `${days}d left`, color: 'text-amber-600' }
  return { text: `${days}d left`, color: 'text-emerald-600' }
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function RevokeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

export function ShareLinkPanel({
  projectId,
  roomId,
  checkpointNumber,
  onLinkCreated,
}: ShareLinkPanelProps) {
  const supabase = createClient()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedExpiry, setSelectedExpiry] = useState(7)
  const [presentationMode, setPresentationMode] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    const { data } = await supabase
      .from('share_links')
      .select('id, url_token, expires_at, is_revoked, opened_at, is_presentation_mode, created_at')
      .eq('room_id', roomId)
      .eq('checkpoint_number', checkpointNumber)
      .order('created_at', { ascending: false })
      .limit(10)
    setLinks(data ?? [])
    setLoadingLinks(false)
  }, [supabase, roomId, checkpointNumber])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const getShareUrl = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/share/${token}`
  }

  const handleCopy = async (link: ShareLink) => {
    const url = getShareUrl(link.url_token)
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async (link: ShareLink) => {
    // Optimistic update
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_revoked: true } : l))
    supabase
      .from('share_links')
      .update({ is_revoked: true })
      .eq('id', link.id)
      .then(({ error }) => {
        if (error) {
          // Roll back
          setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_revoked: false } : l))
          console.warn('[ShareLinkPanel] revoke failed:', error.message)
        }
      })
  }

  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          room_id: roomId,
          checkpoint_number: checkpointNumber,
          expires_in_days: selectedExpiry,
          is_presentation_mode: presentationMode,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create link')

      const newUrl: string = json.url
      onLinkCreated?.(newUrl)
      // Refresh links list
      await fetchLinks()
      // Auto-copy to clipboard
      await navigator.clipboard.writeText(newUrl).catch(() => {})
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const activeLinks = links.filter(l => !l.is_revoked && daysUntil(l.expires_at) >= 0)
  const revokedOrExpired = links.filter(l => l.is_revoked || daysUntil(l.expires_at) < 0)

  return (
    <div className="space-y-3">
      {/* Active links */}
      {!loadingLinks && activeLinks.length > 0 && (
        <div className="space-y-2">
          {activeLinks.map((link) => {
            const days = daysUntil(link.expires_at)
            const { text: expText, color: expColor } = expiryLabel(days)
            const url = getShareUrl(link.url_token)
            return (
              <div
                key={link.id}
                className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5"
              >
                {/* Link icon + truncated URL */}
                <span className="text-stone-400 flex-shrink-0"><LinkIcon /></span>
                <span className="flex-1 text-[10px] text-stone-500 font-mono truncate" title={url}>
                  {url.replace(/^https?:\/\//, '')}
                </span>

                {/* Opened indicator */}
                {link.opened_at && (
                  <span className="flex-shrink-0 text-[9px] text-emerald-600 font-medium">Opened</span>
                )}

                {/* Expiry */}
                <span className={`flex-shrink-0 text-[10px] font-semibold ${expColor}`}>
                  {expText}
                </span>

                {/* Presentation mode badge */}
                {link.is_presentation_mode && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-purple-100 text-purple-600">
                    Pres
                  </span>
                )}

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(link)}
                  title="Copy link"
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                    copiedId === link.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-white border border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-400'
                  }`}
                >
                  {copiedId === link.id ? '✓' : <CopyIcon />}
                </button>

                {/* Revoke button */}
                <button
                  onClick={() => handleRevoke(link)}
                  title="Revoke this link"
                  className="flex-shrink-0 p-1.5 rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <RevokeIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create new link */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2.5">
        <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
          Create Share Link
        </p>

        {/* Expiry selector */}
        <div className="flex gap-1.5 flex-wrap">
          {EXPIRY_OPTIONS.map(({ days, label }) => (
            <button
              key={days}
              onClick={() => setSelectedExpiry(days)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                selectedExpiry === days
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Presentation mode toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setPresentationMode(v => !v)}
            className={`relative w-7 h-4 rounded-full transition-colors ${
              presentationMode ? 'bg-stone-900' : 'bg-stone-200'
            }`}
          >
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
              presentationMode ? 'translate-x-3' : 'translate-x-0'
            }`} />
          </div>
          <span className="text-[10px] text-stone-600 font-medium">Presentation mode</span>
          <span className="text-[9px] text-stone-400">(fade toggle, no team UI)</span>
        </label>

        {createError && (
          <p className="text-[10px] text-red-600">{createError}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full min-h-[36px] bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creating…
            </>
          ) : (
            <>
              <LinkIcon />
              Generate & Copy Link
            </>
          )}
        </button>
      </div>

      {/* Revoked / expired — collapsed */}
      {revokedOrExpired.length > 0 && (
        <details className="group">
          <summary className="text-[10px] text-stone-400 hover:text-stone-600 cursor-pointer select-none flex items-center gap-1.5 py-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            {revokedOrExpired.length} revoked / expired link{revokedOrExpired.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-1.5 space-y-1">
            {revokedOrExpired.map((link) => (
              <div key={link.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 opacity-50">
                <span className="flex-1 text-[10px] text-stone-400 font-mono truncate">
                  …/{link.url_token.slice(-8)}
                </span>
                <span className="text-[10px] text-stone-400">
                  {link.is_revoked ? 'Revoked' : 'Expired'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
