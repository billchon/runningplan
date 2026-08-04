-- Run this once in the Supabase Dashboard: Project > SQL Editor > New query > paste > Run.
-- Mirrors the USERS entity from the PRD (section 10 ERD). auth.users already has id/email,
-- so this only adds the app-specific columns and keeps them in sync via a trigger.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  login_provider text not null default 'email',
  height_cm numeric,
  weight_kg numeric,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, login_provider)
  values (new.id, coalesce(new.raw_app_meta_data ->> 'provider', 'email'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
