begin;

-- Allows the callback's session and owner to be checked together.
create unique index if not exists career_sessions_id_user_id_idx
  on public.career_sessions (id, user_id);

create table public.callback_requests (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  session_id uuid not null,

  phone_number text not null
    check (phone_number ~ '^\+91[6-9][0-9]{9}$'),

  consent boolean not null
    check (consent = true),

  consent_version text not null default 'callback-v1',

  status text not null default 'awaiting_verification'
    check (
      status in (
        'awaiting_verification',
        'queued',
        'calling',
        'completed',
        'failed',
        'cancelled'
      )
    ),

  created_at timestamptz not null default now(),

  foreign key (session_id, user_id)
    references public.career_sessions (id, user_id)
    on delete cascade
);

create index callback_requests_user_created_idx
  on public.callback_requests (user_id, created_at desc);

-- Prevent duplicate pending requests for the same assessment.
create unique index callback_requests_one_pending_per_session
  on public.callback_requests (session_id)
  where status in ('awaiting_verification', 'queued', 'calling');

alter table public.callback_requests
  enable row level security;

revoke all on public.callback_requests from anon;
revoke all on public.callback_requests from authenticated;

grant select, insert
  on public.callback_requests
  to authenticated;

create policy "Users can read their own callback requests"
  on public.callback_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can request an unverified callback"
  on public.callback_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'awaiting_verification'
    and consent = true
    and consent_version = 'callback-v1'
  );

commit;