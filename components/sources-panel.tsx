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
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

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

  const handleFileChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isUploading) return;
      
      setIsUploading(true);
      setError(null);
      try {
        await ingestRawFiles(files);
        await load();
        toast.success(`Successfully ingested ${files.length} file(s)`);
      } catch (e) {
        setError((e as Error).message);
        toast.error("Failed to ingest files: " + (e as Error).message);
      } finally {
        setIsUploading(false);
        setUploadKey((k) => k + 1);
      }
    },
    [load, isUploading],
  );

  const handleFileReject = useCallback((file: File, message: string) => {
    toast.error(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);

  const handleDelete = async (sourceId: string) => {
    const prev = sources;
    setSources((curr) => curr.filter((s) => s.sourceId !== sourceId));
    try {
      await deleteSource(sourceId);
      toast.success("Source deleted");
    } catch (e) {
      setSources(prev);
      setError((e as Error).message);
      toast.error("Failed to delete source");
    }
  };

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
        <FileUpload
          key={uploadKey}
          maxFiles={10}
          maxSize={50 * 1024 * 1024}
          accept="application/pdf,.txt,.md,.docx,text/plain,text/markdown"
          onAccept={handleFileChange}
          onFileReject={handleFileReject}
          multiple
          disabled={isUploading}
        >
          <FileUploadDropzone>
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="flex items-center justify-center rounded-full border p-2.5">
                <Upload className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drag & drop files here</p>
              <p className="text-xs text-muted-foreground">
                {isUploading
                  ? "Ingesting files..."
                  : "Or click to browse (PDF, DOCX, TXT, MD up to 50MB)"}
              </p>
            </div>
            <FileUploadTrigger asChild disabled={isUploading}>
              <Button variant="outline" size="sm" className="mt-2 w-fit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Browse files"}
              </Button>
            </FileUploadTrigger>
          </FileUploadDropzone>
        </FileUpload>
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
