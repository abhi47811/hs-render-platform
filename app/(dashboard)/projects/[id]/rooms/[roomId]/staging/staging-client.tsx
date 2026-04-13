'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Render, Room } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { PassSelector } from '@/components/staging/PassSelector';
import { PromptBuilder } from '@/components/staging/PromptBuilder';
import { RenderGallery } from '@/components/staging/RenderGallery';
import { GenerateButton } from '@/components/staging/GenerateButton';
import { allocateReferenceSlots } from '@/lib/prompt/references';
import { ProjectCostBadge } from '@/components/shared/ProjectCostBadge';
// Sprint 4 components
import { StyleSeedPanel } from '@/components/staging/StyleSeedPanel';
import { RoomProgressTimeline } from '@/components/staging/RoomProgressTimeline';
import { CrossRoomStyleBanner } from '@/components/staging/CrossRoomStyleBanner';
// Sprint 5 — Sec 30/41: Revision Workflow
import { RevisionWorkflow } from '@/components/staging/RevisionWorkflow';
import type { Revision } from '@/types/database';
// Sprint 6 — Sec 36: Furniture Reference Library (wired into PromptBuilder)
// Sprint 7 — Sec 28: Day-to-Dusk Lighting Variants (post-CP3)
import { DayToDuskPanel } from '@/components/staging/DayToDuskPanel'
// Sprint 7 — Sec 29: Material & Surface Swap Tool
import { MaterialSwapPanel } from '@/components/staging/MaterialSwapPanel'
// Sprint 7 — Sec 42: Final Export Formats
import { ExportPanel } from '@/components/staging/ExportPanel'
// Sprint 7 — Sec 43: Client Presentation Export
import { PresentationExport } from '@/components/staging/PresentationExport'
// Sprint 8 — A1: Render Lightbox
import { RenderLightbox } from '@/components/staging/RenderLightbox'
import type { LightboxRender } from '@/components/staging/RenderLightbox'
// Sprint 8 — A2: Prompt Preview Modal
import { PromptPreviewModal } from '@/components/staging/PromptPreviewModal'
// Sprint 8 — A5: Cost Alert Banner
import { CostAlertBanner } from '@/components/staging/CostAlertBanner'
// Sprint 8 — A6: Auto-save prompt drafts
import { useAutoSavePrompt } from '@/lib/useAutoSavePrompt'
import { AutoSaveIndicator } from '@/lib/AutoSaveIndicator'
// A3: CheckpointPanel for CP2/CP3 — WhatsApp button + team notes + quality checklist
import { CheckpointPanel } from '@/components/shell/CheckpointPanel'
// S09: Shell Enhancement Pass
import { ShellEnhancement } from '@/components/staging/ShellEnhancement'
// S10: Spatial Analysis
import { SpatialAnalysis } from '@/components/staging/SpatialAnalysis'
// Sprint 9 — A7: Style Seed Evolution Timeline
import { StyleSeedEvolution } from '@/components/staging/StyleSeedEvolution'
// Sprint 9 — A8: Prompt Version History
import { PromptVersionHistory } from '@/components/staging/PromptVersionHistory'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CheckpointRecord {
  id: string;
  checkpoint_number: number;
  status: 'pending' | 'shared' | 'approved';
  client_notes: string | null;
  team_notes: string | null;
  shared_at: string | null;
}

