// types/database.ts
// Hand-written types matching the Supabase schema.
// Regenerate after schema changes: npx supabase gen types typescript --local > types/supabase.ts

export type Role = 'admin' | 'senior' | 'junior' | 'viewer'
export type ProjectStatus =
  | 'intake'
  | 'shell_ready'
  | 'style_set'
  | 'staging'
  | 'client_review'
  | 'revisions'
  | 'delivered'
export type City = 'Hyderabad' | 'Bangalore' | 'Mumbai' | 'Delhi' | 'Pune' | 'Chennai'
export type ProjectType = 'New Flat' | 'Renovation' | 'Builder Unit' | 'Office'
export type OccupantProfile =
  | 'Single Professional'
  | 'Young Couple'
  | 'Family with Children'
  | 'Multi-Generational'
  | 'Elderly'
  | 'Corporate'
export type BudgetBracket = 'economy' | 'standard' | 'premium' | 'luxury'
export type Priority = 'Normal' | 'High' | 'Urgent'
export type RoomType =
  | 'Living'
  | 'Master Bedroom'
  | 'Bedroom 2'
  | 'Kitchen'
  | 'Dining'
  | 'Study'
  | 'Office'
  | 'Bathroom'
  | 'Balcony'
  | 'Other'
export type RoomStatus = 'not_started' | 'in_progress' | 'delivered'
export type RenderStatus =
  | 'generated'
  | 'team_approved'
  | 'client_approved'
  | 'approved'        // alias used interchangeably with team_approved in some flows
  | 'rejected'
  | 'not_selected'
export type PassType =
  | 'shell_enhancement'
  | 'spatial_analysis'
  | 'style_seed'
  | 'flooring'
  | 'main_furniture'
  | 'accent_pieces'
  | 'lighting'
  | 'decor'
  | 'revision'
  | 'day_to_dusk'
  | 'surface_swap'
export type ResolutionTier = '1K' | '2K' | '4K'
export type CheckpointStatus = 'pending' | 'shared' | 'approved'
export type QueueStatus = 'pending' | 'processing' | 'complete' | 'failed'
export type VariationLabel = 'A' | 'B' | 'C'
export type SlaStatus = 'green' | 'amber' | 'red' | 'breached'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface Project {
  id: string
  client_name: string
  client_whatsapp: string
  client_email: string | null
  city: City
  project_type: ProjectType
  occupant_profile: OccupantProfile
  budget_bracket: BudgetBracket
  primary_style: string
  vastu_required: 'Yes' | 'No' | 'Partial'
  vastu_notes: string | null
  style_preferences: string | null
  material_preferences: string | null
  exclusions: string | null
  assigned_to: string | null
  status: ProjectStatus
  priority: Priority
  sla_deadline: string
  created_at: string
  delivered_at: string | null
  is_late_delivery: boolean
  revision_limit: number
  total_api_cost: number
  project_style_anchor: Record<string, unknown> | null
  /** Sec 21: project-level style seed URL — propagated from the first room to lock a style seed */
  style_seed_url: string | null
  // Joined relations (present when fetched with select)
  rooms?: Room[]
  assigned_profile?: Profile | null
}

export interface Room {
  id: string
  project_id: string
  room_name: string
  room_type: RoomType
  dimensions_l: number | null
  dimensions_w: number | null
  dimensions_h: number | null
  status: RoomStatus
  current_pass: number
  design_style: string | null
  style_seed_id: string | null
  spatial_analysis: Record<string, unknown> | null
  colour_palette: Record<string, unknown> | null
  enhanced_shell_url: string | null
  original_shell_url: string | null
  photorealistic_shell_url: string | null
  created_at: string
  /** Sec 26: URL of the approved style seed render — set when a style seed is approved */
  style_seed_url: string | null
  /** Sec 26: true after CP2 approval — freezes style direction for all subsequent passes */
  style_locked: boolean
  /** Sec 26: ISO timestamp of when style was locked */
  style_locked_at: string | null
  /** Sec 21: true when this room inherited its style seed from another room in the project */
  style_inherited: boolean
}

export interface ArtifactFlag {
  issue: string
  location: string
  severity: 'Critical' | 'Major' | 'Minor'
  description?: string
}

export interface Render {
  id: string
  room_id: string
  project_id: string
  pass_number: number
  pass_type: PassType
  variation_label: VariationLabel | null
  resolution_tier: ResolutionTier
  storage_url: string
  watermarked_url: string | null
  thumbnail_url: string | null
  status: RenderStatus
  prompt_used: string | null
  /** Alias for prompt_used — some queries return this field name */
  prompt: string | null
  references_used: string[] | null
  /** Structured reference slot labels stored alongside URLs */
  references_slots: Array<{ slot: number; label: string }> | null
  artifact_flags: ArtifactFlag[] | null
  api_cost: number
  created_at: string
  approved_at: string | null
  approved_by: string | null
  /** Sec 29/28: optional metadata stored by surface_swap / day_to_dusk passes */
  metadata: Record<string, unknown> | null
}

