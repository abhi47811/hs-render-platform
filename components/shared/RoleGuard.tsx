'use client'

// ─── Sec 05: RoleGuard — role-aware conditional rendering ─────────────────
// Wraps any UI that should only be visible / interactive for specific roles.
//
// Usage examples:
//
//   // Hide element from viewers entirely:
//   <RoleGuard action="approve_checkpoint">
//     <ApproveButton />
//   </RoleGuard>
//
//   // Show a fallback for unauthorised roles:
//   <RoleGuard action="delete_project" fallback={<p>Not permitted</p>}>
//     <DeleteButton />
//   </RoleGuard>
//
//   // Render children but disable them for unauthorised roles:
//   <RoleGuard action="run_staging" disableInstead>
//     <GenerateButton />
//   </RoleGuard>

import { useUserRole } from '@/hooks/useUserRole'
import type { PermissionAction } from '@/lib/rbac'
import type { ReactNode } from 'react'

interface RoleGuardProps {
  /** The permission action required to see / use the wrapped content */
  action: PermissionAction
  /** Content to show if the user has the required permission */
  children: ReactNode
  /**
   * Content to render when the user lacks permission.
   * Defaults to null (renders nothing).
   */
  fallback?: ReactNode
  /**
   * When true, children are always rendered but wrapped in a div with
   * pointer-events-none + opacity-40 for unauthorised users.
   * Useful for buttons that should be visible but not clickable.
   */
  disableInstead?: boolean
}

export function RoleGuard({
  action,
  children,
  fallback = null,
  disableInstead = false,
}: RoleGuardProps) {
  const { can, loading } = useUserRole()

  // While loading, render nothing to avoid flash of unauthorised content
  if (loading) return null

  const permitted = can(action)

  if (disableInstead) {
    return (
      <div
        className={permitted ? undefined : 'pointer-events-none opacity-40 select-none'}
        aria-disabled={!permitted || undefined}
        title={!permitted ? 'You don\'t have permission to perform this action' : undefined}
      >
        {children}
      </div>
    )
  }

  if (!permitted) return <>{fallback}</>

  return <>{children}</>
}

// ── Convenience guard components for common patterns ──────────────────────

/** Renders children only for admin users */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard action="manage_users" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

/** Renders children for admins and senior designers */
export function SeniorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard action="approve_checkpoint" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}
