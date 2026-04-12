'use client'

// ─── Sec 39: In-App Notification System ────────────────────────────────────
// Bell icon with unread count badge in TopBar.
// Clicking opens a right-anchored drawer listing notifications.
//
// 7 trigger types (inferred from message prefix / `notification_type` column):
//   sla_breach · cp_approved · revision_received · mention · cost_alert
//   delivery_complete · generation_failed
//
// Features:
//  • Unread count badge (red, max 9+)
//  • Mark all as read on drawer open
//  • Per-notification mark-read on click
//  • Click-outside-to-close
//  • Relative timestamps ("2h ago")
//  • Project link if project_id present

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── Local notification type — superset of DB Notification ────────────────────
interface NotifRow {
  id: string
  user_id: string
  project_id: string | null
  message: string
  is_read: boolean
  created_at: string
  // Optional enriched columns — present if DB has them
  notification_type?: string | null
  title?: string | null
  link_url?: string | null
}

// ── Notification type config ─────────────────────────────────────────────────
type NotifKind =
  | 'sla_breach'
  | 'cp_approved'
  | 'revision_received'
  | 'mention'
  | 'cost_alert'
  | 'delivery_complete'
  | 'generation_failed'
  | 'default'

const KIND_CONFIG: Record<NotifKind, { icon: string; iconClass: string; dotClass: string }> = {
  sla_breach:          { icon: '⚠', iconClass: 'text-red-600',    dotClass: 'bg-red-500' },
  cp_approved:         { icon: '✓', iconClass: 'text-green-600',  dotClass: 'bg-green-500' },
  revision_received:   { icon: '↩', iconClass: 'text-orange-600', dotClass: 'bg-orange-400' },
  mention:             { icon: '@', iconClass: 'text-blue-600',   dotClass: 'bg-blue-500' },
  cost_alert:          { icon: '₹', iconClass: 'text-amber-600',  dotClass: 'bg-amber-400' },
  delivery_complete:   { icon: '✉', iconClass: 'text-emerald-600', dotClass: 'bg-emerald-500' },
  generation_failed:   { icon: '✕', iconClass: 'text-red-500',   dotClass: 'bg-red-400' },
  default:             { icon: '●', iconClass: 'text-stone-400',  dotClass: 'bg-stone-400' },
}

function inferKind(notif: NotifRow): NotifKind {
  // Prefer explicit column
  if (notif.notification_type) {
    if (notif.notification_type in KIND_CONFIG) return notif.notification_type as NotifKind
  }
  // Infer from message keywords
  const m = notif.message.toLowerCase()
  if (m.includes('sla') || m.includes('overdue'))          return 'sla_breach'
  if (m.includes('approved') || m.includes('checkpoint'))  return 'cp_approved'
  if (m.includes('revision'))                               return 'revision_received'
  if (m.includes('@') || m.includes('mention'))             return 'mention'
  if (m.includes('cost') || m.includes('₹'))               return 'cost_alert'
  if (m.includes('delivered') || m.includes('complete'))    return 'delivery_complete'
  if (m.includes('failed') || m.includes('error'))          return 'generation_failed'
  return 'default'
}

// ── Relative time ────────────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── BellIcon ─────────────────────────────────────────────────────────────────
function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={hasUnread ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={hasUnread ? 'text-stone-700' : 'text-stone-400'}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const supabase = createClient()
  const [notifs, setNotifs] = useState<NotifRow[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const drawerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // ── Fetch notifications ───────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('notifications')
      .select('id, user_id, project_id, message, is_read, created_at, notification_type, title, link_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)

    setNotifs(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => { fetchNotifs() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchNotifs])

  // ── Click-outside close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Mark all as read when drawer opens ───────────────────────────────────
  const handleOpen = async () => {
    setOpen(true)
    const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id)
    if (!unreadIds.length) return

    // Optimistic
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))

    supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(({ error }) => {
        if (error) console.warn('[NotificationBell] mark-read failed:', error.message)
      })
  }

  // ── Mark single notification read on click ───────────────────────────────
  const handleNotifClick = (notif: NotifRow) => {
    if (!notif.is_read) {
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
        .then(({ error }) => {
          if (error) console.warn('[NotificationBell] single mark-read failed:', error.message)
        })
    }
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon hasUnread={unreadCount > 0} />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none select-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div
          ref={drawerRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-50"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifs.some(n => !n.is_read) && (
                <button
                  onClick={() => {
                    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
                    supabase.from('notifications')
                      .update({ is_read: true })
                      .in('id', notifs.filter(n => !n.is_read).map(n => n.id))
                      .then(() => {})
                  }}
                  className="text-[10px] text-stone-400 hover:text-stone-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors p-0.5"
                aria-label="Close notifications"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {loading && (
              <div className="px-4 py-8 flex items-center justify-center">
                <svg className="animate-spin w-4 h-4 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-stone-400">No notifications yet</p>
              </div>
            )}

            {!loading && notifs.map(notif => {
              const kind = inferKind(notif)
              const cfg = KIND_CONFIG[kind]
              const dest = notif.link_url ?? (notif.project_id ? `/projects/${notif.project_id}` : null)

              const content = (
                <div
                  className={`flex gap-3 px-4 py-3 border-b border-stone-50 transition-colors cursor-pointer group ${
                    !notif.is_read
                      ? 'bg-stone-50 hover:bg-stone-100'
                      : 'bg-white hover:bg-stone-50'
                  }`}
                  onClick={() => handleNotifClick(notif)}
                >
                  {/* Kind icon */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
                    ${kind === 'sla_breach'        ? 'bg-red-100' :
                      kind === 'cp_approved'        ? 'bg-green-100' :
                      kind === 'revision_received'  ? 'bg-orange-100' :
                      kind === 'mention'             ? 'bg-blue-100' :
                      kind === 'cost_alert'          ? 'bg-amber-100' :
                      kind === 'delivery_complete'   ? 'bg-emerald-100' :
                      kind === 'generation_failed'   ? 'bg-red-100' :
                      'bg-stone-100'}
                    ${cfg.iconClass}`}
                  >
                    <span className="text-[12px]">{cfg.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {notif.title && (
                      <p className="text-xs font-semibold text-stone-800 leading-snug mb-0.5 truncate">
                        {notif.title}
                      </p>
                    )}
                    <p className={`text-[11px] leading-snug ${notif.is_read ? 'text-stone-500' : 'text-stone-700'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-stone-400 mt-1">{relativeTime(notif.created_at)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dotClass}`} />
                  )}
                </div>
              )

              return dest ? (
                <Link key={notif.id} href={dest} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={notif.id}>{content}</div>
              )
            })}
          </div>

          {/* Footer */}
          {notifs.length >= 40 && (
            <div className="px-4 py-2 border-t border-stone-100">
              <p className="text-[9px] text-stone-400 text-center">Showing latest 40 notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
