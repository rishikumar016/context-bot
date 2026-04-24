"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Size = "default" | "sm" | "lg" | "icon" | "icon-sm";

export function NewChatButton({
  size = "default",
  variant = "default",
}: {
  size?: Size;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const onClick = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const { id } = (await res.json()) as { id: string };
      router.push(`/dashboard/chats/${id}`);
    } catch (e) {
      toast.error("Couldn't start a new chat: " + (e as Error).message);
      setCreating(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={creating} size={size} variant={variant}>
      {creating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Plus className="size-4" />
      )}
      New chat
    </Button>
  );
}
