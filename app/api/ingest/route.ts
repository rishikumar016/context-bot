import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { extractFileText, isSupportedFile } from "@/lib/rag/parse";
import { chunkText } from "@/lib/rag/chunk";

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

  const results: Array<{
    source_id: string;
    source_name: string;
    chunks: number;
  }> = [];
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

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      skipped.push({ name: file.name, reason: "no extractable text" });
      continue;
    }

    const { embeddings } = await embedMany({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      values: chunks,
    });

    const sourceId = crypto.randomUUID();
    const rows = chunks.map((content, i) => ({
      user_id: user.id,
      source_id: sourceId,
      source_name: file.name,
      content,
      embedding: embeddings[i],
      metadata: { chunk_index: i, total_chunks: chunks.length },
    }));

    const { error } = await supabase.from("documents").insert(rows);
    if (error) {
      return Response.json(
        { error: `Insert failed for ${file.name}: ${error.message}` },
        { status: 500 }
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
