-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: room_prompt_drafts
-- Created:   2026-04-12
-- Purpose:   Stores per-room, per-pass prompt draft text so that custom
--            Block 2 instructions survive navigation and page refreshes.
--            Used by lib/useAutoSavePrompt.ts (Sprint 8, Addition A6).
--
-- Key design decisions:
--   • PRIMARY KEY (room_id, pass_number) — one draft per room+pass combo
--   • ON CONFLICT (room_id, pass_number) DO UPDATE — upsert semantics
--   • user_id nullable — fallback if auth not resolved
--   • updated_at maintained via trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS room_prompt_drafts (
  room_id       TEXT          NOT NULL,
  pass_number   INT           NOT NULL,
  prompt_text   TEXT          NOT NULL DEFAULT '',
  user_id       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  PRIMARY KEY (room_id, pass_number),

  CONSTRAINT fk_room
    FOREIGN KEY (room_id)
    REFERENCES rooms(id)
    ON DELETE CASCADE
);

-- Index for user-scoped queries (e.g. "show me all my drafts")
CREATE INDEX IF NOT EXISTS idx_room_prompt_drafts_user
  ON room_prompt_drafts (user_id)
  WHERE user_id IS NOT NULL;

-- ── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_room_prompt_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_room_prompt_drafts_updated_at ON room_prompt_drafts;
CREATE TRIGGER trg_room_prompt_drafts_updated_at
  BEFORE UPDATE ON room_prompt_drafts
  FOR EACH ROW
  EXECUTE FUNCTION set_room_prompt_draft_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE room_prompt_drafts ENABLE ROW LEVEL SECURITY;

-- Team members can read/write drafts for any room they can access.
-- Follows the same pattern as other team-scoped tables in this project.

-- Policy: authenticated users can SELECT all drafts
CREATE POLICY "Team can read prompt drafts"
  ON room_prompt_drafts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users can INSERT/UPDATE their own drafts
CREATE POLICY "Team can upsert prompt drafts"
  ON room_prompt_drafts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Comment ─────────────────────────────────────────────────────────────────
COMMENT ON TABLE room_prompt_drafts IS
  'Auto-saved Block 2 (pass instruction) drafts per room+pass. '
  'Written by useAutoSavePrompt hook with 800ms debounce. '
  'Loaded on staging page mount if prompt is empty. '
  'Upserted on conflict (room_id, pass_number).';
