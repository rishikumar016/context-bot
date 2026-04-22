# RAG Implementation Plan — context-bot

End-to-end plan for adding document ingestion + retrieval-augmented chat to the existing Next.js 16 + Vercel AI SDK v6 + Supabase stack.

## Decisions locked in

| Decision            | Choice                                                         |
| ------------------- | -------------------------------------------------------------- |
| Supported uploads   | PDF, `.txt`, `.md`, `.docx`                                    |
| Embedding model     | `openai/text-embedding-3-small` (1536 dim, cheap, good enough) |
| Retrieval pattern   | Tool-based — model calls `searchDocs` when it needs context    |
| Upload UX           | Inline in chat composer via ai-elements `PromptInput`          |
| Vector store        | Supabase `pgvector` with HNSW index                            |
| Isolation per user  | RLS policies scoped to `auth.uid()`                            |

---

## Architecture

```
 ┌────────────────────┐   drop file   ┌──────────────────────┐
 │  PromptInput (UI)  │──────────────▶│  POST /api/ingest    │
 │  chats/[id]/page   │               │                      │
 └─────────┬──────────┘               │  parse → chunk →     │
           │ text only                │  embedMany →         │
           ▼                          │  insert documents    │
 ┌────────────────────┐               └──────────┬───────────┘
 │  POST /api/chat    │                          │
 │  streamText +      │                          ▼
 │  searchDocs tool   │              ┌─────────────────────────┐
 └─────────┬──────────┘              │  Supabase (pgvector)    │
           │ tool call               │  documents table        │
           ▼                         │  match_documents() RPC  │
 ┌────────────────────┐              └─────────────────────────┘
 │  embed(query) →    │◀─────────────────────────┘
 │  match_documents   │
 │  → top-k chunks    │
 └────────────────────┘
```

---

## 1. Dependencies

Add:

```bash
pnpm add unpdf mammoth
```

- **`unpdf`** — PDF text extraction, edge-compatible (no native bindings, works on Vercel Node runtime)
- **`mammoth`** — `.docx` → text
- `.txt` / `.md` — native `File.text()`, no dep

Already present: `ai`, `@ai-sdk/openai`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`.

---

## 2. Environment variables

`.env.local` already has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Add:

```
OPENAI_API_KEY=sk-...
```

Used server-side only by `@ai-sdk/openai`.

---

## 3. Supabase schema

New SQL migration at `supabase/migrations/0001_rag.sql` (or run once in the Supabase SQL editor).

```sql
-- extension
create extension if not exists vector;

-- per-chunk storage
create table if not exists documents (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  source_id   uuid not null,        -- groups chunks from the same upload
  source_name text not null,        -- original filename, shown in citations
  content     text not null,
  metadata    jsonb default '{}'::jsonb,
  embedding   vector(1536),
  created_at  timestamptz default now()
);

create index if not exists documents_user_idx on documents(user_id);
create index if not exists documents_source_idx on documents(source_id);

-- HNSW is fastest for <10M rows, cosine distance for OpenAI embeddings
create index if not exists documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);

-- RLS: user only sees their own chunks
alter table documents enable row level security;

create policy "read own documents" on documents
  for select using (auth.uid() = user_id);

create policy "insert own documents" on documents
  for insert with check (auth.uid() = user_id);

create policy "delete own documents" on documents
  for delete using (auth.uid() = user_id);

