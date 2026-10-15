-- Echelon: Personal Productivity XP Database Schema
-- Run this in the Supabase SQL Editor to set up tables, triggers, and Row Level Security (RLS)

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Categories Table
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Tasks Table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  scoring_method text not null check (scoring_method in ('time', 'quantity')),
  time_unit text default 'hour' check (time_unit in ('hour', 'minute')),
  xp_rate numeric(10, 4) not null check (xp_rate >= 0),
  is_archived boolean default false not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Work Sessions Table
create table if not exists public.work_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  task_name text not null,
  category_name text default 'Uncategorized',
  category_color text default '#6366f1',
  scoring_method text not null check (scoring_method in ('time', 'quantity')),
  time_unit text default 'hour' check (time_unit in ('hour', 'minute')),
  xp_rate numeric(10, 4) not null check (xp_rate >= 0),
  duration_seconds integer default 0 not null check (duration_seconds >= 0),
  quantity numeric(10, 2) check (quantity is null or quantity >= 0),
  xp_earned numeric(10, 4) not null check (xp_earned >= 0),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Active Timers Table (One per user)
create table if not exists public.active_timers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  task_id uuid references public.tasks(id) on delete cascade not null,
  accumulated_seconds integer default 0 not null check (accumulated_seconds >= 0),
  is_running boolean default true not null,
  last_started_at timestamptz,
  session_start_time timestamptz default timezone('utc'::text, now()) not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists idx_tasks_user on public.tasks(user_id, is_archived);
create index if not exists idx_sessions_user_date on public.work_sessions(user_id, ended_at desc);
create index if not exists idx_sessions_task on public.work_sessions(task_id);
create index if not exists idx_categories_user on public.categories(user_id);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.work_sessions enable row level security;
alter table public.active_timers enable row level security;

-- Profiles Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Categories Policies
create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Tasks Policies
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Work Sessions Policies
create policy "Users can view own sessions"
  on public.work_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.work_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.work_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.work_sessions for delete
  using (auth.uid() = user_id);

-- Active Timers Policies
create policy "Users can view own active timer"
  on public.active_timers for select
  using (auth.uid() = user_id);

create policy "Users can insert own active timer"
  on public.active_timers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own active timer"
  on public.active_timers for update
  using (auth.uid() = user_id);

create policy "Users can delete own active timer"
  on public.active_timers for delete
  using (auth.uid() = user_id);

-- Function to handle new user registration: create profile and default categories
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  -- Default editable categories
  insert into public.categories (user_id, name, color) values
    (new.id, 'Study', '#3b82f6'),
    (new.id, 'Coding', '#10b981'),
    (new.id, 'Health', '#f59e0b'),
    (new.id, 'Personal Development', '#8b5cf6');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
