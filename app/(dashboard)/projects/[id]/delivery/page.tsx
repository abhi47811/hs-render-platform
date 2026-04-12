import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

const BUDGET_LABELS: Record<string, string> = {
  economy: 'Economy (<₹5L)',
  standard: 'Standard (₹5–12L)',
  premium: 'Premium (₹12–25L)',
  luxury: 'Luxury (₹25L+)',
}

export default async function DeliverySummaryPage({ params }: PageProps) {
  const supabase = await createClient()

  const { data: project, error } = await supabase.from('projects').select('*').eq('id', params.id).single()

  if (error || !project) notFound()

  const { data: rooms = [] } = await supabase
    .from('rooms')
    .select('id, room_name, room_type, status, current_pass, renders(id, status, storage_url, thumbnail_url, pass_number, variation_label)')
    .eq('project_id', params.id)
    .order('created_at')

  const { data: assignedProfile } = project.assigned_to
    ? await supabase.from('profiles').select('full_name, role').eq('id', project.assigned_to).single()
    : { data: null }

  const deliveredAt = project.delivered_at ? new Date(project.delivered_at) : null
  const duration = deliveredAt ? Math.round((deliveredAt.getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60)) : null

  const totalRenders = (rooms ?? []).reduce((sum, r) => sum + (Array.isArray(r.renders) ? r.renders.length : 0), 0)
  const approvedRenders = (rooms ?? []).reduce((sum, r) => {
    const rends = Array.isArray(r.renders) ? r.renders : []
    return sum + rends.filter((rnd: any) => rnd.status === 'client_approved' || rnd.status === 'team_approved').length
  }, 0)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div
        className="sticky top-0 z-20 px-6 flex items-center justify-between"
        style={{
          height: 56,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${params.id}`}
            className="text-xs flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to project
          </Link>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Delivery Summary
          </h1>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
          ✓ Delivered
        </span>
      </div>

      <div className="p-6 max-w-4xl space-y-6">
        <div
          className="rounded-xl px-6 py-5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--text-muted)' }}>
            Project Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryField label="Client" value={project.client_name} />
            <SummaryField label="City" value={project.city ?? '—'} />
            <SummaryField label="Type" value={project.project_type ?? '—'} />
            <SummaryField label="Budget" value={BUDGET_LABELS[project.budget_bracket] ?? project.budget_bracket ?? '—'} />
            <SummaryField label="Designer" value={assignedProfile?.full_name ?? 'Unassigned'} />
            <SummaryField label="Completed In" value={duration ? `${duration}h` : '—'} />
            <SummaryField label="Total Rooms" value={String((rooms ?? []).length)} />
            <SummaryField label="Renders" value={`${approvedRenders} approved / ${totalRenders} total`} />
          </div>
          {deliveredAt && (
            <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Delivered on{' '}
              {deliveredAt.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {project.is_late_delivery && (
                <span className="ml-2 text-red-500 font-semibold">⚠ Late delivery</span>
              )}
            </p>
          )}
        </div>

        {(rooms ?? []).map((room: any) => {
          const renders = Array.isArray(room.renders) ? room.renders : []
          const approvedCount = renders.filter((r: any) => r.status === 'client_approved' || r.status === 'team_approved').length

          return (
            <div
              key={room.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {room.room_name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {room.room_type} · Pass {room.current_pass ?? 0}/6
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                  {approvedCount} approved
                </span>
              </div>

              {renders.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
                  {renders.map((r: any) => (
                    <div
                      key={r.id}
                      className="aspect-video rounded-lg overflow-hidden relative"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
                    >
                      {r.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumbnail_url} alt={`P${r.pass_number}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
                          No preview
                        </div>
                      )}
                      <div
                        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[9px] font-semibold"
                        style={{ background: 'rgba(14,13,11,0.65)', color: '#fff' }}
                      >
                        P{r.pass_number}
                        {r.variation_label ? ` · ${r.variation_label}` : ''}
                        {(r.status === 'client_approved' || r.status === 'team_approved') ? ' ✓' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                  No renders
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}
