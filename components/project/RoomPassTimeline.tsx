// ─── Sec 08: Room Pass Timeline Strip ─────────────────────────────────────
// Server component — shows all rooms as rows with their pass progress dots.
// Used at the top of the project workspace to give a cross-room overview.

interface RoomData {
  id: string
  room_name: string
  room_type: string
  current_pass: number
  status: string
  style_locked?: boolean
}

interface RoomPassTimelineProps {
  rooms: RoomData[]
  projectId: string
}

const PASS_LABELS = ['Seed', 'Floor', 'Furn', 'Accent', 'Light', 'Decor']

const ROOM_STATUS_DOT: Record<string, string> = {
  not_started:    'bg-stone-200',
  shell_uploaded: 'bg-blue-400',
  in_progress:    'bg-amber-400',
  client_review:  'bg-violet-400',
  delivered:      'bg-green-500',
}

export function RoomPassTimeline({ rooms, projectId }: RoomPassTimelineProps) {
  if (rooms.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Pass Progress</h3>
        <div className="flex items-center gap-4 text-[9px] text-stone-400">
          {PASS_LABELS.map((label, i) => (
            <span key={i} className="text-center w-8 hidden sm:inline">{label}</span>
          ))}
        </div>
      </div>

      {/* Room rows */}
      <div className="divide-y divide-stone-50">
        {rooms.map((room) => {
          const statusDot = ROOM_STATUS_DOT[room.status] ?? 'bg-stone-200'
          const isDelivered = room.status === 'delivered'
          const currentPass = room.current_pass ?? 0

          return (
            <a
              key={room.id}
              href={`/projects/${projectId}/rooms/${room.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 transition-colors group"
            >
              {/* Room name + status */}
              <div className="w-32 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
                  <p className="text-xs font-medium text-stone-800 truncate group-hover:text-stone-900">
                    {room.room_name}
                  </p>
                </div>
                <p className="text-[9px] text-stone-400 pl-3 truncate">{room.room_type}</p>
              </div>

              {/* Pass dots */}
              <div className="flex items-center gap-3 flex-1">
                {PASS_LABELS.map((_, passIdx) => {
                  const passNum = passIdx + 1
                  const isComplete = isDelivered || passNum < currentPass
                  const isCurrent = passNum === currentPass && !isDelivered
                  const isFuture = passNum > currentPass && !isDelivered

                  return (
                    <div key={passIdx} className="flex items-center gap-1.5 flex-1 justify-center">
                      <div
                        className={`
                          w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all
                          ${isComplete ? 'bg-stone-700' : ''}
                          ${isCurrent ? 'bg-stone-900 ring-2 ring-stone-900 ring-offset-1 scale-125' : ''}
                          ${isFuture ? 'bg-stone-200' : ''}
                          ${isDelivered ? 'bg-green-500' : ''}
                        `}
                        title={`Pass ${passNum}: ${PASS_LABELS[passIdx]}`}
                      />
                      {/* Connector between passes */}
                      {passIdx < PASS_LABELS.length - 1 && (
                        <div className={`h-px flex-1 ${
                          isComplete || isDelivered ? 'bg-stone-400' : 'bg-stone-100'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Right: style lock + room status label */}
              <div className="flex items-center gap-2 flex-shrink-0 w-28 justify-end">
                {room.style_locked && (
                  <span className="text-[9px] text-emerald-600 font-medium">🔒 Locked</span>
                )}
                {isDelivered && (
                  <span className="text-[9px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">Done</span>
                )}
                {!isDelivered && currentPass > 0 && (
                  <span className="text-[9px] text-stone-400">P{currentPass}/6</span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-200 group-hover:text-stone-400 transition-colors">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
