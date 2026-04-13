import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ShellUpload } from '@/components/shell/ShellUpload'
import { ShellEnhancement } from '@/components/shell/ShellEnhancement'
import { ShellViewer } from '@/components/shell/ShellViewer'
import { EnvironmentReplacer } from '@/components/shell/EnvironmentReplacer'
import { CheckpointPanel } from '@/components/shell/CheckpointPanel'
import { StyleConfigurator } from '@/components/staging/StyleConfigurator'
import { SpatialAnalysis } from '@/components/shell/SpatialAnalysis'
import { ColourPalette } from '@/components/staging/ColourPalette'
import { TeamComments } from '@/components/comments/TeamComments'
import { RoomStatusControl } from '@/components/project/RoomStatusControl'

export const dynamic = 'force-dynamic'

interface RoomPageProps {
  params: { id: string; roomId: string }
}

const ROOM_FLOW_STEPS = [
  { key: 'upload',      label: 'Shell Upload' },
  { key: 'enhancement', label: 'Enhance Shell' },
  { key: 'environment', label: 'Environment' },
  { key: 'approve',     label: 'Shell Approval' },
  { key: 'style',       label: 'Style Config' },
  { key: 'staging',     label: 'AI Staging' },
  { key: 'review',      label: 'Client Review' },
  { key: 'done',        label: 'Delivered' },
]

function getActiveStep(
  room: {
    original_shell_url?: string | null
    photorealistic_shell_url?: string | null
    enhanced_shell_url?: string | null
    status: string
    design_style?: string | null
  },
  cp1Status: string
) {
  if (!room.original_shell_url) return 'upload'
  if (!room.photorealistic_shell_url) return 'enhancement'
  if (!room.enhanced_shell_url) return 'environment'
  if (cp1Status === 'pending') return 'approve'
  if (cp1Status === 'shared') return 'approve'
  if (!room.design_style) return 'style'
  if (room.status === 'in_progress') return 'staging'
  if (room.status === 'client_review') return 'review'
  if (room.status === 'delivered') return 'done'
  return 'style'
}

