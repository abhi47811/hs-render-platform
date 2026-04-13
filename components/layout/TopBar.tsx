import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './SignOutButton'
import { NotificationBell } from './NotificationBell'
import { QueueIndicator } from '@/components/staging/QueueIndicator'

export async function TopBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
    : { data: null }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '??'

  const roleLabel: Record<string, string> = {
    admin:  'Admin',
    senior: 'Senior Designer',
    junior: 'Junior Designer',
    viewer: 'Viewer',
  }

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-5"
      style={{
        height: 52,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* ── Left: breadcrumb slot (page fills this via a portal or static label) */}
      <div className="flex items-center gap-2">
        {/* Brand micro mark for when sidebar is context */}
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--text-secondary)' }}
          >
            Houspire Staging
          </span>
        </div>
        {/* Divider */}
        <span
          className="w-px h-4"
          style={{ background: 'var(--border)' }}
        />
        {/* Phase tag */}
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--brand-light)', color: 'var(--brand-dark)' }}
        >
          Module 1
        </span>
      </div>

      {/* ── Right: tools + user ─────────────────────────────── */}
      <div className="flex items-center gap-1">

        {/* Queue indicator */}
        <QueueIndicator />

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <span className="w-px h-5 mx-2" style={{ background: 'var(--border)' }} />

        {/* User identity */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p
              className="text-xs font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {profile?.full_name ?? 'Team Member'}
            </p>
            <p
              className="text-[10px] leading-tight mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {roleLabel[profile?.role ?? 'junior'] ?? profile?.role}
            </p>
          </div>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold select-none flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
              color: 'white',
              boxShadow: '0 0 0 2px var(--border)',
            }}
          >
            {initials}
          </div>

          {/* Sign out */}
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
