create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null default '',
  age int,
  weight_kg numeric(5,1),
  goal text not null default 'muscle',
  level text not null default '2',
  frequency text not null default '3',
  place text not null default 'mixte',
  session_time text not null default '35',
  preferred_split text not null default 'adaptive',
  food_preference text not null default 'omnivore',
  recovery_preference text not null default 'equilibre',
  coach_tone text not null default 'direct',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  target_value numeric(8,2),
  target_unit text,
  target_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  source text not null default 'ia',
  type text not null default 'training',
  title text not null,
  objective text,
  zone text,
  place text,
  duration_min int,
  duration_real_min int,
  completed_sets int default 0,
  volume int default 0,
  calories_estimate int default 0,
  feedback text,
  difficulty text,
  difficulty_rpe int,
  training_load text,
  coach_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  position int not null default 0,
  sets_planned int default 0,
  sets_done int default 0,
  reps_completed int default 0,
  rest_sec int default 0,
  comparison jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  metric_date date not null,
  weight_kg numeric(5,1),
  body_fat_pct numeric(5,2),
  notes text,
  updated_at timestamptz not null default now(),
  unique (profile_id, metric_date)
);

create table if not exists nutrition_days (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  log_date date not null,
  goal text,
  calories int,
  proteins int,
  carbs int,
  fats int,
  training_load text,
  meal_ids jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (profile_id, log_date)
);

create table if not exists recipes_favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, recipe_id)
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  badge_key text not null,
  unlocked_at timestamptz,
  status text not null default 'locked',
  updated_at timestamptz not null default now(),
  unique (profile_id, badge_key)
);

create table if not exists streaks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  streak_type text not null,
  current_value int not null default 0,
  best_value int not null default 0,
  updated_at timestamptz not null default now(),
  unique (profile_id, streak_type)
);

create table if not exists recovery_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  source text not null,
  title text not null,
  duration_min int default 0,
  stress_impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_memory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  memory_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (profile_id, memory_key)
);

create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);
create index if not exists idx_goals_profile_status on goals(profile_id, status);
create index if not exists idx_sessions_profile_created_at on sessions(profile_id, created_at desc);
create index if not exists idx_session_exercises_session_position on session_exercises(session_id, position);
create index if not exists idx_body_metrics_profile_date on body_metrics(profile_id, metric_date desc);
create index if not exists idx_nutrition_days_profile_date on nutrition_days(profile_id, log_date desc);
create index if not exists idx_badges_profile_status on badges(profile_id, status);
create index if not exists idx_streaks_profile_type on streaks(profile_id, streak_type);
create index if not exists idx_recovery_logs_profile_created_at on recovery_logs(profile_id, created_at desc);
create index if not exists idx_ai_memory_profile_key on ai_memory(profile_id, memory_key);

alter table profiles enable row level security;
alter table goals enable row level security;
alter table sessions enable row level security;
alter table session_exercises enable row level security;
alter table body_metrics enable row level security;
alter table nutrition_days enable row level security;
alter table recipes_favorites enable row level security;
alter table badges enable row level security;
alter table streaks enable row level security;
alter table recovery_logs enable row level security;
alter table ai_memory enable row level security;

alter table profiles add column if not exists email text;
alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists account_status text not null default 'active';
alter table profiles add column if not exists bio text not null default '';
alter table profiles add column if not exists moderation_reason text not null default '';
alter table profiles add column if not exists deleted_at timestamptz;
alter table profiles alter column account_status set default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('pending', 'active', 'suspended', 'banned'));
  end if;
end $$;

create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_profiles_role_status on profiles(role, account_status);

create or replace function public.is_active_account()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and coalesce(account_status, 'active') = 'active'
  );
$$;

create or replace function public.can_access_own_profile(target_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and auth_user_id = auth.uid()
      and coalesce(account_status, 'active') = 'active'
  );
$$;

create or replace function public.can_access_own_session(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.sessions
    join public.profiles on public.profiles.id = public.sessions.profile_id
    where public.sessions.id = target_session_id
      and public.profiles.auth_user_id = auth.uid()
      and coalesce(public.profiles.account_status, 'active') = 'active'
  );
$$;

drop policy if exists "profiles_self_access" on profiles;
create policy "profiles_self_access" on profiles
  for all
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists "goals_owner_access" on goals;
create policy "goals_owner_access" on goals
  for all
  using (public.can_access_own_profile(goals.profile_id))
  with check (public.can_access_own_profile(goals.profile_id));

