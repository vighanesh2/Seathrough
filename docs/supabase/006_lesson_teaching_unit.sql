-- Lesson teaching-unit contract (token compression).
-- Run in Supabase SQL Editor after 001–005.
--
-- Home of the unit: public.lessons columns ONLY.
-- Do NOT also store these five fields inside plan JSON (one place, not both).
-- Do NOT store the unit only on lesson_turns (turns are ordered speech).
-- lesson_beats stay the canvas + voice timeline; diagram_action is still/may_move at runtime.
--
-- prompt = sloppy draft (unchanged).
-- title = display name (unchanged).
-- human_summary = leftover product copy — NOT the teaching unit until renamed/replaced.
-- content_name = tight content name from Pipe A / teaching unit.

create type public.critic_pass as enum (
  'yes',
  'no',
  'asked_user'
);

alter table public.lessons
  add column if not exists content_name text,
  add column if not exists scope jsonb,
  add column if not exists core_concept_summary text,
  add column if not exists next_step text,
  add column if not exists mapping jsonb,
  add column if not exists tight_ask text,
  add column if not exists critic_pass public.critic_pass;

comment on column public.lessons.prompt is
  'Sloppy draft the student typed or said. Pipe A reads this; it is not the tight ask.';
comment on column public.lessons.title is
  'Display title for UI. Not the teaching-unit content name.';
comment on column public.lessons.human_summary is
  'Legacy closing copy from the lesson planner. Not the teaching unit; do not treat as core_concept_summary.';
comment on column public.lessons.content_name is
  'Teaching unit: tight content name (concept label for this canvas).';
comment on column public.lessons.scope is
  'Teaching unit: { "include": string, "exclude": string } — what is in / out for this canvas.';
comment on column public.lessons.core_concept_summary is
  'Teaching unit: one-sentence core concept. Distinct from human_summary until proven identical.';
comment on column public.lessons.next_step is
  'Teaching unit: immediate teaching move after stating the concept.';
comment on column public.lessons.mapping is
  'Teaching unit canvas contract JSON: { "objects": string, "meaning": string, "still_may_move": string }.';
comment on column public.lessons.tight_ask is
  'Pipe A output: concept + scope only. Null until Pipe A runs or user confirms.';
comment on column public.lessons.critic_pass is
  'Compression critic: yes | no | asked_user. Null until Pipe A/B decide.';

-- Optional shape checks (nullable rows stay valid for pre-compression lessons).
alter table public.lessons
  drop constraint if exists lessons_scope_object_check;
alter table public.lessons
  add constraint lessons_scope_object_check
  check (
    scope is null
    or (
      jsonb_typeof(scope) = 'object'
      and scope ? 'include'
      and scope ? 'exclude'
    )
  );

alter table public.lessons
  drop constraint if exists lessons_mapping_object_check;
alter table public.lessons
  add constraint lessons_mapping_object_check
  check (
    mapping is null
    or (
      jsonb_typeof(mapping) = 'object'
      and mapping ? 'objects'
      and mapping ? 'meaning'
      and mapping ? 'still_may_move'
    )
  );

create index if not exists lessons_content_name_idx
  on public.lessons (content_name)
  where content_name is not null;

create index if not exists lessons_critic_pass_idx
  on public.lessons (critic_pass)
  where critic_pass is not null;

create index if not exists lessons_tight_ask_idx
  on public.lessons (tight_ask)
  where tight_ask is not null;
