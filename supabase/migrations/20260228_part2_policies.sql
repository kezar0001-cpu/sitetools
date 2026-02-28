-- Part 2: Policies only
-- org_transfer_requests
do $$
begin
    if not exists (
        select 1 from pg_tables 
        where tablename = 'org_transfer_requests' 
        and rowsecurity = true
    ) then
        alter table public.org_transfer_requests enable row level security;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_transfer_requests' 
        and policyname = 'Users can view their own transfer requests'
    ) then
        create policy "Users can view their own transfer requests"
          on public.org_transfer_requests for select
          using (
            from_user_id = auth.uid() or
            to_user_id = auth.uid() or
            exists (
              select 1 from org_members
              where org_members.org_id = org_transfer_requests.org_id
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
        where tablename = 'org_transfer_requests' 
        and policyname = 'Admins can create transfer requests'
    ) then
        create policy "Admins can create transfer requests"
          on public.org_transfer_requests for insert
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
        where tablename = 'org_transfer_requests' 
        and policyname = 'Target users can update transfer requests'
    ) then
        create policy "Target users can update transfer requests"
          on public.org_transfer_requests for update
          using (to_user_id = auth.uid())
          with check (to_user_id = auth.uid());
    end if;
end $$;