drop policy if exists "sessions_owner_access" on sessions;
create policy "sessions_owner_access" on sessions
  for all
  using (public.can_access_own_profile(sessions.profile_id))
  with check (public.can_access_own_profile(sessions.profile_id));

drop policy if exists "session_exercises_owner_access" on session_exercises;
create policy "session_exercises_owner_access" on session_exercises
  for all
  using (public.can_access_own_session(session_exercises.session_id))
  with check (public.can_access_own_session(session_exercises.session_id));

drop policy if exists "body_metrics_owner_access" on body_metrics;
create policy "body_metrics_owner_access" on body_metrics
  for all
  using (public.can_access_own_profile(body_metrics.profile_id))
  with check (public.can_access_own_profile(body_metrics.profile_id));

drop policy if exists "nutrition_days_owner_access" on nutrition_days;
create policy "nutrition_days_owner_access" on nutrition_days
  for all
  using (public.can_access_own_profile(nutrition_days.profile_id))
  with check (public.can_access_own_profile(nutrition_days.profile_id));

drop policy if exists "recipes_favorites_owner_access" on recipes_favorites;
create policy "recipes_favorites_owner_access" on recipes_favorites
  for all
  using (public.can_access_own_profile(recipes_favorites.profile_id))
  with check (public.can_access_own_profile(recipes_favorites.profile_id));

drop policy if exists "badges_owner_access" on badges;
create policy "badges_owner_access" on badges
  for all
  using (public.can_access_own_profile(badges.profile_id))
  with check (public.can_access_own_profile(badges.profile_id));

drop policy if exists "streaks_owner_access" on streaks;
create policy "streaks_owner_access" on streaks
  for all
  using (public.can_access_own_profile(streaks.profile_id))
  with check (public.can_access_own_profile(streaks.profile_id));

drop policy if exists "recovery_logs_owner_access" on recovery_logs;
create policy "recovery_logs_owner_access" on recovery_logs
  for all
  using (public.can_access_own_profile(recovery_logs.profile_id))
  with check (public.can_access_own_profile(recovery_logs.profile_id));

drop policy if exists "ai_memory_owner_access" on ai_memory;
create policy "ai_memory_owner_access" on ai_memory
  for all
  using (public.can_access_own_profile(ai_memory.profile_id))
  with check (public.can_access_own_profile(ai_memory.profile_id));

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  photo_date date not null,
  zone text,
  weight_kg numeric(5,1),
  height_cm int,
  context text,
  note text,
  photo_storage_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progress_photos_profile_date on progress_photos(profile_id, photo_date desc);
create index if not exists idx_progress_photos_storage_path on progress_photos(photo_storage_path);

alter table progress_photos enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
      and coalesce(account_status, 'active') = 'active'
  );
$$;

