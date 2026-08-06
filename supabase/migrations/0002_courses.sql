-- Run this once in the Supabase Dashboard: Project > SQL Editor > New query > paste > Run.
-- Mirrors COURSES / COURSE_WAYPOINTS / COURSE_RATINGS / COURSE_LOCATION_TAGS from the
-- PRD ERD (section 10). All RLS policies scope rows to the owning user.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  memo text,
  distance_m numeric not null default 0,
  avg_pace numeric,
  is_circular boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Users can view their own courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own courses"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own courses"
  on public.courses for delete
  using (auth.uid() = user_id);

create table if not exists public.course_waypoints (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  seq int not null,
  lat double precision not null,
  lng double precision not null
);

alter table public.course_waypoints enable row level security;

create policy "Users can manage waypoints of their own courses"
  on public.course_waypoints for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create table if not exists public.course_ratings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  category text not null check (category in ('경관', '안전', '평탄')),
  score smallint not null check (score between 1 and 5),
  unique (course_id, category)
);

alter table public.course_ratings enable row level security;

create policy "Users can manage ratings of their own courses"
  on public.course_ratings for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create table if not exists public.course_location_tags (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  tag_type text not null check (tag_type in ('start', 'finish')),
  region_name text not null
);

alter table public.course_location_tags enable row level security;

create policy "Users can manage location tags of their own courses"
  on public.course_location_tags for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));
