-- =============================================================
-- RPC fix: get_siteplan_projects_with_stats
-- Excludes phase tasks from avg_progress and task_count so the
-- result matches computeWorkProgress() in the frontend.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_siteplan_projects_with_stats(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  description text,
  status text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  task_count bigint,
  avg_progress int,
  has_delayed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.company_id,
    p.name,
    p.description,
    p.status,
    p.created_by,
    p.created_at,
    p.updated_at,
    COALESCE(s.task_count, 0) AS task_count,
    COALESCE(s.avg_progress, 0) AS avg_progress,
    COALESCE(s.has_delayed, false) AS has_delayed
  FROM projects p
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::bigint AS task_count,
      ROUND(AVG(t.progress))::int AS avg_progress,
      BOOL_OR(t.status = 'delayed') AS has_delayed
    FROM siteplan_tasks t
    WHERE t.project_id = p.id
      AND t.type != 'phase'   -- exclude phase containers, match computeWorkProgress()
  ) s ON true
  WHERE p.company_id = p_company_id
    AND p.status IN ('active', 'on-hold')
    AND EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = p_company_id
        AND cm.user_id = auth.uid()
    )
  ORDER BY p.created_at DESC;
$$;
