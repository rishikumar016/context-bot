import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { chatSources, chats, documents, sources } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { extractFileText, isSupportedFile } from "@/lib/rag/parse";
import { chunkContent } from "@/lib/rag/chunking";
import { generateEmbeddings } from "@/lib/rag/embeddings";
import { buildR2Key, deleteFromR2, uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId"); // optional: auto-attach to this chat

  // If a chatId is provided, verify it belongs to the user once up-front.
  let chatBelongsToUser = false;
  if (chatId) {
    const [row] = await db
      .select({ id: chats.id })
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
      .limit(1);
    chatBelongsToUser = Boolean(row);
    if (!chatBelongsToUser) {
      return new Response("Chat not found", { status: 404 });
    }
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  const results: Array<{ source_id: string; source_name: string; chunks: number }> = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  for (const file of files) {
    if (!isSupportedFile(file.name)) {
      skipped.push({ name: file.name, reason: "unsupported file type" });
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    let text: string;
    try {
      text = await extractFileText(
        new File([bytes], file.name, { type: file.type }),
      );
    } catch (e) {
      skipped.push({ name: file.name, reason: (e as Error).message });
      continue;
    }

    const chunks = await chunkContent(text);
    if (chunks.length === 0) {
      skipped.push({ name: file.name, reason: "no extractable text" });
      continue;
    }

    const embeddings = await generateEmbeddings(chunks);

    const sourceId = crypto.randomUUID();
    const r2Key = buildR2Key(user.id, sourceId, file.name);

    // 1. Upload raw file to R2 first
    try {
      await uploadToR2(r2Key, bytes, file.type || undefined);
    } catch (e) {
      return Response.json(
        { error: `R2 upload failed for ${file.name}: ${(e as Error).message}` },
        { status: 500 },
      );
    }

    // 2. Insert sources + documents + optional chat_sources
    try {
      await db.insert(sources).values({
        id: sourceId,
        userId: user.id,
        name: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        r2Key,
        chunkCount: chunks.length,
      });

      await db.insert(documents).values(
        chunks.map((content, i) => ({
          userId: user.id,
          sourceId,
          content,
          embedding: embeddings[i],
          metadata: { chunk_index: i, total_chunks: chunks.length },
        })),
      );

      if (chatId && chatBelongsToUser) {
        await db
          .insert(chatSources)
          .values({ chatId, sourceId })
          .onConflictDoNothing();
      }
    } catch (e) {
      // Roll back R2 on DB failure
      try {
        await deleteFromR2(r2Key);
      } catch {}
      return Response.json(
        { error: `Insert failed for ${file.name}: ${(e as Error).message}` },
        { status: 500 },
      );
    }

    results.push({
      source_id: sourceId,
      source_name: file.name,
      chunks: chunks.length,
    });
  }

  return Response.json({ results, skipped });
}
