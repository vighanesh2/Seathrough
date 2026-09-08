-- Dedicated Human Anatomy conversation snapshots.
-- Run after 001_initial_schema.sql and 005_profiles.sql.

create table if not exists public.anatomy_conversations (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  scene_id text not null,
  animation_mode text not null,
  reveal smallint not null default 6,
  selected_structure text,
  focused_structures jsonb not null default '[]'::jsonb,
  turns jsonb not null default '[]'::jsonb,
  turn_count smallint not null default 0,
  created_at timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint anatomy_conversations_id_length
    check (char_length(id) between 1 and 100),
  constraint anatomy_conversations_title_length
    check (char_length(title) between 1 and 80),
  constraint anatomy_conversations_scene
    check (scene_id in ('cardiopulmonary', 'eye', 'brain', 'kidney')),
  constraint anatomy_conversations_reveal
    check (reveal between 1 and 6),
  constraint anatomy_conversations_focused_array
    check (jsonb_typeof(focused_structures) = 'array'),
  constraint anatomy_conversations_turns_array
    check (jsonb_typeof(turns) = 'array'),
  constraint anatomy_conversations_turn_count
    check (
      turn_count between 0 and 100
      and turn_count = jsonb_array_length(turns)
    )
);

create index if not exists anatomy_conversations_user_updated_idx
  on public.anatomy_conversations (user_id, client_updated_at desc);

drop trigger if exists anatomy_conversations_set_updated_at
  on public.anatomy_conversations;
create trigger anatomy_conversations_set_updated_at
  before update on public.anatomy_conversations
  for each row execute function public.set_updated_at();

alter table public.anatomy_conversations enable row level security;

drop policy if exists "anatomy_conversations_select_own"
  on public.anatomy_conversations;
create policy "anatomy_conversations_select_own"
  on public.anatomy_conversations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "anatomy_conversations_insert_own"
  on public.anatomy_conversations;
create policy "anatomy_conversations_insert_own"
  on public.anatomy_conversations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "anatomy_conversations_update_own"
  on public.anatomy_conversations;
create policy "anatomy_conversations_update_own"
  on public.anatomy_conversations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "anatomy_conversations_delete_own"
  on public.anatomy_conversations;
create policy "anatomy_conversations_delete_own"
  on public.anatomy_conversations for delete
  to authenticated
  using (auth.uid() = user_id);
