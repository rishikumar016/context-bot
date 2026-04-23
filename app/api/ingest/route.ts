import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { extractFileText, isSupportedFile } from "@/lib/rag/parse";
import { chunkContent } from "@/lib/rag/chunking";
import { generateEmbeddings } from "@/lib/rag/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

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

    let text: string;
    try {
      text = await extractFileText(file);
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
    const rows = chunks.map((content, i) => ({
      userId: user.id,
      sourceId,
      sourceName: file.name,
      content,
      embedding: embeddings[i],
      metadata: { chunk_index: i, total_chunks: chunks.length },
    }));

    try {
      await db.insert(documents).values(rows);
    } catch (e) {
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
