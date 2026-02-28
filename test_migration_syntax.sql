-- Test migration syntax to verify it works
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
