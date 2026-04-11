import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/analytics/StatsCard'
import ActivityFeed from '@/components/analytics/ActivityFeed'
import { Project, ActivityLogEntry } from '@/types/database'

export const metadata = {
  title: 'Analytics | Houspire Staging',
}

export default async function AnalyticsPage() {
  const supabase = createClient()

  // Fetch all projects
  const { data: projects = [] } = await supabase
    .from('projects')
    .select('*')

  // Fetch API cost log for current month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: apiCostLogs = [] } = await supabase
    .from('api_cost_log')
    .select('cost_inr')
    .gte('created_at', startOfMonth.toISOString())

  // Fetch recent activity
  const { data: activityLogs = [] } = await supabase
    .from('activity_log')
    .select('id, project_id, room_id, user_id, action_type, action_description, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch project names for activity
  const projectIds = Array.from(
    new Set(activityLogs.map((a) => a.project_id).filter(Boolean))
  )
  const { data: projectsForActivity = [] } = await supabase
    .from('projects')
    .select('id, client_name')
    .in('id', projectIds)

  const projectMap = new Map(
    projectsForActivity.map((p) => [p.id, p.client_name])
  )

  // Calculate metrics
  const totalProjects = projects.length
  const deliveredThisMonth = projects.filter((p) => {
    if (!p.delivered_at) return false
    const deliveredDate = new Date(p.delivered_at)
    return (
      deliveredDate.getMonth() === new Date().getMonth() &&
      deliveredDate.getFullYear() === new Date().getFullYear()
    )
  }).length

  const lateDeliveries = projects.filter((p) => p.is_late_delivery).length
  const onTimeDeliveries = projects.filter(
    (p) => p.delivered_at && !p.is_late_delivery
  ).length
  const onTimeRate =
    onTimeDeliveries + lateDeliveries > 0
      ? Math.round(
          (onTimeDeliveries / (onTimeDeliveries + lateDeliveries)) * 100
        )
      : 0

  const totalApiCost = apiCostLogs.reduce((sum, log) => sum + log.cost_inr, 0)

  // Calculate average completion time
  const completedProjects = projects.filter(
    (p) => p.delivered_at && p.created_at
  )
  const avgCompletionHours =
    completedProjects.length > 0
      ? Math.round(
          completedProjects.reduce((sum, p) => {
            const createdTime = new Date(p.created_at).getTime()
            const deliveredTime = new Date(p.delivered_at!).getTime()
            return sum + (deliveredTime - createdTime) / (1000 * 60 * 60)
          }, 0) / completedProjects.length
        )
      : 0

  // Group by status
  const projectsByStatus = {
    intake: projects.filter((p) => p.status === 'intake').length,
    shell_ready: projects.filter((p) => p.status === 'shell_ready').length,
    style_set: projects.filter((p) => p.status === 'style_set').length,
    staging: projects.filter((p) => p.status === 'staging').length,
    client_review: projects.filter((p) => p.status === 'client_review').length,
    revisions: projects.filter((p) => p.status === 'revisions').length,
    delivered: projects.filter((p) => p.status === 'delivered').length,
  }

  // Group by city
  const projectsByCity: Record<string, number> = {}
  projects.forEach((p) => {
    projectsByCity[p.city] = (projectsByCity[p.city] || 0) + 1
  })

  // Group by budget
  const projectsByBudget: Record<string, number> = {}
  projects.forEach((p) => {
    projectsByBudget[p.budget_bracket] = (projectsByBudget[p.budget_bracket] || 0) + 1
  })

  // Prepare activity data
  const activityData = activityLogs.map((log) => ({
    id: log.id,
    action_type: log.action_type,
    action_description: log.action_description,
    created_at: log.created_at,
    project_id: log.project_id,
    client_name: projectMap.get(log.project_id),
  }))

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <h1 className="text-3xl font-bold text-stone-900 mb-6">Analytics</h1>

      {/* Row 1: Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="Total Projects"
          value={totalProjects.toString()}
          subtext="all time"
        />
        <StatsCard
          label="Delivered This Month"
          value={deliveredThisMonth.toString()}
          subtext="this month"
        />
        <StatsCard
          label="On-Time Rate"
          value={`${onTimeRate}%`}
          subtext={`${onTimeDeliveries} on time`}
          trend={onTimeRate >= 80 ? 'up' : onTimeRate >= 60 ? 'neutral' : 'down'}
          trendLabel={onTimeRate >= 80 ? '+5%' : undefined}
        />
        <StatsCard
          label="Total API Cost"
          value={`₹${totalApiCost.toLocaleString('en-IN')}`}
          subtext="this month"
        />
      </div>

      {/* Row 2: Status Distribution Bar Chart */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          Projects by Status
        </h2>
        <div className="space-y-3">
          {Object.entries(projectsByStatus).map(([status, count]) => {
            const percentage =
              totalProjects > 0 ? (count / totalProjects) * 100 : 0
            const statusColors: Record<string, string> = {
              intake: 'bg-blue-500',
              shell_ready: 'bg-cyan-500',
              style_set: 'bg-emerald-500',
              staging: 'bg-purple-500',
              client_review: 'bg-amber-500',
              revisions: 'bg-orange-500',
              delivered: 'bg-green-500',
            }
            const statusLabels: Record<string, string> = {
              intake: 'Intake',
              shell_ready: 'Shell Ready',
              style_set: 'Style Set',
              staging: 'Staging',
              client_review: 'Client Review',
              revisions: 'Revisions',
              delivered: 'Delivered',
            }
            return (
              <div key={status}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-stone-700">
                    {statusLabels[status]}
                  </span>
                  <span className="text-sm text-stone-600">
                    {count} ({Math.round(percentage)}%)
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${statusColors[status]}`}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row 3: By City & By Budget Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By City */}
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Projects by City
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-stone-700 text-sm mb-2">
              <span>City</span>
              <span>Count</span>
            </div>
            {Object.entries(projectsByCity)
              .sort(([, a], [, b]) => b - a)
              .map(([city, count]) => (
                <div key={city} className="flex justify-between text-sm">
                  <span className="text-stone-600">{city}</span>
                  <span className="font-medium text-stone-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By Budget */}
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Projects by Budget
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-stone-700 text-sm mb-2">
              <span>Budget</span>
              <span>Count</span>
            </div>
            {Object.entries(projectsByBudget)
              .sort(([, a], [, b]) => b - a)
              .map(([budget, count]) => {
                const labels: Record<string, string> = {
                  economy: 'Economy',
                  standard: 'Standard',
                  premium: 'Premium',
                  luxury: 'Luxury',
                }
                return (
                  <div key={budget} className="flex justify-between text-sm">
                    <span className="text-stone-600">{labels[budget]}</span>
                    <span className="font-medium text-stone-900">{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Activity */}
      <div className="bg-white border border-stone-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          Recent Activity
        </h2>
        <ActivityFeed activities={activityData} />
      </div>
    </div>
  )
}
