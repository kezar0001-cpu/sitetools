-- Part 1: Functions only
-- Function to get user by email (for admin use)
create or replace function get_user_by_email(p_email text)
returns table(id uuid, email text, created_at timestamptz) as $$
begin
    return query
    select u.id, u.email, u.created_at
    from auth.users u
    where u.email = lower(p_email)
    limit 1;
end;
$$ language plpgsql security definer;

-- Function to get user by ID (for admin use)
create or replace function get_user_by_id(p_user_id uuid)
returns table(id uuid, email text, created_at timestamptz) as $$
begin
    return query
    select u.id, u.email, u.created_at
    from auth.users u
    where u.id = p_user_id
    limit 1;
end;
$$ language plpgsql security definer;

-- Grant access to authenticated users
grant execute on function get_user_by_email(text) to authenticated;
grant execute on function get_user_by_id(uuid) to authenticated;
