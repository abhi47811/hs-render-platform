'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Render } from '@/types/database';
import { useStagingContext } from '@/lib/staging-context';

import { RoomProgressTimeline } from '@/components/staging/RoomProgressTimeline';
import { StyleSeedEvolution } from '@/components/staging/StyleSeedEvolution';
import { CheckpointPanel } from '@/components/shell/CheckpointPanel';
import { RenderGallery } from '@/components/staging/RenderGallery';
import { RenderLightbox } from '@/components/staging/RenderLightbox';
import type { LightboxRender } from '@/components/staging/RenderLightbox';
import { PromptVersionHistory } from '@/components/staging/PromptVersionHistory';

interface ReviewClientProps {
  projectId: string;
  roomId: string;
  allRenders: Render[];
}

export function ReviewClient({ projectId, roomId, allRenders }: ReviewClientProps) {
  const router = useRouter();
  const {
    room,
    project,
    checkpoints,
    cpStatuses,
    styleLocked, setStyleLocked,
    localSeedUrl,
  } = useStagingContext();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const getCP = (num: number) => checkpoints.find(c => c.checkpoint_number === num) ?? null;

  // Approved renders (all passes) for summary gallery
  const approvedRenders = useMemo(() =>
    allRenders.filter(
      r => r.status === 'team_approved' || r.status === 'client_approved' || r.status === 'approved'
    ),
    [allRenders]
  );

  // Count distinct pass numbers that have at least one approved render
  // Used to auto-verify cp3_allpasses checklist item when all 6 passes are done
  const approvedPassCount = useMemo(() => {
    const passNums = new Set(
      approvedRenders.map(r => r.pass_number)
    );
    return passNums.size;
  }, [approvedRenders]);

  const lightboxRenders: LightboxRender[] = allRenders.map(r => ({
    id: r.id,
    storage_url: r.storage_url,
    pass_type: r.pass_type ?? 'main_furniture',
    pass_number: r.pass_number,
    status: r.status,
    created_at: r.created_at,
    cost: (r as any).api_cost ?? null,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div>
        <h2 className="text-base font-bold text-stone-900">Review & Sign-off</h2>
        <p className="text-[12px] text-stone-500 mt-0.5">
          Review all passes, share with your client, and get final approval.
        </p>
      </div>

      {/* Room Progress Timeline */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <RoomProgressTimeline
          currentPass={allRenders.length > 0
            ? Math.max(...allRenders.map(r => r.pass_number))
            : 0}
          styleLocked={styleLocked}
          checkpointStatuses={cpStatuses}
          roomStatus={room.status ?? 'not_started'}
        />
      </div>

      {/* Style Seed Evolution — when multiple seed renders exist */}
      {allRenders.filter(r => r.pass_number === 1).length > 1 && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Style Seed Evolution</h3>
          <StyleSeedEvolution renders={allRenders} />
        </div>
      )}

      {/* All Approved Renders — summary gallery (read-only) */}
      {approvedRenders.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">Approved Renders</h3>
            <span className="text-[10px] text-stone-400">
              {approvedRenders.length} render{approvedRenders.length !== 1 ? 's' : ''} across all passes
            </span>
          </div>
          <RenderGallery
            renders={approvedRenders}
            onApprove={undefined}
            onReject={undefined}
            shellUrl={(room as any).original_shell_url ?? null}
            onDoubleClick={(renderId) => {
              const idx = lightboxRenders.findIndex(r => r.id === renderId);
              if (idx >= 0) setLightboxIndex(idx);
            }}
          />
        </div>
      )}

      {/* CP2: Style Set Checkpoint */}
      {cpStatuses.cp1 === 'approved' && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Checkpoint 2 — Style Set</h3>
          <CheckpointPanel
            checkpoint={getCP(2)}
            roomId={roomId}
            projectId={projectId}
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

      {/* CP3: Final Sign-off Checkpoint */}
      {cpStatuses.cp2 === 'approved' && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Checkpoint 3 — Final Sign-off</h3>
          <CheckpointPanel
            checkpoint={getCP(3)}
            roomId={roomId}
            projectId={projectId}
            checkpointNumber={3}
            clientName={project.client_name ?? null}
            roomName={room.room_name}
            approvedPassCount={approvedPassCount}
          />
        </div>
      )}

      {/* Prompt Version History — all passes */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-800 mb-3">Prompt History</h3>
        {[1, 2, 3, 4, 5, 6].map(pass => (
          <div key={pass} className="mb-2">
            <PromptVersionHistory
              roomId={roomId}
              passNumber={pass}
              onRestore={() => {
                // Navigate to that pass if restoring
                router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${pass}`);
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <button
          onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/6`)}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Pass 6
        </button>
        {cpStatuses.cp3 === 'approved' && (
          <button
            onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/deliver`)}
            className="px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-lg hover:bg-stone-800 transition-colors"
          >
            Delivery Tools →
          </button>
        )}
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
    </div>
  );
}
