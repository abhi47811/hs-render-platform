-- Migration: Add photorealistic_shell_url to rooms table
-- Section 9: Shell Enhancement Pass
-- This field stores the Coohom-to-photorealistic enhanced bare shell
-- (separate from enhanced_shell_url which stores the EnvironmentReplacer output)

alter table public.rooms
  add column if not exists photorealistic_shell_url text;

-- Room flow field explanation:
--   original_shell_url         = raw Coohom 3D render uploaded by team
--   photorealistic_shell_url   = Section 9 output: photorealistic bare shell (ambient occlusion, textures, light)
--   enhanced_shell_url         = EnvironmentReplacer output: photorealistic shell + window view replaced
