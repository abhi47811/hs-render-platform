import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { TeamMembersPanel } from '@/components/settings/TeamMembersPanel'
import { RevisionLimitPanel } from '@/components/settings/RevisionLimitPanel'

export const metadata = {
  title: 'Settings | Houspire Staging',
}

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: teamMembers = [] } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: true })

  // Sec 41 — Revision-limit admin config: figure out the current default
  // as the most common revision_limit across active projects.
  const { data: activeRows = [], count: activeProjectCount = 0 } = await supabase
    .from('projects')
    .select('revision_limit', { count: 'exact' })
    .in('status', ['intake', 'in_progress', 'needs_revision', 'qc'])

  const counts = new Map<number, number>()
  for (const r of activeRows ?? []) {
    const rl = r.revision_limit ?? 2
    counts.set(rl, (counts.get(rl) ?? 0) + 1)
  }
  let currentRevisionLimit = 2
  let max = 0
  counts.forEach((c, rl) => {
    if (c > max) { max = c; currentRevisionLimit = rl }
  })

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-20 px-6 flex items-center justify-between"
        style={{
          height: 56,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div>
          <h1
            className="text-[15px] font-bold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Settings
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Account & workspace configuration
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6 max-w-3xl space-y-6">

        {/* Profile section */}
        <section
          className="rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Your Profile
            </h2>
          </div>
          <div className="px-6 py-5">
            <ProfileForm
              userId={user.id}
              email={user.email ?? ''}
              initialFullName={profile?.full_name ?? ''}
              initialRole={profile?.role ?? ''}
            />
          </div>
        </section>

        {/* Team section */}
        <section
          className="rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Team Members
            </h2>
          </div>
          <div className="px-6 py-5">
            <TeamMembersPanel
              members={teamMembers ?? []}
              currentUserId={user.id}
              isAdmin={isAdmin}
            />
          </div>
        </section>

        {/* Workspace Policy — admin only */}
        {isAdmin && (
          <section
            className="rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div
              className="px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2
                className="text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Workspace Policy
              </h2>
            </div>
            <div className="px-6 py-5">
              <RevisionLimitPanel
                currentDefault={currentRevisionLimit}
                activeProjectCount={activeProjectCount ?? 0}
              />
            </div>
          </section>
        )}

        {/* Platform info section */}
        <section
          className="rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Platform
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <InfoRow label="Module" value="Module 1 — Staging Ops" />
            <InfoRow label="AI Engine" value="Google Gemini Imagen 3" />
            <InfoRow label="Database" value="Supabase (ap-south-1)" />
            <InfoRow label="Staging API" value="us-west1.run.app" />
            <InfoRow label="Version" value="1.0.0-beta" />
          </div>
        </section>

      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        className="text-sm font-medium px-2.5 py-0.5 rounded-full"
        style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
      >
        {value}
      </span>
    </div>
  )
}
