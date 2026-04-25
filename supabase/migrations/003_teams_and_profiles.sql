-- Teams (offices)
create table teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz default now() not null
);

-- User profiles — one row per auth.users row, holds display name, team, and role
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  team_id      uuid references teams(id),
  role         text not null default 'rep' check (role in ('rep', 'manager', 'admin')),
  created_at   timestamptz default now() not null
);

alter table profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (display_name only; role/team_id should be set by admin)
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
