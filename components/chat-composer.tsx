"use client";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatStatus, FileUIPart } from "ai";
import { FileText, Loader2, X } from "lucide-react";

// MIME types — PromptInput does exact `file.type` matching, so extensions
// like ".pdf" will be silently rejected. Markdown has no universal MIME type,
// so we include both common variants plus text/plain as a fallback.
const DEFAULT_ACCEPT = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
].join(",");

type ComposerError = {
  code: "max_files" | "max_file_size" | "accept";
  message: string;
};

const getTypeLabel = (file: FileUIPart): string => {
  const mt = file.mediaType ?? "";
  if (mt === "application/pdf") return "PDF";
  if (mt.startsWith("image/")) return mt.split("/")[1].toUpperCase();
  if (mt === "text/markdown") return "MD";
  if (mt === "text/plain") return "TXT";
  if (mt.includes("word") || mt.includes("officedocument")) return "DOCX";
  const ext = file.filename?.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
};

const AttachmentCards = ({ className }: { className?: string }) => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 px-3 pt-3 pb-1",
        className
      )}
    >
      {attachments.files.map((file) => {
        const isImage = file.mediaType?.startsWith("image/");
        const label = getTypeLabel(file);
        const name = file.filename || "Attachment";

        return (
          <Tooltip key={file.id}>
            <TooltipTrigger asChild>
              <div className="group relative flex items-center gap-3 rounded-2xl border border-border bg-muted/50 py-2 pr-9 pl-2 max-w-70">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-red-500 text-white">
                  {isImage && file.url ? (
                    <img
                      alt={name}
                      className="size-full object-cover"
                      src={file.url}
                    />
                  ) : (
                    <FileText className="size-5" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {label}
                  </span>
                </div>
                <button
                  aria-label={`Remove ${name}`}
                  className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
                  onClick={() => attachments.remove(file.id)}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">{name}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export type ChatComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  onError?: (err: ComposerError) => void;
  status?: ChatStatus;
  busy?: boolean;
  busyLabel?: string;
  placeholder?: string;
  accept?: string;
  maxFiles?: number;
  maxFileSize?: number;
  multiple?: boolean;
  autoFocus?: boolean;
  className?: string;
};

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onError,
  status,
  busy = false,
  busyLabel = "Working…",
  placeholder = "Ask anything",
  accept = DEFAULT_ACCEPT,
  maxFiles,
  maxFileSize,
  multiple = true,
  autoFocus,
  className,
}: ChatComposerProps) {
  const handleError = (err: ComposerError) => {
    if (onError) {
      onError(err);
      return;
    }
    console.warn(`[ChatComposer] ${err.code}: ${err.message}`);
  };

  return (
    <PromptInput
      accept={accept}
      className={cn(
        "backdrop-blur-2xl bg-card rounded-3xl border border-border shadow-2xl",
        className
      )}
      globalDrop
      maxFiles={maxFiles}
      maxFileSize={maxFileSize}
      multiple={multiple}
      onError={handleError}
      onSubmit={onSubmit}
    >
      {busy && (
        <PromptInputHeader>
          <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
            <Loader2 className="size-3 animate-spin" />
            {busyLabel}
          </div>
        </PromptInputHeader>
      )}

      <PromptInputBody>
        <AttachmentCards />
        <PromptInputTextarea
          autoFocus={autoFocus}
          className="border-none bg-transparent focus:outline-none focus-visible:ring-0"
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          value={input}
        />
      </PromptInputBody>

      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments label="Upload photos & files" />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>

        <PromptInputSubmit
          disabled={(!input && !status) || busy}
          status={status}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
