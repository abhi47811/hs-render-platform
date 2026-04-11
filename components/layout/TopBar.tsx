import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './SignOutButton'

export async function TopBar() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  return (
    <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: notification placeholder */}
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        <span className="text-xs text-stone-400">Notifications</span>
      </div>

      {/* Right: user info */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-stone-700">
            {profile?.full_name ?? 'Team Member'}
          </p>
          <p className="text-xs text-stone-400 capitalize">{profile?.role ?? 'junior'}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-stone-700 text-white text-xs flex items-center justify-center font-semibold">
          {initials}
        </div>
        <SignOutButton />
      </div>
    </header>
  )
}