interface StagingPageClientProps {
  room: Room & { projects: any };
  project: any;
  renders: Render[];
  checkpoints: CheckpointRecord[];
  // Sprint 4 — Sec 21: project-level style anchor
  projectStyleSeedUrl: string | null;
  projectStyleSeedRoom: string | null;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function SlotIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

// ─── Pass type mapping ──────────────────────────────────────────────────────

const PASS_TYPES: Record<number, string> = {
  1: 'style_seed',
  2: 'flooring',
  3: 'main_furniture',
  4: 'accent_pieces',
  5: 'lighting',
  6: 'decor',
};

const getPassType = (passNumber: number): string =>
  PASS_TYPES[passNumber] ?? 'main_furniture';

// ─── Auto-resolution per pass context (Sec 33) ─────────────────────────────

const AUTO_RESOLUTION: Record<string, '1K' | '2K' | '4K'> = {
  style_seed:     '1K',
  flooring:       '2K',
  main_furniture: '2K',
  accent_pieces:  '2K',
  lighting:       '2K',
  decor:          '2K',
  revision:       '2K',
  day_to_dusk:    '2K',
  surface_swap:   '2K',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function StagingPageClient({
  room,
  project,
  renders: initialRenders,
  checkpoints,
  projectStyleSeedUrl,
  projectStyleSeedRoom,
}: StagingPageClientProps) {
  const supabase = createClient();

  // ── Pass + generation state ─────────────────────────────────────────────
  const [selectedPass, setSelectedPass] = useState(room.current_pass ?? 1);
  const [prompt, setPrompt] = useState('');
  const [resolutionTier, setResolutionTier] = useState<'1K' | '2K' | '4K'>('2K');
  const [variationCount, setVariationCount] = useState<1 | 2 | 3>(1);
  const [renders, setRenders] = useState<Render[]>(initialRenders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [costRefreshKey, setCostRefreshKey] = useState(0);

  // ── S09: Shell Enhancement state ───────────────────────────────────────
  const [enhancedShellUrl, setEnhancedShellUrl] = useState<string | null>(
    (room as any).enhanced_shell_url ?? null
  )

  // ── S10: Spatial Analysis state ─────────────────────────────────────────
  const [spatialAnalysisData, setSpatialAnalysisData] = useState<Record<string, unknown> | null>(
    room.spatial_analysis ?? null
  )

  // ── Sprint 5: Project status (tracks revisions) ─────────────────────────
  const [projectStatus, setProjectStatus] = useState<string>(project.status ?? 'staging');

  // ── Sprint 6 — Sec 36: Furniture reference URLs (fills Gemini slots 9–14) ─
  const [furnitureRefUrls, setFurnitureRefUrls] = useState<string[]>([]);

  // ── Sprint 8 — A1: Lightbox ────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxRenders: LightboxRender[] = renders.map(r => ({
    id: r.id,
    storage_url: r.storage_url,
    pass_type: r.pass_type ?? 'main_furniture',
    pass_number: r.pass_number,
    status: r.status,
    created_at: r.created_at,
    cost: (r as any).api_cost ?? null,
  }));

  // ── Sprint 8 — A2: Prompt Preview Modal ───────────────────────────────
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // ── Sprint 8 — A6: Auto-save prompt drafts ────────────────────────────
  const { saveState, loadedDraft, isLoadingDraft } = useAutoSavePrompt(
    room.id,
    selectedPass,
    prompt,
  );

