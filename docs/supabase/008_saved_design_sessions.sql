-- Saved system-design sessions, reopened from the dashboard to keep editing.
-- Run in Supabase SQL Editor after 001–007.
-- `session` holds the question, intake answers, design spec, edit history and
-- conversation; the board is rebuilt from the spec when the session is opened.

create table if not exists public.saved_design_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  question text not null default '',
  session jsonb not null,
  preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_design_sessions_user_updated_idx
  on public.saved_design_sessions (user_id, updated_at desc);

drop trigger if exists saved_design_sessions_set_updated_at on public.saved_design_sessions;
create trigger saved_design_sessions_set_updated_at
  before update on public.saved_design_sessions
  for each row execute function public.set_updated_at();

alter table public.saved_design_sessions enable row level security;

create policy "saved_design_sessions_select_own"
  on public.saved_design_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "saved_design_sessions_insert_own"
  on public.saved_design_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "saved_design_sessions_update_own"
  on public.saved_design_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_design_sessions_delete_own"
  on public.saved_design_sessions for delete
  to authenticated
  using (auth.uid() = user_id);