export default async function RoomPage({ params }: RoomPageProps) {
  const supabase = await createClient()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*, projects:project_id(id, client_name, city, project_type, budget_bracket, primary_style, style_preferences, material_preferences, exclusions)')
    .eq('id', params.roomId)
    .eq('project_id', params.id)
    .single()

  if (roomError || !room) notFound()

  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('room_id', params.roomId)
    .order('checkpoint_number')

  // Fetch the approved style seed render (for colour palette extraction)
  const { data: styleSeedRender } = await supabase
    .from('renders')
    .select('storage_url, watermarked_url')
    .eq('room_id', params.roomId)
    .eq('pass_type', 'style_seed')
    .in('status', ['team_approved', 'client_approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: renders } = await supabase
    .from('renders')
    .select('*')
    .eq('room_id', params.roomId)
    .order('created_at', { ascending: false })

  const cp1 = checkpoints?.find((cp) => cp.checkpoint_number === 1) ?? null
  const activeStep = getActiveStep(room, cp1?.status ?? 'pending')
  const project = room.projects as any

  const stepIndex = ROOM_FLOW_STEPS.findIndex((s) => s.key === activeStep)

  return (
    <div className="bg-stone-50 min-h-full">

      {/* Sticky sub-header: breadcrumb + progress strip */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between py-3 border-b border-stone-100">
            <nav className="flex items-center gap-2 text-xs text-stone-400">
              <Link href="/" className="hover:text-stone-700 transition-colors cursor-pointer">Pipeline</Link>
              <span className="text-stone-300">/</span>
              <Link href={`/projects/${params.id}`} className="hover:text-stone-700 transition-colors font-medium text-stone-600 cursor-pointer">
                {project.client_name}
              </Link>
              <span className="text-stone-300">/</span>
              <span className="text-stone-800 font-semibold">{room.room_name}</span>
            </nav>
            <div className="flex items-center gap-3">
              <p className="text-xs text-stone-400 tabular-nums">
                {room.room_type} · {project.city} · {project.budget_bracket}
              </p>
              <RoomStatusControl
                roomId={params.roomId}
                currentStatus={room.status as 'not_started' | 'shell_uploaded' | 'in_progress' | 'client_review' | 'delivered'}
              />
            </div>
          </div>

          {/* Progress strip — horizontal scroll on small screens */}
          <div className="flex items-stretch overflow-x-auto scrollbar-none -mb-px">
            {ROOM_FLOW_STEPS.map((step, idx) => {
              const isActive = step.key === activeStep
              const isDone = idx < stepIndex
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap flex-shrink-0 transition-colors ${
                    isActive
                      ? 'border-stone-900 text-stone-900'
                      : isDone
                      ? 'border-transparent text-stone-400'
                      : 'border-transparent text-stone-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isDone
                      ? 'bg-stone-900 text-white'
                      : isActive
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-200 text-stone-400'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </span>
                  {step.label}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left: Shell + Checkpoint */}
          <div className="lg:col-span-2 space-y-5">

            {/* Shell card */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-stone-800">Room Shell</h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {!room.original_shell_url
                      ? 'Upload the Coohom 3D render to begin'
                      : !room.photorealistic_shell_url
                      ? 'Enhance to photorealistic quality'
                      : !room.enhanced_shell_url
                      ? 'Set the environment visible through windows'
                      : 'Shell ready for staging'}
                  </p>
                </div>
                {room.enhanced_shell_url ? (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Shell Ready
                  </span>
                ) : room.photorealistic_shell_url ? (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Environment Pending
                  </span>
                ) : room.original_shell_url ? (
                  <span className="text-xs font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                    Enhancement Pending
                  </span>
                ) : null}
              </div>
              <div className="p-5">
                {!room.original_shell_url ? (
                  /* Step 1: No shell yet — show uploader */
                  <ShellUpload
                    roomId={params.roomId}
                    projectId={params.id}
                    roomType={room.room_type ?? null}
                  />
                ) : !room.photorealistic_shell_url ? (
                  /* Step 2: Shell uploaded, run photorealistic enhancement (Section 9) */
                  <ShellEnhancement
                    roomId={params.roomId}
                    projectId={params.id}
                    shellUrl={room.original_shell_url}
                    projectStyle={project.primary_style ?? null}
                    roomType={room.room_type ?? null}
                    palette={typeof project.style_preferences === 'string' ? project.style_preferences : null}
                    customPrompt={null}
                    navigateBackUrl={`/projects/${params.id}/rooms/${params.roomId}`}
                  />
                ) : !room.enhanced_shell_url ? (
                  /* Step 3: Enhanced shell — set environment visible through windows */
                  <EnvironmentReplacer
                    roomId={params.roomId}
                    projectId={params.id}
                    shellUrl={room.photorealistic_shell_url}
                    city={project.city}
                    projectType={project.project_type}
                  />
                ) : (
                  /* Step 4+: Environment set — show viewer with tabs */
                  <ShellViewer
                    originalUrl={room.original_shell_url}
                    enhancedUrl={room.enhanced_shell_url}
                    roomName={room.room_name}
                  />
                )}
              </div>
            </div>

            {/* CP1 — only show after shell uploaded */}
            {room.original_shell_url && (
              <CheckpointPanel
                checkpoint={cp1}
                roomId={params.roomId}
                projectId={params.id}
                checkpointNumber={1}
                clientName={(room.projects as any)?.client_name ?? null}
                roomName={room.room_name}
              />
            )}

            {/* Renders — only show if any exist */}
            {renders && renders.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100">
                  <h2 className="text-sm font-semibold text-stone-800">Renders</h2>
                  <p className="text-xs text-stone-400 mt-0.5">{renders.length} render{renders.length !== 1 ? 's' : ''} generated</p>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  {renders.map((render) => (
                    <div key={render.id} className="rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                      <div className="relative aspect-video bg-stone-100">
                        <img
                          src={render.watermarked_url || render.thumbnail_url || render.storage_url}
                          alt={`Pass ${render.pass_number}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-stone-700">Pass {render.pass_number}</p>
                          <p className="text-xs text-stone-400">{render.pass_type?.replace(/_/g, ' ')}</p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          render.status === 'client_approved' ? 'bg-green-100 text-green-700' :
                          render.status === 'team_approved' ? 'bg-blue-100 text-blue-700' :
                          render.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {render.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staging CTA — shown after CP1 approved */}
            {cp1?.status === 'approved' && (
              <div className="bg-stone-900 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Ready for AI Staging</p>
                  <p className="text-xs text-stone-400 mt-0.5">Shell approved · Style configured · Generation queued</p>
                </div>
                <Link
                  href={`/projects/${params.id}/rooms/${params.roomId}/staging`}
                  className="inline-flex items-center gap-2 bg-white text-stone-900 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Open Staging
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              </div>
            )}
          </div>

          {/* Right: Spatial Analysis + Style Config + Comments */}
          <div className="space-y-5">

            {/* Spatial Analysis — shown once shell is photorealistic */}
            {room.photorealistic_shell_url && (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-800">Spatial Analysis</h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {room.spatial_analysis
                        ? 'Constraints locked — used in every generation'
                        : 'Detect doors, forbidden zones, and furniture placement'}
                    </p>
                  </div>
                  {room.spatial_analysis && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Locked
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <SpatialAnalysis
                    roomId={params.roomId}
                    projectId={params.id}
                    shellUrl={room.photorealistic_shell_url}
                    existingAnalysis={room.spatial_analysis as any}
                  />
                </div>
              </div>
            )}

            {/* Colour Palette — shown after style seed is approved at CP2 */}
            {(styleSeedRender || room.colour_palette) && (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-800">Colour Palette</h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {room.colour_palette
                        ? '6-role palette locked — consistent across all passes'
                        : 'Extract from approved style seed'}
                    </p>
                  </div>
                  {room.colour_palette && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Locked
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <ColourPalette
                    roomId={params.roomId}
                    projectId={params.id}
                    styleSeedUrl={styleSeedRender?.watermarked_url ?? styleSeedRender?.storage_url ?? null}
                    existingPalette={room.colour_palette as any}
                  />
                </div>
              </div>
            )}

            {/* Style Configurator */}
            <StyleConfigurator
              room={room}
              projectStyle={project.primary_style}
              projectStylePrefs={project.style_preferences}
              projectMaterialPrefs={project.material_preferences}
              projectExclusions={project.exclusions}
            />

            {/* Team Discussion */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-800">Team Discussion</h2>
              </div>
              <TeamComments projectId={params.id} roomId={params.roomId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
