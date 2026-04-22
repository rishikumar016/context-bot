import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").notNull(),
    sourceId: uuid("source_id").notNull(),
    sourceName: text("source_name").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("documents_user_idx").on(t.userId),
    index("documents_source_idx").on(t.sourceId),
    index("documents_embedding_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
  ]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
