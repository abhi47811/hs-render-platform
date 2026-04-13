'use client'

// ─── Sec 10: Spatial Analysis Panel ─────────────────────────────────────────
// Calls /api/shell/analyse-space → analyse-space edge function (Gemini vision).
// Parses the room's spatial constraints: furniture zones, forbidden zones,
// doors, windows, structural features. Results flow into PromptBuilder.
//
// States:
//   idle       — no analysis yet, or shell not uploaded
//   analysing  — API call in flight
//   done       — spatial_analysis JSON present, show accordion results
//   error      — API returned error, retry available

import { useState } from 'react'

interface Door {
  location: string
  approximate_position: string
  notes: string
}

interface Window {
  location: string
  approximate_position: string
  light_direction: string
  notes: string
}

interface ForbiddenZone {
  reason: string
  location: string
  approximate_pct: string
}

interface FurnitureZone {
  zone_name: string
  location: string
  approximate_pct: string
  notes: string
}

export interface SpatialConstraintData {
  vanishing_point?: { x_pct: number; y_pct: number }
  depth_planes?: { foreground: string; mid: string; background: string }
  doors?: Door[]
  windows?: Window[]
  forbidden_zones?: ForbiddenZone[]
  furniture_zones?: FurnitureZone[]
  ceiling_height_estimate?: string
  floor_area_estimate?: string
  structural_features?: string[]
  lighting_conditions?: string
  analysis_confidence?: 'high' | 'medium' | 'low'
  analyst_notes?: string
}

interface SpatialAnalysisProps {
  roomId: string
  projectId: string
  /** Best available shell URL (enhanced preferred, falls back to original). Null = no shell yet. */
  shellUrl: string | null
  /** Current spatial_analysis from rooms table. Null if never analysed. */
  spatialAnalysis: Record<string, unknown> | null
  /** Called when analysis succeeds — parent should update local state */
  onAnalysed: (data: Record<string, unknown>) => void
}

type AnalyseState = 'idle' | 'analysing' | 'done' | 'error'

const CONFIDENCE_COLORS: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#F0FDF4', color: '#16A34A' },
  medium: { bg: '#FFFBEB', color: '#D97706' },
  low:    { bg: '#FEF2F2', color: '#DC2626' },
}

