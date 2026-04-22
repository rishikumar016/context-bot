-- RAG: pgvector store for user-uploaded document chunks
-- Run once in the Supabase SQL editor (or via supabase CLI migrations).

create extension if not exists vector;

create table if not exists documents (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  source_id   uuid not null,
  source_name text not null,
  content     text not null,
  metadata    jsonb default '{}'::jsonb,
  embedding   vector(1536),
  created_at  timestamptz default now()
);

create index if not exists documents_user_idx on documents(user_id);
create index if not exists documents_source_idx on documents(source_id);
create index if not exists documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);

alter table documents enable row level security;

create policy "read own documents" on documents
  for select using (auth.uid() = user_id);

create policy "insert own documents" on documents
  for insert with check (auth.uid() = user_id);

create policy "delete own documents" on documents
  for delete using (auth.uid() = user_id);

create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter_user uuid default null
)
returns table (
  id bigint,
  source_name text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    source_name,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where (filter_user is null or user_id = filter_user)
  order by embedding <=> query_embedding
  limit match_count;
$$;
