'use client';

import { useState, useEffect } from 'react';

// ─── Checklist definitions ────────────────────────────────────────────────────
// Each checkpoint has a different set of mandatory checks that the team must
// tick before the share/approve action is enabled.

type CheckpointType = 1 | 2 | 3 | 'revision';

const CHECKLISTS: Record<CheckpointType, { id: string; label: string }[]> = {
  // CP1 — Shell Approval (5 items)
  1: [
    { id: 'cp1_sharp',      label: 'Shell is sharp and properly lit — no blur, grain, or overexposure' },
    { id: 'cp1_complete',   label: 'All surfaces visible and complete (walls, floor, ceiling — no clipping)' },
    { id: 'cp1_cleared',    label: 'No furniture, fixtures, or objects from the original Coohom photo remain' },
    { id: 'cp1_spatial',    label: 'Spatial analysis has been reviewed and confirmed by the team' },
    { id: 'cp1_nologo',     label: 'No Coohom watermarks, logos, or UI text visible anywhere in image' },
  ],

  // CP2 — Style Set (4 items)
  2: [
    { id: 'cp2_seed',       label: 'Style seed render has been team-approved and locked' },
    { id: 'cp2_palette',    label: 'Colour palette has been extracted and locked in the system' },
    { id: 'cp2_prefs',      label: 'Client style preferences, materials, and exclusions are reflected in the direction' },
    { id: 'cp2_vastu',      label: 'Vastu requirements verified and Block 9 confirmed (or Vastu marked as N/A)' },
  ],

  // CP3 — Final Sign-off (10 items)
  3: [
    { id: 'cp3_allpasses',  label: 'All staging passes complete (flooring, furniture, accents, lighting, decor)' },
    { id: 'cp3_nocritical', label: 'No Critical artifact flags on any approved render — or each is documented as overridden' },
    { id: 'cp3_watermarks', label: 'Watermarked versions generated for ALL approved renders' },
    { id: 'cp3_cpshared',   label: 'Client presentation link shared and confirmed as working' },
    { id: 'cp3_budget',     label: 'Budget accuracy verified — BOQ figures cross-checked' },
    { id: 'cp3_vendors',    label: 'Verified vendor list attached with contact details and lead times' },
    { id: 'cp3_allrooms',   label: 'All contracted room renders are included in the delivery package' },
    { id: 'cp3_finalqc',    label: 'Final visual QC completed on each render by a senior team member' },
    { id: 'cp3_sharelink',  label: 'Final delivery share link tested and confirmed accessible without login' },
    { id: 'cp3_notes',      label: 'Project delivery notes and any deviations from brief are documented' },
  ],

  // Revision (4 items)
  revision: [
    { id: 'rev_brief',      label: 'Revision brief is clearly documented with specific change requests' },
    { id: 'rev_ref',        label: 'Reference render identified for visual continuity (geometry + palette anchor)' },
    { id: 'rev_scope',      label: 'Changes confirmed to be within contracted revision scope (not a new design)' },
    { id: 'rev_preserved',  label: 'Previously approved renders have been preserved and are not overwritten' },
  ],
};

const CP_LABELS: Record<CheckpointType, string> = {
  1:        'CP1 Pre-Share Checklist — Shell Approval',
  2:        'CP2 Pre-Share Checklist — Style Set',
  3:        'CP3 Pre-Share Checklist — Final Delivery',
  revision: 'Revision Checklist',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface QualityChecklistProps {
  checkpointType: CheckpointType;
  /** Called whenever the all-checked state changes — parent uses this to enable/disable share button */
  onAllChecked: (allDone: boolean) => void;
  /** Optional: reset key — when this changes, all checkboxes reset */
  resetKey?: string | number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function QualityChecklist({
  checkpointType,
  onAllChecked,
  resetKey,
}: QualityChecklistProps) {
  const items = CHECKLISTS[checkpointType] ?? [];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Reset when resetKey changes (e.g. new render generated)
  useEffect(() => {
    setChecked({});
    onAllChecked(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const allDone = checkedCount === items.length;

  const handleToggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    const done = Object.values(next).filter(Boolean).length === items.length;
    onAllChecked(done);
  };

  const progressPct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-stone-800">{CP_LABELS[checkpointType]}</h4>
          <p className="text-[10px] text-stone-400 mt-0.5">
            Must tick all items before sharing
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {allDone ? (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-lg">
              ✓ All clear
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-stone-500 tabular-nums">
              {checkedCount}/{items.length}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-stone-100">
        <div
          className={`h-full transition-all duration-300 rounded-full ${allDone ? 'bg-emerald-500' : 'bg-stone-400'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="p-4 space-y-3">
        {items.map(item => (
          <label
            key={item.id}
            className="flex items-start gap-3 cursor-pointer group"
          >
            <div className={`
              w-4 h-4 flex-shrink-0 mt-0.5 rounded border-2 flex items-center justify-center transition-colors
              ${checked[item.id]
                ? 'bg-stone-900 border-stone-900'
                : 'bg-white border-stone-300 group-hover:border-stone-500'
              }
            `}>
              {checked[item.id] && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
              <input
                type="checkbox"
                className="sr-only"
                checked={!!checked[item.id]}
                onChange={() => handleToggle(item.id)}
              />
            </div>
            <span className={`text-xs leading-snug transition-colors ${
              checked[item.id] ? 'text-stone-400 line-through' : 'text-stone-700 group-hover:text-stone-900'
            }`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {/* Footer gate message */}
      {!allDone && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex gap-2">
            <svg className="flex-shrink-0 mt-0.5 text-amber-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-[10px] text-amber-700">
              Complete all {items.length - checkedCount} remaining item{items.length - checkedCount !== 1 ? 's' : ''} to unlock the share action.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Type exports for CheckpointPanel ────────────────────────────────────────
export type { CheckpointType };
