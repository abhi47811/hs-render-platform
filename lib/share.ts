import { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

/**
 * Generate a share link for a checkpoint
 * Creates a new share_links record and returns the unique token
 */
export async function createShareLink(params: {
  supabase: SupabaseClient
  projectId: string
  roomId: string
  checkpointNumber: number
  expiresInDays?: number
}): Promise<string> {
  const { supabase, projectId, roomId, checkpointNumber, expiresInDays = 7 } = params

  // Generate a unique hex token
  const token = randomBytes(16).toString('hex')

  // Calculate expiry date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Insert into share_links table
  const { data, error } = await supabase
    .from('share_links')
    .insert({
      project_id: projectId,
      room_id: roomId,
      checkpoint_number: checkpointNumber,
      url_token: token,
      expires_at: expiresAt.toISOString(),
      is_revoked: false,
      is_presentation_mode: false,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create share link: ${error.message}`)
  }

  return token
}

/**
 * Check if a share link is valid (not expired, not revoked)
 */
export function isShareLinkValid(shareLink: {
  expires_at: string
  is_revoked: boolean
}): boolean {
  if (shareLink.is_revoked) {
    return false
  }

  const expiresAt = new Date(shareLink.expires_at)
  const now = new Date()

  return now < expiresAt
}

/**
 * Revoke a share link by token or ID
 */
export async function revokeShareLink(
  supabase: SupabaseClient,
  tokenOrId: string
): Promise<void> {
  // Determine if it's a token or ID by checking length
  // Tokens are 32 chars (16 bytes as hex), IDs are UUIDs (36 chars)
  const isToken = tokenOrId.length === 32

  const query = isToken
    ? supabase.from('share_links').update({ is_revoked: true }).eq('url_token', tokenOrId)
    : supabase.from('share_links').update({ is_revoked: true }).eq('id', tokenOrId)

  const { error } = await query

  if (error) {
    throw new Error(`Failed to revoke share link: ${error.message}`)
  }
}
