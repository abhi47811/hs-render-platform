'use client'

// Sec 41 — Admin-only: revision_limit config.
// Lets admins set the maximum number of revisions allowed per project.
// Applies to all currently active (non-delivered) projects via a bulk update.

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  /** Current default — sampled from the most common revision_limit across active projects */
  currentDefault: number
  /** How many active projects will be affected by a change */
  activeProjectCount: number
}

const CHOICES = [1, 2, 3, 4, 5]

export function RevisionLimitPanel({ currentDefault, activeProjectCount }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [value, setValue] = useState<number>(currentDefault)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const dirty = value !== currentDefault

  const apply = () => {
    startTransition(async () => {
      setStatus(null)
      const { error, count } = await supabase
        .from('projects')
        .update({ revision_limit: value }, { count: 'exact' })
        .in('status', ['intake', 'in_progress', 'needs_revision', 'qc'])

      if (error) {
        setStatus({ type: 'err', msg: error.message })
        return
      }
      setStatus({ type: 'ok', msg: `Updated ${count ?? 0} active project(s) to allow ${value} revision${value === 1 ? '' : 's'}.` })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Revision Limit per Project
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Maximum number of revision rounds a client can request. Affects {activeProjectCount} active project{activeProjectCount === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors min-w-[48px]"
            style={{
              background: value === n ? 'var(--text-primary)' : 'var(--surface-3)',
              color: value === n ? 'var(--surface)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={!dirty || isPending}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--text-primary)',
            color: 'var(--surface)',
          }}
        >
          {isPending ? 'Applying…' : 'Apply to active projects'}
        </button>
        {dirty && !isPending && (
          <button
            type="button"
            onClick={() => { setValue(currentDefault); setStatus(null) }}
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Reset
          </button>
        )}
      </div>

      {status && (
        <p
          className="text-xs"
          style={{ color: status.type === 'ok' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' }}
        >
          {status.msg}
        </p>
      )}
    </div>
  )
}
