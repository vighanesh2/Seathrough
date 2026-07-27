-- Expand scene_shape enum for geometry + richer sketches
-- Run in Supabase SQL Editor after 001_initial_schema.sql

alter type public.scene_shape add value if not exists 'circle';
alter type public.scene_shape add value if not exists 'square';
alter type public.scene_shape add value if not exists 'triangle';
alter type public.scene_shape add value if not exists 'line';
