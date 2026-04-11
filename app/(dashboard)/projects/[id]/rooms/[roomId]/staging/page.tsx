import { createClient } from '@/lib/supabase/server';
import { Render, Room } from '@/types/database';
import { redirect } from 'next/navigation';
import { PassSelector } from '@/components/staging/PassSelector';
import { PromptBuilder } from '@/components/staging/PromptBuilder';
import { RenderGallery } from '@/components/staging/RenderGallery';
import { GenerateButton } from '@/components/staging/GenerateButton';
import { StagingPageClient } from './staging-client';

interface StagingPageProps {
  params: {
    id: string;
    roomId: string;
  };
}

export default async function StagingPage({ params }: StagingPageProps) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Fetch room with project details
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select(
      `
      *,
      projects (
        id,
        primary_style,
        budget_bracket,
        vastu_required,
        style_preferences,
        material_preferences,
        exclusions,
        project_style_anchor
      )
    `
    )
    .eq('id', params.roomId)
    .eq('project_id', params.id)
    .single();

  if (roomError || !room) {
    redirect(`/projects/${params.id}/rooms/${params.roomId}`);
  }

  // Get renders for this room
  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .order('created_at', { ascending: false });

  const project = room.projects as any;
  const roomData: Room & { projects: any } = room;

  // Check if checkpoint 1 (shell enhancement) is approved
  const cp1Approved = roomData.status === 'in_progress' || roomData.status === 'delivered';

  if (!cp1Approved) {
    redirect(`/projects/${params.id}/rooms/${params.roomId}`);
  }

  // Prepare props for client component
  const renderList: Render[] = renders || [];

  return (
    <StagingPageClient
      room={roomData}
      project={project}
      renders={renderList}
    />
  );
}
