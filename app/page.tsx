"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { AnimatedAIChatWelcome } from "@/components/ui/animated-ai-chat-welcome";
import { ingestFiles } from "@/lib/ingest-client";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [ingesting, setIngesting] = useState(false);

  const handleSend = async (message: PromptInputMessage) => {
    if (message.files?.length) {
      setIngesting(true);
      try {
        await ingestFiles(message.files);
      } catch (e) {
        console.error(e);
        setIngesting(false);
        return;
      }
      setIngesting(false);
    }

    const text =
      message.text ||
      (message.files?.length
        ? `I uploaded ${message.files
            .map((f) => f.filename)
            .filter(Boolean)
            .join(", ")}. Please summarize.`
        : "");

    if (!text) return;

    const chatId = nanoid();
    sessionStorage.setItem(`chat-initial-${chatId}`, text);
    router.push(`/chats/${chatId}`);
  };

  return (
    <AnimatedAIChatWelcome
      busy={ingesting}
      busyLabel="Ingesting documents…"
      onSend={handleSend}
    />
  );
}
