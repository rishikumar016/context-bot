CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	"source_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_user_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_source_idx" ON "documents" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_embedding_idx" ON "documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "read own documents" ON "documents";--> statement-breakpoint
CREATE POLICY "read own documents" ON "documents" FOR SELECT USING (auth.uid() = user_id);--> statement-breakpoint
DROP POLICY IF EXISTS "insert own documents" ON "documents";--> statement-breakpoint
CREATE POLICY "insert own documents" ON "documents" FOR INSERT WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
DROP POLICY IF EXISTS "delete own documents" ON "documents";--> statement-breakpoint
CREATE POLICY "delete own documents" ON "documents" FOR DELETE USING (auth.uid() = user_id);--> statement-breakpoint
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_user uuid DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  source_name text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    source_name,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE (filter_user IS NULL OR user_id = filter_user)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
