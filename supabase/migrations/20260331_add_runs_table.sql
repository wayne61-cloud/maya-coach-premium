-- GPS Run Tracking table
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null default '',
  run_type text not null default 'free',
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_sec int not null default 0,
  distance_m numeric(10, 1) not null default 0,
  avg_pace_sec int,
  best_pace_sec int,
  calories_estimate int default 0,
  gps_points jsonb not null default '[]'::jsonb,
  splits jsonb not null default '[]'::jsonb,
  status text not null default 'completed',
  weather jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_runs_profile_started_at on runs(profile_id, started_at desc);

alter table runs enable row level security;

create policy "runs_owner_access" on runs
  for all
  using (public.can_access_own_profile(runs.profile_id))
  with check (public.can_access_own_profile(runs.profile_id));

create policy "runs_admin_access" on runs
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());
