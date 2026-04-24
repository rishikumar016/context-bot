"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DeleteChatButton({ chatId }: { chatId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Chat deleted");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't delete chat: " + (err as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Button
      aria-label="Delete chat"
      onClick={onClick}
      disabled={deleting}
      size="icon-sm"
      variant="ghost"
      className="absolute top-3 right-3 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
    >
      {deleting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </Button>
  );
}
