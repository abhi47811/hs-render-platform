import { createClient } from '@/lib/supabase/server';
import { Render, Room } from '@/types/database';
import { redirect } from 'next/navigation';
import { StagingPageClient } from './staging-client';

interface StagingPageProps {
  params: {
    id: string;
    roomId: string;
  };
}

export default async function StagingPage({ params }: StagingPageProps) {
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  // Fetch room with full project details (all fields for prompt assembly + Sprint 4)
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
        style_seed_url
      )
    `)
    .eq('id', params.roomId)
    .eq('project_id', params.id)
    .single();

  if (roomError || !room) redirect(`/projects/${params.id}/rooms/${params.roomId}`);

  // Guard: must have shell approved before staging
  const cp1Approved = room.status !== 'not_started' && room.status !== 'intake';
  if (!cp1Approved) redirect(`/projects/${params.id}/rooms/${params.roomId}`);

  // Fetch renders
  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .order('created_at', { ascending: false });

  // Fetch checkpoints for this room
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('id, checkpoint_number, status, client_notes, team_notes, shared_at, approved_at')
    .eq('room_id', params.roomId);

  // Sprint 4 — Sec 21: find which room in this project owns the project-level style seed
  const project = room.projects as any;
  let projectStyleSeedRoom: string | null = null;
  if (project?.style_seed_url) {
    const { data: anchorRoom } = await supabase
      .from('rooms')
      .select('id, room_name')
      .eq('project_id', params.id)
      .eq('style_seed_url', project.style_seed_url)
      .neq('id', params.roomId)
      .limit(1)
      .single();
    projectStyleSeedRoom = anchorRoom?.room_name ?? 'another room';
  }

  const renderList: Render[] = renders || [];
  const cpList = checkpoints || [];

  return (
    <StagingPageClient
      room={room as Room & { projects: any }}
      project={project}
      renders={renderList}
      checkpoints={cpList}
      projectStyleSeedUrl={project?.style_seed_url ?? null}
      projectStyleSeedRoom={projectStyleSeedRoom}
    />
  );
}
