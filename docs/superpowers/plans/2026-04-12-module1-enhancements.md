# Module 1 — All 15 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 15 missing features for a production-grade Houspire Staging Ops Module 1, grouped into parallel-safe batches.

**Architecture:** Next.js 14 App Router + Supabase SSR. All new components are client components (`'use client'`) using inline `style={{}}` with CSS custom properties (`var(--brand)`, `var(--surface)`, etc.) — never Tailwind color classes for dynamic state. API routes use `await createClient()` from `@/lib/supabase/server`. New controls follow the `ProjectStatusControl` pattern (optimistic update → PATCH API → `router.refresh()`).

**Tech Stack:** Next.js 14.2, React 18, Supabase JS v2, TypeScript strict, Tailwind CSS (layout only), CSS custom properties design system in `app/globals.css`.

**CSS vars reference:**
- `var(--brand)` = #C4913A (amber gold)
- `var(--surface)` / `var(--surface-2)` / `var(--surface-3)` = white / off-white / parchment
- `var(--border)` / `var(--border-strong)` = dividers
- `var(--text-primary)` / `var(--text-secondary)` / `var(--text-muted)` = text hierarchy
- `var(--bg)` = #F4F1EC (warm background)
- `var(--sidebar-bg)` = #0E0D0B

---

## BATCH 1 — Project Controls (all files independent, run in parallel)

---

### Task 1: Project Assignment Control

**Files:**
- Create: `components/project/ProjectAssignControl.tsx`
- Create: `app/api/projects/[id]/assign/route.ts`
- Modify: `app/(dashboard)/projects/[id]/page.tsx` — import + replace static "Assigned To" StatCard

---

- [ ] **Step 1: Create the PATCH API route**

Create `app/api/projects/[id]/assign/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams { params: { id: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assigned_to } = await request.json()

  // assigned_to may be null (unassign) or a UUID string
  if (assigned_to !== null && typeof assigned_to !== 'string') {
    return NextResponse.json({ error: 'assigned_to must be a UUID or null' }, { status: 400 })
  }

  const { error } = await supabase
    .from('projects')
    .update({ assigned_to: assigned_to ?? null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  supabase.from('activity_log').insert({
    project_id: params.id, user_id: user.id,
    action_type: 'assign_project',
    action_description: assigned_to ? `Assigned to ${assigned_to}` : 'Unassigned',
  }).then(() => {})

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the client component**

Create `components/project/ProjectAssignControl.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member { id: string; full_name: string | null; role: string | null }

interface ProjectAssignControlProps {
  projectId: string
  currentAssigneeId: string | null
  currentAssigneeName: string | null
  members: Member[]
}

