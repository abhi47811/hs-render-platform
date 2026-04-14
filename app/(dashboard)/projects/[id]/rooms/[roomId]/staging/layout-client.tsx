'use client';

import { ReactNode } from 'react';
import { StagingProvider, useStagingContext } from '@/lib/staging-context';
import { StepProgressNav } from '@/components/staging/StepProgressNav';
import { ProjectCostBadge } from '@/components/shared/ProjectCostBadge';
import { CostAlertBanner } from '@/components/staging/CostAlertBanner';
import type { Room } from '@/types/database';

interface StagingLayoutClientProps {
  children: ReactNode;
  room: Room & { projects: any };
  project: any;
  checkpoints: any[];
  projectStyleSeedUrl: string | null;
  projectStyleSeedRoom: string | null;
}

// Inner component that consumes context (must be inside StagingProvider)
function StagingLayoutInner({
  children,
  projectStyleSeedUrl,
  projectStyleSeedRoom,
}: {
  children: ReactNode;
  projectStyleSeedUrl: string | null;
  projectStyleSeedRoom: string | null;
}) {
  const { room, project, localCurrentPass, cpStatuses } = useStagingContext();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Top chrome ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-2.5 shadow-sm">
        {/* Row 1: Room identity + cost badge */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-stone-900 truncate leading-tight">
              {room.room_name}
            </h1>
            <p className="text-[11px] text-stone-500 truncate">
              {room.room_type}
              {project?.primary_style ? ` · ${project.primary_style}` : ''}
              {project?.city ? ` · ${project.city}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(cpStatuses.cp2 === 'approved' || (room as any).style_locked) && (
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                🔒 Style locked
              </span>
            )}
            <ProjectCostBadge
              projectId={room.project_id}
              warnAt={500}
              refreshKey={0}
            />
          </div>
        </div>

        {/* Row 2: Step progress nav */}
        <StepProgressNav
          projectId={room.project_id}
          roomId={room.id}
          localCurrentPass={localCurrentPass}
          cpStatuses={cpStatuses}
        />
      </div>

      {/* ── Cost alert (shown when threshold exceeded) ── */}
      <div className="px-4 pt-2">
        <CostAlertBanner roomId={room.id} threshold={150} refreshKey={0} />
      </div>

      {/* ── Page content ── */}
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}

export function StagingLayoutClient({
  children,
  room,
  project,
  checkpoints,
  projectStyleSeedUrl,
  projectStyleSeedRoom,
}: StagingLayoutClientProps) {
  return (
    <StagingProvider room={room} project={project} checkpoints={checkpoints}>
      <StagingLayoutInner
        projectStyleSeedUrl={projectStyleSeedUrl}
        projectStyleSeedRoom={projectStyleSeedRoom}
      >
        {children}
      </StagingLayoutInner>
    </StagingProvider>
  );
}
