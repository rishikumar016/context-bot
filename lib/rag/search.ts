import { and, cosineDistance, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, sources } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/rag/embeddings";

export async function searchDocuments(
  query: string,
  userId: string,
  sourceIds: string[],
  limit = 5,
  threshold = 0.25,
) {
  // No sources attached to this chat → no knowledge base to search.
  if (sourceIds.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`;

  return db
    .select({
      id: documents.id,
      content: documents.content,
      sourceName: sources.name,
      similarity,
    })
    .from(documents)
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .where(
      and(
        eq(documents.userId, userId),
        inArray(documents.sourceId, sourceIds),
        gt(similarity, threshold),
      ),
    )
    .orderBy(desc(similarity))
    .limit(limit);
}
