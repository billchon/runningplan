-- Run this once in the Supabase Dashboard: Project > SQL Editor > New query > paste > Run.
-- Mirrors RUNS / RUN_SEGMENTS from the PRD ERD (section 10).

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  distance_m numeric not null default 0,
  duration_sec integer not null default 0,
  completion_rate numeric,
  created_at timestamptz not null default now()
);

alter table public.runs enable row level security;

create policy "Users can view their own runs"
  on public.runs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own runs"
  on public.runs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own runs"
  on public.runs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own runs"
  on public.runs for delete
  using (auth.uid() = user_id);

create table if not exists public.run_segments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  km_index integer not null,
  pace numeric,
  speed_category text check (speed_category in ('fast', 'normal', 'slow'))
);

alter table public.run_segments enable row level security;

create policy "Users can manage segments of their own runs"
  on public.run_segments for all
  using (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()));
