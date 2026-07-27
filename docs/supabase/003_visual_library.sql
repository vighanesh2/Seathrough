-- Visual library: grow reusable VisualPlans as unknown topics appear.
-- Stores validated JSON plans only — never executable code.
-- Run in Supabase SQL Editor after 001 + 002.

create table if not exists public.visual_library (
  id uuid primary key default gen_random_uuid(),
  -- Normalized lookup key, e.g. "photosynthesis", "dividing-by-fractions"
  topic_key text not null,
  display_label text,
  source_prompt text,
  concept_key text,
  -- Validated VisualPlan JSON (renderer + recipe/actions). No JS.
  plan jsonb not null,
  -- learned = auto-cached; promoted = human-approved for catalog; rejected = do not reuse
  quality text not null default 'learned'
    check (quality in ('learned', 'promoted', 'rejected')),
  hit_count integer not null default 1
    check (hit_count >= 0),
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_key)
);

create index if not exists visual_library_hit_count_idx
  on public.visual_library (hit_count desc);

create index if not exists visual_library_quality_idx
  on public.visual_library (quality);

create index if not exists visual_library_last_used_idx
  on public.visual_library (last_used_at desc);

drop trigger if exists visual_library_set_updated_at on public.visual_library;
create trigger visual_library_set_updated_at
  before update on public.visual_library
  for each row execute function public.set_updated_at();

alter table public.visual_library enable row level security;

-- Readable by clients for future "library browser"; writes via service role only.
create policy "visual_library_select_active"
  on public.visual_library for select
  to anon, authenticated
  using (quality in ('learned', 'promoted'));