-- similarity search RPC (security definer so it runs w/ user's JWT)
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter_user uuid default null
)
returns table (
  id bigint,
  source_name text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    source_name,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where (filter_user is null or user_id = filter_user)
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

Notes:
- `<=>` is cosine distance in pgvector. `1 - distance` = similarity in [0, 1].
- RPC filters by `filter_user` belt-and-suspenders with RLS; the route always passes `user.id`.

---

## 4. Chunking strategy

Simple recursive character chunker is good enough for MVP. Target:

- **Chunk size**: ~1000 characters (~250 tokens)
- **Overlap**: 150 characters — keeps sentence boundaries intact across chunks
- **Split preference**: `\n\n` → `\n` → `. ` → ` ` (fall through if no boundary found)

Put it in `lib/rag/chunk.ts`:

```ts
export function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    let slice = clean.slice(i, end);

    if (end < clean.length) {
      const boundary =
        slice.lastIndexOf("\n\n") ??
        slice.lastIndexOf("\n") ??
        slice.lastIndexOf(". ");
      if (boundary > size * 0.5) slice = slice.slice(0, boundary);
    }

    chunks.push(slice.trim());
    i += slice.length - overlap;
  }
  return chunks.filter((c) => c.length > 0);
}
```

---

## 5. File parsing

`lib/rag/parse.ts`:

```ts
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (name.endsWith(".docx")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
```

---

## 6. Ingest route — `app/api/ingest/route.ts`

```ts
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { extractFileText } from "@/lib/rag/parse";
import { chunkText } from "@/lib/rag/chunk";

export const runtime = "nodejs";       // unpdf + mammoth need Node
export const maxDuration = 60;          // embedding many chunks can take a bit

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) return new Response("No files", { status: 400 });

  const results = [];

  for (const file of files) {
    const text = await extractFileText(file);
    const chunks = chunkText(text);
    if (!chunks.length) continue;

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
    if (error) throw error;

    results.push({ source_id: sourceId, source_name: file.name, chunks: chunks.length });
  }

  return Response.json({ results });
}
```

Edge cases:
- Very large PDFs → consider batching `embedMany` in groups of ~100 chunks (OpenAI allows bigger but latency adds up).
- Empty files / OCR-needed scanned PDFs → `extractText` returns empty; skip them.

---

## 7. Chat route — `app/api/chat/route.ts`

Replace the current minimal route with:

```ts
import { streamText, tool, embed, convertToModelMessages, stepCountIs, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages, model = "gpt-4o-mini" }: { messages: UIMessage[]; model?: string } =
    await req.json();

  const result = streamText({
    model: openai(model),
    system:
      "You are a helpful assistant that answers questions about the user's uploaded documents. " +
      "When the user asks about content that might be in their docs, call the `searchDocs` tool " +
      "with a focused query. Cite the `source_name` of chunks you used. If the tool returns no " +
      "relevant results, say so instead of guessing.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      searchDocs: tool({
        description:
          "Search the user's uploaded documents for chunks relevant to a query. " +
          "Use concise natural-language queries; the embedding model handles paraphrasing.",
        inputSchema: z.object({
          query: z.string().describe("The search query"),
          k: z.number().int().min(1).max(10).default(5),
        }),
        execute: async ({ query, k }) => {
          const { embedding } = await embed({
            model: openai.textEmbeddingModel("text-embedding-3-small"),
            value: query,
          });
          const { data, error } = await supabase.rpc("match_documents", {
            query_embedding: embedding,
            match_count: k,
            filter_user: user.id,
          });
          if (error) return { error: error.message, results: [] };
          return { results: data ?? [] };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

Key points:
- `stopWhen: stepCountIs(5)` lets the model call the tool, read results, and answer in a single user turn.
- Query embedding is computed server-side — no user-provided embeddings are ever accepted.
- `filter_user: user.id` is redundant given RLS but makes intent explicit and is cheaper than RLS on cold paths.

---

## 8. UI — intercept attachments in `app/chats/[id]/page.tsx`

Current `handleSubmit` passes files directly to `sendMessage`. Change it so that **files go to `/api/ingest` first**, then only the text goes into the chat turn.

Patch in the existing `ChatPage`:

```ts
const [ingesting, setIngesting] = useState(false);

const handleSubmit = async (message: PromptInputMessage) => {
  if (!message.text && !message.files?.length) return;

  // 1. Ingest any attached files first
  if (message.files?.length) {
    setIngesting(true);
    try {
      const fd = new FormData();
      for (const f of message.files) fd.append("files", f as File);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
    } catch (e) {
      console.error(e);
      setIngesting(false);
      return;
    }
    setIngesting(false);
  }

  // 2. Send text only — model will retrieve via the searchDocs tool
  const text =
    message.text ||
    (message.files?.length
      ? `I uploaded ${message.files.map((f) => f.name).join(", ")}. Please summarize.`
      : "");

  if (text) sendMessage({ text });
  setInput("");
};
```

Pass `ingesting` into `ChatInput` to disable the submit button and show a spinner in the attachment area while uploading.

Also update `PromptInput` file-type filter so users can't drop unsupported types. In `prompt-input.tsx` usage, pass `accept=".pdf,.txt,.md,.docx"` to the attachment action (check the component's prop — might be on `PromptInputActionAddAttachments`).

---

## 9. Rendering tool calls in the chat

When the model calls `searchDocs`, the stream emits tool-call parts. The existing `ChatMessage` only renders `part.type === "text"`. Extend it:

```tsx
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";

// inside message.parts.map:
if (part.type === "tool-searchDocs") {
  return (
    <Tool key={`${message.id}-${i}`} defaultOpen={false}>
      <ToolHeader type="tool-searchDocs" state={part.state} />
      <ToolContent>
        <pre className="text-xs">{JSON.stringify(part.input ?? part.output, null, 2)}</pre>
      </ToolContent>
    </Tool>
  );
}
```

Exact API depends on your `components/ai-elements/tool.tsx` — verify prop names before wiring. The goal is a collapsible "Searched your docs" indicator so the user sees retrieval happened.

Optionally render `Sources` below the assistant message listing unique `source_name` values from the tool output.

---

## 10. File structure after changes

```
app/
  api/
    chat/route.ts        # updated: adds searchDocs tool
    ingest/route.ts      # new
  chats/[id]/page.tsx    # updated: intercept files → /api/ingest
lib/
  rag/
    chunk.ts             # new
    parse.ts             # new
supabase/
  migrations/
    0001_rag.sql         # new (or run in SQL editor)
```

---

## 11. Testing checklist

Manual run-through before declaring done:

- [ ] `pnpm dev`, sign in, open a chat.
- [ ] Drop a small `.txt` into the composer, hit send. Confirm in Supabase `documents` table that rows appear with `user_id = your uid` and non-null `embedding`.
- [ ] Ask a question whose answer is in the txt. Model should call `searchDocs`, answer from it, and mention `source_name`.
- [ ] Repeat with a PDF (≤10 pages) and a `.docx`.
- [ ] Ask something **not** in the docs — model should say it doesn't know, not hallucinate.
- [ ] Sign in as a second user, upload a doc, confirm first user's query cannot see second user's chunks (RLS check).
- [ ] Check network tab: `/api/ingest` runs before `/api/chat`, no files are sent to `/api/chat`.
- [ ] Try a 50-page PDF — does it finish in 60s? If not, raise `maxDuration` or batch embeddings.
- [ ] Try an unsupported file type (e.g. `.png`) — expect a 400 / user-facing error, not a crash.
- [ ] Try a scanned-image PDF — expect empty extraction, graceful handling (no zero-length chunks inserted).

---

## 12. Known gaps / future work (not blocking MVP)

- **No dedup** — uploading the same file twice stores it twice. Add a hash check on `source_id`/content hash later.
- **No delete UI** — users can't remove uploaded docs. Add a sidebar listing `source_id`s with a delete button (hits `supabase.from('documents').delete().eq('source_id', id)`).
- **No OCR** — scanned PDFs fail silently. Add `tesseract.js` or a server OCR step if needed.
- **No chunk-level reranking** — top-k by cosine is fine for small corpora; consider a reranker (Cohere Rerank, or an LLM judge) once corpus > ~10k chunks.
- **No streaming ingestion progress** — current UI just shows a spinner. Could stream per-chunk progress via SSE.
- **Chat history persistence** — unrelated to RAG but `useChat` messages aren't stored. Worth tackling in a separate task.
