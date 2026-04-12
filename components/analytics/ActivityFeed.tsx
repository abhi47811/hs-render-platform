import Link from 'next/link'

interface ActivityEntry {
  id: string
  action_type: string
  action_description: string
  created_at: string
  project_id: string
  client_name?: string
}

interface ActivityFeedProps {
  activities: ActivityEntry[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActionDot = (actionType: string): string => {
    switch (actionType) {
      case 'project_created':     return 'bg-green-500'
      case 'shell_uploaded':      return 'bg-blue-500'
      case 'render_generated':    return 'bg-violet-500'
      case 'checkpoint_approved': return 'bg-emerald-500'
      case 'revision_requested':  return 'bg-amber-500'
      case 'delivered':           return 'bg-amber-400'
      default:                    return 'bg-stone-300'
    }
  }

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1)   return 'just now'
    if (diffMins < 60)  return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7)   return `${diffDays}d ago`

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  if (activities.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-500">No activity yet</p>
        <p className="text-xs text-stone-400">Actions will appear here as the team works</p>
      </div>
    )
  }

  return (
    <div className="space-y-0 divide-y divide-stone-50">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
          {/* Dot */}
          <div className="flex-shrink-0 pt-1.5">
            <div className={`w-2 h-2 rounded-full ${getActionDot(activity.action_type)}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-800 leading-snug">
              {activity.action_description}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {activity.client_name && (
                <>
                  <span className="text-[11px] text-stone-400">in</span>
                  <Link
                    href={`/projects`}
                    className="text-[11px] text-stone-500 hover:text-stone-800 font-medium transition-colors cursor-pointer"
                  >
                    {activity.client_name}
                  </Link>
                  <span className="text-[11px] text-stone-300">·</span>
                </>
              )}
              <span className="text-[11px] text-stone-400 tabular-nums">
                {getRelativeTime(activity.created_at)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
