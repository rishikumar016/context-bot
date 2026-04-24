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
import type { UIMessage } from "ai";

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

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title"),
    messages: jsonb("messages")
      .$type<UIMessage[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("chats_user_idx").on(t.userId)],
);

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
