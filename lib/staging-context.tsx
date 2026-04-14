'use client';

import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import type { Room } from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────────────────

type CPStatus = 'pending' | 'shared' | 'approved';

interface CheckpointRecord {
  id: string;
  checkpoint_number: number;
  status: CPStatus;
  client_notes: string | null;
  team_notes: string | null;
  shared_at: string | null;
}

export interface StagingContextValue {
  // ── Shadow values (mirror DB fields, updated client-side after actions) ──
  localCurrentPass: number;
  setLocalCurrentPass: (n: number | ((prev: number) => number)) => void;

  enhancedShellUrl: string | null;
  setEnhancedShellUrl: (url: string | null) => void;

  spatialAnalysisData: Record<string, unknown> | null;
  setSpatialAnalysisData: (d: Record<string, unknown> | null) => void;

  floorPlanData: Record<string, unknown> | null;
  setFloorPlanData: (d: Record<string, unknown> | null) => void;

  styleLocked: boolean;
  setStyleLocked: (v: boolean) => void;

  localSeedUrl: string | null;
  setLocalSeedUrl: (url: string | null) => void;

  projectStatus: string;
  setProjectStatus: (s: string) => void;

  // ── Derived from server-fetched checkpoints ──────────────────────────────
  cpStatuses: { cp1: CPStatus; cp2: CPStatus; cp3: CPStatus };
  checkpoints: CheckpointRecord[];

  // ── Cost refresh key (incremented after each generation to re-poll badges) ──
  costRefreshKey: number;
  bumpCostRefreshKey: () => void;

  // ── Room + project (read-only, from server) ──────────────────────────────
  room: Room & { projects: any };
  project: any;
}

const StagingContext = createContext<StagingContextValue | null>(null);

export function useStagingContext(): StagingContextValue {
  const ctx = useContext(StagingContext);
  if (!ctx) throw new Error('useStagingContext must be used within StagingLayoutClient');
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface StagingProviderProps {
  children: ReactNode;
  room: Room & { projects: any };
  project: any;
  checkpoints: CheckpointRecord[];
}

export function StagingProvider({ children, room, project, checkpoints }: StagingProviderProps) {
  const [localCurrentPass, setLocalCurrentPass] = useState<number>(
    (room as any).current_pass ?? 0
  );
  const [enhancedShellUrl, setEnhancedShellUrl] = useState<string | null>(
    (room as any).enhanced_shell_url ?? null
  );
  const [spatialAnalysisData, setSpatialAnalysisData] = useState<Record<string, unknown> | null>(
    (room as any).spatial_analysis ?? null
  );
  const [floorPlanData, setFloorPlanData] = useState<Record<string, unknown> | null>(
    (room as any).floor_plan_data ?? null
  );
  const [styleLocked, setStyleLocked] = useState<boolean>(
    !!(room as any).style_locked
  );
  const [localSeedUrl, setLocalSeedUrl] = useState<string | null>(
    (room as any).style_seed_url ?? null
  );
  const [projectStatus, setProjectStatus] = useState<string>(
    project?.status ?? 'staging'
  );
  const [costRefreshKey, setCostRefreshKey] = useState<number>(0);
  const bumpCostRefreshKey = useCallback(() => setCostRefreshKey(k => k + 1), []);

  const cpStatuses = useMemo(() => {
    const getCP = (num: number) => checkpoints.find(c => c.checkpoint_number === num) ?? null;
    return {
      cp1: (getCP(1)?.status ?? 'pending') as CPStatus,
      cp2: (getCP(2)?.status ?? 'pending') as CPStatus,
      cp3: (getCP(3)?.status ?? 'pending') as CPStatus,
    };
  }, [checkpoints]);

  const value: StagingContextValue = {
    localCurrentPass,
    setLocalCurrentPass,
    enhancedShellUrl,
    setEnhancedShellUrl,
    spatialAnalysisData,
    setSpatialAnalysisData,
    floorPlanData,
    setFloorPlanData,
    styleLocked,
    setStyleLocked,
    localSeedUrl,
    setLocalSeedUrl,
    projectStatus,
    setProjectStatus,
    costRefreshKey,
    bumpCostRefreshKey,
    cpStatuses,
    checkpoints,
    room,
    project,
  };

  return (
    <StagingContext.Provider value={value}>
      {children}
    </StagingContext.Provider>
  );
}
