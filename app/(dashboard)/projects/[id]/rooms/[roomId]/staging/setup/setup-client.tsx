'use client';

import { useRouter } from 'next/navigation';
import { useStagingContext } from '@/lib/staging-context';
import { ShellEnhancement } from '@/components/staging/ShellEnhancement';
import { SpatialAnalysis } from '@/components/staging/SpatialAnalysis';
import { FloorPlanUpload } from '@/components/shell/FloorPlanUpload';
import { CrossRoomStyleBanner } from '@/components/staging/CrossRoomStyleBanner';
import { RevisionWorkflow } from '@/components/staging/RevisionWorkflow';
import { CheckpointPanel } from '@/components/shell/CheckpointPanel';
import type { Revision } from '@/types/database';

interface SetupClientProps {
  projectId: string;
  roomId: string;
  checkpoints: any[];
  projectStyleSeedUrl: string | null;
  projectStyleSeedRoom: string | null;
  project: any;
}

export function SetupClient({
  projectId,
  roomId,
  checkpoints,
  projectStyleSeedUrl,
  projectStyleSeedRoom,
  project,
}: SetupClientProps) {
  const router = useRouter();
  const {
    room,
    enhancedShellUrl, setEnhancedShellUrl,
    spatialAnalysisData, setSpatialAnalysisData,
    floorPlanData, setFloorPlanData,
    localSeedUrl, setLocalSeedUrl,
    cpStatuses,
    projectStatus, setProjectStatus,
  } = useStagingContext();

  const cp1 = checkpoints.find(c => c.checkpoint_number === 1) ?? null;

  const showCrossRoomBanner =
    !!projectStyleSeedUrl &&
    !!projectStyleSeedRoom &&
    !localSeedUrl;

  const handleRevisionAccepted = (revision: Revision, startingPassType: string) => {
    const PASS_TYPES: Record<number, string> = {
      1: 'style_seed', 2: 'flooring', 3: 'main_furniture',
      4: 'accent_pieces', 5: 'lighting', 6: 'decor',
    };
    const passEntry = Object.entries(PASS_TYPES).find(([, v]) => v === startingPassType);
    const passNumber = passEntry ? Number(passEntry[0]) : 3;
    setProjectStatus('staging');
    router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/${passNumber}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Revision workflow — shown when project is in revisions */}
      {projectStatus === 'revisions' && (
        <RevisionWorkflow
          roomId={roomId}
          projectId={projectId}
          revisionLimit={project?.revision_limit ?? 2}
          cp3RenderUrl={null}
          onRevisionAccepted={handleRevisionAccepted}
        />
      )}

      {/* Cross-room style banner */}
      {showCrossRoomBanner && (
        <CrossRoomStyleBanner
          projectId={projectId}
          currentRoomId={roomId}
          currentRoomHasSeed={!!localSeedUrl}
          projectStyleSeedUrl={projectStyleSeedUrl!}
          projectStyleSeedRoom={projectStyleSeedRoom!}
          onInheritSeed={(url) => setLocalSeedUrl(url)}
        />
      )}

      {/* Page header */}
      <div>
        <h2 className="text-base font-bold text-stone-900">Room Setup</h2>
        <p className="text-[12px] text-stone-500 mt-0.5">
          Prepare your room shell before generating. These steps are optional but improve render quality.
        </p>
      </div>

      {/* Shell Enhancement */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-stone-800">Shell Enhancement</h3>
          <p className="text-[11px] text-stone-500">Remove furniture and clean the room shell</p>
        </div>
        <ShellEnhancement
          roomId={roomId}
          projectId={projectId}
          shellUrl={(room as any).original_shell_url ?? null}
          enhancedShellUrl={enhancedShellUrl}
          onEnhanced={(url) => setEnhancedShellUrl(url)}
        />
      </div>

      {/* Spatial Analysis */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-stone-800">Spatial Analysis</h3>
          <p className="text-[11px] text-stone-500">Analyse room zones to guide furniture placement</p>
        </div>
        <SpatialAnalysis
          roomId={roomId}
          projectId={projectId}
          shellUrl={enhancedShellUrl ?? (room as any).original_shell_url ?? null}
          spatialAnalysis={spatialAnalysisData}
          onAnalysed={(data) => setSpatialAnalysisData(data)}
        />
      </div>

      {/* Floor Plan Upload */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-stone-800">Floor Plan</h3>
          <p className="text-[11px] text-stone-500">Upload a floor plan for precise furniture positioning</p>
        </div>
        <FloorPlanUpload
          roomId={roomId}
          projectId={projectId}
          existingFloorPlanUrl={(room as any).floor_plan_url ?? null}
          floorPlanData={floorPlanData}
          onParsed={(data) => {
            setFloorPlanData(data);
            router.refresh();
          }}
        />
      </div>

      {/* CP1: Shell Approved — explicit checkpoint action */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <CheckpointPanel
          checkpoint={cp1}
          roomId={roomId}
          projectId={projectId}
          checkpointNumber={1}
          clientName={project?.client_name ?? null}
          roomName={room.room_name}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <a
          href={`/projects/${projectId}/rooms/${roomId}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Back to Room
        </a>
        <button
          onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/pass/1`)}
          className="px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-lg hover:bg-stone-800 transition-colors"
        >
          Start Staging →
        </button>
      </div>
    </div>
  );
}
