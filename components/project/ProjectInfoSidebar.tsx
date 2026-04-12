'use client'

import { useState } from 'react'

// ─── Sec 08: Collapsible Project Brief Sidebar ─────────────────────────────
// Sticky panel on the right side of the project workspace. Shows client brief
// (style prefs, material prefs, exclusions, vastu notes). Collapses to a narrow
// icon strip to save horizontal space.

interface ProjectInfoSidebarProps {
  stylePreferences: string | null
  materialPreferences: string | null
  exclusions: string | null
  vastuRequired: string
  vastuNotes: string | null
  occupantProfile: string | null
  primaryStyle: string
  budgetBracket: string
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  )
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

const BUDGET_LABELS: Record<string, string> = {
  economy:  'Economy (< ₹5L)',
  standard: 'Standard (₹5–12L)',
  premium:  'Premium (₹12–25L)',
  luxury:   'Luxury (₹25L+)',
}

export function ProjectInfoSidebar({
  stylePreferences,
  materialPreferences,
  exclusions,
  vastuRequired,
  vastuNotes,
  occupantProfile,
  primaryStyle,
  budgetBracket,
}: ProjectInfoSidebarProps) {
  const [open, setOpen] = useState(true)

  const hasContent = !!(stylePreferences || materialPreferences || exclusions || vastuNotes)

  return (
    <div className={`
      flex-shrink-0 transition-all duration-200
      ${open ? 'w-64' : 'w-10'}
    `}>
      <div className="sticky top-[57px] bg-white border border-stone-200 rounded-xl overflow-hidden">

        {/* Toggle button row */}
        <div className={`flex items-center border-b border-stone-100 px-3 py-2.5 ${open ? 'justify-between' : 'justify-center'}`}>
          {open && (
            <div className="flex items-center gap-1.5 text-stone-600">
              <BookIcon />
              <span className="text-xs font-semibold">Project Brief</span>
            </div>
          )}
          <button
            onClick={() => setOpen(v => !v)}
            className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-0.5"
            title={open ? 'Collapse brief' : 'Expand project brief'}
          >
            {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {open && (
          <div className="p-3 space-y-3 text-xs">

            {/* Style + Budget summary */}
            <div className="bg-stone-50 rounded-lg p-2.5 space-y-1">
              <Row label="Style" value={primaryStyle} />
              <Row label="Budget" value={BUDGET_LABELS[budgetBracket] ?? budgetBracket} />
              {occupantProfile && <Row label="Occupant" value={occupantProfile} />}
            </div>

            {/* Vastu */}
            {vastuRequired !== 'No' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 space-y-1">
                <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Vastu · {vastuRequired}</p>
                {vastuNotes && (
                  <p className="text-stone-600 leading-relaxed text-[10px]">{vastuNotes}</p>
                )}
              </div>
            )}

            {/* Style preferences */}
            {stylePreferences && (
              <BriefSection label="Style Prefs" value={stylePreferences} />
            )}

            {/* Material preferences */}
            {materialPreferences && (
              <BriefSection label="Materials" value={materialPreferences} />
            )}

            {/* Exclusions */}
            {exclusions && (
              <BriefSection label="Exclusions" value={exclusions} accent="red" />
            )}

            {/* Empty state */}
            {!hasContent && (
              <p className="text-stone-300 text-[10px] italic text-center py-2">
                No brief notes yet
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-[10px] text-stone-700 leading-relaxed">{value}</span>
    </div>
  )
}

function BriefSection({ label, value, accent }: { label: string; value: string; accent?: 'red' }) {
  return (
    <div>
      <p className={`text-[9px] font-semibold uppercase tracking-wide mb-0.5 ${
        accent === 'red' ? 'text-red-400' : 'text-stone-400'
      }`}>
        {label}
      </p>
      <p className="text-[10px] text-stone-600 leading-relaxed">{value}</p>
    </div>
  )
}
