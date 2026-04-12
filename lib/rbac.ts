// ─── Sec 05: RBAC — Role definitions & permission map ─────────────────────
// Centralised source-of-truth for role-based access control.
// Usage:
//   import { canPerform } from '@/lib/rbac'
//   if (canPerform(userRole, 'approve_checkpoint')) { ... }

// ── Role types ──────────────────────────────────────────────────────────────
// IMPORTANT: must match the DB check constraint on profiles.role:
//   check (role in ('admin', 'senior', 'junior', 'viewer'))

export type UserRole = 'admin' | 'senior' | 'junior' | 'viewer'

// ── Permission actions ───────────────────────────────────────────────────────
// Add new actions here as features are built; never remove old ones.

export type PermissionAction =
  // Projects
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'assign_project'          // reassign designer
  | 'view_project'

  // Rooms
  | 'create_room'
  | 'edit_room'
  | 'upload_shell'

  // Staging / renders
  | 'run_staging'             // trigger AI generation
  | 'approve_render'          // mark a render as approved seed
  | 'delete_render'

  // Checkpoints
  | 'share_checkpoint'        // send CP to client
  | 'approve_checkpoint'      // record client approval internally
  | 'add_team_notes'

  // Style
  | 'lock_style'              // write style_locked=true
  | 'override_style_lock'     // admin-only unlock

  // Cost & analytics
  | 'view_api_cost'
  | 'view_analytics'

  // Team management
  | 'manage_users'            // invite / deactivate team members
  | 'manage_prompt_templates'

// ── Permission matrix ────────────────────────────────────────────────────────
// true  = role has this permission
// false / absent = denied

const PERMISSION_MATRIX: Record<PermissionAction, Record<UserRole, boolean>> = {
  // Projects
  create_project:          { admin: true,  senior: true,  junior: false, viewer: false },
  edit_project:            { admin: true,  senior: true,  junior: false, viewer: false },
  delete_project:          { admin: true,  senior: false, junior: false, viewer: false },
  assign_project:          { admin: true,  senior: true,  junior: false, viewer: false },
  view_project:            { admin: true,  senior: true,  junior: true,  viewer: true  },

  // Rooms
  create_room:             { admin: true,  senior: true,  junior: true,  viewer: false },
  edit_room:               { admin: true,  senior: true,  junior: true,  viewer: false },
  upload_shell:            { admin: true,  senior: true,  junior: true,  viewer: false },

  // Staging / renders
  run_staging:             { admin: true,  senior: true,  junior: true,  viewer: false },
  approve_render:          { admin: true,  senior: true,  junior: false, viewer: false },
  delete_render:           { admin: true,  senior: true,  junior: false, viewer: false },

  // Checkpoints
  share_checkpoint:        { admin: true,  senior: true,  junior: false, viewer: false },
  approve_checkpoint:      { admin: true,  senior: true,  junior: false, viewer: false },
  add_team_notes:          { admin: true,  senior: true,  junior: true,  viewer: false },

  // Style
  lock_style:              { admin: true,  senior: true,  junior: false, viewer: false },
  override_style_lock:     { admin: true,  senior: false, junior: false, viewer: false },

  // Cost & analytics
  view_api_cost:           { admin: true,  senior: true,  junior: false, viewer: false },
  view_analytics:          { admin: true,  senior: true,  junior: false, viewer: false },

  // Team management
  manage_users:            { admin: true,  senior: false, junior: false, viewer: false },
  manage_prompt_templates: { admin: true,  senior: true,  junior: false, viewer: false },
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if the given role is allowed to perform the action.
 * Safely returns false for unknown roles / actions.
 */
export function canPerform(role: UserRole | null | undefined, action: PermissionAction): boolean {
  if (!role) return false
  return PERMISSION_MATRIX[action]?.[role] ?? false
}

/**
 * Returns all actions a role is permitted to perform.
 * Useful for debugging or building permission summaries.
 */
export function getAllowedActions(role: UserRole): PermissionAction[] {
  return (Object.keys(PERMISSION_MATRIX) as PermissionAction[]).filter(
    (action) => PERMISSION_MATRIX[action][role] === true,
  )
}

// ── Role display helpers ─────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Admin',
  senior:  'Senior Designer',
  junior:  'Junior Designer',
  viewer:  'Viewer',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:   'bg-stone-900 text-white',
  senior:  'bg-violet-100 text-violet-700',
  junior:  'bg-blue-100 text-blue-700',
  viewer:  'bg-stone-100 text-stone-500',
}
