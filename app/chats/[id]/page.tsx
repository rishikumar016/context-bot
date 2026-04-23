"use client";

import { ChatView } from "@/components/chat-view";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    const key = `chat-initial-${chatId}`;
    const stashed = sessionStorage.getItem(key);
    if (stashed) {
      sessionStorage.removeItem(key);
      setInitialPrompt(stashed);
    }
  }, [chatId]);

  return <ChatView chatId={chatId} initialPrompt={initialPrompt} />;
}
