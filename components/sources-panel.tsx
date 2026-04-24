"use client";

import {
  CHAT_SOURCES_CHANGED_EVENT,
  SOURCES_CHANGED_EVENT,
  type SourceSummary,
  attachSourceToChat,
  deleteSource,
  detachSourceFromChat,
  ingestRawFiles,
  listChatSources,
  listSources,
} from "@/lib/ingest-client";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "sonner";


function getTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "FILE";
  return ext.toUpperCase();
}

function useChatIdFromPath(): string | null {
  const pathname = usePathname();
  return useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/dashboard\/chats\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);
}

export function SourcesPanel() {
  const chatId = useChatIdFromPath();
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [attachedIds, setAttachedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [all, attached] = await Promise.all([
        listSources(),
        chatId ? listChatSources(chatId) : Promise.resolve([]),
      ]);
      setSources(all);
      setAttachedIds(new Set(attached.map((s) => s.sourceId)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    load();
    const onChanged = () => {
      load();
    };
    window.addEventListener(SOURCES_CHANGED_EVENT, onChanged);
    window.addEventListener(CHAT_SOURCES_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(SOURCES_CHANGED_EVENT, onChanged);
      window.removeEventListener(CHAT_SOURCES_CHANGED_EVENT, onChanged);
    };
  }, [load]);

  const handleFileChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isUploading) return;

      setIsUploading(true);
      setError(null);
      try {
        // When on a chat page, auto-attach uploaded sources to this chat.
        await ingestRawFiles(files, chatId ?? undefined);
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
    [load, isUploading, chatId],
  );

  const handleToggleAttach = useCallback(
    async (sourceId: string, nextChecked: boolean) => {
      if (!chatId) return;
      // Optimistic
      setAttachedIds((curr) => {
        const next = new Set(curr);
        if (nextChecked) next.add(sourceId);
        else next.delete(sourceId);
        return next;
      });
      try {
        if (nextChecked) {
          await attachSourceToChat(chatId, sourceId);
        } else {
          await detachSourceFromChat(chatId, sourceId);
        }
      } catch (e) {
        // Roll back
        setAttachedIds((curr) => {
          const next = new Set(curr);
          if (nextChecked) next.delete(sourceId);
          else next.add(sourceId);
          return next;
        });
        toast.error(
          (nextChecked ? "Attach" : "Detach") +
            " failed: " +
            (e as Error).message,
        );
      }
    },
    [chatId],
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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
        <div className="flex items-baseline gap-2 px-2 py-1">
          <h2 className="font-medium text-sm">Sources</h2>
          <span className="text-muted-foreground text-xs">
            {sources.length}
          </span>
        </div>
        </SidebarMenu>
     </SidebarHeader>

      <SidebarContent >
        <SidebarGroup>
          <SidebarGroupContent className="">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-fit"
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Browse files"}
                  </Button>
                </FileUploadTrigger>
              </FileUploadDropzone>
            </FileUpload>
            {error && (
              <p className="mt-2 px-1 text-[11px] text-destructive">{error}</p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                <Loader2 className="mr-2 size-3 animate-spin" /> Loading…
              </div>
            ) : sources.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-xs">
                No sources yet. Drop a file above to get started.
              </p>
            ) : (
              <SidebarMenu className="">
                {sources.map((source) => {
                  const label = getTypeLabel(source.sourceName);
                  const attached = attachedIds.has(source.sourceId);
                  return (
                    <SidebarMenuItem key={source.sourceId}>
                      <SidebarMenuButton
                        size="lg"
                        tooltip={
                          chatId
                            ? attached
                              ? "Attached to this chat"
                              : "Not attached to this chat"
                            : source.sourceName
                        }
                        onClick={
                          chatId
                            ? () =>
                                handleToggleAttach(source.sourceId, !attached)
                            : undefined
                        }
                      >
                        {chatId ? (
                          <input
                            type="checkbox"
                            checked={attached}
                            onChange={(e) =>
                              handleToggleAttach(
                                source.sourceId,
                                e.target.checked,
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Attach ${source.sourceName} to this chat`}
                            className="size-4 shrink-0 accent-primary"
                          />
                        ) : (
                          <FileText className="size-5" />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col leading-tight">
                          <span className="truncate font-medium text-sm">
                            {source.sourceName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {label} · {source.chunks} chunks
                          </span>
                        </div>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        aria-label={`Delete ${source.sourceName}`}
                        onClick={() => handleDelete(source.sourceId)}
                        showOnHover
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
