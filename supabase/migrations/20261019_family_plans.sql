-- Each account owns exactly one family plan. RLS applies to reads and writes.
create table if not exists public.family_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  children jsonb not null default '[{"name":"Kind 1","url":""},{"name":"Kind 2","url":""}]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint valid_children check (
    jsonb_typeof(children) = 'array' and jsonb_array_length(children) = 2
    and jsonb_typeof(children->0->'name')='string'
    and jsonb_typeof(children->1->'name')='string'
    and jsonb_typeof(children->0->'url')='string'
    and jsonb_typeof(children->1->'url')='string'
  )
);
alter table public.family_plans enable row level security;
revoke all on public.family_plans from anon;
grant select,insert,update,delete on public.family_plans to authenticated;
create policy "owner select" on public.family_plans for select to authenticated using ((select auth.uid())=user_id);
create policy "owner insert" on public.family_plans for insert to authenticated with check ((select auth.uid())=user_id);
create policy "owner update" on public.family_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "owner delete" on public.family_plans for delete to authenticated using ((select auth.uid())=user_id);
