import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PassClient } from './pass-client';
import type { Render } from '@/types/database';

interface PassPageProps {
  params: { id: string; roomId: string; passNum: string };
}

export default async function PassPage({ params }: PassPageProps) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const passNum = parseInt(params.passNum);
  if (isNaN(passNum) || passNum < 1 || passNum > 6) {
    redirect(`/projects/${params.id}/rooms/${params.roomId}/staging/pass/1`);
  }

  // Fetch checkpoints for gating check
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('checkpoint_number, status')
    .eq('room_id', params.roomId);

  // Server-side access gate: pass 2–6 require cp1 approved OR current_pass >= passNum
  if (passNum >= 2) {
    const cp1 = checkpoints?.find(c => c.checkpoint_number === 1);
    const { data: room } = await supabase
      .from('rooms')
      .select('current_pass')
      .eq('id', params.roomId)
      .single();

    const currentPass = room?.current_pass ?? 0;
    const cp1Approved = cp1?.status === 'approved';

    if (!cp1Approved && currentPass < passNum) {
      redirect(`/projects/${params.id}/rooms/${params.roomId}/staging/pass/1`);
    }
  }

  // Fetch all renders for this room
  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .order('created_at', { ascending: false });

  return (
    <PassClient
      projectId={params.id}
      roomId={params.roomId}
      passNum={passNum}
      initialRenders={(renders ?? []) as Render[]}
    />
  );
}
