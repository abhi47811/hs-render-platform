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
  const { room, project, localCurrentPass, cpStatuses, costRefreshKey } = useStagingContext();

  return (
    <div className="min-h-full bg-background">
      {/* ── Top chrome ── */}
      <div className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 shadow-xs">
        {/* Row 1: Room identity + cost badge */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-[var(--text-primary)] truncate leading-tight tracking-[-0.01em]">
              {room.room_name}
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {room.room_type}
              {project?.primary_style ? ` · ${project.primary_style}` : ''}
              {project?.city ? ` · ${project.city}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(cpStatuses.cp2 === 'approved' || (room as any).style_locked) && (
              <span className="text-[10px] text-[var(--status-ok)] font-semibold bg-[var(--status-ok-bg)] px-1.5 py-0.5 rounded-xs border border-[var(--border)] whitespace-nowrap">
                Style locked
              </span>
            )}
            <ProjectCostBadge
              projectId={room.project_id}
              warnAt={500}
              refreshKey={costRefreshKey}
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
        <CostAlertBanner roomId={room.id} threshold={150} refreshKey={costRefreshKey} />
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
