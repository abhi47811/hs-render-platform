-- Section 6 — Client reference images
-- Adds an array column to projects so the intake form can capture
-- inspiration/reference images uploaded by the client (Pinterest-style
-- mood shots, floorplan photos, existing room photos). Files are stored
-- in the existing `client-refs` Storage bucket and URLs persisted here.

alter table public.projects
  add column if not exists client_reference_images text[] default '{}'::text[];

comment on column public.projects.client_reference_images is
  'Public URLs of client-uploaded reference images in the client-refs storage bucket.';
