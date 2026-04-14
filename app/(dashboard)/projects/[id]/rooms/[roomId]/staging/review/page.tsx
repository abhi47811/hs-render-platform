import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReviewClient } from './review-client';
import type { Render } from '@/types/database';

interface ReviewPageProps {
  params: { id: string; roomId: string };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  // Gate: at least one generate must have happened
  const { data: room } = await supabase
    .from('rooms')
    .select('current_pass')
    .eq('id', params.roomId)
    .single();

  if (!room || (room.current_pass ?? 0) < 1) {
    redirect(`/projects/${params.id}/rooms/${params.roomId}/staging/pass/1`);
  }

  // Fetch all renders for summary gallery + evolution
  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .order('created_at', { ascending: false });

  return (
    <ReviewClient
      projectId={params.id}
      roomId={params.roomId}
      allRenders={(renders ?? []) as Render[]}
    />
  );
}
