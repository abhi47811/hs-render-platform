'use client'
import { useMemo, useState } from 'react'
import type { ProjectWithRoomCount } from '@/types/database'

export interface PipelineFilterState {
  search:   string   // client name substring
  city:     string   // '' = all
  priority: string   // '' = all
  budget:   string   // '' = all
  assignee: string   // '' = all | 'unassigned' | profile UUID
}

export const EMPTY_FILTERS: PipelineFilterState = {
  search:   '',
  city:     '',
  priority: '',
  budget:   '',
  assignee: '',
}

export function usePipelineFilter(projects: ProjectWithRoomCount[]) {
  const [filters, setFilters] = useState<PipelineFilterState>(EMPTY_FILTERS)

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!p.client_name.toLowerCase().includes(q)) return false
      }
      if (filters.city     && p.city             !== filters.city)     return false
      if (filters.priority && p.priority         !== filters.priority) return false
      if (filters.budget   && p.budget_bracket   !== filters.budget)   return false
      if (filters.assignee) {
        if (filters.assignee === 'unassigned') {
          if (p.assigned_to !== null) return false
        } else {
          if (p.assigned_to !== filters.assignee) return false
        }
      }
      return true
    })
  }, [projects, filters])

  const activeCount = Object.values(filters).filter(Boolean).length

  function reset() { setFilters(EMPTY_FILTERS) }

  return { filters, setFilters, filtered, activeCount, reset }
}
