begin;

alter table public.callback_requests
  add column if not exists dispatch_started_at timestamptz,
  add column if not exists call_consent_at timestamptz,
  add column if not exists conversation_id text,
  add column if not exists provider_call_sid text;

create table if not exists public.callback_action_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('sms', 'verify')),
  window_start timestamptz not null default now(),
  last_attempt timestamptz not null default now(),
  attempts integer not null default 0,
  primary key (user_id, action)
);
alter table public.callback_action_limits enable row level security;
revoke all on public.callback_action_limits from anon, authenticated;

create or replace function public.consume_callback_action(p_user uuid, p_action text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.callback_action_limits; max_attempts integer;
begin
  if p_action not in ('sms', 'verify') then return false; end if;
  max_attempts := case when p_action = 'sms' then 5 else 10 end;
  insert into public.callback_action_limits(user_id, action) values (p_user, p_action) on conflict do nothing;
  select * into r from public.callback_action_limits where user_id = p_user and action = p_action for update;
  if r.window_start < now() - interval '1 hour' then
    r.attempts := 0;
    r.window_start := now();
  end if;
  if r.attempts >= max_attempts or (p_action = 'sms' and r.attempts > 0 and r.last_attempt > now() - interval '60 seconds') then return false; end if;
  update public.callback_action_limits set attempts = r.attempts + 1, window_start = r.window_start, last_attempt = now() where user_id = p_user and action = p_action;
  return true;
end;
$$;

-- Only the server can claim a call. The lock prevents concurrent requests from dialing twice.
create or replace function public.claim_verified_callback(p_id uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.callback_requests; verified boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select * into r from public.callback_requests where id = p_id and user_id = p_user for update;
  if not found or r.status <> 'awaiting_verification' or r.dispatch_started_at is not null or not r.consent then return false; end if;
  select exists(select 1 from auth.users u where u.id = p_user and u.phone_confirmed_at is not null
    and ('+' || regexp_replace(u.phone, '[^0-9]', '', 'g')) = r.phone_number) into verified;
  if not verified then return false; end if;
  if (select count(*) from public.callback_requests where user_id = p_user and dispatch_started_at > now() - interval '24 hours') >= 3 then return false; end if;
  update public.callback_requests set status = 'queued', dispatch_started_at = now(), call_consent_at = now() where id = p_id;
  return true;
end;
$$;

revoke all on function public.consume_callback_action(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_verified_callback(uuid, uuid) from public, anon, authenticated;
grant execute on function public.consume_callback_action(uuid, text) to service_role;
grant execute on function public.claim_verified_callback(uuid, uuid) to service_role;
grant all on public.callback_action_limits to service_role;
grant select, update on public.callback_requests to service_role;

drop policy if exists "Users can request an unverified callback" on public.callback_requests;
create policy "Users can request an unverified callback"
  on public.callback_requests for insert to authenticated
  with check (
    (select auth.uid()) = user_id and status = 'awaiting_verification'
    and consent = true and consent_version = 'callback-v1'
    and dispatch_started_at is null and call_consent_at is null
    and conversation_id is null and provider_call_sid is null
  );
commit;
