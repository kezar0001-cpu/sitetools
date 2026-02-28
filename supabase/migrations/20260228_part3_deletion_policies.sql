-- Part 3: Deletion request policies only
-- org_deletion_requests
do $$
begin
    if not exists (
        select 1 from pg_tables 
        where tablename = 'org_deletion_requests' 
        and rowsecurity = true
    ) then
        alter table public.org_deletion_requests enable row level security;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_deletion_requests' 
        and policyname = 'Org admins can view deletion requests'
    ) then
        create policy "Org admins can view deletion requests"
          on public.org_deletion_requests for select
          using (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_deletion_requests' 
        and policyname = 'Org admins can create deletion requests'
    ) then
        create policy "Org admins can create deletion requests"
          on public.org_deletion_requests for insert
          with check (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_deletion_requests' 
        and policyname = 'Org admins can approve deletion requests'
    ) then
        create policy "Org admins can approve deletion requests"
          on public.org_deletion_requests for update
          using (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;
