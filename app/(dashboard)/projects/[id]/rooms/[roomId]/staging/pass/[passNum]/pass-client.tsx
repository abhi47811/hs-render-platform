'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Render } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useStagingContext } from '@/lib/staging-context';

import { PassSelector } from '@/components/staging/PassSelector';
import { PromptBuilder } from '@/components/staging/PromptBuilder';
import { RenderGallery } from '@/components/staging/RenderGallery';
import { GenerateButton } from '@/components/staging/GenerateButton';
import { allocateReferenceSlots } from '@/lib/prompt/references';
import { StyleSeedPanel } from '@/components/staging/StyleSeedPanel';
import { StyleSeedEvolution } from '@/components/staging/StyleSeedEvolution';
import { CrossRoomStyleBanner } from '@/components/staging/CrossRoomStyleBanner';
import { RevisionWorkflow } from '@/components/staging/RevisionWorkflow';
import { RenderLightbox } from '@/components/staging/RenderLightbox';
import type { LightboxRender } from '@/components/staging/RenderLightbox';
import { PromptPreviewModal } from '@/components/staging/PromptPreviewModal';
import { AutoSaveIndicator } from '@/lib/AutoSaveIndicator';
import { PromptVersionHistory } from '@/components/staging/PromptVersionHistory';
import { useAutoSavePrompt } from '@/lib/useAutoSavePrompt';
import { MoodboardPicker } from '@/components/staging/MoodboardPicker';
import type { Revision } from '@/types/database';

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Icons ───────────────────────────────────────────────────────────────────

function SlotIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PassClientProps {
  projectId: string;
  roomId: string;
  passNum: number;
  initialRenders: Render[];
}

