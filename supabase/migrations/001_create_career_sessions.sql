begin;

create table public.career_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  target_role text not null
    check (char_length(target_role) between 2 and 120),

  profile_text text not null
    check (char_length(profile_text) between 80 and 12000),

  job_description text not null
    check (char_length(job_description) between 80 and 16000),

  assessment jsonb not null
    check (jsonb_typeof(assessment) = 'object'),

  learning_plan jsonb
    check (
      learning_plan is null
      or jsonb_typeof(learning_plan) = 'object'
    ),

  created_at timestamptz not null default now()
);

create index career_sessions_user_created_idx
  on public.career_sessions (user_id, created_at desc);

alter table public.career_sessions
  enable row level security;

revoke all on table public.career_sessions from anon;
revoke all on table public.career_sessions from authenticated;

grant select, insert, update, delete
  on table public.career_sessions
  to authenticated;

create policy "Users can read their own sessions"
  on public.career_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own sessions"
  on public.career_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own sessions"
  on public.career_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own sessions"
  on public.career_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;