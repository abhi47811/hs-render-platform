'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Room } from '@/types/database'

const ROOM_TYPE_ICONS: Record<string, string> = {
  'Living': 'LR', 'Master Bedroom': 'MB', 'Bedroom 2': 'BR',
  'Kitchen': 'KT', 'Dining': 'DI', 'Study': 'ST',
  'Office': 'OF', 'Bathroom': 'BA', 'Balcony': 'BL', 'Other': '—',
}

const ROOM_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  not_started:    { label: 'Not Started',   color: 'text-stone-400',  dot: 'bg-stone-300' },
  shell_uploaded: { label: 'Shell Ready',   color: 'text-blue-600',   dot: 'bg-blue-400' },
  in_progress:    { label: 'In Progress',   color: 'text-amber-600',  dot: 'bg-amber-400' },
  client_review:  { label: 'In Review',     color: 'text-violet-600', dot: 'bg-violet-400' },
  delivered:      { label: 'Delivered',     color: 'text-green-600',  dot: 'bg-green-500' },
}

interface RoomSequencingUIProps {
  rooms: Room[]
  projectId: string
}

export function RoomSequencingUI({ rooms, projectId }: RoomSequencingUIProps) {
  const router = useRouter()
  const [orderedRooms, setOrderedRooms] = useState<Room[]>(rooms)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dragRef = useRef<number | null>(null)
  const dragOccurredRef = useRef(false)

  async function saveOrder() {
    setSaving(true)
    try {
      const res = await fetch('/api/rooms/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_ids: orderedRooms.map((r) => r.id),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save room order')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch (err: unknown) {
      console.error('[RoomSequencingUI] save error:', err)
      // Revert to original order on error
      setOrderedRooms(rooms)
    } finally {
      setSaving(false)
    }
  }

  function handleDragStart(index: number) {
    dragOccurredRef.current = false
    dragRef.current = index
    setDraggedIndex(index)
  }

  function handleDragOver(index: number) {
    if (dragRef.current === null || dragRef.current === index) return
    dragOccurredRef.current = true

    const newRooms = [...orderedRooms]
    const dragged = newRooms[dragRef.current]
    newRooms.splice(dragRef.current, 1)
    newRooms.splice(index, 0, dragged)

    dragRef.current = index
    setOrderedRooms(newRooms)
  }

  function handleDragEnd() {
    dragRef.current = null
    setDraggedIndex(null)
  }

  function handleCardClick(roomId: string) {
    if (dragOccurredRef.current) return
    router.push(`/projects/${projectId}/rooms/${roomId}`)
  }

  const hasChanges = orderedRooms.some((r, i) => r.id !== rooms[i].id)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Rooms
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">
            {orderedRooms.length} room{orderedRooms.length !== 1 ? 's' : ''}
          </span>
          <Link
            href={`/projects/${projectId}/rooms/new`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Room
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {orderedRooms.map((room, index) => {
          const statusCfg = ROOM_STATUS_CONFIG[room.status] ?? ROOM_STATUS_CONFIG.not_started
          const renderCount = Array.isArray((room as any).renders) ? (room as any).renders.length : 0
          const hasShell = !!room.original_shell_url

          return (
            <div
              key={room.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={() => handleDragOver(index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleCardClick(room.id)}
              className="group bg-white rounded-lg border border-stone-200 hover:border-stone-400 hover:shadow-sm transition-all p-4 flex items-center gap-4"
              style={{
                opacity: draggedIndex === index ? 0.5 : 1,
                cursor: 'pointer',
              }}
            >
              {/* Drag handle */}
              <div className="flex-shrink-0 text-stone-300 group-hover:text-stone-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" />
                  <circle cx="15" cy="5" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="15" cy="19" r="1.5" />
                </svg>
              </div>

              {/* Room type badge */}
              <div className="w-10 h-10 rounded bg-stone-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-stone-500 group-hover:bg-stone-200 transition-colors">
                {ROOM_TYPE_ICONS[room.room_type] ?? '—'}
              </div>

              {/* Room info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-stone-800 truncate">{room.room_name}</p>
                  <span className="text-xs text-stone-400 flex-shrink-0">{room.room_type}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <span className={`flex items-center gap-1 ${statusCfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                  {hasShell && <span className="text-stone-400">Shell ✓</span>}
                  {renderCount > 0 && <span className="text-stone-400">{renderCount} render{renderCount !== 1 ? 's' : ''}</span>}
                  {room.current_pass > 0 && <span className="text-stone-400">P{room.current_pass}/6</span>}
                  {(room as any).style_locked && <span className="text-emerald-600">🔒</span>}
                </div>
              </div>

              {/* Open link */}
              <Link
                href={`/projects/${projectId}/rooms/${room.id}`}
                className="flex-shrink-0 text-stone-300 hover:text-stone-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Save button (only show if changes) */}
      {hasChanges && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-200">
          <button
            onClick={saveOrder}
            disabled={saving}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
            style={{
              background: '#16A34A',
              color: 'white',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save Order'}
          </button>
          <button
            onClick={() => setOrderedRooms(rooms)}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs font-medium px-4 py-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          {saved && (
            <span className="text-xs text-green-600 font-medium">✓ Saved!</span>
          )}
        </div>
      )}
    </div>
  )
}