export function PassClient({ projectId, roomId, passNum, initialRenders }: PassClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const {
    room,
    project,
    cpStatuses,
    localCurrentPass, setLocalCurrentPass,
    enhancedShellUrl,
    spatialAnalysisData,
    floorPlanData,
    styleLocked,
    localSeedUrl, setLocalSeedUrl,
    projectStatus, setProjectStatus,
    bumpCostRefreshKey,
  } = useStagingContext();

  // ── Local state ────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [resolutionTier, setResolutionTier] = useState<'1K' | '2K' | '4K'>('2K');
  const [variationCount, setVariationCount] = useState<1 | 2 | 3>(1);
  const [renders, setRenders] = useState<Render[]>(initialRenders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([]);
  const [furnitureRefUrls, setFurnitureRefUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // ── Auto-save prompt drafts ────────────────────────────────────────────────
  const { saveState, loadedDraft, isLoadingDraft } = useAutoSavePrompt(
    roomId,
    passNum,
    prompt,
  );

  useEffect(() => {
    if (!isLoadingDraft && loadedDraft && !prompt) {
      setPrompt(loadedDraft);
    }
  }, [isLoadingDraft, loadedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-set resolution on pass ────────────────────────────────────────────
  useEffect(() => {
    const auto = AUTO_RESOLUTION[getPassType(passNum)] ?? '2K';
    setResolutionTier(auto);
  }, [passNum]);

  // ── Keyboard shortcut: number key selects pass ─────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const pass = (e as CustomEvent).detail?.pass;
      if (pass >= 1 && pass <= 6) {
        router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${pass}`);
      }
    };
    window.addEventListener('houspire:selectPass', handler);
    return () => window.removeEventListener('houspire:selectPass', handler);
  }, [projectId, roomId, router]);

  // ── Render classification ──────────────────────────────────────────────────
  const approvedSeedRender = useMemo(() =>
    renders.find(
      r => r.pass_type === 'style_seed' &&
        (r.status === 'team_approved' || r.status === 'client_approved' || r.status === 'approved')
    ) ?? null,
    [renders]
  );

  const pendingSeedRenders = useMemo(() =>
    renders.filter(
      r => r.pass_type === 'style_seed' &&
        r.status !== 'rejected' &&
        r.storage_url !== localSeedUrl
    ),
    [renders, localSeedUrl]
  );

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

  // ── 14-slot reference allocation ──────────────────────────────────────────
  const referenceAllocation = useMemo(() =>
    allocateReferenceSlots({
      photorealistic_shell_url: room.photorealistic_shell_url,
      enhanced_shell_url: room.enhanced_shell_url,
      original_shell_url: room.original_shell_url,
      approved_renders: approvedRenders,
      style_seed_url: localSeedUrl ?? approvedSeedRender?.storage_url ?? null,
      moodboard_urls: moodboardUrls,
      furniture_ref_urls: furnitureRefUrls,
      pass_number: passNum,
    }),
    [room, approvedRenders, localSeedUrl, approvedSeedRender, passNum, furnitureRefUrls, moodboardUrls]
  );

  // ── Cross-room banner ──────────────────────────────────────────────────────
  // Only relevant on pass 1
  const showCrossRoomBanner = passNum === 1 && !localSeedUrl;

  // ── Lightbox renders ───────────────────────────────────────────────────────
  const lightboxRenders: LightboxRender[] = renders.map(r => ({
    id: r.id,
    storage_url: r.storage_url,
    pass_type: r.pass_type ?? 'main_furniture',
    pass_number: r.pass_number,
    status: r.status,
    created_at: r.created_at,
    cost: (r as any).api_cost ?? null,
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = async (renderId: string) => {
    try {
      const res = await fetch(`/api/renders/${renderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'team_approved' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRenders(prev => prev.map(r => r.id === renderId ? { ...r, status: 'team_approved' } : r));
      // Auto-advance to next pass after approval
      const approvedRender = renders.find(r => r.id === renderId);
      if (approvedRender && approvedRender.pass_number === passNum && passNum < 6) {
        router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${passNum + 1}`);
      } else if (approvedRender && passNum === 6) {
        // After pass 6 approval → go to review
        router.push(`/projects/${projectId}/rooms/${roomId}/staging/review`);
      }
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
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setRenders(data);
        if (data.length > 0) {
          const maxGenerated = Math.max(...data.map((r: { pass_number: number }) => r.pass_number));
          setLocalCurrentPass(prev => Math.max(prev, maxGenerated));
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
      bumpCostRefreshKey();
    }
  };

  const handleSeedApproved = (render: Render) => {
    const seedUrl = render.storage_url;
    setLocalSeedUrl(seedUrl);
    setRenders(prev =>
      prev.map(r => r.id === render.id ? { ...r, status: 'approved' } : r)
    );
    // Auto-extract colour palette from approved seed — fire-and-forget, non-blocking
    if (seedUrl) {
      fetch('/api/style/extract-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, project_id: projectId, style_seed_url: seedUrl }),
      }).catch(err => console.warn('[palette] extraction failed silently:', err));
    }
  };

  const handleInheritSeed = (url: string) => {
    setLocalSeedUrl(url);
  };

  const handleRevisionAccepted = useCallback((revision: Revision, startingPassType: string) => {
    const passEntry = Object.entries(PASS_TYPES).find(([, v]) => v === startingPassType);
    const passNumber = passEntry ? Number(passEntry[0]) : 3;
    setProjectStatus('staging');
    router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${passNumber}`);
    handleGenerateComplete();
  }, [projectId, roomId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation handler for PassSelector ───────────────────────────────────
  const handleSelectPass = (pass: number) => {
    router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${pass}`);
  };

  // ── Revision anchor (highest-pass approved render) ─────────────────────────
  const cp3RenderUrl = useMemo(() => {
    if (!approvedRenders.length) return null;
    const sorted = [...approvedRenders].sort((a, b) => b.pass_number - a.pass_number);
    return sorted[0]?.storage_url ?? null;
  }, [approvedRenders]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Revision Workflow — top of page when project is in revisions */}
      {projectStatus === 'revisions' && (
        <RevisionWorkflow
          roomId={roomId}
          projectId={projectId}
          revisionLimit={project.revision_limit ?? 2}
          cp3RenderUrl={cp3RenderUrl}
          onRevisionAccepted={handleRevisionAccepted}
        />
      )}

      {/* Pass 1 only: Cross-room style banner */}
      {passNum === 1 && showCrossRoomBanner && (
        <CrossRoomStyleBanner
          projectId={projectId}
          currentRoomId={roomId}
          currentRoomHasSeed={!!localSeedUrl}
          projectStyleSeedUrl={null}
          projectStyleSeedRoom={null}
          onInheritSeed={handleInheritSeed}
        />
      )}

      {/* Main layout: left controls + right gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── Left: Controls ── */}
        <div className="lg:col-span-1 space-y-3 lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto lg:pr-1" style={{ scrollbarWidth: 'thin' }}>

          {/* Pass Selector */}
          <PassSelector
            currentPass={localCurrentPass}
            selectedPass={passNum}
            onSelectPass={handleSelectPass}
          />

          {/* Moodboard — style vault selections, fills Gemini slots 4–8 */}
          <div className="px-0.5">
            <MoodboardPicker
              roomType={room.room_type}
              primaryStyle={project.primary_style ?? ''}
              selectedUrls={moodboardUrls}
              maxSelections={5}
              onChange={setMoodboardUrls}
            />
          </div>

          {/* Pass 1: Style Seed Panel */}
          {(passNum === 1 || !approvedSeedRender) && (
            <StyleSeedPanel
              roomId={roomId}
              currentPassNumber={passNum}
              seedRender={approvedSeedRender}
              pendingSeedRenders={pendingSeedRenders as any}
              styleLocked={styleLocked}
              onSeedApproved={handleSeedApproved as any}
            />
          )}

          {/* Pass 1: Style Seed Evolution (when multiple seeds exist) */}
          {passNum === 1 && renders.filter(r => r.pass_number === 1).length > 1 && (
            <StyleSeedEvolution renders={renders} />
          )}

          {/* Prompt Builder */}
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
            passType={getPassType(passNum)}
            passNumber={passNum}
            spatialAnalysis={spatialAnalysisData}
            floorPlanData={floorPlanData}
            colourPalette={room.colour_palette ?? null}
            moodboardCount={referenceAllocation.moodboard_count}
            furnitureRefCount={referenceAllocation.furniture_ref_count}
            furnitureRefUrls={furnitureRefUrls}
            onFurnitureRefsChange={setFurnitureRefUrls}
            onPromptChange={setPrompt}
          />

          {/* Generation Settings */}
          <div className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200">
            <div className="relative flex-1">
              <select
                value={resolutionTier}
                onChange={(e) => setResolutionTier(e.target.value as '1K' | '2K' | '4K')}
                className="w-full appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer"
              >
                <option value="1K">1K · ₹2.50</option>
                <option value="2K">2K · ₹6.00</option>
                <option value="4K">4K · ₹15.00</option>
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className="h-5 w-px bg-stone-200 flex-shrink-0" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-stone-400 font-medium mr-0.5">Var</span>
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  onClick={() => setVariationCount(count as 1 | 2 | 3)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    variationCount === count
                      ? 'bg-stone-900 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Slot Summary */}
          {referenceAllocation.slots.length > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200">
              <SlotIcon />
              <span className="text-[10px] text-stone-400 font-medium flex-shrink-0">
                Refs {referenceAllocation.slots.length}/14
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {referenceAllocation.slots.map(slot => (
                  <span key={slot.slot} className="text-[10px] text-stone-500 bg-white border border-stone-200 rounded px-1.5 py-0.5">
                    S{slot.slot}: {slot.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preview + autosave row */}
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
              <PromptVersionHistory
                roomId={roomId}
                passNumber={passNum}
                onRestore={setPrompt}
              />
            </div>
            <AutoSaveIndicator saveState={saveState} />
          </div>

          {/* Generate Button */}
          <GenerateButton
            roomId={roomId}
            projectId={projectId}
            passNumber={passNum}
            passType={getPassType(passNum)}
            prompt={prompt}
            referenceUrls={referenceAllocation.urls}
            resolutionTier={resolutionTier}
            variationCount={variationCount}
            onComplete={handleGenerateComplete}
            onPromptSuggestionAccepted={setPrompt}
            cp1Status={cpStatuses.cp1}
            cp2Status={cpStatuses.cp2}
            existingRenders={renders.map(r => ({ pass_number: r.pass_number, status: r.status }))}
          />

        </div>

        {/* ── Right: Render Gallery ── */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-stone-800">
                Pass {passNum} · {getPassType(passNum).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </h2>
              {styleLocked && (
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  🔒 Style locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400">Double-click to fullscreen</span>
              {isRefreshing && (
                <svg className="animate-spin text-stone-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              )}
            </div>
          </div>

          <RenderGallery
            renders={renders}
            onApprove={handleApprove}
            onReject={handleReject}
            shellUrl={enhancedShellUrl ?? (room as any).original_shell_url ?? null}
            onDoubleClick={(renderId) => {
              const idx = lightboxRenders.findIndex(r => r.id === renderId);
              if (idx >= 0) setLightboxIndex(idx);
            }}
          />

          {/* Pass navigation footer */}
          <div className="mt-4 flex items-center justify-between">
            {passNum > 1 ? (
              <button
                onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${passNum - 1}`)}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                ← Pass {passNum - 1}
              </button>
            ) : (
              <button
                onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/setup`)}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                ← Setup
              </button>
            )}
            {passNum < 6 ? (
              <button
                onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${passNum + 1}`)}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                Pass {passNum + 1} →
              </button>
            ) : (
              <button
                onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/review`)}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                Review →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxRenders.length > 0 && (
        <RenderLightbox
          renders={lightboxRenders}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          roomName={room.room_name}
        />
      )}

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <PromptPreviewModal
          prompt={prompt}
          passNumber={passNum}
          passType={getPassType(passNum)}
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
    </div>
  );
}
