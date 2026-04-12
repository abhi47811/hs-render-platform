import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/analytics/StatsCard'
import ActivityFeed from '@/components/analytics/ActivityFeed'
import { DesignerTable } from '@/components/analytics/DesignerTable'
import { CostBreakdownTable } from '@/components/analytics/CostBreakdownTable'
import { MonthlyTrendChart } from '@/components/analytics/MonthlyTrendChart'

export const metadata = {
  title: 'Analytics | Houspire Staging',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

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
    new Set((activityLogs ?? []).map((a) => a.project_id).filter(Boolean))
  )
  const { data: projectsForActivity = [] } = projectIds.length > 0
    ? await supabase.from('projects').select('id, client_name').in('id', projectIds)
    : { data: [] }

  const projectMap = new Map(
    (projectsForActivity ?? []).map((p) => [p.id, p.client_name])
  )

  // --- Metrics ---
  const safeProjects = projects ?? []
  const totalProjects = safeProjects.length

  const deliveredThisMonth = safeProjects.filter((p) => {
    if (!p.delivered_at) return false
    const d = new Date(p.delivered_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const lateDeliveries   = safeProjects.filter((p) => p.is_late_delivery).length
  const onTimeDeliveries = safeProjects.filter((p) => p.delivered_at && !p.is_late_delivery).length
  const onTimeRate =
    onTimeDeliveries + lateDeliveries > 0
      ? Math.round((onTimeDeliveries / (onTimeDeliveries + lateDeliveries)) * 100)
      : 0

  const totalApiCost = (apiCostLogs ?? []).reduce((sum, log) => sum + (log.cost_inr ?? 0), 0)

  const completedProjects = safeProjects.filter((p) => p.delivered_at && p.created_at)
  const avgCompletionHours =
    completedProjects.length > 0
      ? Math.round(
          completedProjects.reduce((sum, p) => {
            const created   = new Date(p.created_at).getTime()
            const delivered = new Date(p.delivered_at!).getTime()
            return sum + (delivered - created) / (1000 * 60 * 60)
          }, 0) / completedProjects.length
        )
      : 0

  // --- Group by status ---
  const statusKeys = ['intake', 'shell_ready', 'style_set', 'staging', 'client_review', 'revisions', 'delivered'] as const
  const statusLabels: Record<string, string> = {
    intake:        'Intake',
    shell_ready:   'Shell Ready',
    style_set:     'Style Set',
    staging:       'Staging',
    client_review: 'Client Review',
    revisions:     'Revisions',
    delivered:     'Delivered',
  }
  const statusColors: Record<string, string> = {
    intake:        'bg-blue-400',
    shell_ready:   'bg-cyan-500',
    style_set:     'bg-emerald-500',
    staging:       'bg-violet-500',
    client_review: 'bg-amber-500',
    revisions:     'bg-orange-500',
    delivered:     'bg-green-500',
  }
  const projectsByStatus = statusKeys.map((key) => ({
    key,
    count: safeProjects.filter((p) => p.status === key).length,
  }))

  // --- Group by city ---
  const cityMap: Record<string, number> = {}
  safeProjects.forEach((p) => {
    if (p.city) cityMap[p.city] = (cityMap[p.city] ?? 0) + 1
  })

  // --- Group by budget ---
  const budgetMap: Record<string, number> = {}
  safeProjects.forEach((p) => {
    if (p.budget_bracket) budgetMap[p.budget_bracket] = (budgetMap[p.budget_bracket] ?? 0) + 1
  })
  const budgetLabels: Record<string, string> = {
    economy:  'Economy',
    standard: 'Standard',
    premium:  'Premium',
    luxury:   'Luxury',
  }

  // --- Activity data ---
  const activityData = (activityLogs ?? []).map((log) => ({
    id:                 log.id,
    action_type:        log.action_type,
    action_description: log.action_description,
    created_at:         log.created_at,
    project_id:         log.project_id,
    client_name:        projectMap.get(log.project_id),
  }))

  // --- Designer productivity ---
  const { data: allProfiles = [] } = await supabase
    .from('profiles').select('id, full_name, role').order('full_name')
  const { data: designerProjects = [] } = await supabase
    .from('projects').select('assigned_to, delivered_at, created_at, is_late_delivery, status').not('assigned_to', 'is', null)
  const designerRows = (allProfiles ?? []).map(profile => {
    const theirProjects  = (designerProjects ?? []).filter(p => p.assigned_to === profile.id)
    const delivered      = theirProjects.filter(p => p.delivered_at)
    const lateDeliveries = theirProjects.filter(p => p.is_late_delivery).length
    const durations      = delivered.map(p => new Date(p.delivered_at!).getTime() - new Date(p.created_at).getTime()).filter(d => d > 0)
    const avgHours       = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length / (1000 * 60 * 60) : null
    return { id: profile.id, full_name: profile.full_name, role: profile.role, total: theirProjects.length, delivered: delivered.length, lateDeliveries, avgHours }
  }).filter(r => r.total > 0)

  // --- Cost & margin per project ---
  const { data: projectCostDetails = [] } = await supabase
    .from('projects').select('id, client_name, city').order('created_at', { ascending: false }).limit(20)
  const { data: renderCountRows = [] } = await supabase
    .from('renders').select('room_id, rooms!inner(project_id)')
  const renderCountByProject: Record<string, number> = {}
  ;(renderCountRows ?? []).forEach((r: any) => {
    const pid = r.rooms?.project_id
    if (pid) renderCountByProject[pid] = (renderCountByProject[pid] ?? 0) + 1
  })
  const costRows = (projectCostDetails ?? []).map(p => {
    const costLogs   = (apiCostLogs ?? []).filter((l: any) => l.project_id === p.id)
    const totalCost  = costLogs.reduce((sum: number, l: any) => sum + (l.cost_inr ?? 0), 0)
    return { projectId: p.id, clientName: p.client_name, city: p.city, totalCost, margin: 4999 - totalCost, renderCount: renderCountByProject[p.id] ?? 0 }
  }).filter(r => r.renderCount > 0 || r.totalCost > 0)

  // --- Monthly trend — last 6 months ---
  const monthlyData: { month: string; delivered: number; apiCostInr: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - i)
    const next = new Date(d); next.setMonth(next.getMonth() + 1)
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    const delivered = safeProjects.filter(p => {
      if (!p.delivered_at) return false
      const da = new Date(p.delivered_at)
      return da >= d && da < next
    }).length
    const apiCost = (apiCostLogs ?? []).filter((l: any) => {
      const ca = new Date(l.created_at); return ca >= d && ca < next
    }).reduce((sum: number, l: any) => sum + (l.cost_inr ?? 0), 0)
    monthlyData.push({ month: label, delivered, apiCostInr: apiCost })
  }

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
            Analytics
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalProjects} total projects
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={{ background: '#F0FDF4', color: '#16A34A' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
          Live
        </span>
      </div>

      {/* ── Content ── */}
      <div className="p-6 space-y-6">

        {/* Row 1: Key Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="Total Projects"
            value={totalProjects.toString()}
            subtext="all time"
            accent="default"
          />
          <StatsCard
            label="Delivered This Month"
            value={deliveredThisMonth.toString()}
            subtext={new Date().toLocaleString('en-IN', { month: 'long' })}
            accent="success"
          />
          <StatsCard
            label="On-Time Rate"
            value={`${onTimeRate}%`}
            subtext={`${onTimeDeliveries} on time`}
            trend={onTimeRate >= 80 ? 'up' : onTimeRate >= 60 ? 'neutral' : 'down'}
            trendLabel={`${onTimeRate}%`}
            accent={onTimeRate >= 80 ? 'success' : onTimeRate >= 60 ? 'warning' : 'danger'}
          />
          <StatsCard
            label="API Cost This Month"
            value={`₹${totalApiCost.toLocaleString('en-IN')}`}
            subtext={`avg ${avgCompletionHours}h per project`}
            accent="brand"
          />
        </div>

        {/* Row 2: Status distribution */}
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.1em] mb-5"
            style={{ color: 'var(--text-muted)' }}
          >
            Projects by Status
          </h2>
          <div className="space-y-3">
            {projectsByStatus.map(({ key, count }) => {
              const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {statusLabels[key]}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {count} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusColors[key]}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Row 3: By City + By Budget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* By City */}
          <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-5" style={{ color: 'var(--text-muted)' }}>
              Projects by City
            </h2>
            {Object.keys(cityMap).length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No city data yet</p>
            ) : (
              <div>
                <div className="flex justify-between pb-2 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>City</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Projects</span>
                </div>
                <div>
                  {Object.entries(cityMap)
                    .sort(([, a], [, b]) => b - a)
                    .map(([city, count]) => (
                      <div key={city} className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{city}</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* By Budget */}
          <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-5" style={{ color: 'var(--text-muted)' }}>
              Projects by Budget
            </h2>
            {Object.keys(budgetMap).length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No budget data yet</p>
            ) : (
              <div>
                <div className="flex justify-between pb-2 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tier</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Projects</span>
                </div>
                {Object.entries(budgetMap)
                  .sort(([, a], [, b]) => b - a)
                  .map(([budget, count]) => (
                    <div key={budget} className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {budgetLabels[budget] ?? budget}
                      </span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: 6-Month Trend */}
        <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>6-Month Trend</h2>
          </div>
          <div className="px-6 py-5"><MonthlyTrendChart data={monthlyData} /></div>
        </div>

        {/* Row 5: Designer Productivity */}
        <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Designer Productivity</h2>
          </div>
          <div className="px-6 py-4">
            <DesignerTable rows={designerRows} />
          </div>
        </div>

        {/* Row 6: Cost & Margin */}
        <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Cost & Margin per Project</h2>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Revenue: ₹4,999 flat fee</span>
          </div>
          <div className="px-6 py-4"><CostBreakdownTable rows={costRows} /></div>
        </div>

        {/* Row 7: Recent Activity */}
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.1em] mb-5"
            style={{ color: 'var(--text-muted)' }}
          >
            Recent Activity
          </h2>
          <ActivityFeed activities={activityData} />
        </div>

      </div>
    </div>
  )
}
