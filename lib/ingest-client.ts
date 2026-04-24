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

export async function ingestFiles(files: FileUIPart[]): Promise<IngestResult> {
  const fd = new FormData();
  for (const part of files) {
    if (!part.url) continue;
    const blob = await (await fetch(part.url)).blob();
    const filename = part.filename ?? "upload";
    fd.append("files", new File([blob], filename, { type: blob.type }));
  }
  return postIngest(fd);
}

export async function ingestRawFiles(files: File[]): Promise<IngestResult> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  return postIngest(fd);
}

async function postIngest(fd: FormData): Promise<IngestResult> {
  const res = await fetch("/api/ingest", { method: "POST", body: fd });
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
