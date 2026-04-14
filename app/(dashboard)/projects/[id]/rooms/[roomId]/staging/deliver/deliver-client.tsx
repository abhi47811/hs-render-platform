'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Render } from '@/types/database';
import { useStagingContext } from '@/lib/staging-context';

import { DayToDuskPanel } from '@/components/staging/DayToDuskPanel';
import { MaterialSwapPanel } from '@/components/staging/MaterialSwapPanel';
import { ExportPanel } from '@/components/staging/ExportPanel';
import { PresentationExport } from '@/components/staging/PresentationExport';

interface DeliverClientProps {
  projectId: string;
  roomId: string;
  approvedRenders: Render[];
}

export function DeliverClient({ projectId, roomId, approvedRenders }: DeliverClientProps) {
  const router = useRouter();
  const { room, project } = useStagingContext();

  // Highest-pass approved render → used as anchor for Day-to-Dusk + Material Swap
  const cp3RenderUrl = useMemo(() => {
    if (!approvedRenders.length) return null;
    const sorted = [...approvedRenders].sort((a, b) => b.pass_number - a.pass_number);
    return sorted[0]?.storage_url ?? null;
  }, [approvedRenders]);

  const cp3RenderPrompt = useMemo(() => {
    if (!approvedRenders.length) return null;
    const sorted = [...approvedRenders].sort((a, b) => b.pass_number - a.pass_number);
    return (sorted[0] as any)?.prompt ?? null;
  }, [approvedRenders]);

  // Approved renders in format expected by ExportPanel
  const approvedRendersForExport = approvedRenders.map(r => ({
    storage_url: r.storage_url,
    watermarked_url: r.watermarked_url ?? null,
    pass_number: r.pass_number,
  }));

  const handleVariantGenerated = () => {
    // Refresh to pick up new renders — use router.refresh()
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div>
        <h2 className="text-base font-bold text-stone-900">Delivery Tools</h2>
        <p className="text-[12px] text-stone-500 mt-0.5">
          Post-approval extras: lighting variants, material swaps, exports, and client presentation.
        </p>
      </div>

      {/* Day-to-Dusk Lighting Variants */}
      {cp3RenderUrl && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Day-to-Dusk Lighting Variants</h3>
          <DayToDuskPanel
            roomId={roomId}
            projectId={projectId}
            cp3RenderUrl={cp3RenderUrl}
            cp3RenderPrompt={cp3RenderPrompt}
            onVariantGenerated={handleVariantGenerated}
          />
        </div>
      )}

      {/* Material & Surface Swap */}
      {cp3RenderUrl && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Material & Surface Swap</h3>
          <MaterialSwapPanel
            roomId={roomId}
            projectId={projectId}
            baseRenderUrl={cp3RenderUrl}
            onSwapGenerated={handleVariantGenerated}
          />
        </div>
      )}

      {/* Export + Presentation — side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Export Renders</h3>
          <ExportPanel
            roomId={roomId}
            projectId={projectId}
            roomName={room.room_name}
            approvedRenders={approvedRendersForExport}
          />
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Client Presentation</h3>
          <PresentationExport
            projectId={projectId}
            projectName={project.client_name}
            city={project.city ?? ''}
            primaryStyle={project.primary_style ?? ''}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <button
          onClick={() => router.push(`/projects/${projectId}/rooms/${roomId}/staging/review`)}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Review
        </button>
        <a
          href={`/projects/${projectId}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          Back to Project
        </a>
      </div>
    </div>
  );
}
