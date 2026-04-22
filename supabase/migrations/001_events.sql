create table events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text not null check (type in ('knock', 'conversation', 'sale')),
  created_at timestamptz default now() not null
);

create index events_user_id_created_at_idx on events (user_id, created_at);

alter table events enable row level security;

create policy "Users can manage their own events"
  on events for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