export function SpatialAnalysis({
  roomId,
  projectId,
  shellUrl,
  spatialAnalysis: initialData,
  onAnalysed,
}: SpatialAnalysisProps) {
  const [state, setState] = useState<AnalyseState>(initialData ? 'done' : 'idle')
  const [data, setData] = useState<SpatialConstraintData | null>(
    initialData as SpatialConstraintData | null
  )
  const [error, setError] = useState<string | null>(null)
  // Which accordion section is open
  const [openSection, setOpenSection] = useState<string | null>('furniture_zones')

  // ── Trigger analysis ─────────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!shellUrl) return
    setState('analysing')
    setError(null)
    try {
      const res = await fetch('/api/shell/analyse-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, project_id: projectId, shell_url: shellUrl }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `API ${res.status}`)
      }
      const result = await res.json()
      const parsed: SpatialConstraintData = result.spatial_analysis
      if (!parsed) throw new Error('No spatial analysis returned from API')
      setData(parsed)
      setState('done')
      onAnalysed(parsed as unknown as Record<string, unknown>)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setState('error')
    }
  }

  const toggleSection = (key: string) =>
    setOpenSection(prev => (prev === key ? null : key))

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const confidence = data?.analysis_confidence ?? 'medium'
  const confColor = CONFIDENCE_COLORS[confidence] ?? CONFIDENCE_COLORS.medium

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
            Spatial Analysis
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Furniture zones &amp; spatial constraints
          </p>
        </div>
        {state === 'done' && data && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: confColor.bg, color: confColor.color }}
          >
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">

        {/* ── No shell yet ── */}
        {!shellUrl && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Upload a shell photo above to run spatial analysis.
          </p>
        )}

        {/* ── Ready to analyse / error ── */}
        {shellUrl && (state === 'idle' || state === 'error') && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Analyse the room's spatial layout to identify furniture zones, forbidden areas,
              doors, windows, and structural features.
            </p>
            <button
              onClick={handleAnalyse}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Analyse Space
            </button>
          </div>
        )}

        {/* ── Analysing ── */}
        {state === 'analysing' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner size={24} />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Analysing room…</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gemini is mapping spatial constraints</p>
            </div>
          </div>
        )}

        {/* ── Done: accordion results ── */}
        {state === 'done' && data && (
          <div className="space-y-2">

            {/* Quick stats row */}
            <div className="grid grid-cols-4 gap-2 pb-2">
              {[
                { label: 'Zones',    value: data.furniture_zones?.length ?? 0 },
                { label: 'Blocked',  value: data.forbidden_zones?.length ?? 0 },
                { label: 'Doors',    value: data.doors?.length ?? 0 },
                { label: 'Windows',  value: data.windows?.length ?? 0 },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="text-center py-2 rounded-lg"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <p className="text-base font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Accordion: Furniture Zones */}
            <AccordionSection
              id="furniture_zones"
              title="Furniture Zones"
              open={openSection === 'furniture_zones'}
              onToggle={toggleSection}
              badge={data.furniture_zones?.length}
              badgeColor="#C4913A"
            >
              {(data.furniture_zones ?? []).length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No zones identified.</p>
              ) : (
                <div className="space-y-2">
                  {data.furniture_zones!.map((zone, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2.5"
                      style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                    >
                      <p className="text-xs font-semibold" style={{ color: '#92400E' }}>{zone.zone_name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#78350F' }}>{zone.location} — {zone.approximate_pct}</p>
                      {zone.notes && (
                        <p className="text-[11px] mt-0.5 italic" style={{ color: '#A16207' }}>{zone.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            {/* Accordion: Forbidden Zones */}
            <AccordionSection
              id="forbidden_zones"
              title="Forbidden Zones"
              open={openSection === 'forbidden_zones'}
              onToggle={toggleSection}
              badge={data.forbidden_zones?.length}
              badgeColor="#DC2626"
            >
              {(data.forbidden_zones ?? []).length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No constraints identified.</p>
              ) : (
                <div className="space-y-2">
                  {data.forbidden_zones!.map((zone, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2.5"
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
                    >
                      <p className="text-xs font-semibold" style={{ color: '#991B1B' }}>{zone.reason}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#B91C1C' }}>{zone.location} — {zone.approximate_pct}</p>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            {/* Accordion: Openings (Doors + Windows) */}
            <AccordionSection
              id="openings"
              title="Doors &amp; Windows"
              open={openSection === 'openings'}
              onToggle={toggleSection}
              badge={(data.doors?.length ?? 0) + (data.windows?.length ?? 0)}
            >
              <div className="space-y-3">
                {(data.doors ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Doors</p>
                    <div className="space-y-1.5">
                      {data.doors!.map((door, i) => (
                        <div key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">{door.location}</span>
                          {door.approximate_position && ` — ${door.approximate_position}`}
                          {door.notes && <span className="text-[11px] italic ml-1" style={{ color: 'var(--text-muted)' }}>({door.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(data.windows ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Windows</p>
                    <div className="space-y-1.5">
                      {data.windows!.map((win, i) => (
                        <div key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">{win.location}</span>
                          {win.approximate_position && ` — ${win.approximate_position}`}
                          {win.light_direction && (
                            <span className="ml-1" style={{ color: '#C4913A' }}>💡 {win.light_direction}</span>
                          )}
                          {win.notes && <span className="text-[11px] italic ml-1" style={{ color: 'var(--text-muted)' }}>({win.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* Accordion: Room Metrics */}
            <AccordionSection
              id="metrics"
              title="Room Metrics"
              open={openSection === 'metrics'}
              onToggle={toggleSection}
            >
              <div className="space-y-2.5">
                {data.ceiling_height_estimate && (
                  <MetricRow label="Ceiling height" value={data.ceiling_height_estimate} />
                )}
                {data.floor_area_estimate && (
                  <MetricRow label="Floor area" value={data.floor_area_estimate} />
                )}
                {data.lighting_conditions && (
                  <MetricRow label="Lighting" value={data.lighting_conditions} />
                )}
                {(data.structural_features ?? []).length > 0 && (
                  <div>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Structural features</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.structural_features!.map((feat, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.analyst_notes && (
                  <div
                    className="text-[11px] italic px-3 py-2 rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                  >
                    {data.analyst_notes}
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* Re-analyse link */}
            <button
              onClick={() => { setState('idle'); setData(null) }}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Re-analyse space
            </button>
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-lg px-4 py-3 flex items-start gap-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AccordionSection ────────────────────────────────────────────────────────

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  badge,
  badgeColor = 'var(--text-muted)',
  children,
}: {
  id: string
  title: string
  open: boolean
  onToggle: (id: string) => void
  badge?: number
  badgeColor?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{ background: open ? 'var(--surface-2)' : 'var(--surface)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {badge !== undefined && badge > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
              style={{ background: badgeColor + '20', color: badgeColor }}
            >
              {badge}
            </span>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── MetricRow ───────────────────────────────────────────────────────────────

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[11px] font-medium text-right" style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      style={{ width: size, height: size, color: 'var(--brand)' }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
