import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSlaStatus } from '@/lib/sla'
import { MyWorkRow } from '@/components/my-work/MyWorkRow'

export const metadata = { title: 'My Work | Houspire Staging' }
export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  intake:        { label: 'Intake',         color: '#78716C', bg: '#F5F5F4' },
  shell_ready:   { label: 'Shell Ready',    color: '#2563EB', bg: '#EFF6FF' },
  style_set:     { label: 'Style Set',      color: '#7C3AED', bg: '#EDE9FE' },
  staging:       { label: 'Staging',        color: '#D97706', bg: '#FFFBEB' },
  client_review: { label: 'Client Review',  color: '#0891B2', bg: '#ECFEFF' },
  revisions:     { label: 'Revisions',      color: '#EA580C', bg: '#FFF7ED' },
  delivered:     { label: 'Delivered',      color: '#16A34A', bg: '#F0FDF4' },
}
const PRIORITY_COLORS: Record<string, string> = { Urgent: '#DC2626', High: '#D97706', Normal: '#78716C' }

export default async function MyWorkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  const { data: myProjects = [] } = await supabase
    .from('projects')
    .select('id, client_name, city, status, priority, sla_deadline, budget_bracket, project_type, created_at')
    .eq('assigned_to', user.id)
    .neq('status', 'delivered')
    .order('sla_deadline', { ascending: true })

  const { data: allMyProjects = [] } = await supabase
    .from('projects').select('id').eq('assigned_to', user.id)

  const urgent  = (myProjects ?? []).filter(p => p.priority === 'Urgent').length
  const overdue = (myProjects ?? []).filter(p => getSlaStatus(p.sla_deadline) === 'breached').length
  const total   = (allMyProjects ?? []).length
  const initials = (profile?.full_name ?? '').trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 flex items-center gap-4"
        style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}>{initials}</div>
        <div>
          <h1 className="text-[15px] font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name ? `${profile.full_name}'s Work` : 'My Work'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Active projects assigned to you</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatPill label="Total" value={String(total)} />
          {urgent > 0 && <StatPill label="Urgent" value={String(urgent)} accent="#DC2626" />}
          {overdue > 0 && <StatPill label="Overdue" value={String(overdue)} accent="#DC2626" />}
        </div>
      </div>

      <div className="p-6 max-w-4xl">
        {(myProjects ?? []).length === 0 ? (
          <div className="rounded-xl px-6 py-12 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-3xl mb-3">🎉</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No active projects assigned to you</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>You're all caught up</p>
            <Link href="/" className="inline-block mt-4 text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)', color: 'white' }}>
              View Pipeline
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(myProjects ?? []).map(p => (
              <MyWorkRow
                key={p.id}
                project={p}
                sc={STATUS_CONFIG[p.status] ?? STATUS_CONFIG.intake}
                priorityColor={PRIORITY_COLORS[p.priority] ?? '#78716C'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
      style={{ background: accent ? `${accent}12` : 'var(--surface-2)', border: `1px solid ${accent ? `${accent}33` : 'var(--border)'}` }}>
      <span className="text-xs font-bold" style={{ color: accent ?? 'var(--text-secondary)' }}>{value}</span>
      <span className="text-[10px]" style={{ color: accent ?? 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
