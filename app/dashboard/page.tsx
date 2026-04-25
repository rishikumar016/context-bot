import { FileText, MessageSquareText, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteChatButton } from "@/components/delete-chat-button";
import { Header } from "@/components/header";
import { NewChatButton } from "@/components/new-chat-button";
import { Button } from "@/components/ui/button";
import { listChats } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/relative-time";
import { Card } from "@/components/ui/card";
import { DashboardRefresh } from "@/components/dashboard-refresh";


export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const chats = await listChats(user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardRefresh />
      <Header fixed href="/" />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">Your chats</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Every conversation you&rsquo;ve had with your documents.
            </p>
          </div>
          <NewChatButton />
        </div>

      {chats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card/30 py-20 text-center">
          <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background">
            <MessageSquareText className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-medium text-sm">No chats yet</h2>
          <p className="mt-1 max-w-sm text-muted-foreground text-xs">
            Start your first conversation — upload a source if you haven&rsquo;t,
            then ask a question.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/upload">
                <Upload className="size-3.5" />
                Upload a source
              </Link>
            </Button>
            <NewChatButton size="sm" />
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4 lg:gap-6">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Card className="group relative overflow-hidden border border-border bg-card/40 transition hover:border-border/80 hover:bg-card/70 ">
                <div className="absolute right-2 top-2 z-10 sm:right-4 sm:top-4 opacity-100 sm:opacity-0 focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
                  <DeleteChatButton chatId={chat.id} />
                </div>
                <Link
                  href={`/dashboard/chats/${chat.id}`}
                  className="flex flex-col gap-2 p-4"
                >
                  <div className="flex items-start justify-between gap-3 pr-8 sm:items-center">
                    <h3 className="min-w-0 flex-1 truncate font-medium text-[15px] sm:text-sm">
                      {chat.title ?? "Untitled chat"}
                    </h3>
                    <time className="shrink-0 text-muted-foreground text-xs hidden sm:block">
                      {formatRelativeTime(chat.updatedAt)}
                    </time>
                  </div>

                  {chat.lastAssistantPreview && (
                    <p className="line-clamp-2 text-muted-foreground text-[13px] sm:text-xs leading-relaxed">
                      {chat.lastAssistantPreview}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                      <MessageSquareText className="size-3" />
                      {chat.messageCount}{" "}
                      {chat.messageCount === 1 ? "message" : "messages"}
                    </span>
                    {chat.sourceNames.slice(0, 3).map((name) => (
                      <span
                        key={name}
                        className="inline-flex max-w-32.5 sm:max-w-45 items-center gap-1 truncate rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <FileText className="size-3 shrink-0" />
                        <span className="truncate">{name}</span>
                      </span>
                    ))}
                    {chat.sourceNames.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{chat.sourceNames.length - 3} more
                      </span>
                    )}  
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
