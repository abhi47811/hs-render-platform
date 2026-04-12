'use client'

// ─── Sec 05: useUserRole — client hook ────────────────────────────────────
// Fetches the authenticated user's role from the profiles table.
// Result is cached for the component tree via a module-level cache so
// multiple concurrent calls don't fire duplicate DB queries in one render.

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/rbac'
import { canPerform } from '@/lib/rbac'
import type { PermissionAction } from '@/lib/rbac'

// Module-level cache — survives remounts but clears on page nav (client-side)
let _cachedUserId: string | null = null
let _cachedRole: UserRole | null = null

interface UseUserRoleResult {
  role: UserRole | null
  loading: boolean
  /** Convenience: check a permission without importing canPerform separately */
  can: (action: PermissionAction) => boolean
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole | null>(_cachedRole)
  const [loading, setLoading] = useState<boolean>(_cachedRole === null)
  const didFetch = useRef(false)

  useEffect(() => {
    // Already have a cached result — skip fetch
    if (_cachedRole !== null) {
      setRole(_cachedRole)
      setLoading(false)
      return
    }

    // Prevent double-fetch in React Strict Mode
    if (didFetch.current) return
    didFetch.current = true

    const supabase = createClient()

    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Use cache if same user
        if (_cachedUserId === user.id && _cachedRole !== null) {
          setRole(_cachedRole)
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !profile) {
          console.warn('[useUserRole] Could not fetch profile:', error?.message)
          setLoading(false)
          return
        }

        const fetchedRole = profile.role as UserRole
        _cachedUserId = user.id
        _cachedRole = fetchedRole
        setRole(fetchedRole)
      } catch (err) {
        console.warn('[useUserRole] Unexpected error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  const can = (action: PermissionAction) => canPerform(role, action)

  return { role, loading, can }
}

/**
 * Clears the module-level cache. Call this after sign-out so the next
 * session fetches fresh role data.
 */
export function clearUserRoleCache() {
  _cachedUserId = null
  _cachedRole = null
}
