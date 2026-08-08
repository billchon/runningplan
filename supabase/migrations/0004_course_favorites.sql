-- Run this once in the Supabase Dashboard: Project > SQL Editor > New query > paste > Run.
-- Adds course favoriting (set from the run-result screen, PRD 4.4) and tracks whether a
-- course was designed in course-builder or auto-generated from a favorited free run.

alter table public.courses
  add column if not exists is_favorite boolean not null default false;

alter table public.courses
  add column if not exists source text not null default 'builder';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_source_check'
  ) then
    alter table public.courses
      add constraint courses_source_check check (source in ('builder', 'free_run'));
  end if;
end $$;
