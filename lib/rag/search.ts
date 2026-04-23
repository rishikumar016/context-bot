import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/rag/embeddings";

export async function searchDocuments(
  query: string,
  userId: string,
  limit = 5,
  threshold = 0.5,
) {
  const queryEmbedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`;

  return db
    .select({
      id: documents.id,
      content: documents.content,
      sourceName: documents.sourceName,
      similarity,
    })
    .from(documents)
    .where(and(eq(documents.userId, userId), gt(similarity, threshold)))
    .orderBy(desc(similarity))
    .limit(limit);
}
