import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSources, chats, sources } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function verifyChatOwnership(chatId: string, userId: string) {
  const [row] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);
  return Boolean(row);
}

async function verifySourceOwnership(sourceId: string, userId: string) {
  const [row] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!(await verifyChatOwnership(chatId, user.id))) {
    return new Response("Chat not found", { status: 404 });
  }

  const rows = await db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      mimeType: sources.mimeType,
      sizeBytes: sources.sizeBytes,
      chunks: sources.chunkCount,
      createdAt: sources.createdAt,
    })
    .from(chatSources)
    .innerJoin(sources, eq(chatSources.sourceId, sources.id))
    .where(eq(chatSources.chatId, chatId));

  return Response.json({ sources: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { sourceId?: string }
    | null;
  const sourceId = body?.sourceId;
  if (!sourceId) {
    return Response.json({ error: "sourceId required" }, { status: 400 });
  }

  if (!(await verifyChatOwnership(chatId, user.id))) {
    return new Response("Chat not found", { status: 404 });
  }
  if (!(await verifySourceOwnership(sourceId, user.id))) {
    return new Response("Source not found", { status: 404 });
  }

  await db
    .insert(chatSources)
    .values({ chatId, sourceId })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;
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

  if (!(await verifyChatOwnership(chatId, user.id))) {
    return new Response("Chat not found", { status: 404 });
  }

  await db
    .delete(chatSources)
    .where(
      and(eq(chatSources.chatId, chatId), eq(chatSources.sourceId, sourceId)),
    );

  return Response.json({ ok: true });
}