export interface Checkpoint {
  id: string
  room_id: string
  checkpoint_number: 1 | 2 | 3
  status: CheckpointStatus
  shared_at: string | null
  approved_at: string | null
  approved_by: string | null
  share_link_id: string | null
  client_notes: string | null
  team_notes: string | null
}

export interface Revision {
  id: string
  room_id: string
  revision_number: number
  brief: string
  element_tags: string[]
  base_render_id: string | null
  status: 'in_progress' | 'completed'
  created_at: string
  created_by: string | null
  completed_at: string | null
}

export interface GenerationQueueItem {
  id: string
  project_id: string
  room_id: string
  pass_number: number
  pass_type: PassType
  variation_count: 1 | 2 | 3
  prompt: string
  reference_urls: string[]
  resolution_tier: ResolutionTier
  priority: 1 | 2 | 3
  status: QueueStatus
  queued_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  api_cost: number | null
  requested_by: string | null
}

export interface ShareLink {
  id: string
  project_id: string
  room_id: string | null
  render_id: string | null
  checkpoint_number: number | null
  url_token: string
  created_at: string
  expires_at: string
  opened_at: string | null
  is_revoked: boolean
  is_presentation_mode: boolean
}

export interface PromptTemplate {
  id: string
  name: string
  room_type: RoomType
  style: string
  city: City | null
  pass_number: number
  instruction: string
  usage_count: number
  zero_revision_count: number
  success_rate: number
  created_by: string | null
  updated_at: string
  is_active: boolean
}

export interface StyleVaultEntry {
  id: string
  image_url: string
  thumbnail_url: string | null
  style_name: string
  room_type: RoomType
  city: City | null
  budget_bracket: BudgetBracket | null
  material_family: string | null
  colour_family: string | null
  usage_count: number
  source_project_id: string | null
  created_at: string
  created_by: string | null
  tags: string[]
}

export interface FurnitureReference {
  id: string
  image_url: string
  thumbnail_url: string | null
  category: string
  sub_category: string
  style_tags: string[]
  material_tags: string[]
  colour_family: string | null
  recommended_rooms: RoomType[]
  recommended_budgets: BudgetBracket[]
  usage_count: number
  added_by: string | null
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  project_id: string
  room_id: string | null
  user_id: string | null
  action_type: string
  action_description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface TeamComment {
  id: string
  project_id: string
  room_id: string | null
  user_id: string
  content: string
  mentioned_users: string[]
  created_at: string
  edited_at: string | null
  profile?: Profile
}

export interface ApiCostLogEntry {
  id: string
  project_id: string
  room_id: string | null
  call_type: 'generation' | 'vision' | 'enhancement'
  resolution_tier: ResolutionTier | null
  cost_inr: number
  gemini_model: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  project_id: string | null
  room_id: string | null
  message: string
  /** Short heading for the notification — e.g. "SLA Breach", "Checkpoint Approved" */
  title: string | null
  notification_type: string | null
  /** Deep link navigated to on click — e.g. /projects/:id */
  link_url: string | null
  is_read: boolean
  created_at: string
}

/** Sprint 8 — A6: Auto-saved Block 2 prompt draft per room+pass */
export interface RoomPromptDraft {
  room_id: string
  pass_number: number
  prompt_text: string
  user_id: string | null
  updated_at: string
}

/** Sprint 6 — Sec 36: Furniture reference items for Gemini slots 9–14 */
export type FurnitureCategory =
  | 'Seating'
  | 'Tables'
  | 'Storage'
  | 'Beds'
  | 'Lighting'
  | 'Decor'
  | 'Rugs'

// ─── Utility / Computed types ────────────────────────────────

/** Project with room_count added — used on Pipeline Board */
export interface ProjectWithRoomCount extends Project {
  room_count: number
  rooms: Room[]
  assigned_profile: Profile | null
  /** Sec 41: max revision_number seen across this project's rooms (0 if none) */
  revision_count: number
}

// ─── Constants ───────────────────────────────────────────────

export const PIPELINE_COLUMNS: ProjectStatus[] = [
  'intake',
  'shell_ready',
  'style_set',
  'staging',
  'client_review',
  'revisions',
  'delivered',
]

export const PIPELINE_COLUMN_LABELS: Record<ProjectStatus, string> = {
  intake: 'Intake',
  shell_ready: 'Shell Ready',
  style_set: 'Style Set',
  staging: 'Staging',
  client_review: 'Client Review',
  revisions: 'Revisions',
  delivered: 'Delivered',
}
