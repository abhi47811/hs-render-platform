import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DeliverClient } from './deliver-client';
import type { Render } from '@/types/database';

interface DeliverPageProps {
  params: { id: string; roomId: string };
}

export default async function DeliverPage({ params }: DeliverPageProps) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  // Hard gate: CP3 must be approved
  const { data: cp3 } = await supabase
    .from('checkpoints')
    .select('status')
    .eq('room_id', params.roomId)
    .eq('checkpoint_number', 3)
    .single();

  if (!cp3 || cp3.status !== 'approved') {
    redirect(`/projects/${params.id}/rooms/${params.roomId}/staging/review`);
  }

  // Fetch all approved renders
  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .in('status', ['team_approved', 'client_approved', 'approved'])
    .order('pass_number', { ascending: false });

  return (
    <DeliverClient
      projectId={params.id}
      roomId={params.roomId}
      approvedRenders={(renders ?? []) as Render[]}
    />
  );
}
