-- ============================================================
-- DuePulse — Full Schema
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: profiles
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  canvas_domain text,
  canvas_token  text,
  onboarding_complete boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: owner delete"
  on public.profiles for delete
  using (auth.uid() = id);

-- ============================================================
-- TABLE: courses
-- ============================================================
create table if not exists public.courses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  canvas_course_id bigint not null,
  name             text not null,
  color            text not null default '#6366f1',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, canvas_course_id)
);

alter table public.courses enable row level security;

create policy "courses: owner select"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "courses: owner insert"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "courses: owner update"
  on public.courses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "courses: owner delete"
  on public.courses for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE: assignments
-- ============================================================
create table if not exists public.assignments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  course_id            uuid not null references public.courses(id) on delete cascade,
  canvas_assignment_id bigint not null,
  title                text not null,
  due_at               timestamptz,
  points_possible      numeric,
  submission_types     text[] not null default '{}',
  html_url             text,
  estimated_minutes    int,
  priority             smallint not null default 2 check (priority between 1 and 3),
  is_completed         boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, canvas_assignment_id)
);

alter table public.assignments enable row level security;

create policy "assignments: owner select"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "assignments: owner insert"
  on public.assignments for insert
  with check (auth.uid() = user_id);

create policy "assignments: owner update"
  on public.assignments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "assignments: owner delete"
  on public.assignments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE: push_subscriptions
-- ============================================================
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions: owner insert"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions: owner delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE: productive_windows
-- ============================================================
create table if not exists public.productive_windows (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  hour_of_day  smallint not null check (hour_of_day between 0 and 23),
  score        numeric(4,3) not null default 0 check (score between 0 and 1),
  updated_at   timestamptz not null default now(),
  unique (user_id, day_of_week, hour_of_day)
);

alter table public.productive_windows enable row level security;

create policy "productive_windows: owner select"
  on public.productive_windows for select
  using (auth.uid() = user_id);

create policy "productive_windows: owner insert"
  on public.productive_windows for insert
  with check (auth.uid() = user_id);

create policy "productive_windows: owner update"
  on public.productive_windows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "productive_windows: owner delete"
  on public.productive_windows for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RPC: get_workload_heatmap
-- Returns assignment load bucketed by due date + hour for D3 heatmap
-- ============================================================
create or replace function public.get_workload_heatmap(p_user_id uuid)
returns table (
  due_date   date,
  hour_of_day smallint,
  count      bigint,
  total_points numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    due_at::date                      as due_date,
    extract(hour from due_at)::smallint as hour_of_day,
    count(*)                           as count,
    coalesce(sum(points_possible), 0)  as total_points
  from public.assignments
  where user_id        = p_user_id
    and is_completed   = false
    and due_at         is not null
    and due_at         >= now()
  group by 1, 2
  order by 1, 2;
$$;

-- Revoke public execute; only the authenticated user's service role calls this
revoke execute on function public.get_workload_heatmap(uuid) from public;
grant  execute on function public.get_workload_heatmap(uuid) to authenticated;
