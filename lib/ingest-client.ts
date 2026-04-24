import type { FileUIPart } from "ai";

export const SOURCES_CHANGED_EVENT = "sources:changed";

function emitSourcesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SOURCES_CHANGED_EVENT));
}

export type IngestResult = {
  results?: Array<{ source_id: string; source_name: string; chunks: number }>;
  skipped?: Array<{ name: string; reason: string }>;
  error?: string;
};

export async function ingestFiles(
  files: FileUIPart[],
  chatId?: string,
): Promise<IngestResult> {
  const fd = new FormData();
  for (const part of files) {
    if (!part.url) continue;
    const blob = await (await fetch(part.url)).blob();
    const filename = part.filename ?? "upload";
    fd.append("files", new File([blob], filename, { type: blob.type }));
  }
  return postIngest(fd, chatId);
}

export async function ingestRawFiles(
  files: File[],
  chatId?: string,
): Promise<IngestResult> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  return postIngest(fd, chatId);
}

async function postIngest(
  fd: FormData,
  chatId?: string,
): Promise<IngestResult> {
  const url = chatId
    ? `/api/ingest?chatId=${encodeURIComponent(chatId)}`
    : "/api/ingest";
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ingest failed: ${res.status} ${errText}`);
  }
  const json = (await res.json()) as IngestResult;
  emitSourcesChanged();
  return json;
}

export type SourceSummary = {
  sourceId: string;
  sourceName: string;
  chunks: number;
  createdAt: string | null;
};

export async function listSources(): Promise<SourceSummary[]> {
  const res = await fetch("/api/sources");
  if (!res.ok) throw new Error(`Failed to load sources: ${res.status}`);
  const data = (await res.json()) as { sources: SourceSummary[] };
  return data.sources;
}

export async function deleteSource(sourceId: string): Promise<void> {
  const res = await fetch(`/api/sources?sourceId=${encodeURIComponent(sourceId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  emitSourcesChanged();
}

export const CHAT_SOURCES_CHANGED_EVENT = "chat-sources:changed";

function emitChatSourcesChanged(chatId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CHAT_SOURCES_CHANGED_EVENT, { detail: { chatId } }),
  );
}

export async function listChatSources(
  chatId: string,
): Promise<SourceSummary[]> {
  const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/sources`);
  if (!res.ok) throw new Error(`Failed to load chat sources: ${res.status}`);
  const data = (await res.json()) as { sources: SourceSummary[] };
  return data.sources;
}

export async function attachSourceToChat(
  chatId: string,
  sourceId: string,
): Promise<void> {
  const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId }),
  });
  if (!res.ok) throw new Error(`Attach failed: ${res.status}`);
  emitChatSourcesChanged(chatId);
}

export async function detachSourceFromChat(
  chatId: string,
  sourceId: string,
): Promise<void> {
  const res = await fetch(
    `/api/chats/${encodeURIComponent(chatId)}/sources?sourceId=${encodeURIComponent(sourceId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`Detach failed: ${res.status}`);
  emitChatSourcesChanged(chatId);
}
