begin;
create table if not exists public.coach_message_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  last_attempt timestamptz,
  attempts integer not null default 0
);
alter table public.coach_message_limits enable row level security;
revoke all on public.coach_message_limits from public, anon, authenticated;
create or replace function public.consume_coach_message()
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.coach_message_limits; uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  insert into public.coach_message_limits(user_id) values(uid) on conflict do nothing;
  select * into r from public.coach_message_limits where user_id = uid for update;
  if r.window_start < now() - interval '1 hour' then
    r.attempts := 0;
    r.window_start := now();
  end if;
  if r.attempts >= 30 or r.last_attempt > now() - interval '3 seconds' then return false; end if;
  update public.coach_message_limits set attempts = r.attempts + 1, window_start = r.window_start, last_attempt = now() where user_id = uid;
  return true;
end;
$$;
revoke all on function public.consume_coach_message() from public, anon;
grant execute on function public.consume_coach_message() to authenticated;

-- Retire browser-voice access without deleting records or modifying old migrations.
do $$
begin
  if to_regprocedure('public.consume_voice_session()') is not null then
    revoke all on function public.consume_voice_session() from public, anon, authenticated, service_role;
  end if;
  if to_regclass('public.voice_session_limits') is not null then
    revoke all on public.voice_session_limits from public, anon, authenticated, service_role;
  end if;
end;
$$;
commit;
