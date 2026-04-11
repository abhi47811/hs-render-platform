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
  // Get color dot based on action type
  const getActionColor = (actionType: string): string => {
    switch (actionType) {
      case 'project_created':
        return 'bg-green-500'
      case 'shell_uploaded':
        return 'bg-blue-500'
      case 'render_generated':
        return 'bg-violet-500'
      case 'checkpoint_approved':
        return 'bg-emerald-500'
      case 'revision_requested':
        return 'bg-amber-500'
      case 'delivered':
        return 'bg-gold'
      default:
        return 'bg-stone-400'
    }
  }

  // Format relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

    // Format as date
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-stone-500 text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4">
          {/* Dot */}
          <div className="flex-shrink-0 pt-1">
            <div
              className={`w-3 h-3 rounded-full ${getActionColor(activity.action_type)}`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-900">
              {activity.action_description}
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
              {activity.client_name && (
                <>
                  <span>in</span>
                  <Link
                    href={`/projects`}
                    className="text-stone-600 hover:text-stone-900 font-medium"
                  >
                    {activity.client_name}
                  </Link>
                </>
              )}
              <span className="ml-auto">{getRelativeTime(activity.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
