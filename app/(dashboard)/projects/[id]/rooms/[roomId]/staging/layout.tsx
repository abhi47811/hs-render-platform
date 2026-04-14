import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StagingLayoutClient } from './layout-client';
import type { Room } from '@/types/database';

interface StagingLayoutProps {
  children: React.ReactNode;
  params: { id: string; roomId: string };
}

export default async function StagingLayout({ children, params }: StagingLayoutProps) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  // Fetch room with full project details
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select(`
      *,
      projects (
        id,
        client_name,
        primary_style,
        budget_bracket,
        city,
        occupant_profile,
        vastu_required,
        vastu_notes,
        style_preferences,
        material_preferences,
        exclusions,
        status,
        project_style_anchor,
        revision_limit
      )
    `)
    .eq('id', params.roomId)
    .eq('project_id', params.id)
    .single();

  if (roomError || !room) redirect(`/projects/${params.id}`);
  if (!room.original_shell_url) redirect(`/projects/${params.id}/rooms/${params.roomId}`);

  // Fetch all checkpoints for this room
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('id, checkpoint_number, status, client_notes, team_notes, shared_at')
    .eq('room_id', params.roomId);

  // Find cross-room style seed
  const project = room.projects as any;
  const projectStyleAnchor = project?.project_style_anchor ?? null;
  let projectStyleSeedRoom: string | null = null;
  if (projectStyleAnchor) {
    const { data: anchorRoom } = await supabase
      .from('rooms')
      .select('id, room_name')
      .eq('project_id', params.id)
      .eq('style_seed_id', projectStyleAnchor)
      .neq('id', params.roomId)
      .limit(1)
      .maybeSingle();
    projectStyleSeedRoom = anchorRoom?.room_name ?? null;
  }

  return (
    <StagingLayoutClient
      room={room as Room & { projects: any }}
      project={project}
      checkpoints={checkpoints ?? []}
      projectStyleSeedUrl={projectStyleAnchor}
      projectStyleSeedRoom={projectStyleSeedRoom}
    >
      {children}
    </StagingLayoutClient>
  );
}
