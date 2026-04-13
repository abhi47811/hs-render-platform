import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsCard from '@/components/analytics/StatsCard'
import { PassType, Render, Room, Project, StyleVaultEntry } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Template Performance | Houspire Staging' }

interface PassTypeStats {
  passType: PassType
  totalRenders: number
  approved: number
  rejected: number
  approvalRate: number
}

interface ZeroRevisionDesigner {
  designerName: string
  projectCount: number
  zeroRevisionCount: number
  percentage: number
}

export default async function TemplatePerformancePage() {
  const supabase = await createClient()

  // 1. Auth check
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) {
    redirect('/login')
  }

  // 2. Fetch renders with related data
  const { data: renders = [] } = await supabase
    .from('renders')
    .select('id, room_id, pass_type, status, created_at')

  // 3. Fetch rooms for revision linking
  const { data: rooms = [] } = await supabase
    .from('rooms')
    .select('id, project_id')

  // 4. Fetch revisions to count per room
  const { data: revisions = [] } = await supabase
    .from('revisions')
    .select('id, room_id, created_at')

  // 5. Fetch all projects for designer lookup
  const { data: projects = [] } = await supabase
    .from('projects')
    .select('id, assigned_to, client_name, delivered_at')

  // 6. Fetch profiles for designer names
  const { data: profiles = [] } = await supabase
    .from('profiles')
    .select('id, full_name')

  // 7. Fetch style vault entries
  const { data: styleVault = [] } = await supabase
    .from('style_vault')
    .select('id, style_name, room_type, city, usage_count')
    .order('usage_count', { ascending: false })
    .limit(20)

  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p.full_name])
  )

  const projectMap = new Map(
    (projects ?? []).map((p: Project) => [
      p.id,
      { assignedTo: p.assigned_to, delivered: p.delivered_at },
    ])
  )

  const roomMap = new Map((rooms ?? []).map((r: Room) => [r.id, r.project_id]))

  const revisionMap = new Map<string, number>()
  ;(revisions ?? []).forEach((rev: any) => {
    const count = (revisionMap.get(rev.room_id) ?? 0) + 1
    revisionMap.set(rev.room_id, count)
  })

  // Aggregate pass type stats
  const passTypeStats = new Map<PassType, PassTypeStats>()
  ;(renders as Render[]).forEach((render) => {
    const passType = render.pass_type
    const current = passTypeStats.get(passType) || {
      passType,
      totalRenders: 0,
      approved: 0,
      rejected: 0,
      approvalRate: 0,
    }

    current.totalRenders += 1

    if (
      render.status === 'team_approved' ||
      render.status === 'client_approved' ||
      render.status === 'approved'
    ) {
      current.approved += 1
    } else if (render.status === 'rejected') {
      current.rejected += 1
    }

    current.approvalRate =
      current.totalRenders > 0
        ? Math.round((current.approved / current.totalRenders) * 100)
        : 0

    passTypeStats.set(passType, current)
  })

  const passTypeArray = Array.from(passTypeStats.values()).sort(
    (a, b) => b.totalRenders - a.totalRenders
  )

  // Identify zero-revision projects
  const zeroRevisionProjects = new Map<string, boolean>()
  ;(projects ?? []).forEach((proj: Project) => {
    if (proj.delivered_at) {
      const projRooms = (rooms ?? []).filter(
        (r: Room) => r.project_id === proj.id
      )
      const hasRevisions = projRooms.some(
        (r: Room) => revisionMap.get(r.id) && revisionMap.get(r.id) > 0
      )
      if (!hasRevisions) {
        zeroRevisionProjects.set(proj.id, true)
      }
    }
  })

  // Group zero-revision projects by designer
  const designerZeroRevisions = new Map<string, ZeroRevisionDesigner>()
  ;(projects ?? []).forEach((proj: Project) => {
    if (proj.delivered_at && zeroRevisionProjects.has(proj.id)) {
      const designerId = proj.assigned_to
      if (designerId) {
        const designerName = profileMap.get(designerId) || 'Unknown'
        const current = designerZeroRevisions.get(designerId) || {
          designerName,
          projectCount: 0,
          zeroRevisionCount: 0,
          percentage: 0,
        }

        current.zeroRevisionCount += 1
        designerZeroRevisions.set(designerId, current)
      }
    }
  })

  // Calculate total projects per designer
  ;(projects ?? []).forEach((proj: Project) => {
    if (proj.delivered_at && proj.assigned_to) {
      const designerId = proj.assigned_to
      const designerName = profileMap.get(designerId) || 'Unknown'
      const current = designerZeroRevisions.get(designerId)
      if (current) {
        current.projectCount += 1
        current.percentage = Math.round(
          (current.zeroRevisionCount / current.projectCount) * 100
        )
      }
    }
  })

  const designerStats = Array.from(designerZeroRevisions.values())
    .sort((a, b) => b.zeroRevisionCount - a.zeroRevisionCount)
    .slice(0, 10)

  // Compute overall metrics
  const totalRenders = (renders as Render[]).length
  const totalApproved = passTypeArray.reduce((sum, p) => sum + p.approved, 0)
  const totalDelivered = (projects as Project[]).filter(
    (p) => p.delivered_at
  ).length
  const totalZeroRevision = zeroRevisionProjects.size

  const overallApprovalRate =
    totalRenders > 0 ? Math.round((totalApproved / totalRenders) * 100) : 0

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
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Template Performance
        </h1>
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-auto">
        {/* Row 1: Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatsCard
            label="Overall Approval Rate"
            value={`${overallApprovalRate}%`}
            accent="success"
          />
          <StatsCard
            label="Zero Revision Projects"
            value={totalZeroRevision.toString()}
            accent="brand"
          />
          <StatsCard
            label="Projects Delivered"
            value={totalDelivered.toString()}
            accent="default"
          />
        </div>

        {/* Section 1: Pass Type Success Rates */}
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
            Pass Type Success Rates
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    'Pass Type',
                    'Total Renders',
                    'Approved',
                    'Rejected',
                    'Approval Rate',
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
                {passTypeArray.map((stat) => {
                  const approvalBg =
                    stat.approvalRate >= 80
                      ? '#F0FDF4'
                      : stat.approvalRate >= 50
                        ? '#FFFBEB'
                        : '#FEF2F2'
                  const approvalColor =
                    stat.approvalRate >= 80
                      ? '#16A34A'
                      : stat.approvalRate >= 50
                        ? '#D97706'
                        : '#DC2626'

                  return (
                    <tr
                      key={stat.passType}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        className="py-3 px-3 font-semibold capitalize"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {stat.passType.replace(/_/g, ' ')}
                      </td>
                      <td
                        className="py-3 px-3 tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {stat.totalRenders}
                      </td>
                      <td
                        className="py-3 px-3 font-semibold tabular-nums"
                        style={{ color: '#16A34A' }}
                      >
                        {stat.approved}
                      </td>
                      <td
                        className="py-3 px-3 tabular-nums"
                        style={{ color: '#DC2626' }}
                      >
                        {stat.rejected}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            background: approvalBg,
                            color: approvalColor,
                          }}
                        >
                          {stat.approvalRate}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {passTypeArray.length === 0 && (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No render data yet
            </p>
          )}
        </div>

        {/* Section 2: Style Vault Leaderboard */}
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
            Style Vault Leaderboard
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    'Style Name',
                    'Room Type',
                    'City',
                    'Times Used',
                    'Usage %',
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
                {(styleVault as StyleVaultEntry[]).map((entry) => {
                  const maxUsage = Math.max(
                    ...((styleVault as StyleVaultEntry[]) ?? []).map(
                      (e) => e.usage_count ?? 0
                    ),
                    1
                  )
                  const usagePct = Math.round(
                    ((entry.usage_count ?? 0) / maxUsage) * 100
                  )

                  return (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        className="py-3 px-3 font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {entry.style_name}
                      </td>
                      <td
                        className="py-3 px-3 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {entry.room_type ?? '—'}
                      </td>
                      <td
                        className="py-3 px-3 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {entry.city ?? '—'}
                      </td>
                      <td
                        className="py-3 px-3 tabular-nums"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {entry.usage_count ?? 0}
                      </td>
                      <td className="py-3 px-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ maxWidth: '120px' }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '6px',
                              background: 'var(--border)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${usagePct}%`,
                                height: '100%',
                                background: 'var(--brand)',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-semibold tabular-nums"
                            style={{ color: 'var(--text-muted)', minWidth: '24px' }}
                          >
                            {usagePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {(styleVault as StyleVaultEntry[]).length === 0 && (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No style vault entries yet
            </p>
          )}
        </div>

        {/* Section 3: Zero Revision Designers */}
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
            Top Zero-Revision Designers
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    'Designer',
                    'Total Delivered',
                    'Zero Revisions',
                    'Rate',
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
                {designerStats.map((designer) => {
                  const rateBg =
                    designer.percentage >= 80
                      ? '#F0FDF4'
                      : designer.percentage >= 50
                        ? '#FFFBEB'
                        : '#FEF2F2'
                  const rateColor =
                    designer.percentage >= 80
                      ? '#16A34A'
                      : designer.percentage >= 50
                        ? '#D97706'
                        : '#DC2626'

                  return (
                    <tr
                      key={designer.designerName}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        className="py-3 px-3 font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {designer.designerName}
                      </td>
                      <td
                        className="py-3 px-3 tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {designer.projectCount}
                      </td>
                      <td
                        className="py-3 px-3 font-semibold tabular-nums"
                        style={{ color: '#16A34A' }}
                      >
                        {designer.zeroRevisionCount}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            background: rateBg,
                            color: rateColor,
                          }}
                        >
                          {designer.percentage}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {designerStats.length === 0 && (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No designer data yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
