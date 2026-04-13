'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PipelineBoardWithFilters } from '@/components/pipeline/PipelineBoardWithFilters'
import Link from 'next/link'
import type { ProjectWithRoomCount } from '@/types/database'

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithRoomCount[]>([])
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch projects
      const { data: rawProjectsData, error } = await supabase
        .from('projects')
        .select('*, room_count:rooms(count), rooms(id, status)')
        .order('created_at', { ascending: false })
      const rawProjects = rawProjectsData ?? []

      if (error) console.error('[Pipeline] fetch error:', error)

      // Fetch all team members for bulk assign dropdown
      const { data: allMembers = [] } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')

      // Fetch assigned profiles separately to avoid FK join hint issues
      const assignedIds = Array.from(
        new Set(rawProjects.map((p) => p.assigned_to).filter(Boolean))
      ) as string[]
      const { data: profileRows } =
        assignedIds.length > 0
          ? await supabase.from('profiles').select('id, full_name, role').in('id', assignedIds)
          : { data: [] }
      const profileMap = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]))

      // Fetch max revision_number for projects currently in 'revisions' status
      const revisionRoomIds = rawProjects
        .filter((p) => p.status === 'revisions')
        .flatMap((p) => (p.rooms ?? []).map((r: { id: string }) => r.id))

      const { data: revisionRows } =
        revisionRoomIds.length > 0
          ? await supabase
              .from('revisions')
              .select('room_id, revision_number')
              .in('room_id', revisionRoomIds)
          : { data: [] }

      // Build room → project map, then project → max revision_number
      const roomToProjectId: Record<string, string> = {}
      rawProjects.forEach((p) => {
        ;(p.rooms ?? []).forEach((r: { id: string }) => {
          roomToProjectId[r.id] = p.id
        })
      })
      const revisionCountByProject: Record<string, number> = {}
      ;(revisionRows ?? []).forEach((r: { room_id: string; revision_number: number }) => {
        const pid = roomToProjectId[r.room_id]
        if (pid) {
          revisionCountByProject[pid] = Math.max(
            revisionCountByProject[pid] ?? 0,
            r.revision_number
          )
        }
      })

      const normalised: ProjectWithRoomCount[] = rawProjects.map((p) => ({
        ...p,
        room_count: Array.isArray(p.room_count)
          ? (p.room_count[0] as { count: number })?.count ?? 0
          : 0,
        rooms: p.rooms ?? [],
        assigned_profile: p.assigned_to ? (profileMap[p.assigned_to] ?? null) : null,
        revision_count: revisionCountByProject[p.id] ?? 0,
      }))

      setProjects(normalised)
      setMembers(allMembers ?? [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const totalProjects = projects.length
  const urgentCount = projects.filter((p) => p.priority === 'Urgent').length
  const activeCount = projects.filter(
    (p) => p.status !== 'delivered' && p.status !== 'intake'
  ).length

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Premium page header ── */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{
          height: 56,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4">
          <div>
            <h1
              className="text-[15px] font-bold leading-none tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Project Pipeline
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {loading ? (
                <span>Loading…</span>
              ) : (
                <>
                  {totalProjects} project{totalProjects !== 1 ? 's' : ''}
                  {urgentCount > 0 && (
                    <span className="ml-2" style={{ color: '#DC2626' }}>
                      · {urgentCount} urgent
                    </span>
                  )}
                  {activeCount > 0 && (
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                      · {activeCount} in progress
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Quick stat pills */}
          {!loading && totalProjects > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
              >
                {projects.filter((p) => p.status === 'staging').length} staging
              </span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#F0FDF4', color: '#16A34A' }}
              >
                {projects.filter((p) => p.status === 'delivered').length} delivered
              </span>
            </div>
          )}
        </div>

        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all"
          style={{
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(196,145,58,0.35)',
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Pipeline board with filters + bulk actions */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full text-stone-400 text-sm">
            Loading pipeline…
          </div>
        ) : (
          <PipelineBoardWithFilters projects={projects} members={members} />
        )}
      </div>
    </div>
  )
}
