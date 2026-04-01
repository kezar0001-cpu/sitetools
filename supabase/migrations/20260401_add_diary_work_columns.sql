-- Add work_completed and planned_works columns to site_diaries table
-- work_completed: describes what work was done today (work description, areas covered, milestones reached)
-- planned_works: describes what's planned for tomorrow (activities, plant needed, hold points)

alter table public.site_diaries
  add column if not exists work_completed text,
  add column if not exists planned_works text;