create or replace function public.admin_get_user_detail(target_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  target_profile public.profiles%rowtype;
  notes_payload jsonb := '[]'::jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'Accès admin requis';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_profile_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  select coalesce(
    jsonb_agg(note_row.item order by note_row.sort_date desc nulls last),
    '[]'::jsonb
  )
  into notes_payload
  from (
    select
      progress_photos.photo_date::timestamp as sort_date,
      jsonb_build_object(
        'id', concat('photo:', progress_photos.id),
        'kind', 'photo',
        'title', coalesce(progress_photos.zone, 'Photo'),
        'date', progress_photos.photo_date,
        'description', trim(concat_ws(' • ', nullif(progress_photos.context, ''), nullif(progress_photos.note, ''))),
        'context', coalesce(progress_photos.zone, ''),
        'meta', jsonb_build_object(
          'weightKg', progress_photos.weight_kg,
          'heightCm', progress_photos.height_cm
        )
      ) as item
    from public.progress_photos
    where progress_photos.profile_id = target_profile_id
      and (coalesce(progress_photos.context, '') <> '' or coalesce(progress_photos.note, '') <> '')

    union all

    select
      body_metrics.metric_date::timestamp as sort_date,
      jsonb_build_object(
        'id', concat('metric:', body_metrics.id),
        'kind', 'metric',
        'title', 'Suivi poids',
        'date', body_metrics.metric_date,
        'description', coalesce(body_metrics.notes, ''),
        'context', case
          when body_metrics.weight_kg is not null then concat(body_metrics.weight_kg, ' kg')
          else ''
        end,
        'meta', jsonb_build_object()
      ) as item
    from public.body_metrics
    where body_metrics.profile_id = target_profile_id
      and coalesce(body_metrics.notes, '') <> ''

    union all

    select
      nutrition_days.log_date::timestamp as sort_date,
      jsonb_build_object(
        'id', concat('nutrition:', nutrition_days.id),
        'kind', 'nutrition',
        'title', coalesce(nutrition_days.goal, 'Nutrition'),
        'date', nutrition_days.log_date,
        'description', array_to_string(array(select jsonb_array_elements_text(coalesce(nutrition_days.notes, '[]'::jsonb))), ' • '),
        'context', coalesce(nutrition_days.training_load, ''),
        'meta', jsonb_build_object(
          'calories', nutrition_days.calories
        )
      ) as item
    from public.nutrition_days
    where nutrition_days.profile_id = target_profile_id
      and jsonb_typeof(coalesce(nutrition_days.notes, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(nutrition_days.notes, '[]'::jsonb)) > 0

    union all

    select
      recovery_logs.created_at as sort_date,
      jsonb_build_object(
        'id', concat('recovery:', recovery_logs.id),
        'kind', 'recovery',
        'title', coalesce(recovery_logs.title, 'Recovery'),
        'date', recovery_logs.created_at,
        'description', coalesce(recovery_logs.stress_impact, ''),
        'context', coalesce(recovery_logs.source, ''),
        'meta', jsonb_build_object()
      ) as item
    from public.recovery_logs
    where recovery_logs.profile_id = target_profile_id
      and coalesce(recovery_logs.stress_impact, '') <> ''
  ) as note_row;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', target_profile.id,
      'auth_user_id', target_profile.auth_user_id,
      'email', coalesce(target_profile.email, ''),
      'name', coalesce(target_profile.name, ''),
      'bio', coalesce(target_profile.bio, ''),
      'age', target_profile.age,
      'weight_kg', target_profile.weight_kg,
      'role', coalesce(target_profile.role, 'user'),
      'account_status', coalesce(target_profile.account_status, 'active'),
      'moderation_reason', coalesce(target_profile.moderation_reason, ''),
      'deleted_at', target_profile.deleted_at,
      'goal', coalesce(target_profile.goal, 'muscle'),
      'level', coalesce(target_profile.level, '2'),
      'frequency', coalesce(target_profile.frequency, '3'),
      'place', coalesce(target_profile.place, 'mixte'),
      'session_time', coalesce(target_profile.session_time, '35'),
      'preferred_split', coalesce(target_profile.preferred_split, 'adaptive'),
      'food_preference', coalesce(target_profile.food_preference, 'omnivore'),
      'recovery_preference', coalesce(target_profile.recovery_preference, 'equilibre'),
      'coach_tone', coalesce(target_profile.coach_tone, 'direct'),
      'photo_path', coalesce(target_profile.photo_path, ''),
      'created_at', target_profile.created_at
    ),
    'notes', notes_payload
  );
end;
$$;

