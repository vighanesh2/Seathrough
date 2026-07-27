-- Conversations + turns — persist every student/tutor message
-- Run in Supabase SQL Editor after 001–003.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  root_prompt text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx
  on public.conversations (user_id);
create index if not exists conversations_created_at_idx
  on public.conversations (created_at desc);

create type public.turn_role as enum ('student', 'tutor', 'system');

create table if not exists public.lesson_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  turn_order integer not null,
  role public.turn_role not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (conversation_id, turn_order)
);

create index if not exists lesson_turns_conversation_id_idx
  on public.lesson_turns (conversation_id);
create index if not exists lesson_turns_lesson_id_idx
  on public.lesson_turns (lesson_id);

alter table public.lessons
  add column if not exists conversation_id uuid
    references public.conversations (id) on delete set null;

create index if not exists lessons_conversation_id_idx
  on public.lessons (conversation_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.lesson_turns enable row level security;

-- Owners only when authenticated; anonymous rows are service-role only.
create policy "conversations_select_own"
  on public.conversations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "conversations_insert_own"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "conversations_update_own"
  on public.conversations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lesson_turns_select_own"
  on public.lesson_turns for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "lesson_turns_insert_own"
  on public.lesson_turns for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
