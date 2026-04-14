'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArtifactFlag, Render } from '@/types/database';
import { ArtifactChecker, isApproveBlocked } from './ArtifactChecker';
import { BeforeAfterSlider } from './BeforeAfterSlider';

interface RenderGalleryProps {
  renders: Render[];
  onApprove?: ((renderId: string) => void) | undefined;
  onReject?: ((renderId: string) => void) | undefined;
  /** Original shell URL used as "before" in the Before/After comparison */
  shellUrl?: string | null;
  /** Sprint 8 — A1: Double-click on render image → open lightbox */
  onDoubleClick?: (renderId: string) => void;
}

// ─── Pass name map ────────────────────────────────────────────────────────────
const PASS_NAMES: Record<string, string> = {
  style_seed:    'Style Seed',
  flooring:      'Flooring',
  main_furniture:'Main Furniture',
  accent_pieces: 'Accent Pieces',
  lighting:      'Lighting',
  decor:         'Decor',
  revision:      'Revision',
  day_to_dusk:   'Day to Dusk',
  surface_swap:  'Surface Swap',
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  generated:       { bg: 'bg-stone-100',   text: 'text-stone-600',  label: 'Generated' },
  team_approved:   { bg: 'bg-emerald-100', text: 'text-emerald-700',label: 'Team Approved' },
  client_approved: { bg: 'bg-stone-800',   text: 'text-white',       label: 'Client Approved' },
  rejected:        { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Rejected' },
  not_selected:    { bg: 'bg-stone-100',   text: 'text-stone-600',  label: 'Not Selected' },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

// ─── Single render card ───────────────────────────────────────────────────────
interface RenderCardProps {
  render: Render;
  flags: ArtifactFlag[] | null;
  shellUrl?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onFlagsUpdated: (renderId: string, flags: ArtifactFlag[]) => void;
}

function RenderCard({ render, flags, shellUrl, onApprove, onReject, onFlagsUpdated }: RenderCardProps) {
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const statusConfig = STATUS_CONFIG[render.status] ?? STATUS_CONFIG.generated;
  const isEditable = render.status === 'generated';
  const blocked = isApproveBlocked(flags) && !overrideUnlocked;
  const canCompare = !!shellUrl && !!render.storage_url;

  const handleFlagsUpdated = (renderId: string, newFlags: ArtifactFlag[]) => {
    onFlagsUpdated(renderId, newFlags);
    setOverrideUnlocked(false);
  };

  return (
    <div className="group relative bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image / slider area */}
      {showComparison && canCompare ? (
        <div className="p-2">
          <BeforeAfterSlider
            beforeUrl={shellUrl!}
            afterUrl={render.storage_url}
            beforeLabel="Shell"
            afterLabel="Staged"
            defaultMode="drag"
            showModeToggle={true}
          />
        </div>
      ) : (
        <div className="relative w-full h-52 bg-stone-100">
          {render.storage_url ? (
            <Image
              src={render.storage_url}
              alt={`${render.pass_type} – ${render.variation_label ?? ''}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-stone-400 text-xs">
              Image loading…
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-start justify-between p-2">
            {/* Top badges */}
            <div className="flex gap-1.5 flex-wrap">
              {render.variation_label && (
                <span className="px-2 py-0.5 bg-stone-900 text-white text-[10px] font-semibold rounded">
                  {render.variation_label}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Action buttons — only shown when approve/reject handlers are provided */}
            {isEditable && (onApprove || onReject) && (
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {onApprove && (
                  <button
                    onClick={onApprove}
                    disabled={blocked}
                    title={blocked ? 'Critical artifacts detected — scan expanded for override' : 'Approve this render'}
                    className={`px-3 py-1.5 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                      blocked
                        ? 'bg-stone-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {blocked ? <LockIcon /> : <CheckIcon />}
                    {blocked ? 'Locked' : 'Approve'}
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={onReject}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                  >
                    <XIcon />
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Critical badge overlay — always visible when blocked */}
          {isEditable && blocked && (
            <div className="absolute top-2 right-2">
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded uppercase tracking-wider">
                Critical
              </span>
            </div>
          )}
        </div>
      )}

      {/* Metadata footer */}
      <div className="px-3 py-2 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
        <span className="text-[10px] text-stone-500 tabular-nums">{render.resolution_tier}</span>
        <div className="flex items-center gap-2">
          {/* Before/After toggle button */}
          {canCompare && (
            <button
              onClick={() => setShowComparison((v) => !v)}
              title={showComparison ? 'Show staged only' : 'Compare before/after'}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                showComparison
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              ↔ Compare
            </button>
          )}
          <span className="text-[10px] font-medium text-stone-700 tabular-nums">
            ₹{render.api_cost?.toFixed(2) ?? '—'}
          </span>
        </div>
      </div>

      {/* Artifact Checker — Section 16 */}
      {render.storage_url && !showComparison && (
        <ArtifactChecker
          renderId={render.id}
          renderUrl={render.storage_url}
          existingFlags={flags}
          onFlagsUpdated={handleFlagsUpdated}
        />
      )}
    </div>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
export function RenderGallery({ renders, onApprove, onReject, shellUrl, onDoubleClick }: RenderGalleryProps) {
  // Local state: artifact flags per render (may already be set from DB)
  const [flagsMap, setFlagsMap] = useState<Record<string, ArtifactFlag[] | null>>(() => {
    const initial: Record<string, ArtifactFlag[] | null> = {};
    renders.forEach(r => { initial[r.id] = r.artifact_flags ?? null; });
    return initial;
  });

  const handleFlagsUpdated = (renderId: string, newFlags: ArtifactFlag[]) => {
    setFlagsMap(prev => ({ ...prev, [renderId]: newFlags }));
  };

  if (renders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 py-20">
        <div className="text-center">
          <svg className="w-10 h-10 text-stone-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <p className="text-stone-600 font-medium text-sm">No renders yet</p>
          <p className="text-stone-400 text-xs mt-1">Generate passes to see results here</p>
        </div>
      </div>
    );
  }

  // Group by pass_type (preferred) then pass_number
  const rendersByPass = renders.reduce(
    (acc, render) => {
      const key = render.pass_type ?? String(render.pass_number);
      if (!acc[key]) acc[key] = { passType: render.pass_type, passNumber: render.pass_number, items: [] };
      acc[key].items.push(render);
      return acc;
    },
    {} as Record<string, { passType: string | null; passNumber: number; items: Render[] }>
  );

  const sortedPassKeys = Object.keys(rendersByPass).sort((a, b) => {
    return rendersByPass[a].passNumber - rendersByPass[b].passNumber;
  });

  return (
    <div className="space-y-8 h-full overflow-y-auto">
      {sortedPassKeys.map(key => {
        const group = rendersByPass[key];
        const passLabel = group.passType ? (PASS_NAMES[group.passType] ?? group.passType) : `Pass ${group.passNumber}`;

        return (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                {passLabel}
              </h3>
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[10px] text-stone-400">{group.items.length} render{group.items.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {group.items.map(render => (
                <div key={render.id} onDoubleClick={() => onDoubleClick?.(render.id)}>
                  <RenderCard
                    render={render}
                    flags={flagsMap[render.id] ?? null}
                    shellUrl={shellUrl}
                    onApprove={onApprove ? () => onApprove(render.id) : undefined}
                    onReject={onReject ? () => onReject(render.id) : undefined}
                    onFlagsUpdated={handleFlagsUpdated}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
