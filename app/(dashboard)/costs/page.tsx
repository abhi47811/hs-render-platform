import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsCard from '@/components/analytics/StatsCard'
import { ApiCostLogEntry, Project, Profile } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'API Costs | Houspire Staging' }

const REVENUE_PER_PROJECT = 4999
const MEDAL_RANKS = ['🥇', '🥈', '🥉']

interface ProjectCostRow {
  projectId: string
  clientName: string
  city: string | null
  designerName: string | null
  cost: number
  renderCount: number
  margin: number
}

interface DailyCost {
  date: string
  cost: number
}

export default async function CostsDashboard() {
  const supabase = await createClient()

  // 1. Auth check
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) {
    redirect('/login')
  }

  // 2. Get user profile for role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  // 3. Fetch current month's cost logs
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: costLogs = [] } = await supabase
    .from('api_cost_log')
    .select('id, project_id, cost_inr, call_type, gemini_model, created_at, room_id')
    .gte('created_at', startOfMonth.toISOString())

  // 4. Fetch all projects with assigned profiles
  const { data: projects = [] } = await supabase
    .from('projects')
    .select('id, client_name, city, assigned_to')

  // 5. Fetch profiles for designer lookup
  const { data: profiles = [] } = await supabase
    .from('profiles')
    .select('id, full_name')

  const profileMap = new Map(
    (profiles ?? []).map((p: Profile) => [p.id, p.full_name])
  )

  const projectMap = new Map(
    (projects ?? []).map((p: Project) => [
      p.id,
      { clientName: p.client_name, city: p.city, assignedTo: p.assigned_to },
    ])
  )

  // Aggregate costs per project
  const costByProject = new Map<string, number>()
  const callCountByType = new Map<string, number>()
  const costByType = new Map<string, number>()
  const costByModel = new Map<string, number>()
  const dailyCosts = new Map<string, number>()

  let totalMonthCost = 0

  ;(costLogs as ApiCostLogEntry[]).forEach((log) => {
    // Project cost aggregation
    const current = costByProject.get(log.project_id) ?? 0
    costByProject.set(log.project_id, current + log.cost_inr)
    totalMonthCost += log.cost_inr

    // Call type breakdown
    const callCount = callCountByType.get(log.call_type) ?? 0
    callCountByType.set(log.call_type, callCount + 1)

    const callCost = costByType.get(log.call_type) ?? 0
    costByType.set(log.call_type, callCost + log.cost_inr)

    // Model breakdown
    const modelCost = costByModel.get(log.gemini_model) ?? 0
    costByModel.set(log.gemini_model, modelCost + log.cost_inr)

    // Daily cost tracking
    const date = new Date(log.created_at)
    const dateKey = date.toISOString().split('T')[0]
    const dayCost = dailyCosts.get(dateKey) ?? 0
    dailyCosts.set(dateKey, dayCost + log.cost_inr)
  })

  // Sort and build leaderboard
  const leaderboardRows: ProjectCostRow[] = Array.from(costByProject.entries())
    .map(([projectId, cost]) => {
      const projectInfo = projectMap.get(projectId)
      const designerName = projectInfo?.assignedTo
        ? profileMap.get(projectInfo.assignedTo)
        : null

      // Count renders for this project
      const renderCount = (costLogs as ApiCostLogEntry[]).filter(
        (log) => log.project_id === projectId
      ).length

      return {
        projectId,
        clientName: projectInfo?.clientName ?? 'Unknown',
        city: projectInfo?.city ?? null,
        designerName: designerName ?? null,
        cost,
        renderCount,
        margin: REVENUE_PER_PROJECT - cost,
      }
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  // Build daily cost chart data (last 30 days)
  const today = new Date()
  const dailyChartData: DailyCost[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    const cost = dailyCosts.get(dateKey) ?? 0
    dailyChartData.push({ date: dateKey, cost })
  }

  // Compute metrics
  const totalApiCalls = costLogs.length
  const totalProjects = costByProject.size
  const avgCostPerProject =
    totalProjects > 0 ? totalMonthCost / totalProjects : 0

  const sortedCallTypes = Array.from(callCountByType.entries())
    .sort((a, b) => b[1] - a[1])

  const sortedModels = Array.from(costByModel.entries())
    .sort((a, b) => b[1] - a[1])

  // Find max daily cost for chart scaling
  const maxDailyCost = dailyChartData.length > 0
    ? Math.max(...dailyChartData.map((d) => d.cost))
    : 0

  const monthYear = startOfMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className="flex-1 flex flex-col overflow-auto min-h-full"
      style={{ background: 'var(--bg)' }}
    >
      {/* ─── Sticky Header ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 h-14 px-6 py-3 flex items-center justify-between"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            API Costs · {monthYear}
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums"
          style={{
            background: 'var(--brand)',
            color: 'white',
          }}
        >
          ₹{totalMonthCost.toFixed(2)}
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-auto">
        {/* Row 1: Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatsCard
            label="Total Spend"
            value={`₹${totalMonthCost.toFixed(0)}`}
            accent="brand"
          />
          <StatsCard
            label="Avg per Project"
            value={`₹${avgCostPerProject.toFixed(0)}`}
            accent="default"
          />
          <StatsCard
            label="Total API Calls"
            value={totalApiCalls.toString()}
            accent="default"
          />
        </div>

        {/* Row 2: Call Type & Model Breakdown */}
        <div className="grid grid-cols-2 gap-6">
          {/* Call Type Breakdown */}
          <div
            className="rounded-xl p-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3
              className="text-sm font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Call Type Breakdown
            </h3>
            <div className="space-y-2.5">
              {sortedCallTypes.map(([callType, count]) => {
                const cost = costByType.get(callType) ?? 0
                const pct =
                  totalApiCalls > 0
                    ? Math.round((count / totalApiCalls) * 100)
                    : 0
                return (
                  <div key={callType} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div
                        className="text-xs font-semibold capitalize"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {callType}
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ₹{cost.toFixed(2)} · {count} calls
                      </div>
                    </div>
                    <div
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: 'var(--brand)',
                        color: 'white',
                      }}
                    >
                      {pct}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Model Breakdown */}
          <div
            className="rounded-xl p-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3
              className="text-sm font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Model Breakdown
            </h3>
            <div className="space-y-2.5">
              {sortedModels.map(([model, cost]) => {
                const pct = totalMonthCost > 0
                  ? Math.round((cost / totalMonthCost) * 100)
                  : 0
                const calls = Array.from(costLogs as ApiCostLogEntry[]).filter(
                  (log) => log.gemini_model === model
                ).length
                return (
                  <div key={model} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {model}
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ₹{cost.toFixed(2)} · {calls} calls
                      </div>
                    </div>
                    <div
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: 'var(--brand)',
                        color: 'white',
                      }}
                    >
                      {pct}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Project Cost Leaderboard */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Project Cost Leaderboard
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    'Rank',
                    'Project',
                    'City',
                    'Designer',
                    'Cost',
                    'Renders',
                    'Margin %',
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((row, idx) => {
                  const marginPct = Math.round(
                    (row.margin / REVENUE_PER_PROJECT) * 100
                  )
                  const marginBg =
                    marginPct >= 80
                      ? '#F0FDF4'
                      : marginPct >= 50
                        ? '#FFFBEB'
                        : '#FEF2F2'
                  const marginColor =
                    marginPct >= 80
                      ? '#16A34A'
                      : marginPct >= 50
                        ? '#D97706'
                        : '#DC2626'

                  return (
                    <tr
                      key={row.projectId}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        className="py-3 px-3 text-lg font-bold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {idx < 3 ? MEDAL_RANKS[idx] : `#${idx + 1}`}
                      </td>
                      <td
                        className="py-3 px-3 font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {row.clientName}
                      </td>
                      <td
                        className="py-3 px-3 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {row.city ?? '—'}
                      </td>
                      <td
                        className="py-3 px-3 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {row.designerName ?? '—'}
                      </td>
                      <td
                        className="py-3 px-3 font-semibold tabular-nums"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        ₹{row.cost.toFixed(0)}
                      </td>
                      <td
                        className="py-3 px-3 tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {row.renderCount}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            background: marginBg,
                            color: marginColor,
                          }}
                        >
                          {marginPct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {leaderboardRows.length === 0 && (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No cost data yet
            </p>
          )}
        </div>

        {/* Row 4: Daily Spend Chart */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Daily Spend (Last 30 Days)
          </h3>
          <div className="space-y-2">
            {dailyChartData.map((day, idx) => {
              const barWidth = maxDailyCost > 0
                ? Math.round((day.cost / maxDailyCost) * 100)
                : 0
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                    {day.date}
                  </div>
                  <div className="flex-1">
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '24px',
                        background: 'var(--brand)',
                        borderRadius: '4px',
                        minWidth: barWidth > 0 ? '40px' : '0',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                      }}
                    >
                      {day.cost > 0 && (
                        <span
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: 'white' }}
                        >
                          ₹{day.cost.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
