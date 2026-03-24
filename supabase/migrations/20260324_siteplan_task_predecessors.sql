-- Migrate siteplan predecessor storage from comma-separated text to a proper
-- join table.  The existing `predecessors` text column is intentionally kept
-- but will no longer be written by application code (reads/exports may still
-- reference it during the transition period).

-- ── Join table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.siteplan_task_predecessors (
  task_id        uuid NOT NULL REFERENCES public.siteplan_tasks(id) ON DELETE CASCADE,
  predecessor_id uuid NOT NULL REFERENCES public.siteplan_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, predecessor_id)
);

CREATE INDEX idx_stp_task        ON public.siteplan_task_predecessors(task_id);
CREATE INDEX idx_stp_predecessor ON public.siteplan_task_predecessors(predecessor_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.siteplan_task_predecessors ENABLE ROW LEVEL SECURITY;

-- SELECT / UPDATE / DELETE: visible when the referenced task is visible
CREATE POLICY "org_isolation" ON public.siteplan_task_predecessors
  USING (
    task_id IN (
      SELECT t.id FROM public.siteplan_tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.company_id IN (
        SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: allowed when the task being linked belongs to the user's org
CREATE POLICY "org_insert" ON public.siteplan_task_predecessors
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.siteplan_tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.company_id IN (
        SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "org_delete" ON public.siteplan_task_predecessors
  FOR DELETE USING (
    task_id IN (
      SELECT t.id FROM public.siteplan_tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.company_id IN (
        SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.siteplan_task_predecessors;
