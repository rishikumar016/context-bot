import { FileText, Trash2 } from "lucide-react";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import type { SourceSummary } from "@/lib/ingest-client";

interface SourceItemProps {
  source: SourceSummary;
  chatId: string | null;
  attached: boolean;
  onToggleAttach: (sourceId: string, nextChecked: boolean) => void;
  onDelete: (sourceId: string) => void;
}

function getTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "FILE";
  return ext.toUpperCase();
}

export function SourceItem({
  source,
  chatId,
  attached,
  onToggleAttach,
  onDelete,
}: SourceItemProps) {
  const label = getTypeLabel(source.sourceName);

  return (
    <SidebarMenuItem>
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
          chatId ? () => onToggleAttach(source.sourceId, !attached) : undefined
        }
      >
        {chatId ? (
          <Checkbox
            checked={attached}
            onCheckedChange={(checked) =>
              onToggleAttach(source.sourceId, checked as boolean)
            }
            onClick={(e) => e.stopPropagation()}
            aria-label={`Attach ${source.sourceName} to this chat`}
            className="size-4 shrink-0"
          />
        ) : (
          <FileText className="size-5" />
        )}
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-medium text-sm">{source.sourceName}</span>
          <span className="text-muted-foreground text-xs">
            {label} · {source.chunks} chunks
          </span>
        </div>
      </SidebarMenuButton>
      <SidebarMenuAction
        aria-label={`Delete ${source.sourceName}`}
        onClick={() => onDelete(source.sourceId)}
        showOnHover
        className="hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}
