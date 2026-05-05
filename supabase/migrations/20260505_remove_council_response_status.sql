-- Remove council-response-provided status from action register
-- Migrate existing values to in-progress as they represent an intermediate state
-- between open and closed.

-- Step 1: Migrate existing data
update public.site_action_items
set status = 'in-progress'
where status = 'council-response-provided';

update public.site_action_updates
set new_status = 'in-progress'
where new_status = 'council-response-provided';

update public.site_action_updates
set previous_status = 'in-progress'
where previous_status = 'council-response-provided';

-- Step 2: Drop existing check constraints and re-create with allowed statuses only
alter table public.site_action_items
  drop constraint if exists site_action_items_status_check;

alter table public.site_action_items
  add constraint site_action_items_status_check
  check (status in ('open', 'in-progress', 'closed'));

alter table public.site_action_updates
  drop constraint if exists site_action_updates_new_status_check;

alter table public.site_action_updates
  add constraint site_action_updates_new_status_check
  check (new_status in ('open', 'in-progress', 'closed'));

alter table public.site_action_updates
  drop constraint if exists site_action_updates_previous_status_check;

alter table public.site_action_updates
  add constraint site_action_updates_previous_status_check
  check (previous_status is null or previous_status in ('open', 'in-progress', 'closed'));

comment on column public.site_action_items.status is 'Allowed values: open, in-progress, closed. council-response-provided was removed in 20260505 migration and migrated to in-progress.';
