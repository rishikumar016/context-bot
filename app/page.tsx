"use client";

import { AnimatedAIChatWelcome } from "@/components/ui/animated-ai-chat-welcome";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function Home() {
  const router = useRouter();

  const handleSend = (message: string) => {
    const chatId = nanoid();
    sessionStorage.setItem(`chat-initial-${chatId}`, message);
    router.push(`/chats/${chatId}`);
  };

  return <AnimatedAIChatWelcome onSend={handleSend} />;
}