export function ProjectAssignControl({
  projectId, currentAssigneeId, currentAssigneeName, members,
}: ProjectAssignControlProps) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSelect(memberId: string | null) {
    if (memberId === currentAssigneeId) { setOpen(false); return }
    setSaving(true); setOpen(false); setError(null)
    const res = await fetch(`/api/projects/${projectId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: memberId }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed')
    } else {
      router.refresh()
    }
    setSaving(false)
  }

  const initials = (currentAssigneeName ?? '')
    .trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', opacity: saving ? 0.6 : 1,
        }}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
        >
          {initials}
        </span>
        {saving ? 'Saving…' : (currentAssigneeName ?? 'Unassigned')}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-40 rounded-xl min-w-[180px] overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Assign to</p>
            </div>
            <button onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
              style={{ color: !currentAssigneeId ? 'var(--brand)' : 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>—</span>
              Unassigned
              {!currentAssigneeId && <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
            {members.map(m => {
              const mi = (m.full_name ?? '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
              const isActive = m.id === currentAssigneeId
              return (
                <button key={m.id} onClick={() => handleSelect(m.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                  style={{ color: isActive ? 'var(--brand)' : 'var(--text-secondary)', background: isActive ? 'rgba(196,145,58,0.06)' : 'transparent' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}>{mi}</span>
                  <span className="flex-1 text-left truncate">{m.full_name ?? 'Unnamed'}</span>
                  <span className="text-[9px] capitalize" style={{ color: 'var(--text-muted)' }}>{m.role}</span>
                  {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
              )
            })}
          </div>
        </>
      )}
      {error && <p className="absolute left-0 top-full mt-1 text-xs px-2 py-1 rounded z-40" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Wire into project detail page**

In `app/(dashboard)/projects/[id]/page.tsx`:

1. Add import: `import { ProjectAssignControl } from '@/components/project/ProjectAssignControl'`

2. After the existing `assignedProfile` fetch, add a fetch for all team members:
```tsx
const { data: teamMembers = [] } = await supabase
  .from('profiles')
  .select('id, full_name, role')
  .order('full_name')
```

3. Replace the static "Assigned To" StatCard:
```tsx
// REMOVE this:
<StatCard
  label="Assigned To"
  value={assignedProfile ? assignedProfile.full_name : 'Unassigned'}
  sub={assignedProfile?.role}
/>

// ADD this (inside the stats row grid):
<div className="rounded-lg px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
  <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Assigned To</p>
  <ProjectAssignControl
    projectId={params.id}
    currentAssigneeId={project.assigned_to ?? null}
    currentAssigneeName={assignedProfile?.full_name ?? null}
    members={teamMembers ?? []}
  />
</div>
```

- [ ] **Step 4: TypeScript check**
```bash
cd "houspire-staging" && npx tsc --noEmit
```
Expected: no output (zero errors)

---

### Task 2: Project Priority Control

**Files:**
- Create: `components/project/ProjectPriorityControl.tsx`
- Create: `app/api/projects/[id]/priority/route.ts`
- Modify: `app/(dashboard)/projects/[id]/page.tsx` — import + replace static priority badge

---

- [ ] **Step 1: Create the PATCH API route**

Create `app/api/projects/[id]/priority/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_PRIORITIES = ['Normal', 'High', 'Urgent'] as const
type Priority = (typeof VALID_PRIORITIES)[number]
interface RouteParams { params: { id: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { priority } = await request.json() as { priority: unknown }
  if (!VALID_PRIORITIES.includes(priority as Priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  }

  const { error } = await supabase.from('projects').update({ priority }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  supabase.from('activity_log').insert({
    project_id: params.id, user_id: user.id,
    action_type: 'priority_change',
    action_description: `Priority set to ${priority}`,
  }).then(() => {})

  return NextResponse.json({ success: true, priority })
}
```

- [ ] **Step 2: Create the client component**

Create `components/project/ProjectPriorityControl.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Priority = 'Normal' | 'High' | 'Urgent'
const PRIORITIES: { value: Priority; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'Normal', label: 'Normal', color: '#78716C', bg: '#F5F5F4', dot: '#A8A29E' },
  { value: 'High',   label: 'High',   color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { value: 'Urgent', label: 'Urgent', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
]

interface ProjectPriorityControlProps {
  projectId: string
  currentPriority: Priority
}

export function ProjectPriorityControl({ projectId, currentPriority }: ProjectPriorityControlProps) {
  const router = useRouter()
  const [priority, setPriority] = useState<Priority>(currentPriority)
  const [open, setOpen]         = useState(false)
  const [saving, setSaving]     = useState(false)

  const current = PRIORITIES.find(p => p.value === priority) ?? PRIORITIES[0]

  async function handleSelect(next: Priority) {
    if (next === priority) { setOpen(false); return }
    setSaving(true); setOpen(false)
    setPriority(next) // optimistic
    const res = await fetch(`/api/projects/${projectId}/priority`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: next }),
    })
    if (res.ok) router.refresh()
    else setPriority(priority) // revert
    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: current.bg, color: current.color, border: `1px solid ${current.color}33` }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: current.dot }} />
        {saving ? 'Saving…' : current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-40 rounded-xl min-w-[140px] overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Set priority</p>
            </div>
            {PRIORITIES.map(p => (
              <button key={p.value} onClick={() => handleSelect(p.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                style={{ color: p.value === priority ? p.color : 'var(--text-secondary)', background: p.value === priority ? `${p.color}0F` : 'transparent' }}
                onMouseEnter={e => { if (p.value !== priority) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (p.value !== priority) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                {p.label}
                {p.value === priority && <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire into project detail page**

In `app/(dashboard)/projects/[id]/page.tsx`:

1. Add import: `import { ProjectPriorityControl } from '@/components/project/ProjectPriorityControl'`

2. In the project header flex row, replace the static priority badge with the control:
```tsx
// REMOVE:
{project.priority !== 'Normal' && (
  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${...}`}>
    {project.priority}
  </span>
)}

// ADD (always visible, not conditional):
<ProjectPriorityControl
  projectId={params.id}
  currentPriority={project.priority as 'Normal' | 'High' | 'Urgent'}
/>
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no output

---

### Task 3: SLA Extension UI

**Files:**
- Create: `components/project/SlaExtendButton.tsx`
- Create: `app/api/projects/[id]/extend-sla/route.ts`
- Modify: `app/(dashboard)/projects/[id]/page.tsx` — add button near SlaCountdown

---

- [ ] **Step 1: Create the PATCH API route**

Create `app/api/projects/[id]/extend-sla/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_EXTENSIONS = [24, 48, 72] // hours
interface RouteParams { params: { id: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { extend_hours } = await request.json() as { extend_hours: unknown }
  const hours = Number(extend_hours)
  if (!VALID_EXTENSIONS.includes(hours)) {
    return NextResponse.json({ error: 'extend_hours must be 24, 48, or 72' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects').select('sla_deadline').eq('id', params.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const current = new Date(project.sla_deadline)
  const newDeadline = new Date(current.getTime() + hours * 60 * 60 * 1000)

  const { error } = await supabase.from('projects')
    .update({ sla_deadline: newDeadline.toISOString() })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  supabase.from('activity_log').insert({
    project_id: params.id, user_id: user.id,
    action_type: 'sla_extended',
    action_description: `SLA extended by ${hours}h. New deadline: ${newDeadline.toISOString()}`,
  }).then(() => {})

  return NextResponse.json({ success: true, new_deadline: newDeadline.toISOString() })
}
```

- [ ] **Step 2: Create the client component**

Create `components/project/SlaExtendButton.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SlaExtendButtonProps { projectId: string }

export function SlaExtendButton({ projectId }: SlaExtendButtonProps) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  async function extend(hours: 24 | 48 | 72) {
    setSaving(true); setOpen(false)
    await fetch(`/api/projects/${projectId}/extend-sla`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extend_hours: hours }),
    })
    setDone(true)
    setTimeout(() => setDone(false), 3000)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-md transition-all"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: saving ? 'var(--text-muted)' : 'var(--text-secondary)' }}
      >
        {saving ? '…' : done ? '✓ Extended' : '+ Extend SLA'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-40 rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Extend deadline by</p>
            </div>
            {([24, 48, 72] as const).map(h => (
              <button key={h} onClick={() => extend(h)}
                className="w-full px-4 py-2.5 text-sm font-medium text-left transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                +{h} hours
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire into project detail page**

In `app/(dashboard)/projects/[id]/page.tsx`:

1. Add import: `import { SlaExtendButton } from '@/components/project/SlaExtendButton'`

2. In the sticky breadcrumb row where `SlaCountdown` lives, add the extend button next to it:
```tsx
// Modify the breadcrumb flex row (right side):
<div className="flex items-center gap-2">
  <SlaExtendButton projectId={params.id} />
  <SlaCountdown slaDeadline={project.sla_deadline} />
</div>
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 4: Room Status Manual Override

**Files:**
- Create: `components/project/RoomStatusControl.tsx`
- Create: `app/api/rooms/[roomId]/status/route.ts`
- Modify: `app/(dashboard)/projects/[id]/rooms/[roomId]/page.tsx` — add control in room header

---

- [ ] **Step 1: Create the PATCH API route**

Create `app/api/rooms/[roomId]/status/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['not_started','shell_uploaded','in_progress','client_review','delivered'] as const
type RoomStatus = (typeof VALID_STATUSES)[number]
interface RouteParams { params: { roomId: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json() as { status: unknown }
  if (!VALID_STATUSES.includes(status as RoomStatus)) {
    return NextResponse.json({ error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const { data: room } = await supabase.from('rooms').select('id, project_id').eq('id', params.roomId).single()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { error } = await supabase.from('rooms').update({ status }).eq('id', params.roomId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  supabase.from('activity_log').insert({
    project_id: room.project_id, user_id: user.id,
    action_type: 'room_status_change',
    action_description: `Room status changed to ${status}`,
  }).then(() => {})

  return NextResponse.json({ success: true, status })
}
```

- [ ] **Step 2: Create the client component**

Create `components/project/RoomStatusControl.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RoomStatus = 'not_started' | 'shell_uploaded' | 'in_progress' | 'client_review' | 'delivered'
const STATUSES: { value: RoomStatus; label: string; color: string; bg: string }[] = [
  { value: 'not_started',    label: 'Not Started',   color: '#78716C', bg: '#F5F5F4' },
  { value: 'shell_uploaded', label: 'Shell Ready',   color: '#2563EB', bg: '#EFF6FF' },
  { value: 'in_progress',    label: 'In Progress',   color: '#D97706', bg: '#FFFBEB' },
  { value: 'client_review',  label: 'Client Review', color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'delivered',      label: 'Delivered',     color: '#16A34A', bg: '#F0FDF4' },
]

interface RoomStatusControlProps { roomId: string; currentStatus: RoomStatus }

export function RoomStatusControl({ roomId, currentStatus }: RoomStatusControlProps) {
  const router = useRouter()
  const [status, setStatus] = useState<RoomStatus>(currentStatus)
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const current = STATUSES.find(s => s.value === status) ?? STATUSES[0]

  async function handleSelect(next: RoomStatus) {
    if (next === status) { setOpen(false); return }
    setSaving(true); setOpen(false)
    const prev = status; setStatus(next)
    const res = await fetch(`/api/rooms/${roomId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) router.refresh()
    else setStatus(prev)
    setSaving(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: current.bg, color: current.color, border: `1px solid ${current.color}33` }}>
        <span className="w-2 h-2 rounded-full" style={{ background: current.color }} />
        {saving ? 'Updating…' : current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-40 rounded-xl min-w-[160px] overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Set room status</p>
            </div>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => handleSelect(s.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                style={{ color: s.value === status ? s.color : 'var(--text-secondary)', background: s.value === status ? `${s.color}0F` : 'transparent' }}
                onMouseEnter={e => { if (s.value !== status) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (s.value !== status) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
                {s.value === status && <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire into room workspace page**

In `app/(dashboard)/projects/[id]/rooms/[roomId]/page.tsx`, find the room header section and add the import + component.

1. Add import at top: `import { RoomStatusControl } from '@/components/project/RoomStatusControl'`

2. Find the room name/status display (look for the room name `<h1>` or similar heading) and add the control below it:
```tsx
<RoomStatusControl
  roomId={params.roomId}
  currentStatus={room.status as 'not_started' | 'shell_uploaded' | 'in_progress' | 'client_review' | 'delivered'}
/>
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 5: Render Approval API Route

**Files:**
- Create: `app/api/renders/[renderId]/status/route.ts`
- Verify: `components/staging/RenderGallery.tsx` — ensure `onApprove`/`onReject` props call this endpoint

---

- [ ] **Step 1: Create the PATCH API route**

Create `app/api/renders/[renderId]/status/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['generated', 'team_approved', 'client_approved', 'rejected'] as const
type RenderStatus = (typeof VALID_STATUSES)[number]
interface RouteParams { params: { renderId: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json() as { status: unknown }
  if (!VALID_STATUSES.includes(status as RenderStatus)) {
    return NextResponse.json({ error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const { data: render } = await supabase
    .from('renders').select('id, room_id').eq('id', params.renderId).single()
  if (!render) return NextResponse.json({ error: 'Render not found' }, { status: 404 })

  const { error } = await supabase.from('renders').update({ status }).eq('id', params.renderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status })
}
```

- [ ] **Step 2: Verify RenderGallery wires approve/reject to this endpoint**

Open `components/staging/RenderGallery.tsx` and check what happens when `onApprove` / `onReject` is called. If the parent component (staging-client.tsx) doesn't call this API, add the calls there.

The staging-client should call:
```ts
async function handleApproveRender(renderId: string) {
  await fetch(`/api/renders/${renderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'team_approved' }),
  })
  // refresh render list
}
async function handleRejectRender(renderId: string) {
  await fetch(`/api/renders/${renderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' }),
  })
}
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

---

## BATCH 2 — Project Enrichment Features

---

### Task 6: Project Notes / Internal Log

**Files:**
- Create: `components/project/ProjectNotes.tsx`
- Create: `app/api/projects/[id]/notes/route.ts`
- Modify: `app/(dashboard)/projects/[id]/page.tsx` — add notes section below stats row

---

- [ ] **Step 1: Create the API route (GET + POST)**

Create `app/api/projects/[id]/notes/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams { params: { id: string } }

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('project_notes')
    .select('id, note_text, created_at, user_id, profiles(full_name, role)')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { note_text } = await request.json() as { note_text: unknown }
  if (typeof note_text !== 'string' || note_text.trim().length === 0) {
    return NextResponse.json({ error: 'note_text is required' }, { status: 400 })
  }
  if (note_text.trim().length > 2000) {
    return NextResponse.json({ error: 'Note max 2000 characters' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('project_notes')
    .insert({ project_id: params.id, user_id: user.id, note_text: note_text.trim() })
    .select('id, note_text, created_at, user_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

**NOTE:** This requires a `project_notes` table in Supabase. Run this SQL migration:
```sql
CREATE TABLE IF NOT EXISTS project_notes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note_text   text NOT NULL CHECK (length(note_text) <= 2000),
  created_at  timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX project_notes_project_id_idx ON project_notes(project_id);
```

- [ ] **Step 2: Create the client component**

Create `components/project/ProjectNotes.tsx`:

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'

interface Note {
  id: string
  note_text: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null; role: string | null } | null
}

export function ProjectNotes({ projectId }: { projectId: string }) {
  const [notes, setNotes]     = useState<Note[]>([])
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/notes`)
    if (res.ok) setNotes(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { loadNotes() }, [loadNotes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_text: text.trim() }),
    })
    if (res.ok) {
      setText('')
      loadNotes()
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
          Internal Notes
        </h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add an internal note… (client preferences, team context, reminders)"
          rows={3}
          maxLength={2000}
          className="w-full text-sm resize-none rounded-lg px-3 py-2.5 outline-none transition-all"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{text.length}/2000</span>
          <button type="submit" disabled={saving || !text.trim()}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)', color: 'white' }}>
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </form>

      {/* Notes list */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {loading && <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}
        {!loading && notes.length === 0 && (
          <p className="px-5 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No notes yet</p>
        )}
        {notes.map(n => {
          const initials = (n.profiles?.full_name ?? '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
          const date = new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          return (
            <div key={n.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}>{initials}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{n.profiles?.full_name ?? 'Team'}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{date}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{n.note_text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add to project detail page**

In `app/(dashboard)/projects/[id]/page.tsx`:

1. Add import: `import { ProjectNotes } from '@/components/project/ProjectNotes'`

2. Add after the stats row div (before the RoomPassTimeline section):
```tsx
{/* Internal Notes */}
<ProjectNotes projectId={params.id} />
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 7: Pipeline Search & Filter Bar

**Files:**
- Create: `components/pipeline/PipelineFilters.tsx`
- Create: `hooks/usePipelineFilter.ts`
- Modify: `app/(dashboard)/page.tsx` — add filter bar + wire filtered data to PipelineBoard
- Modify: `components/pipeline/PipelineBoard.tsx` — accept pre-filtered projects array

---

- [ ] **Step 1: Create the filter hook**

Create `hooks/usePipelineFilter.ts`:

```ts
import { useState, useMemo } from 'react'

interface Project {
  id: string
  client_name: string
  city: string | null
  budget_bracket: string | null
  status: string
  assigned_to: string | null
}

export interface PipelineFilters {
  search: string
  city: string
  budget: string
  assignee: string
}

const EMPTY: PipelineFilters = { search: '', city: '', budget: '', assignee: '' }

export function usePipelineFilter(projects: Project[]) {
  const [filters, setFilters] = useState<PipelineFilters>(EMPTY)

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!p.client_name.toLowerCase().includes(q)) return false
      }
      if (filters.city && p.city !== filters.city) return false
      if (filters.budget && p.budget_bracket !== filters.budget) return false
      if (filters.assignee) {
        if (filters.assignee === 'unassigned' && p.assigned_to !== null) return false
        if (filters.assignee !== 'unassigned' && p.assigned_to !== filters.assignee) return false
      }
      return true
    })
  }, [projects, filters])

  const isFiltered = filters.search || filters.city || filters.budget || filters.assignee

  function setFilter<K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function clearFilters() { setFilters(EMPTY) }

  return { filters, filtered, isFiltered: Boolean(isFiltered), setFilter, clearFilters }
}
```

- [ ] **Step 2: Create the filter bar component**

Create `components/pipeline/PipelineFilters.tsx`:

```tsx
'use client'
import type { PipelineFilters } from '@/hooks/usePipelineFilter'

interface Member { id: string; full_name: string | null }
interface PipelineFiltersProps {
  filters: PipelineFilters
  isFiltered: boolean
  cities: string[]
  members: Member[]
  onFilter: <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => void
  onClear: () => void
  totalCount: number
  filteredCount: number
}

const BUDGET_LABELS: Record<string, string> = {
  economy: 'Economy (<₹5L)', standard: 'Standard (₹5–12L)',
  premium: 'Premium (₹12–25L)', luxury: 'Luxury (₹25L+)',
}

export function PipelineFilters({
  filters, isFiltered, cities, members, onFilter, onClear, totalCount, filteredCount,
}: PipelineFiltersProps) {
  const inputStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontSize: 12, borderRadius: 8, padding: '5px 10px', outline: 'none',
  }

  return (
    <div
      className="flex items-center gap-3 px-6 py-2.5 flex-wrap"
      style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="Search clients…"
          value={filters.search}
          onChange={e => onFilter('search', e.target.value)}
          className="pl-7 pr-3"
          style={{ ...inputStyle, width: 180 }}
        />
      </div>

      {/* City */}
      <select value={filters.city} onChange={e => onFilter('city', e.target.value)} style={{ ...inputStyle, paddingRight: 24 }}>
        <option value="">All cities</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Budget */}
      <select value={filters.budget} onChange={e => onFilter('budget', e.target.value)} style={{ ...inputStyle, paddingRight: 24 }}>
        <option value="">All budgets</option>
        {Object.entries(BUDGET_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      {/* Assignee */}
      <select value={filters.assignee} onChange={e => onFilter('assignee', e.target.value)} style={{ ...inputStyle, paddingRight: 24 }}>
        <option value="">All designers</option>
        <option value="unassigned">Unassigned</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
      </select>

      {/* Clear */}
      {isFiltered && (
        <button onClick={onClear}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid var(--brand)33' }}
        >
          Clear filters
        </button>
      )}

      {/* Count */}
      <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
        {isFiltered ? `${filteredCount} of ${totalCount}` : `${totalCount} projects`}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Wire filter into dashboard page**

The dashboard `page.tsx` is a server component. The filter must be client-side.  
Create a new client wrapper component `components/pipeline/PipelineBoardWithFilters.tsx`:

```tsx
'use client'
import { PipelineBoard } from './PipelineBoard'
import { PipelineFilters } from './PipelineFilters'
import { usePipelineFilter } from '@/hooks/usePipelineFilter'

interface Member { id: string; full_name: string | null }
interface Project {
  id: string; client_name: string; city: string | null; budget_bracket: string | null
  status: string; assigned_to: string | null; priority: string; sla_deadline: string | null
  [key: string]: unknown
}

interface PipelineBoardWithFiltersProps {
  projects: Project[]
  members: Member[]
}

export function PipelineBoardWithFilters({ projects, members }: PipelineBoardWithFiltersProps) {
  const cities = [...new Set(projects.map(p => p.city).filter(Boolean))] as string[]
  const { filters, filtered, isFiltered, setFilter, clearFilters } = usePipelineFilter(projects)

  return (
    <div className="flex flex-col h-full">
      <PipelineFilters
        filters={filters}
        isFiltered={isFiltered}
        cities={cities}
        members={members}
        onFilter={setFilter}
        onClear={clearFilters}
        totalCount={projects.length}
        filteredCount={filtered.length}
      />
      <PipelineBoard projects={filtered as any} />
    </div>
  )
}
```

Then in `app/(dashboard)/page.tsx`, add a `teamMembers` fetch and swap `<PipelineBoard projects={projects} />` for `<PipelineBoardWithFilters projects={projects} members={teamMembers} />`:

```tsx
// Add import:
import { PipelineBoardWithFilters } from '@/components/pipeline/PipelineBoardWithFilters'

// Add fetch in server component:
const { data: teamMembers = [] } = await supabase
  .from('profiles').select('id, full_name').order('full_name')

// Replace PipelineBoard usage:
<PipelineBoardWithFilters projects={projects ?? []} members={teamMembers ?? []} />
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 8: My Work View

**Files:**
- Create: `app/(dashboard)/my-work/page.tsx`
- Modify: `components/layout/Sidebar.tsx` — add "My Work" nav item

---

- [ ] **Step 1: Create the server page**

Create `app/(dashboard)/my-work/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSlaStatus } from '@/lib/sla'
import { SlaCountdown } from '@/components/pipeline/SlaCountdown'

export const metadata = { title: 'My Work | Houspire Staging' }
export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  intake:        { label: 'Intake',         color: '#78716C', bg: '#F5F5F4' },
  shell_ready:   { label: 'Shell Ready',    color: '#2563EB', bg: '#EFF6FF' },
  style_set:     { label: 'Style Set',      color: '#7C3AED', bg: '#EDE9FE' },
  staging:       { label: 'Staging',        color: '#D97706', bg: '#FFFBEB' },
  client_review: { label: 'Client Review',  color: '#0891B2', bg: '#ECFEFF' },
  revisions:     { label: 'Revisions',      color: '#EA580C', bg: '#FFF7ED' },
  delivered:     { label: 'Delivered',      color: '#16A34A', bg: '#F0FDF4' },
}

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: '#DC2626', High: '#D97706', Normal: '#78716C',
}

export default async function MyWorkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  const { data: myProjects = [] } = await supabase
    .from('projects')
    .select('id, client_name, city, status, priority, sla_deadline, budget_bracket, project_type, created_at')
    .eq('assigned_to', user.id)
    .neq('status', 'delivered')
    .order('sla_deadline', { ascending: true })

  const { data: allProjects = [] } = await supabase
    .from('projects')
    .select('id')
    .eq('assigned_to', user.id)

  const urgent   = (myProjects ?? []).filter(p => p.priority === 'Urgent').length
  const overdue  = (myProjects ?? []).filter(p => getSlaStatus(p.sla_deadline) === 'breached').length
  const total    = (allProjects ?? []).length

  const initials = (profile?.full_name ?? '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-6 flex items-center gap-4"
        style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}>{initials}</div>
        <div>
          <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name ? `${profile.full_name}'s Work` : 'My Work'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active projects assigned to you</p>
        </div>
        {/* Quick stats */}
        <div className="ml-auto flex items-center gap-3">
          <Pill label="Total projects" value={String(total)} />
          {urgent > 0 && <Pill label="Urgent" value={String(urgent)} accent="#DC2626" />}
          {overdue > 0 && <Pill label="Overdue" value={String(overdue)} accent="#DC2626" />}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        {(myProjects ?? []).length === 0 ? (
          <div className="rounded-xl px-6 py-12 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-3xl mb-3">🎉</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No active projects assigned to you</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>You're all caught up, or nothing has been assigned yet</p>
            <Link href="/" className="inline-block mt-4 text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)', color: 'white' }}>
              View Pipeline
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(myProjects ?? []).map(p => {
              const sla = getSlaStatus(p.sla_deadline)
              const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.intake
              const slaColor = { green: '#16A34A', amber: '#D97706', red: '#DC2626', breached: '#DC2626' }[sla]
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                    {/* Priority dot */}
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[p.priority] ?? '#78716C' }} />
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.client_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.city} · {p.project_type}</p>
                    </div>
                    {/* Status badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    {/* SLA */}
                    <div className="flex-shrink-0">
                      <SlaCountdown slaDeadline={p.sla_deadline} />
                    </div>
                    {/* Arrow */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: accent ? `${accent}12` : 'var(--surface-2)', border: `1px solid ${accent ? `${accent}33` : 'var(--border)'}` }}>
      <span className="text-xs font-bold" style={{ color: accent ?? 'var(--text-secondary)' }}>{value}</span>
      <span className="text-[10px]" style={{ color: accent ?? 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
```

- [ ] **Step 2: Add to sidebar**

In `components/layout/Sidebar.tsx`, add a "My Work" nav item in the main nav array (after or before Library):

```tsx
// Find the NAV_ITEMS array and add:
{ label: 'My Work', href: '/my-work', icon: /* use a user/person SVG path */ '...' },
```

Use this SVG path for the icon (person with checkmark concept):
```tsx
// In the icon render, add a case for 'my-work':
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 9: Delivery Summary Page

**Files:**
- Create: `app/(dashboard)/projects/[id]/delivery/page.tsx`
- Modify: `app/(dashboard)/projects/[id]/page.tsx` — add "View Delivery Summary" button when status = delivered

---

- [ ] **Step 1: Create the delivery summary server page**

Create `app/(dashboard)/projects/[id]/delivery/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps { params: { id: string } }

export default async function DeliverySummaryPage({ params }: PageProps) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) notFound()

  const { data: rooms = [] } = await supabase
    .from('rooms')
    .select('id, room_name, room_type, status, current_pass, renders(id, status, storage_url, thumbnail_url, pass_number, variation_label)')
    .eq('project_id', params.id)
    .order('created_at')

  const { data: assignedProfile } = project.assigned_to
    ? await supabase.from('profiles').select('full_name, role').eq('id', project.assigned_to).single()
    : { data: null }

  const deliveredAt = project.delivered_at ? new Date(project.delivered_at) : null
  const createdAt   = new Date(project.created_at)
  const duration    = deliveredAt ? Math.round((deliveredAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null

  const totalRenders = (rooms ?? []).reduce((sum, r) => sum + (Array.isArray(r.renders) ? r.renders.length : 0), 0)
  const approvedRenders = (rooms ?? []).reduce((sum, r) => {
    const renders = Array.isArray(r.renders) ? r.renders : []
    return sum + renders.filter(rnd => rnd.status === 'client_approved' || rnd.status === 'team_approved').length
  }, 0)

  const BUDGET_LABELS: Record<string, string> = {
    economy: 'Economy (<₹5L)', standard: 'Standard (₹5–12L)',
    premium: 'Premium (₹12–25L)', luxury: 'Luxury (₹25L+)',
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-6 flex items-center justify-between"
        style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center gap-3">
          <Link href={`/projects/${params.id}`} className="text-xs flex items-center gap-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Back to project
          </Link>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Delivery Summary</h1>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
          ✓ Delivered
        </span>
      </div>

      <div className="p-6 max-w-4xl space-y-6">

        {/* Project info card */}
        <div className="rounded-xl px-6 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--text-muted)' }}>Project Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryField label="Client" value={project.client_name} />
            <SummaryField label="City" value={project.city ?? '—'} />
            <SummaryField label="Project Type" value={project.project_type ?? '—'} />
            <SummaryField label="Budget" value={BUDGET_LABELS[project.budget_bracket] ?? project.budget_bracket ?? '—'} />
            <SummaryField label="Designer" value={assignedProfile?.full_name ?? 'Unassigned'} />
            <SummaryField label="Completed In" value={duration ? `${duration}h` : '—'} />
            <SummaryField label="Total Rooms" value={String((rooms ?? []).length)} />
            <SummaryField label="Total Renders" value={`${approvedRenders} approved / ${totalRenders} total`} />
          </div>
          {deliveredAt && (
            <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Delivered on {deliveredAt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' '}at {deliveredAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {project.is_late_delivery && <span className="ml-2 text-red-500 font-semibold">⚠ Late delivery</span>}
            </p>
          )}
        </div>

        {/* Rooms + renders */}
        {(rooms ?? []).map(room => {
          const renders = Array.isArray(room.renders) ? room.renders : []
          const approvedCount = renders.filter(r => r.status === 'client_approved' || r.status === 'team_approved').length
          return (
            <div key={room.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{room.room_name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{room.room_type} · Pass {room.current_pass}/6</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                  {approvedCount} approved render{approvedCount !== 1 ? 's' : ''}
                </span>
              </div>

              {renders.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
                  {renders.map(r => (
                    <div key={r.id} className="aspect-video rounded-lg overflow-hidden relative group"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                      {r.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumbnail_url} alt={`Pass ${r.pass_number} ${r.variation_label ?? ''}`}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>No preview</div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[9px] font-semibold"
                        style={{ background: 'rgba(14,13,11,0.65)', color: '#fff' }}>
                        P{r.pass_number}{r.variation_label ? ` · ${r.variation_label}` : ''}
                        {(r.status === 'client_approved' || r.status === 'team_approved') && ' ✓'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>No renders</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
```

- [ ] **Step 2: Add link in project detail page**

In `app/(dashboard)/projects/[id]/page.tsx`, find the DuplicateButton row and add a "View Delivery Summary" link when status is delivered:

```tsx
<div className="flex items-center gap-2 mt-2">
  <DuplicateButton projectId={project.id} projectName={project.client_name} />
  {project.status === 'delivered' && (
    <Link
      href={`/projects/${params.id}/delivery`}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
      style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}
    >
      ✓ View Delivery Summary
    </Link>
  )}
</div>
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

---

## BATCH 3 — Analytics Enhancements (all in analytics/page.tsx, run sequentially)

---

### Task 10: Analytics — Designer Productivity

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx` — add new data fetches + designer table section
- Create: `components/analytics/DesignerTable.tsx`

---

- [ ] **Step 1: Create the DesignerTable component**

Create `components/analytics/DesignerTable.tsx`:

```tsx
interface DesignerRow {
  id: string
  full_name: string | null
  role: string | null
  total: number
  delivered: number
  lateDeliveries: number
  avgHours: number | null
}

export function DesignerTable({ rows }: { rows: DesignerRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No data yet</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Designer', 'Total', 'Delivered', 'On Time', 'Avg Hours'].map(h => (
              <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const onTime   = r.delivered - r.lateDeliveries
            const onTimePct = r.delivered > 0 ? Math.round((onTime / r.delivered) * 100) : null
            const initials = (r.full_name ?? '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}>{initials}</span>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.full_name ?? 'Unnamed'}</p>
                      <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{r.role ?? 'No role'}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{r.total}</td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{r.delivered}</td>
                <td className="py-3 px-3">
                  {onTimePct !== null ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: onTimePct >= 80 ? '#F0FDF4' : '#FEF2F2', color: onTimePct >= 80 ? '#16A34A' : '#DC2626' }}>
                      {onTimePct}%
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {r.avgHours !== null ? `${Math.round(r.avgHours)}h` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Add designer data fetch + section to analytics page**

In `app/(dashboard)/analytics/page.tsx`:

Add this data fetch block after the existing fetches:
```tsx
// Designer productivity
const { data: allProfiles = [] } = await supabase
  .from('profiles')
  .select('id, full_name, role')
  .order('full_name')

const { data: designerProjects = [] } = await supabase
  .from('projects')
  .select('assigned_to, delivered_at, created_at, is_late_delivery, status')
  .not('assigned_to', 'is', null)

const designerRows = (allProfiles ?? []).map(profile => {
  const theirProjects = (designerProjects ?? []).filter(p => p.assigned_to === profile.id)
  const delivered     = theirProjects.filter(p => p.delivered_at)
  const lateDeliveries = theirProjects.filter(p => p.is_late_delivery).length
  const durations = delivered
    .map(p => new Date(p.delivered_at!).getTime() - new Date(p.created_at).getTime())
    .filter(d => d > 0)
  const avgMs   = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null
  const avgHours = avgMs ? avgMs / (1000 * 60 * 60) : null
  return { id: profile.id, full_name: profile.full_name, role: profile.role, total: theirProjects.length, delivered: delivered.length, lateDeliveries, avgHours }
}).filter(r => r.total > 0)
```

Add the import: `import { DesignerTable } from '@/components/analytics/DesignerTable'`

Add a new section at the end of the analytics page content:
```tsx
{/* Designer Productivity */}
<div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
    <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
      Designer Productivity
    </h2>
  </div>
  <div className="px-6 py-4">
    <DesignerTable rows={designerRows} />
  </div>
</div>
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 11: Analytics — Cost & Margin

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx` — add cost-per-project table section
- Create: `components/analytics/CostBreakdownTable.tsx`

---

- [ ] **Step 1: Create the CostBreakdownTable component**

Create `components/analytics/CostBreakdownTable.tsx`:

```tsx
interface CostRow {
  projectId: string
  clientName: string
  city: string | null
  totalCost: number
  margin: number  // revenue (4999) minus cost
  renderCount: number
}

const REVENUE = 4999 // ₹ fixed fee per project

export function CostBreakdownTable({ rows }: { rows: CostRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No cost data yet</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Project', 'City', 'API Cost', 'Revenue', 'Margin', 'Renders'].map(h => (
              <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const marginPct = Math.round((r.margin / REVENUE) * 100)
            return (
              <tr key={r.projectId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{r.clientName}</td>
                <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{r.city ?? '—'}</td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>₹{r.totalCost.toFixed(2)}</td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: '#16A34A' }}>₹{REVENUE.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3">
                  <div>
                    <span className="font-bold tabular-nums" style={{ color: r.margin >= 0 ? '#16A34A' : '#DC2626' }}>
                      ₹{Math.abs(r.margin).toFixed(0)}
                    </span>
                    <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: marginPct >= 80 ? '#F0FDF4' : marginPct >= 50 ? '#FFFBEB' : '#FEF2F2', color: marginPct >= 80 ? '#16A34A' : marginPct >= 50 ? '#D97706' : '#DC2626' }}>
                      {marginPct}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.renderCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Add data + section to analytics page**

In `app/(dashboard)/analytics/page.tsx`:

Add data fetch:
```tsx
const { data: projectCostDetails = [] } = await supabase
  .from('projects')
  .select('id, client_name, city')
  .order('created_at', { ascending: false })
  .limit(20)

const { data: renderCounts = [] } = await supabase
  .from('renders')
  .select('room_id, rooms!inner(project_id)')

// Build render counts per project
const renderCountByProject: Record<string, number> = {}
;(renderCounts ?? []).forEach((r: any) => {
  const pid = r.rooms?.project_id
  if (pid) renderCountByProject[pid] = (renderCountByProject[pid] ?? 0) + 1
})

// Build cost rows
const costRows = (projectCostDetails ?? []).map(p => {
  const costLogs = (apiCostLogs ?? []).filter((l: any) => l.project_id === p.id)
  const totalCost = costLogs.reduce((sum: number, l: any) => sum + (l.cost_inr ?? 0), 0)
  return {
    projectId: p.id,
    clientName: p.client_name,
    city: p.city,
    totalCost,
    margin: 4999 - totalCost,
    renderCount: renderCountByProject[p.id] ?? 0,
  }
}).filter(r => r.renderCount > 0 || r.totalCost > 0)
```

Add import: `import { CostBreakdownTable } from '@/components/analytics/CostBreakdownTable'`

Add section after Designer Productivity:
```tsx
{/* Cost & Margin */}
<div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
    <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Cost & Margin per Project</h2>
    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Revenue: ₹4,999 flat fee</span>
  </div>
  <div className="px-6 py-4">
    <CostBreakdownTable rows={costRows} />
  </div>
</div>
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 12: Analytics — Monthly Trend Chart

**Files:**
- Create: `components/analytics/MonthlyTrendChart.tsx`
- Modify: `app/(dashboard)/analytics/page.tsx` — add trend data + chart

---

- [ ] **Step 1: Create the trend chart (pure CSS bars — no external chart library)**

Create `components/analytics/MonthlyTrendChart.tsx`:

```tsx
'use client'

interface MonthData {
  month: string  // e.g. "Jan 2026"
  delivered: number
  apiCostInr: number
}

export function MonthlyTrendChart({ data }: { data: MonthData[] }) {
  if (data.length === 0) {
    return <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No delivery data yet</p>
  }

  const maxDelivered = Math.max(...data.map(d => d.delivered), 1)
  const maxCost      = Math.max(...data.map(d => d.apiCostInr), 1)

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Projects delivered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#3B82F6' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>API cost (₹)</span>
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-3 h-32 pb-0">
        {data.map((d, i) => {
          const deliveredH = d.delivered > 0 ? Math.max((d.delivered / maxDelivered) * 120, 8) : 4
          const costH      = d.apiCostInr > 0 ? Math.max((d.apiCostInr / maxCost) * 120, 8) : 4
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 120 }}>
                {/* Delivered bar */}
                <div
                  className="flex-1 rounded-t-sm transition-all"
                  style={{ height: deliveredH, background: 'var(--brand)', opacity: 0.85, minWidth: 6 }}
                  title={`${d.delivered} delivered`}
                />
                {/* Cost bar */}
                <div
                  className="flex-1 rounded-t-sm transition-all"
                  style={{ height: costH, background: '#3B82F6', opacity: 0.7, minWidth: 6 }}
                  title={`₹${d.apiCostInr.toFixed(0)} API cost`}
                />
              </div>
              {/* Month label */}
              <span className="text-[9px] font-medium text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                {d.month}
              </span>
            </div>
          )
        })}
      </div>

      {/* Value annotations for last bar */}
      {data.length > 0 && (
        <div className="mt-4 flex items-center gap-6 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Latest month</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand)' }}>{data[data.length - 1].delivered}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>delivered</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>API spend</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: '#3B82F6' }}>₹{data[data.length - 1].apiCostInr.toFixed(0)}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>this month</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add trend data + section to analytics page**

In `app/(dashboard)/analytics/page.tsx`:

Add trend data computation:
```tsx
// Monthly trend — last 6 months
const now6months = new Date()
now6months.setMonth(now6months.getMonth() - 5)
now6months.setDate(1); now6months.setHours(0, 0, 0, 0)

const monthlyData: { month: string; delivered: number; apiCostInr: number }[] = []
for (let i = 5; i >= 0; i--) {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() - i)
  const next = new Date(d); next.setMonth(next.getMonth() + 1)
  const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

  const delivered = safeProjects.filter(p => {
    if (!p.delivered_at) return false
    const da = new Date(p.delivered_at)
    return da >= d && da < next
  }).length

  const apiCost = (apiCostLogs ?? []).filter((l: any) => {
    const ca = new Date(l.created_at)
    return ca >= d && ca < next
  }).reduce((sum: number, l: any) => sum + (l.cost_inr ?? 0), 0)

  monthlyData.push({ month: label, delivered, apiCostInr: apiCost })
}
```

Add import: `import { MonthlyTrendChart } from '@/components/analytics/MonthlyTrendChart'`

Add section before Designer Productivity:
```tsx
{/* Monthly Trend */}
<div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
    <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>6-Month Trend</h2>
  </div>
  <div className="px-6 py-5">
    <MonthlyTrendChart data={monthlyData} />
  </div>
</div>
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

---

## BATCH 4 — Admin & Bulk Operations

---

### Task 13: Admin User Role Management

**Files:**
- Create: `app/api/settings/members/[memberId]/route.ts`
- Modify: `components/settings/TeamMembersPanel.tsx` — add role dropdown + deactivate button (admin-only)
- Modify: `app/(dashboard)/settings/page.tsx` — pass current user role to TeamMembersPanel

---

- [ ] **Step 1: Create the member management API**

Create `app/api/settings/members/[memberId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['admin', 'designer', 'reviewer', 'ops']
interface RouteParams { params: { memberId: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can manage team
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await request.json() as { role?: string; is_active?: boolean }

  if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.role !== undefined)      update.role = body.role
  if (body.is_active !== undefined) update.is_active = body.is_active

  const { error } = await supabase.from('profiles').update(update).eq('id', params.memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Update TeamMembersPanel to be interactive for admins**

Replace the contents of `components/settings/TeamMembersPanel.tsx` with:

```tsx
'use client'
import { useState } from 'react'

const ROLE_OPTIONS = ['admin', 'designer', 'reviewer', 'ops']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:    { bg: '#FDF4E7', color: '#92400E' },
  designer: { bg: '#EDE9FE', color: '#5B21B6' },
  reviewer: { bg: '#F0FDF4', color: '#14532D' },
  ops:      { bg: '#EFF6FF', color: '#1E3A8A' },
}

interface Member {
  id: string
  full_name: string | null
  role: string | null
  created_at: string | null
}

interface TeamMembersPanelProps {
  members: Member[]
  currentUserId: string
  isAdmin: boolean
}

export function TeamMembersPanel({ members, currentUserId, isAdmin }: TeamMembersPanelProps) {
  const [rows, setRows]   = useState(members)
  const [saving, setSaving] = useState<string | null>(null)

  async function updateMember(memberId: string, patch: { role?: string; is_active?: boolean }) {
    setSaving(memberId)
    const res = await fetch(`/api/settings/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok && patch.role !== undefined) {
      setRows(r => r.map(m => m.id === memberId ? { ...m, role: patch.role! } : m))
    }
    setSaving(null)
  }

  if (rows.length === 0) {
    return <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No team members found</p>
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 pb-2 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>Joined</span>
      </div>
      {rows.map(member => {
        const initials = (member.full_name ?? '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
        const roleStyle = member.role ? (ROLE_COLORS[member.role] ?? { bg: 'var(--surface-3)', color: 'var(--text-secondary)' }) : { bg: 'var(--surface-3)', color: 'var(--text-muted)' }
        const joinedDate = member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
        const isSelf = member.id === currentUserId
        const isSaving = saving === member.id

        return (
          <div key={member.id} className="grid grid-cols-3 items-center py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            {/* Avatar + name */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}>{initials}</div>
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{member.full_name ?? 'Unnamed'}</span>
              {isSelf && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>you</span>}
            </div>

            {/* Role — editable for admins on non-self */}
            <div>
              {isAdmin && !isSelf ? (
                <select
                  value={member.role ?? ''}
                  disabled={isSaving}
                  onChange={e => updateMember(member.id, { role: e.target.value })}
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full outline-none"
                  style={{ ...roleStyle, border: 'none', cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}
                >
                  <option value="">No role</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={roleStyle}>
                  {member.role ?? 'No role'}
                </span>
              )}
            </div>

            {/* Joined */}
            <span className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{joinedDate}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Pass currentUserId + isAdmin from settings page**

In `app/(dashboard)/settings/page.tsx`:

```tsx
// Add: fetch current user's role
const isAdmin = profile?.role === 'admin'

// Update TeamMembersPanel usage:
<TeamMembersPanel
  members={teamMembers ?? []}
  currentUserId={user.id}
  isAdmin={isAdmin}
/>
```

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

---

### Task 14: Bulk Actions on Pipeline

**Files:**
- Create: `components/pipeline/BulkActionBar.tsx`
- Modify: `components/pipeline/PipelineCard.tsx` — add checkbox
- Modify: `components/pipeline/PipelineBoardWithFilters.tsx` — add selection state + bulk bar
- Create: `app/api/projects/bulk/route.ts`

---

- [ ] **Step 1: Create the bulk API route**

Create `app/api/projects/bulk/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['intake','shell_ready','style_set','staging','client_review','revisions','delivered']
const VALID_PRIORITIES = ['Normal','High','Urgent']

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { project_ids: string[]; action: string; value: string }
  const { project_ids, action, value } = body

  if (!Array.isArray(project_ids) || project_ids.length === 0) {
    return NextResponse.json({ error: 'project_ids required' }, { status: 400 })
  }
  if (project_ids.length > 50) {
    return NextResponse.json({ error: 'Max 50 projects per bulk action' }, { status: 400 })
  }

  let update: Record<string, unknown> = {}
  if (action === 'status') {
    if (!VALID_STATUSES.includes(value)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    update = { status: value }
  } else if (action === 'priority') {
    if (!VALID_PRIORITIES.includes(value)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    update = { priority: value }
  } else if (action === 'assign') {
    update = { assigned_to: value || null }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await supabase.from('projects').update(update).in('id', project_ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, updated: project_ids.length })
}
```

- [ ] **Step 2: Create BulkActionBar component**

Create `components/pipeline/BulkActionBar.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface Member { id: string; full_name: string | null }

interface BulkActionBarProps {
  selectedCount: number
  members: Member[]
  onAction: (action: string, value: string) => Promise<void>
  onClear: () => void
}

const STATUS_OPTIONS = [
  { value: 'intake', label: 'Intake' },
  { value: 'shell_ready', label: 'Shell Ready' },
  { value: 'style_set', label: 'Style Set' },
  { value: 'staging', label: 'Staging' },
  { value: 'client_review', label: 'Client Review' },
  { value: 'revisions', label: 'Revisions' },
  { value: 'delivered', label: 'Delivered' },
]

export function BulkActionBar({ selectedCount, members, onAction, onClear }: BulkActionBarProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('')
  const [priority, setPriority] = useState('')
  const [assignee, setAssignee] = useState('')

  async function handleApply(action: string, value: string) {
    if (!value) return
    setLoading(true)
    await onAction(action, value)
    setStatus(''); setPriority(''); setAssignee('')
    setLoading(false)
  }

  const selectStyle = {
    fontSize: 11, padding: '5px 8px', borderRadius: 8, outline: 'none',
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
    opacity: loading ? 0.5 : 1,
  }

  return (
    <div className="flex items-center gap-3 px-6 py-2.5 flex-wrap"
      style={{ background: '#FDF4E7', borderBottom: '1px solid var(--brand)33' }}>
      <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
        {selectedCount} project{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <span style={{ color: 'var(--border-strong)' }}>·</span>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</span>
        <select value={status} disabled={loading} onChange={e => setStatus(e.target.value)} style={selectStyle}>
          <option value="">Pick…</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {status && <button onClick={() => handleApply('status', status)} disabled={loading}
          className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: 'var(--brand)', color: 'white' }}>Apply</button>}
      </div>

      {/* Priority */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Priority</span>
        <select value={priority} disabled={loading} onChange={e => setPriority(e.target.value)} style={selectStyle}>
          <option value="">Pick…</option>
          {['Normal','High','Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {priority && <button onClick={() => handleApply('priority', priority)} disabled={loading}
          className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: 'var(--brand)', color: 'white' }}>Apply</button>}
      </div>

      {/* Assign */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Assign</span>
        <select value={assignee} disabled={loading} onChange={e => setAssignee(e.target.value)} style={selectStyle}>
          <option value="">Pick…</option>
          <option value="__unassign__">Unassign</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
        </select>
        {assignee && <button onClick={() => handleApply('assign', assignee === '__unassign__' ? '' : assignee)} disabled={loading}
          className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: 'var(--brand)', color: 'white' }}>Apply</button>}
      </div>

      <button onClick={onClear} className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        ✕ Clear
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Add selection + bulk bar to PipelineBoardWithFilters**

In `components/pipeline/PipelineBoardWithFilters.tsx`, add selection state and wire up:

```tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PipelineBoard } from './PipelineBoard'
import { PipelineFilters } from './PipelineFilters'
import { BulkActionBar } from './BulkActionBar'
import { usePipelineFilter } from '@/hooks/usePipelineFilter'

// ... (keep existing interfaces)

export function PipelineBoardWithFilters({ projects, members }: PipelineBoardWithFiltersProps) {
  const router = useRouter()
  const cities = [...new Set(projects.map(p => p.city).filter(Boolean))] as string[]
  const { filters, filtered, isFiltered, setFilter, clearFilters } = usePipelineFilter(projects)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  async function handleBulkAction(action: string, value: string) {
    const ids = [...selected]
    const res = await fetch('/api/projects/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_ids: ids, action, value }),
    })
    if (res.ok) {
      setSelected(new Set())
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {selected.size > 0 ? (
        <BulkActionBar
          selectedCount={selected.size}
          members={members}
          onAction={handleBulkAction}
          onClear={() => setSelected(new Set())}
        />
      ) : (
        <PipelineFilters
          filters={filters} isFiltered={isFiltered} cities={cities} members={members}
          onFilter={setFilter} onClear={clearFilters}
          totalCount={projects.length} filteredCount={filtered.length}
        />
      )}
      <PipelineBoard
        projects={filtered as any}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
      />
    </div>
  )
}
```

- [ ] **Step 4: Add checkbox to ProjectCard**

In `components/pipeline/ProjectCard.tsx`, add optional `isSelected`/`onToggleSelect` props and render a checkbox in the top-right:

```tsx
// Add to props interface:
interface ProjectCardProps {
  // ... existing props
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

// In the card JSX, add a checkbox overlay:
{onToggleSelect && (
  <input
    type="checkbox"
    checked={isSelected ?? false}
    onChange={e => { e.stopPropagation(); onToggleSelect(project.id) }}
    className="absolute top-3 right-3 w-4 h-4 cursor-pointer z-10"
    style={{ accentColor: 'var(--brand)' }}
    onClick={e => e.stopPropagation()}
  />
)}
```

Also update `PipelineBoard` and `PipelineColumn` to thread the `selectedIds` and `onToggleSelect` props down to `ProjectCard`.

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit
```

---

## Final Verification

- [ ] Run full TypeScript check
```bash
cd "houspire-staging" && npx tsc --noEmit
```
Expected: no output (zero errors)

- [ ] Verify all new API routes exist:
```bash
ls app/api/projects/[id]/assign/
ls app/api/projects/[id]/priority/
ls app/api/projects/[id]/extend-sla/
ls app/api/projects/[id]/notes/
ls app/api/projects/bulk/
ls app/api/rooms/[roomId]/status/
ls app/api/renders/[renderId]/status/
ls app/api/settings/members/[memberId]/
```

- [ ] Verify all new pages exist:
```bash
ls app/(dashboard)/my-work/
ls app/(dashboard)/projects/[id]/delivery/
```

- [ ] Verify all new components exist:
```bash
ls components/project/ProjectAssignControl.tsx
ls components/project/ProjectPriorityControl.tsx
ls components/project/SlaExtendButton.tsx
ls components/project/RoomStatusControl.tsx
ls components/project/ProjectNotes.tsx
ls components/pipeline/PipelineFilters.tsx
ls components/pipeline/PipelineBoardWithFilters.tsx
ls components/pipeline/BulkActionBar.tsx
ls components/analytics/DesignerTable.tsx
ls components/analytics/CostBreakdownTable.tsx
ls components/analytics/MonthlyTrendChart.tsx
```
