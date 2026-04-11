import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShellUpload } from '@/components/shell/ShellUpload'
import { ShellViewer } from '@/components/shell/ShellViewer'
import { CheckpointPanel } from '@/components/shell/CheckpointPanel'
import { TeamComments } from '@/components/comments/TeamComments'

interface RoomPageProps {
  params: {
    id: string
    roomId: string
  }
}

export default async function RoomPage({ params }: RoomPageProps) {
  const supabase = createClient()

  // Fetch room with project and checkpoints
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*, projects:project_id(id, client_name, status)')
    .eq('id', params.roomId)
    .eq('project_id', params.id)
    .single()

  if (roomError || !room) {
    notFound()
  }

  // Fetch checkpoints for this room
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('room_id', params.roomId)
    .order('checkpoint_number', { ascending: true })

  // Get CP1 (Shell Approval checkpoint)
  const cp1 = checkpoints?.find((cp) => cp.checkpoint_number === 1)

  // Fetch renders for this room (if any)
  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .order('created_at', { ascending: false })

  const project = room.projects as any

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <a href="/dashboard" className="hover:text-stone-900">
              Dashboard
            </a>
            <span>/</span>
            <a
              href={`/dashboard/projects/${params.id}`}
              className="hover:text-stone-900 font-medium"
            >
              {project.client_name}
            </a>
            <span>/</span>
            <span className="text-stone-900 font-medium">{room.room_name}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">{room.room_name}</h1>
          <p className="text-stone-600">
            {room.room_type}
            {room.dimensions_l && room.dimensions_w && (
              <> • {room.dimensions_l}L × {room.dimensions_w}W ft</>
            )}
          </p>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Shell + Checkpoint */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shell Upload or Viewer */}
            <div className="rounded-lg border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Room Shell</h2>

              {!room.original_shell_url ? (
                <ShellUpload
                  roomId={params.roomId}
                  projectId={params.id}
                  onUploadComplete={() => {
                    // Trigger refresh after upload
                  }}
                />
              ) : (
                <ShellViewer
                  originalUrl={room.original_shell_url}
                  enhancedUrl={room.enhanced_shell_url}
                  roomName={room.room_name}
                />
              )}
            </div>

            {/* Checkpoint Panel */}
            <CheckpointPanel
              checkpoint={cp1 || null}
              roomId={params.roomId}
              checkpointNumber={1}
              onStatusChange={() => {
                // Trigger refresh on status change
              }}
            />

            {/* Renders (if any) */}
            {renders && renders.length > 0 && (
              <div className="rounded-lg border border-stone-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-stone-900 mb-4">Renders</h2>
                <div className="grid grid-cols-2 gap-4">
                  {renders.slice(0, 4).map((render) => (
                    <div
                      key={render.id}
                      className="rounded-lg overflow-hidden border border-stone-200 bg-stone-100"
                    >
                      <img
                        src={render.watermarked_url || render.thumbnail_url || render.storage_url}
                        alt={`Pass ${render.pass_number}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 text-xs text-stone-600">
                        <p className="font-medium">Pass {render.pass_number}</p>
                        <p>{render.pass_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Comments */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Team Discussion</h2>
              <TeamComments projectId={params.id} roomId={params.roomId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
