begin;
create table if not exists public.voice_session_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  last_started_at timestamptz,
  attempts integer not null default 0
);
alter table public.voice_session_limits enable row level security;
revoke all on public.voice_session_limits from anon, authenticated;

-- Derives the user from the verified JWT; callers cannot charge another user's quota.
create or replace function public.consume_voice_session()
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.voice_session_limits; uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  insert into public.voice_session_limits(user_id) values(uid) on conflict do nothing;
  select * into r from public.voice_session_limits where user_id = uid for update;
  if r.window_start < now() - interval '1 hour' then
    r.attempts := 0;
    r.window_start := now();
  end if;
  if r.attempts >= 10 or r.last_started_at > now() - interval '15 seconds' then return false; end if;
  update public.voice_session_limits set attempts = r.attempts + 1, window_start = r.window_start, last_started_at = now() where user_id = uid;
  return true;
end;
$$;
revoke all on function public.consume_voice_session() from public, anon;
grant execute on function public.consume_voice_session() to authenticated;
commit;
