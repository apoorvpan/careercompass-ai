begin;

-- Preserve existing records and migration history while retiring runtime access.
-- Conditional checks support projects where the telephone migrations were never applied.
do $$
begin
  if to_regclass('public.callback_requests') is not null then
    revoke all on table public.callback_requests from public, anon, authenticated, service_role;
    drop policy if exists "Users can read their own callback requests" on public.callback_requests;
    drop policy if exists "Users can request an unverified callback" on public.callback_requests;
  end if;
  if to_regclass('public.callback_action_limits') is not null then
    revoke all on table public.callback_action_limits from public, anon, authenticated, service_role;
  end if;
  if to_regprocedure('public.consume_callback_action(uuid,text)') is not null then
    revoke all on function public.consume_callback_action(uuid, text) from public, anon, authenticated, service_role;
  end if;
  if to_regprocedure('public.claim_verified_callback(uuid,uuid)') is not null then
    revoke all on function public.claim_verified_callback(uuid, uuid) from public, anon, authenticated, service_role;
  end if;
end;
$$;

commit;
