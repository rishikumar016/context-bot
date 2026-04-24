import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rows = await db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      mimeType: sources.mimeType,
      sizeBytes: sources.sizeBytes,
      chunks: sources.chunkCount,
      createdAt: sources.createdAt,
    })
    .from(sources)
    .where(eq(sources.userId, user.id))
    .orderBy(desc(sources.createdAt));

  return Response.json({ sources: rows });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");
  if (!sourceId) {
    return Response.json({ error: "sourceId required" }, { status: 400 });
  }

  // Look up R2 key before deleting (documents + chat_sources cascade via FK)
  const [row] = await db
    .select({ r2Key: sources.r2Key })
    .from(sources)
    .where(and(eq(sources.userId, user.id), eq(sources.id, sourceId)))
    .limit(1);

  if (!row) {
    return Response.json({ error: "Source not found" }, { status: 404 });
  }

  await db
    .delete(sources)
    .where(and(eq(sources.userId, user.id), eq(sources.id, sourceId)));

  // Best-effort R2 cleanup; DB already succeeded
  try {
    await deleteFromR2(row.r2Key);
  } catch (e) {
    console.error("R2 delete failed", e);
  }

  return Response.json({ ok: true });
}