  // Load draft into prompt when it arrives (only if prompt is empty)
  useEffect(() => {
    if (!isLoadingDraft && loadedDraft && !prompt) {
      setPrompt(loadedDraft);
    }
  }, [isLoadingDraft, loadedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sprint 8 — A8: Keyboard shortcut — number key selects pass ──────────
  useEffect(() => {
    const handler = (e: Event) => {
      const pass = (e as CustomEvent).detail?.pass;
      if (pass >= 1 && pass <= 6) setSelectedPass(pass);
    };
    window.addEventListener('houspire:selectPass', handler);
    return () => window.removeEventListener('houspire:selectPass', handler);
  }, []);

  // ── Sprint 4: Style state ────────────────────────────────────────────────
  // style_locked: true after CP2 is approved
  const [styleLocked, setStyleLocked] = useState<boolean>(
    !!(room as any).style_locked
  );
  // Local seed URL — updated when a seed render is approved or inherited
  const [localSeedUrl, setLocalSeedUrl] = useState<string | null>(
    (room as any).style_seed_url ?? null
  );

  // ── Checkpoint statuses ──────────────────────────────────────────────────
  const getCP = useCallback((num: number) =>
    checkpoints.find(c => c.checkpoint_number === num) ?? null,
    [checkpoints]
  );

  const cpStatuses = useMemo(() => ({
    cp1: (getCP(1)?.status ?? 'pending') as 'pending' | 'shared' | 'approved',
    cp2: (getCP(2)?.status ?? 'pending') as 'pending' | 'shared' | 'approved',
    cp3: (getCP(3)?.status ?? 'pending') as 'pending' | 'shared' | 'approved',
  }), [getCP]);

  // ── Auto-resolve resolution on pass change (Sec 33) ─────────────────────
  useEffect(() => {
    const auto = AUTO_RESOLUTION[getPassType(selectedPass)] ?? '2K';
    setResolutionTier(auto);
  }, [selectedPass]);

  // ── Render classification ────────────────────────────────────────────────
  // Approved style seed render (for reference Slot 2 + StyleSeedPanel)
  const approvedSeedRender = useMemo(() =>
    renders.find(
      r => r.pass_type === 'style_seed' &&
        (r.status === 'team_approved' || r.status === 'client_approved' || r.status === 'approved')
    ) ?? null,
    [renders]
  );

  // All pass-1 renders that haven't been set as the seed yet
  const pendingSeedRenders = useMemo(() =>
    renders.filter(
      r => r.pass_type === 'style_seed' &&
        r.status !== 'rejected' &&
        r.storage_url !== localSeedUrl
    ),
    [renders, localSeedUrl]
  );

  // All approved renders (for continuity reference slots)
  const approvedRenders = useMemo(() =>
    renders
      .filter(r => r.status === 'team_approved' || r.status === 'client_approved' || r.status === 'approved')
      .map(r => ({
        storage_url: r.storage_url,
        watermarked_url: r.watermarked_url ?? null,
        pass_number: r.pass_number,
      })),
    [renders]
  );

  // ── 14-slot reference allocation ─────────────────────────────────────────
  const referenceAllocation = useMemo(() =>
    allocateReferenceSlots({
      photorealistic_shell_url: room.photorealistic_shell_url,
      enhanced_shell_url: room.enhanced_shell_url,
      original_shell_url: room.original_shell_url,
      approved_renders: approvedRenders,
      style_seed_url: localSeedUrl ?? approvedSeedRender?.storage_url ?? null,
      moodboard_urls: [],
      furniture_ref_urls: furnitureRefUrls,  // Sec 36: wired
      pass_number: selectedPass,
    }),
    [room, approvedRenders, localSeedUrl, approvedSeedRender, selectedPass, furnitureRefUrls]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApprove = async (renderId: string) => {
    try {
      const res = await fetch(`/api/renders/${renderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'team_approved' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRenders(prev => prev.map(r => r.id === renderId ? { ...r, status: 'team_approved' } : r));
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const handleReject = async (renderId: string) => {
    try {
      const res = await fetch(`/api/renders/${renderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRenders(prev => prev.map(r => r.id === renderId ? { ...r, status: 'rejected' } : r));
    } catch (err) {
      console.error('Rejection error:', err);
    }
  };

  const handleGenerateComplete = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('renders')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false });
      if (!error && data) setRenders(data);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
      setCostRefreshKey(k => k + 1);
    }
  };

  // Sec 11: seed render approved → update local seed URL
  const handleSeedApproved = (render: Render) => {
    setLocalSeedUrl(render.storage_url);
    setRenders(prev =>
      prev.map(r => r.id === render.id ? { ...r, status: 'approved' } : r)
    );
  };

  // Sec 21: cross-room seed inherited
  const handleInheritSeed = (url: string) => {
    setLocalSeedUrl(url);
  };

  // Sec 26: CP2 approved → lock style
  const handleStyleLocked = () => {
    setStyleLocked(true);
  };

  // ── Cross-room banner logic ───────────────────────────────────────────────
  // Show only when: project has a style seed from a DIFFERENT room, and current
  // room doesn't already have its own seed
  const showCrossRoomBanner =
    !!projectStyleSeedUrl &&
    !!projectStyleSeedRoom &&
    !localSeedUrl;

  // ── Sec 30: CP3 anchor for revision context ──────────────────────────────
  // The highest-pass approved render is the "final delivered" image — used as
  // Reference 2 (Slot 2 anchor) during revision re-generation.
  const cp3RenderUrl = useMemo(() => {
    if (!approvedRenders.length) return null;
    const sorted = [...approvedRenders].sort((a, b) => b.pass_number - a.pass_number);
    return sorted[0]?.storage_url ?? null;
  }, [approvedRenders]);

  // ── Sec 28: CP3 render prompt (for Day-to-Dusk context) ──────────────────
  const cp3RenderPrompt = useMemo(() => {
    if (!renders.length) return null;
    const cp3Render = renders
      .filter(r => r.status === 'team_approved' || r.status === 'client_approved' || r.status === 'approved')
      .sort((a, b) => b.pass_number - a.pass_number)[0];
    return (cp3Render as any)?.prompt ?? null;
  }, [renders]);

  // ── Sec 30: Revision accepted → switch to staging mode at starting pass ──
  const handleRevisionAccepted = useCallback((revision: Revision, startingPassType: string) => {
    // Map passType back to pass number
    const passEntry = Object.entries(PASS_TYPES).find(([, v]) => v === startingPassType);
    const passNumber = passEntry ? Number(passEntry[0]) : 3;
    setSelectedPass(passNumber);
    setProjectStatus('staging');
    // Refresh renders to pick up any new state
    handleGenerateComplete();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Sprint 4 — Sec 05: Room Progress Timeline */}
      <RoomProgressTimeline
        currentPass={selectedPass}
        styleLocked={styleLocked}
        checkpointStatuses={cpStatuses}
        roomStatus={room.status ?? 'not_started'}
      />

      {/* Sprint 4 — Sec 21: Cross-Room Style Banner (conditional) */}
      {showCrossRoomBanner && (
        <CrossRoomStyleBanner
          projectId={room.project_id}
          currentRoomId={room.id}
          currentRoomHasSeed={!!localSeedUrl}
          projectStyleSeedUrl={projectStyleSeedUrl!}
          projectStyleSeedRoom={projectStyleSeedRoom!}
          onInheritSeed={handleInheritSeed}
        />
      )}

      {/* Sprint 5 — Sec 30/41: Revision Workflow (shown when project is in 'revisions' status) */}
      {projectStatus === 'revisions' && (
        <RevisionWorkflow
          roomId={room.id}
          projectId={room.project_id}
          revisionLimit={project.revision_limit ?? 2}
          cp3RenderUrl={cp3RenderUrl}
          onRevisionAccepted={handleRevisionAccepted}
        />
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Panel — Controls ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-stone-900">{room.room_name}</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                {room.room_type} · {project.primary_style} · {project.city}
              </p>
            </div>
            {/* Sec 44: Running cost total */}
            <ProjectCostBadge
              projectId={room.project_id}
              warnAt={500}
              refreshKey={costRefreshKey}
            />
          </div>

          {/* S09: Shell Enhancement Pass */}
          <ShellEnhancement
            roomId={room.id}
            projectId={room.project_id}
            shellUrl={(room as any).original_shell_url ?? null}
            enhancedShellUrl={enhancedShellUrl}
            onEnhanced={(url) => setEnhancedShellUrl(url)}
          />

          {/* S10: Spatial Analysis — prefers enhanced shell if available */}
          <SpatialAnalysis
            roomId={room.id}
            projectId={room.project_id}
            shellUrl={enhancedShellUrl ?? (room as any).original_shell_url ?? null}
            spatialAnalysis={spatialAnalysisData}
            onAnalysed={(data) => setSpatialAnalysisData(data)}
          />

          {/* Pass Selector */}
          <PassSelector
            currentPass={room.current_pass}
            selectedPass={selectedPass}
            onSelectPass={setSelectedPass}
          />

          {/* Sprint 4 — Sec 11: Style Seed Panel */}
          {(selectedPass === 1 || !approvedSeedRender) && (
            <StyleSeedPanel
              roomId={room.id}
              currentPassNumber={selectedPass}
              seedRender={approvedSeedRender}
              pendingSeedRenders={pendingSeedRenders as any}
              styleLocked={styleLocked}
              onSeedApproved={handleSeedApproved as any}
            />
          )}

          {/* Sprint 9 — A7: Style Seed Evolution Timeline */}
          <StyleSeedEvolution renders={renders} />

          {/* Prompt Builder — 9-block architecture */}
          <PromptBuilder
            roomType={room.room_type}
            roomName={room.room_name}
            primaryStyle={project.primary_style}
            budgetBracket={project.budget_bracket}
            city={project.city ?? 'Bangalore'}
            occupantProfile={project.occupant_profile ?? 'Young Couple'}
            vastuRequired={project.vastu_required ?? 'No'}
            vastuNotes={project.vastu_notes ?? null}
            stylePreferences={project.style_preferences ?? null}
            materialPreferences={project.material_preferences ?? null}
            exclusions={project.exclusions ?? null}
            passType={getPassType(selectedPass)}
            passNumber={selectedPass}
            spatialAnalysis={spatialAnalysisData}
            colourPalette={room.colour_palette ?? null}
            moodboardCount={referenceAllocation.moodboard_count}
            furnitureRefCount={referenceAllocation.furniture_ref_count}
            furnitureRefUrls={furnitureRefUrls}
            onFurnitureRefsChange={setFurnitureRefUrls}
            onPromptChange={setPrompt}
          />

          {/* Generation Settings */}
          <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Generation Settings
            </h3>

            {/* Resolution Tier */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-stone-700">Resolution</label>
                <span className="text-[10px] text-stone-400">Auto-set · override OK</span>
              </div>
              <div className="relative">
                <select
                  value={resolutionTier}
                  onChange={(e) => setResolutionTier(e.target.value as '1K' | '2K' | '4K')}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent cursor-pointer"
                >
                  <option value="1K">1K — ₹2.50 / image</option>
                  <option value="2K">2K — ₹6.00 / image</option>
                  <option value="4K">4K — ₹15.00 / image</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Variation Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700">Variations</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    onClick={() => setVariationCount(count as 1 | 2 | 3)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                      variationCount === count
                        ? 'bg-stone-900 text-white'
                        : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reference Slot Summary */}
          {referenceAllocation.slots.length > 0 && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                <SlotIcon />
                Reference Images ({referenceAllocation.slots.length} / 14)
              </div>
              <div className="grid grid-cols-2 gap-1">
                {referenceAllocation.slots.map(slot => (
                  <div key={slot.slot} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0" />
                    <span className="text-[10px] text-stone-500 truncate">
                      <span className="font-medium">S{slot.slot}:</span> {slot.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sprint 8 — A5: Cost Alert Banner */}
          <CostAlertBanner roomId={room.id} threshold={150} refreshKey={costRefreshKey} />

          {/* Sprint 8 — A2: Preview prompt button + auto-save indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPromptPreview(true)}
                disabled={!prompt.trim()}
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-40"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Preview prompt
              </button>
              {/* Sprint 9 — A8: Prompt Version History */}
              <PromptVersionHistory
                roomId={room.id}
                passNumber={selectedPass}
                onRestore={setPrompt}
              />
            </div>
            <AutoSaveIndicator saveState={saveState} />
          </div>

          {/* Generate Button — Sec 31: onPromptSuggestionAccepted bubbles recovery rewrites into prompt state */}
          {/* Sec 6 Checkpoint gates: CP1 gates Pass 1, CP2 gates Passes 2-5 */}
          <GenerateButton
            roomId={room.id}
            projectId={room.project_id}
            passNumber={selectedPass}
            passType={getPassType(selectedPass)}
            prompt={prompt}
            referenceUrls={referenceAllocation.urls}
            resolutionTier={resolutionTier}
            variationCount={variationCount}
            onComplete={handleGenerateComplete}
            onPromptSuggestionAccepted={setPrompt}
            cp1Status={cpStatuses.cp1}
            cp2Status={cpStatuses.cp2}
          />

          {/* Info hint */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2">
            <InfoIcon />
            <p className="text-xs text-amber-700">
              Each pass builds on the previous one. Approve renders before moving to the next stage.
            </p>
          </div>
        </div>

        {/* ── Right Panel — Render Gallery ── */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-800">Generated Renders</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Pass {selectedPass} · {getPassType(selectedPass).replace(/_/g, ' ')}
                {styleLocked && (
                  <span className="ml-2 text-emerald-600 font-medium">🔒 Style locked</span>
                )}
              </p>
            </div>
            {isRefreshing && (
              <svg className="animate-spin text-stone-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            )}
          </div>

          {/* Sprint 8 — A1: Double-click hint + gallery with lightbox trigger */}
          <p className="text-[10px] text-stone-400 mb-2 text-right">Double-click any render to open full-screen</p>
          <RenderGallery
            renders={renders}
            onApprove={handleApprove}
            onReject={handleReject}
            onDoubleClick={(renderId) => {
              const idx = lightboxRenders.findIndex(r => r.id === renderId);
              if (idx >= 0) setLightboxIndex(idx);
            }}
          />
        </div>
      </div>

      {/* ── CP2: Style Set Checkpoint ── */}
      {/* Shown after CP1 approved — locks style seed, triggers vault save, enables styling passes */}
      {cpStatuses.cp1 === 'approved' && (
        <div className="mt-2">
          <CheckpointPanel
            checkpoint={getCP(2)}
            roomId={room.id}
            projectId={room.project_id}
            checkpointNumber={2}
            styleSeedUrl={localSeedUrl}
            onStyleLocked={() => setStyleLocked(true)}
            clientName={project.client_name ?? null}
            roomName={room.room_name}
            vaultMeta={localSeedUrl ? {
              styleName: `${project.primary_style ?? 'Custom'} — ${room.room_name}`,
              roomType: room.room_type,
              city: project.city ?? null,
              budgetBracket: project.budget_bracket ?? null,
              sourceProjectId: room.project_id,
            } : null}
          />
        </div>
      )}

      {/* ── CP3: Final Sign-off Checkpoint ── */}
      {/* Shown after CP2 approved — shares final renders with client, triggers delivery flow */}
      {cpStatuses.cp2 === 'approved' && (
        <div className="mt-2">
          <CheckpointPanel
            checkpoint={getCP(3)}
            roomId={room.id}
            projectId={room.project_id}
            checkpointNumber={3}
            clientName={project.client_name ?? null}
            roomName={room.room_name}
          />
        </div>
      )}

      {/* ── Sprint 8: A1 Lightbox overlay ── */}
      {lightboxIndex !== null && lightboxRenders.length > 0 && (
        <RenderLightbox
          renders={lightboxRenders}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          roomName={room.room_name}
        />
      )}

      {/* ── Sprint 8: A2 Prompt Preview Modal ── */}
      {showPromptPreview && (
        <PromptPreviewModal
          prompt={prompt}
          passNumber={selectedPass}
          passType={getPassType(selectedPass)}
          resolutionTier={resolutionTier}
          variationCount={variationCount}
          referenceSlots={referenceAllocation.slots.map(s => ({
            slot: s.slot,
            label: s.label,
            url: referenceAllocation.urls[s.slot - 1] ?? '',
          }))}
          onClose={() => setShowPromptPreview(false)}
          onGenerate={handleGenerateComplete}
        />
      )}

      {/* ── Sec 28: Day-to-Dusk Variants (available after CP3 approved) ── */}
      {cpStatuses.cp3 === 'approved' && cp3RenderUrl && (
        <div className="mt-2">
          <DayToDuskPanel
            roomId={room.id}
            projectId={room.project_id}
            cp3RenderUrl={cp3RenderUrl}
            cp3RenderPrompt={cp3RenderPrompt}
            onVariantGenerated={handleGenerateComplete}
          />
        </div>
      )}

      {/* ── Sec 29: Material & Surface Swap Tool (available after Pass 3+) ── */}
      {selectedPass >= 3 && cp3RenderUrl && (
        <div className="mt-2">
          <MaterialSwapPanel
            roomId={room.id}
            projectId={room.project_id}
            baseRenderUrl={cp3RenderUrl}
            onSwapGenerated={handleGenerateComplete}
          />
        </div>
      )}

      {/* ── Sec 42 + 43: Export Formats + Client Presentation PDF (after CP3) ── */}
      {cpStatuses.cp3 === 'approved' && (
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExportPanel
            roomId={room.id}
            projectId={room.project_id}
            roomName={room.room_name}
            approvedRenders={approvedRenders}
          />
          <PresentationExport
            projectId={room.project_id}
            projectName={project.client_name}
            city={project.city ?? ''}
            primaryStyle={project.primary_style ?? ''}
          />
        </div>
      )}
    </div>
  );
}
