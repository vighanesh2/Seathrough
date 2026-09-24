-- Saved Smart tutor lessons as videos.
-- Run in Supabase SQL Editor after 001–006.

create table if not exists public.saved_lesson_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  title_source text not null default 'ai'
    check (title_source in ('ai', 'user', 'lesson')),
  question text,
  lesson jsonb not null default '{}'::jsonb,
  storage_path text not null,
  poster_path text,
  mime_type text not null default 'video/webm',
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_lesson_videos_user_id_idx
  on public.saved_lesson_videos (user_id);

create index if not exists saved_lesson_videos_created_at_idx
  on public.saved_lesson_videos (created_at desc);

create trigger saved_lesson_videos_set_updated_at
  before update on public.saved_lesson_videos
  for each row execute function public.set_updated_at();

alter table public.saved_lesson_videos enable row level security;

create policy "saved_lesson_videos_select_own"
  on public.saved_lesson_videos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "saved_lesson_videos_insert_own"
  on public.saved_lesson_videos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "saved_lesson_videos_update_own"
  on public.saved_lesson_videos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_lesson_videos_delete_own"
  on public.saved_lesson_videos for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('lesson-videos', 'lesson-videos', false)
on conflict (id) do nothing;
