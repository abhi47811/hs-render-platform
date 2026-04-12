-- ============================================================
-- SCHEMA PATCH — Missing columns identified during type audit
-- Run after: 20260411000000_add_photorealistic_shell.sql
-- ============================================================

-- ─── PROJECTS: add style_seed_url (Sec 21) ──────────────────
-- Project-level style seed URL propagated from the first room
-- to lock a consistent style direction across all rooms.
alter table public.projects
  add column if not exists style_seed_url text;

-- ─── ROOMS: add design_style ────────────────────────────────
-- Stores the confirmed design style string selected in StyleConfigurator.
-- Used by getActiveStep() to determine whether style config is complete.
alter table public.rooms
  add column if not exists design_style text;

-- ─── ROOMS: add style seed & lock fields (Sec 21, 26) ───────
-- style_seed_url: URL of the approved style seed render (set at CP2 approval)
alter table public.rooms
  add column if not exists style_seed_url text;

-- style_locked: true after CP2 approval — freezes style direction for all
-- subsequent passes (flooring, main_furniture, accent_pieces, etc.)
alter table public.rooms
  add column if not exists style_locked boolean not null default false;

-- style_locked_at: ISO timestamp of when style was locked (CP2 approval time)
alter table public.rooms
  add column if not exists style_locked_at timestamptz;

-- style_inherited: true when this room inherited its style seed from another
-- room in the project (set by the Sec 21 style propagation flow)
alter table public.rooms
  add column if not exists style_inherited boolean not null default false;

-- ─── RENDERS: add references_slots & metadata ────────────────
-- references_slots: structured reference slot labels stored alongside URLs
-- e.g. [{slot: 1, label: "moodboard"}, {slot: 2, label: "sofa ref"}]
alter table public.renders
  add column if not exists references_slots jsonb;

-- metadata: optional pass-specific metadata used by surface_swap (Sec 29)
-- and day_to_dusk (Sec 28) passes to store transformation parameters
alter table public.renders
  add column if not exists metadata jsonb;

-- ─── RENDERS: extend status CHECK to include 'approved' ──────
-- 'approved' is an alias used interchangeably with 'team_approved' in
-- style seed approval flows (Sec 26). We drop & recreate the constraint.
alter table public.renders
  drop constraint if exists renders_status_check;

alter table public.renders
  add constraint renders_status_check
    check (status in (
      'generated',
      'team_approved',
      'client_approved',
      'approved',
      'rejected',
      'not_selected'
    ));

-- ─── NOTIFICATIONS: add room_id, notification_type, title, link_url ──
-- room_id: scopes a notification to a specific room (nullable)
alter table public.notifications
  add column if not exists room_id uuid references public.rooms(id) on delete cascade;

-- notification_type: categorises the notification for filtering/display
-- e.g. 'sla_breach', 'cp_approved', 'revision_received', 'mention',
--      'cost_alert', 'delivery_complete', 'generation_failed'
alter table public.notifications
  add column if not exists notification_type text;

-- title: short heading for the notification (optional, renders above message)
-- e.g. "SLA Breach", "Checkpoint Approved"
alter table public.notifications
  add column if not exists title text;

-- link_url: deep link navigated to on click — e.g. /projects/:id/rooms/:roomId
alter table public.notifications
  add column if not exists link_url text;

-- ─── FURNITURE_REFERENCES: add columns for FurnitureRefPicker ──────────────
-- The initial schema modelled furniture_references with jsonb tag arrays
-- (style_tags, material_tags, recommended_rooms, recommended_budgets).
-- FurnitureRefPicker uses simpler scalar columns for filtering and upload.
-- Both models coexist — the scalar columns enable fast WHERE filtering
-- while the jsonb arrays remain for future faceted search.

-- Display name for the furniture piece — shown in picker grid
alter table public.furniture_references
  add column if not exists name text;

-- Single style string for quick style-match filtering
-- e.g. 'Modern Indian', 'Scandinavian', 'Industrial'
alter table public.furniture_references
  add column if not exists style text;

-- Primary room type this piece suits — nullable (null = suitable for any)
alter table public.furniture_references
  add column if not exists room_type text;

-- Budget tier for this piece — economy / standard / premium / luxury
alter table public.furniture_references
  add column if not exists budget_bracket text;

-- Team member who uploaded this reference (set at upload time)
-- Note: initial schema has added_by; this alias is used by FurnitureRefPicker
alter table public.furniture_references
  add column if not exists uploaded_by uuid references public.profiles(id) on delete set null;

-- Soft-delete flag: false = hidden from picker, true = active
alter table public.furniture_references
  add column if not exists is_active boolean not null default true;

-- ─── GENERATION_QUEUE: add 'cancelled' to status CHECK ──────
-- TypeScript QueueStatus includes 'cancelled' but the initial DB constraint
-- only covers pending/processing/complete/failed. Extend it so the DB accepts
-- cancelled status updates (e.g. when a job is manually cancelled by a team member).
alter table public.generation_queue
  drop constraint if exists generation_queue_status_check;

alter table public.generation_queue
  add constraint generation_queue_status_check
    check (status in ('pending', 'processing', 'complete', 'failed', 'cancelled'));

-- ─── INDEXES ────────────────────────────────────────────────
-- Efficient notification lookup by room
create index if not exists notifications_room_id_idx
  on public.notifications(room_id)
  where room_id is not null;

-- Efficient lookup of rooms that carry a project-level style seed
create index if not exists rooms_style_seed_url_idx
  on public.rooms(style_seed_url)
  where style_seed_url is not null;

-- Efficient project-level style seed lookup
create index if not exists projects_style_seed_url_idx
  on public.projects(style_seed_url)
  where style_seed_url is not null;

-- Compound index for FurnitureRefPicker: active items filtered by category
create index if not exists furniture_refs_active_category_idx
  on public.furniture_references(category, created_at desc)
  where is_active = true;
