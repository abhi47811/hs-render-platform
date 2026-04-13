-- Add metadata JSONB column to renders table.
-- Used by day_to_dusk and material_swap renders to store variant-specific context
-- (e.g. lighting_variant, swap_zone, target_material).

ALTER TABLE public.renders
  ADD COLUMN IF NOT EXISTS metadata jsonb;
