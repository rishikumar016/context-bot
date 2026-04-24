-- Chat persistence: one row per chat, messages stored as UIMessage[] JSONB.

create table if not exists chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_idx on chats(user_id);
create index if not exists chats_user_updated_idx on chats(user_id, updated_at desc);

alter table chats enable row level security;

drop policy if exists "read own chats" on chats;
create policy "read own chats" on chats
  for select using (auth.uid() = user_id);

drop policy if exists "insert own chats" on chats;
create policy "insert own chats" on chats
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own chats" on chats;
create policy "update own chats" on chats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own chats" on chats;
create policy "delete own chats" on chats
  for delete using (auth.uid() = user_id);
