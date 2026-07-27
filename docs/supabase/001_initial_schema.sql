-- Visual Education — initial schema
-- Run in Supabase SQL Editor (or via CLI migration).
-- RLS enabled on every table. Seed data from curated repos comes later.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.cognitive_type as enum (
  'definition',
  'structural',
  'process',
  'hidden_state'
);

create type public.diagram_action as enum (
  'none',
  'generate',
  'keep',
  'retire'
);

create type public.lesson_status as enum (
  'pending',
  'streaming',
  'completed',
  'failed'
);

create type public.scene_shape as enum (
  'classroom',
  'cycle',
  'stack',
  'tree',
  'blank',
  'custom'
);

-- ---------------------------------------------------------------------------
-- metaphors
-- Seed basis: Extended Metaphor Dataset (UCSD) + our cognitive typing
-- ---------------------------------------------------------------------------
create table public.metaphors (
  id uuid primary key default gen_random_uuid(),
  concept_key text not null,
  -- normalized lookup key, e.g. 'class', 'for-loop', 'stack'
  display_name text not null,
  cognitive_type public.cognitive_type not null,
  metaphor_vehicle text not null,
  -- e.g. 'classroom', 'blueprint', 'pile of plates'
  mental_model text,
  -- residual model for final CLI summary
  scene_shape public.scene_shape not null default 'blank',
  scene_template jsonb not null default '{}'::jsonb,
  -- Rough.js scene params (labels, nodes) — not a photo prompt
  domain text default 'general',
  -- e.g. 'cs', 'biology', 'general'
  source text,
  -- e.g. 'metaphor_dataset', 'manual'
  hidden_score smallint not null default 0
    check (hidden_score >= 0 and hidden_score <= 10),
  -- higher = harder to imagine without a visual
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concept_key, domain)
);

create index metaphors_cognitive_type_idx on public.metaphors (cognitive_type);
create index metaphors_concept_key_idx on public.metaphors (concept_key);

-- ---------------------------------------------------------------------------
-- misconceptions
-- Seed basis: ProgMiscon + McMiner bank
-- ---------------------------------------------------------------------------
create table public.misconceptions (
  id uuid primary key default gen_random_uuid(),
  concept_key text not null,
  language text,
  -- e.g. 'java', 'python', null = language-agnostic
  title text not null,
  description text not null,
  wrong_model text,
  -- how learners commonly mis-think it
  correct_model text,
  implies_hidden_state boolean not null default false,
  source text,
  -- e.g. 'progmiscon', 'mcminer', 'manual'
  external_ref text,
  -- URL or id in source inventory
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index misconceptions_concept_key_idx on public.misconceptions (concept_key);
create index misconceptions_language_idx on public.misconceptions (language);

-- ---------------------------------------------------------------------------
-- figure_patterns
-- Seed basis: LPM-inspired rules (when a figure belongs with explanation)
-- Not raw LPM media — curated trigger rules
-- ---------------------------------------------------------------------------
create table public.figure_patterns (
  id uuid primary key default gen_random_uuid(),
  cognitive_type public.cognitive_type not null,
  min_hidden_score smallint not null default 0
    check (min_hidden_score >= 0 and min_hidden_score <= 10),
  default_action public.diagram_action not null,
  notes text,
  source text default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cognitive_type, min_hidden_score, default_action)
);

-- ---------------------------------------------------------------------------
-- lessons
-- Runtime: one row per user prompt / generated lesson
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  -- null allowed for anonymous/dev sessions
  prompt text not null,
  title text,
  language text,
  status public.lesson_status not null default 'pending',
  plan jsonb,
  -- full LessonPlan JSON from Groq
  human_summary text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_user_id_idx on public.lessons (user_id);
create index lessons_status_idx on public.lessons (status);
create index lessons_created_at_idx on public.lessons (created_at desc);

-- ---------------------------------------------------------------------------
-- lesson_beats
-- Optional audit / replay of streamed beats
-- ---------------------------------------------------------------------------
create table public.lesson_beats (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  beat_id text not null,
  beat_order integer not null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  metaphor_id uuid references public.metaphors (id) on delete set null,
  diagram_action public.diagram_action,
  created_at timestamptz not null default now(),
  unique (lesson_id, beat_id)
);

create index lesson_beats_lesson_id_idx on public.lesson_beats (lesson_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger metaphors_set_updated_at
  before update on public.metaphors
  for each row execute function public.set_updated_at();

create trigger misconceptions_set_updated_at
  before update on public.misconceptions
  for each row execute function public.set_updated_at();

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.metaphors enable row level security;
alter table public.misconceptions enable row level security;
alter table public.figure_patterns enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_beats enable row level security;

-- Cognitive seed tables: readable by everyone (anon + authenticated).
-- Writes only via service role (no insert/update/delete policies for clients).
create policy "metaphors_select_all"
  on public.metaphors for select
  to anon, authenticated
  using (is_active = true);

create policy "misconceptions_select_all"
  on public.misconceptions for select
  to anon, authenticated
  using (is_active = true);

create policy "figure_patterns_select_all"
  on public.figure_patterns for select
  to anon, authenticated
  using (is_active = true);

-- Lessons: owners only; anonymous rows (user_id is null) are service-role only.
create policy "lessons_select_own"
  on public.lessons for select
  to authenticated
  using (auth.uid() = user_id);

create policy "lessons_insert_own"
  on public.lessons for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "lessons_update_own"
  on public.lessons for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lessons_delete_own"
  on public.lessons for delete
  to authenticated
  using (auth.uid() = user_id);

-- Beats follow parent lesson ownership
create policy "lesson_beats_select_own"
  on public.lesson_beats for select
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.user_id = auth.uid()
    )
  );

create policy "lesson_beats_insert_own"
  on public.lesson_beats for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.user_id = auth.uid()
    )
  );

create policy "lesson_beats_update_own"
  on public.lesson_beats for update
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.user_id = auth.uid()
    )
  );

create policy "lesson_beats_delete_own"
  on public.lesson_beats for delete
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Bootstrap figure_patterns (Trigger defaults — no repo dump required)
-- ---------------------------------------------------------------------------
insert into public.figure_patterns (cognitive_type, min_hidden_score, default_action, notes, source)
values
  ('definition', 0, 'none', 'Semantic tokens: CLI + small callout only', 'manual'),
  ('structural', 0, 'generate', 'Relationships: teaching sketch + CLI', 'manual'),
  ('process', 0, 'generate', 'State over time: sketch/timeline + CLI', 'manual'),
  ('hidden_state', 3, 'generate', 'Not directly observable: visual first', 'manual')
on conflict do nothing;
