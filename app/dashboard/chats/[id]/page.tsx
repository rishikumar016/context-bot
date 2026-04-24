import { notFound, redirect } from "next/navigation";

import { ChatView } from "@/components/chat-view";
import { loadChat } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const messages = await loadChat(id, user.id);
  if (messages === null) notFound();

  return <ChatView chatId={id} initialMessages={messages} />;
}
