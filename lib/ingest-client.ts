import type { FileUIPart } from "ai";

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

  const res = await fetch("/api/ingest", { method: "POST", body: fd });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ingest failed: ${res.status} ${errText}`);
  }
  return res.json();
}
