import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SetupClient } from './setup-client';

interface SetupPageProps {
  params: { id: string; roomId: string };
}

export default async function SetupPage({ params }: SetupPageProps) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  // Fetch checkpoint 1 to show CP1 panel
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('id, checkpoint_number, status, client_notes, team_notes, shared_at')
    .eq('room_id', params.roomId);

  // Fetch room for cross-room banner data
  const { data: room } = await supabase
    .from('rooms')
    .select('id, room_name, room_type, project_id, original_shell_url, enhanced_shell_url, spatial_analysis, floor_plan_data, style_seed_url, projects(project_style_anchor, client_name, primary_style, city, budget_bracket)')
    .eq('id', params.roomId)
    .single();

  if (!room) redirect(`/projects/${params.id}/rooms/${params.roomId}`);

  const project = (room as any).projects as any;
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
    <SetupClient
      projectId={params.id}
      roomId={params.roomId}
      checkpoints={checkpoints ?? []}
      projectStyleSeedUrl={projectStyleAnchor}
      projectStyleSeedRoom={projectStyleSeedRoom}
      project={project}
    />
  );
}
