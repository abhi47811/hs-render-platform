'use client'

// ─── Pass + CP Timeline ────────────────────────────────────────────────────
// Visual progress strip showing the 6 staging passes, 3 checkpoints,
// and the current stage of the room. Used at the top of the staging view.

interface TimelineProps {
  currentPass: number
  styleLocked: boolean
  checkpointStatuses: {
    cp1: 'pending' | 'shared' | 'approved'
    cp2: 'pending' | 'shared' | 'approved'
    cp3: 'pending' | 'shared' | 'approved'
  }
  roomStatus: string
}

const PASSES = [
  { pass: 1, label: 'Style Seed',     short: 'Seed' },
  { pass: 2, label: 'Flooring',       short: 'Floor' },
  { pass: 3, label: 'Main Furniture', short: 'Furn.' },
  { pass: 4, label: 'Accent Pieces',  short: 'Accent' },
  { pass: 5, label: 'Lighting',       short: 'Light' },
  { pass: 6, label: 'Decor',          short: 'Decor' },
]

// CP gates: CP1 after pass 1, CP2 after pass 1 (style lock), CP3 after pass 6
const CP_GATES: Record<1 | 2 | 3, { afterPass: number; label: string; sublabel: string }> = {
  1: { afterPass: 0, label: 'CP1',         sublabel: 'Shell' },
  2: { afterPass: 1, label: 'CP2',         sublabel: 'Style' },
  3: { afterPass: 6, label: 'CP3',         sublabel: 'Final' },
}

type CheckpointStatus = 'pending' | 'shared' | 'approved'

function cpDotClass(status: CheckpointStatus) {
  if (status === 'approved') return 'bg-emerald-500 border-emerald-500'
  if (status === 'shared')   return 'bg-blue-400 border-blue-400'
  return 'bg-white border-stone-300'
}

function cpLabelClass(status: CheckpointStatus) {
  if (status === 'approved') return 'text-emerald-700 font-semibold'
  if (status === 'shared')   return 'text-blue-600 font-medium'
  return 'text-stone-400'
}

function passDotClass(pass: number, currentPass: number, roomStatus: string) {
  const isDelivered = roomStatus === 'delivered'
  if (isDelivered) return 'bg-emerald-500'
  if (pass < currentPass) return 'bg-stone-700'
  if (pass === currentPass) return 'bg-stone-900 ring-2 ring-stone-900 ring-offset-2'
  return 'bg-stone-200'
}

function passLabelClass(pass: number, currentPass: number) {
  if (pass < currentPass) return 'text-stone-500'
  if (pass === currentPass) return 'text-stone-900 font-semibold'
  return 'text-stone-300'
}

export function RoomProgressTimeline({
  currentPass,
  styleLocked,
  checkpointStatuses,
  roomStatus,
}: TimelineProps) {
  const { cp1, cp2, cp3 } = checkpointStatuses
  const isDelivered = roomStatus === 'delivered'

  // Build the ordered sequence: CP1 → Pass1 → CP2 → Pass2–6 → CP3
  // Displayed as a horizontal scrollable strip

  return (
    <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max">

        {/* CP1 — Shell */}
        <TimelineCP cpNum={1} status={cp1} />
        <TimelineConnector active={cp1 === 'approved'} />

        {/* Passes 1–6, with CP2 after pass 1 and CP3 at the end */}
        {PASSES.map(({ pass, short }) => (
          <div key={pass} className="flex items-center gap-0">
            {/* Pass node */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded-full border-2 transition-all ${passDotClass(pass, currentPass, roomStatus)}`}
                title={PASSES[pass - 1].label}
              />
              <span className={`text-[9px] transition-colors ${passLabelClass(pass, currentPass)}`}>
                {pass === currentPass && !isDelivered ? (
                  <span className="flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-stone-900 animate-pulse inline-block" />
                    {short}
                  </span>
                ) : short}
              </span>
            </div>

            {/* CP2 after pass 1 */}
            {pass === 1 && (
              <>
                <TimelineConnector active={pass < currentPass || currentPass > 1} />
                <TimelineCP cpNum={2} status={cp2} extraLabel={styleLocked ? '🔒' : undefined} />
                <TimelineConnector active={cp2 === 'approved'} />
              </>
            )}

            {/* Connector between passes 2–6 */}
            {pass > 1 && pass < 6 && (
              <TimelineConnector active={pass < currentPass} />
            )}
          </div>
        ))}

        <TimelineConnector active={currentPass > 6 || isDelivered} />

        {/* CP3 — Final */}
        <TimelineCP cpNum={3} status={cp3} />

        {/* Delivered */}
        {isDelivered && (
          <>
            <TimelineConnector active={true} />
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-emerald-600 font-semibold">Done</span>
            </div>
          </>
        )}
      </div>

      {/* Current stage label */}
      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
        <p className="text-[10px] text-stone-400">
          {isDelivered ? (
            <span className="text-emerald-600 font-semibold">Delivered</span>
          ) : currentPass === 0 ? (
            'Awaiting shell approval'
          ) : (
            <>
              Pass {currentPass} of 6 —{' '}
              <span className="text-stone-600 font-medium">
                {PASSES[currentPass - 1]?.label ?? 'Complete'}
              </span>
            </>
          )}
        </p>
        <div className="flex items-center gap-2 text-[9px]">
          {cp1 === 'approved' && (
            <span className="text-stone-400">CP1 ✓</span>
          )}
          {cp2 === 'approved' && (
            <span className="text-stone-400">CP2 ✓{styleLocked ? ' 🔒' : ''}</span>
          )}
          {cp3 === 'approved' && (
            <span className="text-emerald-600 font-medium">CP3 ✓</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TimelineCP({
  cpNum,
  status,
  extraLabel,
}: {
  cpNum: number
  status: CheckpointStatus
  extraLabel?: string
}) {
  const gate = CP_GATES[cpNum as 1 | 2 | 3]
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${cpDotClass(status)}`}
        title={`CP${cpNum}: ${gate.sublabel} — ${status}`}
      >
        {status === 'approved' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
        {status === 'shared' && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 block" />
        )}
      </div>
      <span className={`text-[9px] transition-colors ${cpLabelClass(status)}`}>
        {gate.label}{extraLabel ? ` ${extraLabel}` : ''}
      </span>
    </div>
  )
}

function TimelineConnector({ active }: { active: boolean }) {
  return (
    <div
      className={`h-0.5 w-5 transition-colors ${active ? 'bg-stone-700' : 'bg-stone-200'}`}
    />
  )
}
