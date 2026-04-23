"use client";

import {
  type SourceSummary,
  deleteSource,
  ingestRawFiles,
  listSources,
} from "@/lib/ingest-client";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
} as const;

function getTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "FILE";
  return ext.toUpperCase();
}

type SourcesPanelProps = {
  className?: string;
  onClose?: () => void;
};

export function SourcesPanel({ className, onClose }: SourcesPanelProps) {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listSources();
      setSources(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = useCallback(
    async (files: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        setError(
          `Unsupported: ${rejections.map((r) => r.file.name).join(", ")}`,
        );
      }
      if (files.length === 0) return;
      setUploading(true);
      setError(null);
      try {
        await ingestRawFiles(files);
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [load],
  );

  const handleDelete = async (sourceId: string) => {
    const prev = sources;
    setSources((curr) => curr.filter((s) => s.sourceId !== sourceId));
    try {
      await deleteSource(sourceId);
    } catch (e) {
      setSources(prev);
      setError((e as Error).message);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      onDrop: handleUpload,
      accept: ACCEPT,
      multiple: true,
      noClick: true,
      disabled: uploading,
    });

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-border/50 border-b px-5 py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-medium text-sm">Sources</h2>
          <span className="text-muted-foreground text-xs">
            {sources.length}
          </span>
        </div>
        {onClose && (
          <button
            aria-label="Close sources panel"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            onClick={onClose}
            type="button"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        <div
          {...getRootProps({
            className: cn(
              "relative rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
              isDragReject
                ? "border-destructive/60 bg-destructive/5"
                : isDragActive
                  ? "border-violet-400/60 bg-violet-500/5"
                  : "border-border/60",
              uploading && "opacity-60",
            ),
          })}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin" />
              Ingesting…
            </div>
          ) : (
            <>
              <Upload className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">
                {isDragReject
                  ? "Unsupported file type"
                  : isDragActive
                    ? "Drop to upload"
                    : "Drag files here or "}
                {!isDragActive && (
                  <button
                    className="font-medium text-foreground hover:underline"
                    onClick={open}
                    type="button"
                  >
                    browse
                  </button>
                )}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                PDF · DOCX · TXT · MD
              </p>
            </>
          )}
        </div>
        {error && (
          <p className="mt-2 px-1 text-[11px] text-destructive">{error}</p>
        )}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="mr-2 size-3 animate-spin" /> Loading…
          </div>
        ) : sources.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-xs">
            No sources yet. Drop a file above to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {sources.map((source) => (
              <SourceCard
                key={source.sourceId}
                onDelete={() => handleDelete(source.sourceId)}
                source={source}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  source,
  onDelete,
}: {
  source: SourceSummary;
  onDelete: () => void;
}) {
  const label = getTypeLabel(source.sourceName);

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-xl transition-colors hover:border-border">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
        <FileText className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-medium text-sm">
          {source.sourceName}
        </span>
        <span className="text-muted-foreground text-xs">
          {label} · {source.chunks} chunks
        </span>
      </div>
      <button
        aria-label={`Delete ${source.sourceName}`}
        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
        onClick={onDelete}
        type="button"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
