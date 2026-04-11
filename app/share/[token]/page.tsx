import { createClient } from '@/lib/supabase/server'
import { isShareLinkValid } from '@/lib/share'
import { Checkpoint, Project, Render, Room } from '@/types/database'
import ClientPreview from '@/components/client/ClientPreview'
import { notFound } from 'next/navigation'

interface SharePageProps {
  params: {
    token: string
  }
}

/**
 * Public server component for share links
 * No auth required — validates access via token
 */
export default async function SharePage({ params }: SharePageProps) {
  const { token } = params
  const supabase = await createClient()

  try {
    // Look up share link by token
    const { data: shareLink, error: shareLinkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('url_token', token)
      .single()

    if (shareLinkError || !shareLink) {
      return <InvalidLinkPage />
    }

    // Check if valid (not expired, not revoked)
    if (!isShareLinkValid(shareLink)) {
      return <InvalidLinkPage />
    }

    // Mark as opened (if not already)
    if (!shareLink.opened_at) {
      await supabase
        .from('share_links')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', shareLink.id)
        .catch(() => {
          // Silently fail — we don't want to block the page if tracking fails
        })
    }

    const { room_id, project_id, checkpoint_number } = shareLink

    if (!room_id || !project_id || checkpoint_number === null) {
      return <InvalidLinkPage />
    }

    // Fetch room data
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single()

    if (roomError || !room) {
      return <InvalidLinkPage />
    }

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return <InvalidLinkPage />
    }

    // Fetch renders for this room (team_approved and client_approved only)
    const { data: renders, error: rendersError } = await supabase
      .from('renders')
      .select('*')
      .eq('room_id', room_id)
      .in('status', ['team_approved', 'client_approved'])
      .order('created_at', { ascending: false })

    if (rendersError) {
      return <InvalidLinkPage />
    }

    // Fetch checkpoint to get current status
    const { data: checkpoint, error: checkpointError } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('room_id', room_id)
      .eq('checkpoint_number', checkpoint_number)
      .single()

    if (checkpointError || !checkpoint) {
      return <InvalidLinkPage />
    }

    // If already approved, show confirmation page
    if (checkpoint.status === 'approved') {
      return <ApprovedPage room={room} project={project} />
    }

    return (
      <ClientPreview
        renders={renders as Render[]}
        room={room as Room}
        project={project as Project}
        shareToken={token}
        checkpointNumber={checkpoint_number}
      />
    )
  } catch (error) {
    console.error('Error in share page:', error)
    return <InvalidLinkPage />
  }
}

function InvalidLinkPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Link not valid</h2>
        <p className="text-stone-600 mb-6">
          This share link has expired, been revoked, or doesn't exist.
        </p>
        <p className="text-sm text-stone-500">
          Please contact the team at Houspire if you need assistance.
        </p>
      </div>
    </div>
  )
}

interface ApprovedPageProps {
  room: Room
  project: Project
}

function ApprovedPage({ room, project }: ApprovedPageProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Designs approved!</h2>
        <p className="text-stone-600 mb-2">
          {room.room_name} for {project.client_name}
        </p>
        <p className="text-sm text-stone-500">
          The Houspire team has been notified and will proceed with the next steps.
        </p>
      </div>
    </div>
  )
}
