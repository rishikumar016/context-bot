-- Sources library + per-chat source selection.
-- Wipes old `documents` data (fresh start), adds `sources` and `chat_sources`.

-- 1. Wipe old documents (they reference sourceName only; new model requires sources row)
truncate table documents;

-- 2. Drop denormalized column (moved to `sources.name`)
alter table documents drop column if exists source_name;

-- 3. Create `sources` (user library of uploaded files)
create table if not exists sources (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  mime_type    text,
  size_bytes   bigint,
  r2_key       text not null,
  chunk_count  bigint not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists sources_user_idx on sources(user_id);

alter table sources enable row level security;

drop policy if exists "read own sources" on sources;
create policy "read own sources" on sources
  for select using (auth.uid() = user_id);

drop policy if exists "insert own sources" on sources;
create policy "insert own sources" on sources
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own sources" on sources;
create policy "update own sources" on sources
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own sources" on sources;
create policy "delete own sources" on sources
  for delete using (auth.uid() = user_id);

-- 4. Add FK from documents.source_id to sources.id (cascade delete)
alter table documents
  add constraint documents_source_id_fk
  foreign key (source_id) references sources(id) on delete cascade;

-- 5. Create `chat_sources` join table (per-chat selection)
create table if not exists chat_sources (
  chat_id    uuid not null references chats(id) on delete cascade,
  source_id  uuid not null references sources(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (chat_id, source_id)
);

create index if not exists chat_sources_chat_idx on chat_sources(chat_id);
create index if not exists chat_sources_source_idx on chat_sources(source_id);

alter table chat_sources enable row level security;

-- A row in chat_sources is "yours" if the referenced chat is yours.
drop policy if exists "read own chat_sources" on chat_sources;
create policy "read own chat_sources" on chat_sources
  for select using (
    exists (select 1 from chats c where c.id = chat_sources.chat_id and c.user_id = auth.uid())
  );

drop policy if exists "insert own chat_sources" on chat_sources;
create policy "insert own chat_sources" on chat_sources
  for insert with check (
    exists (select 1 from chats c where c.id = chat_sources.chat_id and c.user_id = auth.uid())
    and exists (select 1 from sources s where s.id = chat_sources.source_id and s.user_id = auth.uid())
  );

drop policy if exists "delete own chat_sources" on chat_sources;
create policy "delete own chat_sources" on chat_sources
  for delete using (
    exists (select 1 from chats c where c.id = chat_sources.chat_id and c.user_id = auth.uid())
  );
