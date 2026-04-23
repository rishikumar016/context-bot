import { and, count, desc, eq, min } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rows = await db
    .select({
      sourceId: documents.sourceId,
      sourceName: documents.sourceName,
      chunks: count(documents.id),
      createdAt: min(documents.createdAt),
    })
    .from(documents)
    .where(eq(documents.userId, user.id))
    .groupBy(documents.sourceId, documents.sourceName)
    .orderBy(desc(min(documents.createdAt)));

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

  await db
    .delete(documents)
    .where(and(eq(documents.userId, user.id), eq(documents.sourceId, sourceId)));

  return Response.json({ ok: true });
}
