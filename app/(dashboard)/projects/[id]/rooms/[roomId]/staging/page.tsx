import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Staging entry redirect.
 * Determines the correct active step and redirects the user there.
 * The layout.tsx handles auth + data fetching for all child pages.
 */

interface StagingPageProps {
  params: { id: string; roomId: string };
}

export default async function StagingPage({ params }: StagingPageProps) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const base = `/projects/${params.id}/rooms/${params.roomId}/staging`;

  // Fetch room and checkpoints to determine active step
  const [{ data: room }, { data: checkpoints }] = await Promise.all([
    supabase
      .from('rooms')
      .select('original_shell_url, current_pass')
      .eq('id', params.roomId)
      .single(),
    supabase
      .from('checkpoints')
      .select('checkpoint_number, status')
      .eq('room_id', params.roomId),
  ]);

  // No shell → back to room setup
  if (!room || !room.original_shell_url) {
    redirect(`/projects/${params.id}/rooms/${params.roomId}`);
  }

  const currentPass = room.current_pass ?? 0;
  const cpList = checkpoints ?? [];
  const getCP = (num: number) => cpList.find(c => c.checkpoint_number === num);

  const cp1 = getCP(1);
  const cp2 = getCP(2);
  const cp3 = getCP(3);

  // Redirect priority: furthest step first
  if (cp3?.status === 'approved') redirect(`${base}/deliver`);
  if (cp2?.status === 'approved' && currentPass >= 6) redirect(`${base}/review`);
  if (cp2?.status === 'shared') redirect(`${base}/review`);
  if (cp1?.status === 'approved' && currentPass >= 1) {
    // Resume at the current pass (capped at 6)
    const resumePass = Math.min(Math.max(currentPass, 1), 6);
    redirect(`${base}/pass/${resumePass}`);
  }

  // Default: start at pass 1
  redirect(`${base}/pass/1`);
}
