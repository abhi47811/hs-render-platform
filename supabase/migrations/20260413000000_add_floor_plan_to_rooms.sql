-- supabase/migrations/20260413000000_add_floor_plan_to_rooms.sql
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS floor_plan_url TEXT,
  ADD COLUMN IF NOT EXISTS floor_plan_data JSONB;

COMMENT ON COLUMN rooms.floor_plan_url IS 'Public URL of uploaded floor plan image in Supabase storage (bucket: shells, prefix: floorplans/)';
COMMENT ON COLUMN rooms.floor_plan_data IS 'Gemini-parsed floor plan data: doors, windows, dimensions, entry point — injected into Block 1 prompt';