create or replace function public.admin_remove_user_account(target_profile_id uuid, delete_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  target_profile public.profiles%rowtype;
  safe_reason text := left(trim(coalesce(delete_reason, '')), 240);
begin
  if not public.is_admin_user() then
    raise exception 'Accès admin requis';
  end if;

  if safe_reason = '' then
    raise exception 'Raison requise';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_profile_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  if target_profile.role = 'admin' or target_profile.auth_user_id = auth.uid() then
    raise exception 'Impossible de supprimer ce compte';
  end if;

  delete from public.progress_photos where profile_id = target_profile.id;
  delete from public.body_metrics where profile_id = target_profile.id;
  delete from public.nutrition_days where profile_id = target_profile.id;
  delete from public.sessions where profile_id = target_profile.id;
  delete from public.recovery_logs where profile_id = target_profile.id;
  delete from public.goals where profile_id = target_profile.id;
  delete from public.recipes_favorites where profile_id = target_profile.id;
  delete from public.badges where profile_id = target_profile.id;
  delete from public.streaks where profile_id = target_profile.id;
  delete from public.ai_memory where profile_id = target_profile.id;

  update public.profiles
  set
    age = null,
    weight_kg = null,
    bio = '',
    photo_path = null,
    account_status = 'banned',
    moderation_reason = safe_reason,
    deleted_at = now(),
    goal = 'muscle',
    level = '2',
    frequency = '3',
    place = 'mixte',
    session_time = '35',
    preferred_split = 'adaptive',
    food_preference = 'omnivore',
    recovery_preference = 'equilibre',
    coach_tone = 'direct',
    updated_at = now()
  where id = target_profile.id;

  return jsonb_build_object(
    'ok', true,
    'profile_id', target_profile.id,
    'email', coalesce(target_profile.email, ''),
    'reason', safe_reason
  );
end;
$$;

grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_remove_user_account(uuid, text) to authenticated;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text := lower(coalesce(new.raw_user_meta_data->>'app_role', new.raw_user_meta_data->>'role', 'user'));
  next_status text := lower(coalesce(new.raw_user_meta_data->>'account_status', ''));
begin
  if next_role not in ('admin', 'user') then
    next_role := 'user';
  end if;

  if next_status not in ('pending', 'active', 'suspended', 'banned') then
    next_status := 'active';
  end if;

  insert into public.profiles (
    auth_user_id,
    email,
    name,
    role,
    account_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', ''),
    next_role,
    next_status,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        name = case
          when excluded.name <> '' then excluded.name
          else profiles.name
        end,
        role = case
          when profiles.role = 'admin' then 'admin'
          else excluded.role
        end,
        account_status = case
          when profiles.role = 'admin' then profiles.account_status
          else excluded.account_status
        end,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user_created();

drop policy if exists "profiles_admin_access" on profiles;
create policy "profiles_admin_access" on profiles
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "progress_photos_owner_access" on progress_photos;
create policy "progress_photos_owner_access" on progress_photos
  for all
  using (public.can_access_own_profile(progress_photos.profile_id))
  with check (public.can_access_own_profile(progress_photos.profile_id));

drop policy if exists "progress_photos_admin_access" on progress_photos;
create policy "progress_photos_admin_access" on progress_photos
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('progress-photos', 'progress-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "avatars_select_own_or_admin" on storage.objects;
create policy "avatars_select_own_or_admin" on storage.objects
  for select
  using (
    bucket_id = 'avatars'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "avatars_insert_own_or_admin" on storage.objects;
create policy "avatars_insert_own_or_admin" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "avatars_update_own_or_admin" on storage.objects;
create policy "avatars_update_own_or_admin" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  )
  with check (
    bucket_id = 'avatars'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "avatars_delete_own_or_admin" on storage.objects;
create policy "avatars_delete_own_or_admin" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "progress_photos_select_own_or_admin" on storage.objects;
create policy "progress_photos_select_own_or_admin" on storage.objects
  for select
  using (
    bucket_id = 'progress-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "progress_photos_insert_own_or_admin" on storage.objects;
create policy "progress_photos_insert_own_or_admin" on storage.objects
  for insert
  with check (
    bucket_id = 'progress-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "progress_photos_update_own_or_admin" on storage.objects;
create policy "progress_photos_update_own_or_admin" on storage.objects
  for update
  using (
    bucket_id = 'progress-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  )
  with check (
    bucket_id = 'progress-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

drop policy if exists "progress_photos_delete_own_or_admin" on storage.objects;
create policy "progress_photos_delete_own_or_admin" on storage.objects
  for delete
  using (
    bucket_id = 'progress-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.is_active_account())
      or public.is_admin_user()
    )
  );

insert into public.profiles (
  auth_user_id,
  email,
  name,
  role,
  account_status,
  created_at,
  updated_at
)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data->>'display_name', users.raw_user_meta_data->>'name', ''),
  case
    when lower(coalesce(users.raw_user_meta_data->>'app_role', users.raw_user_meta_data->>'role', 'user')) = 'admin' then 'admin'
    else 'user'
  end,
  case
    when lower(coalesce(users.raw_user_meta_data->>'app_role', users.raw_user_meta_data->>'role', 'user')) = 'admin' then 'active'
    when lower(coalesce(users.raw_user_meta_data->>'account_status', '')) in ('pending', 'active', 'suspended', 'banned')
      then lower(users.raw_user_meta_data->>'account_status')
    else 'active'
  end,
  coalesce(users.created_at, now()),
  now()
from auth.users as users
on conflict (auth_user_id) do update
  set email = excluded.email,
      name = case
        when excluded.name <> '' then excluded.name
        else profiles.name
      end,
      updated_at = now();

update public.profiles
set
  account_status = 'active',
  updated_at = now()
where role <> 'admin'
  and coalesce(account_status, 'active') = 'pending';
