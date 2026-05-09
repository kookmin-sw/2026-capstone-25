create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  raw_input text not null,
  primary_type text,
  secondary_tags text[] not null default '{}',
  goal text not null,
  current_phase text,
  color text,
  start_date date,
  due date,
  is_single boolean not null default false,
  scale text,
  template_id text,
  template_name text,
  created_at timestamptz not null default now()
);

create table public.decompositions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  round integer not null default 1,
  parent_decomp_id uuid references public.decompositions(id) on delete set null,
  trigger text not null default 'initial',
  created_at timestamptz not null default now(),
  constraint decompositions_round_positive check (round > 0)
);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  decomposition_id uuid not null references public.decompositions(id) on delete cascade,
  parent_step_id uuid references public.steps(id) on delete cascade,
  order_idx integer not null,
  title text not null,
  description text,
  guide text,
  estimated_minutes integer,
  done boolean not null default false,
  time_spent integer not null default 0,
  boundary_signal text,
  constraint steps_order_idx_nonnegative check (order_idx >= 0),
  constraint steps_estimated_minutes_positive check (estimated_minutes is null or estimated_minutes > 0),
  constraint steps_time_spent_nonnegative check (time_spent >= 0)
);

create table public.reasoning_logs (
  id uuid primary key default gen_random_uuid(),
  decomposition_id uuid not null references public.decompositions(id) on delete cascade,
  signals_used text[] not null default '{}',
  analysis_json jsonb not null default '{}'::jsonb,
  raw_llm_json jsonb not null default '{}'::jsonb
);

create table public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  slot_start time,
  slot_end time,
  constraint schedule_slot_order check (
    slot_start is null
    or slot_end is null
    or slot_start < slot_end
  )
);

create index projects_user_id_idx on public.projects(user_id);
create index projects_due_idx on public.projects(due);
create index decompositions_project_id_idx on public.decompositions(project_id);
create index steps_decomposition_id_idx on public.steps(decomposition_id);
create index steps_parent_step_id_idx on public.steps(parent_step_id);
create index reasoning_logs_decomposition_id_idx on public.reasoning_logs(decomposition_id);
create index schedule_assignments_user_date_idx on public.schedule_assignments(user_id, date);
create index schedule_assignments_step_id_idx on public.schedule_assignments(step_id);
