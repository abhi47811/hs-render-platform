-- Migration: enrich notifications table with type + title + link columns
-- These columns are read by NotificationBell.tsx but were missing from the schema.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS notification_type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS link_url text;

-- Index for fast bell queries (unread for a user, newest first)
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read, created_at DESC);
