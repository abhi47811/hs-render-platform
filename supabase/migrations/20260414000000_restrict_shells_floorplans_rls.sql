-- Restrict shells bucket INSERT policies.
--
-- Previously: any authenticated user could write to any path in shells.
-- Now:
--   floorplans/ prefix → must be a member of the org that owns the project in path
--   all other paths  → any authenticated user (preserves existing shell photo behaviour)
--
-- Path format for floor plans: floorplans/{projectId}/{roomId}_{timestamp}.ext

DROP POLICY IF EXISTS "Authenticated upload to shells" ON storage.objects;
DROP POLICY IF EXISTS "team_shells_insert" ON storage.objects;

-- Floor plans: restrict to org members of the project in the path
CREATE POLICY "Org members can upload floor plans to shells"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shells'
  AND (storage.foldername(name))[1] = 'floorplans'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] IN (
    SELECT (p.id)::text
    FROM core.projects p
    WHERE p.org_id = ANY (get_user_org_ids())
  )
);

-- All other shells paths (shell photos, etc.): any authenticated user
CREATE POLICY "Authenticated upload to shells non-floorplan"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shells'
  AND (storage.foldername(name))[1] != 'floorplans'
  AND auth.uid() IS NOT NULL
);
