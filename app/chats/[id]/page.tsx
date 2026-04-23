"use client";

import { ChatComposer } from "@/components/chat-composer";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { SourcesPanel } from "@/components/sources-panel";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { FileText, Loader, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const BackgroundBlobs = () => (
  <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
    <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-violet-500/5 mix-blend-normal blur-[128px]" />
    <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-500/5 mix-blend-normal blur-[128px]" />
    <div className="absolute top-1/4 right-1/3 h-64 w-64 rounded-full bg-fuchsia-500/5 mix-blend-normal blur-[96px]" />
  </div>
);

const ChatMessage = ({
  message,
  isLoading,
}: {
  message: UIMessage;
  isLoading: boolean;
}) => (
  <Message from={message.role} key={message.id}>
    <MessageContent
      className={cn(
        message.role === "user" &&
          "group-[.is-user]:backdrop-blur-xl group-[.is-user]:border group-[.is-user]:border-border"
      )}
    >
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;

        if (part.type === "text") {
          return <MessageResponse key={key}>{part.text}</MessageResponse>;
        }

        if (part.type === "tool-searchKnowledgeBase") {
          return (
            <Tool defaultOpen={false} key={key}>
              <ToolHeader
                state={part.state}
                title="Searching your documents"
                type="tool-searchKnowledgeBase"
              />
              <ToolContent>
                {part.input ? <ToolInput input={part.input} /> : null}
                <ToolOutput
                  errorText={
                    part.state === "output-error" ? part.errorText : undefined
                  }
                  output={
                    part.state === "output-available" ? part.output : undefined
                  }
                />
              </ToolContent>
            </Tool>
          );
        }

        return null;
      })}
      {isLoading && (
        <div className="flex items-center p-2">
          <Loader className="size-4 animate-spin" />
        </div>
      )}
    </MessageContent>
  </Message>
);

const MessagesList = ({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: ChatStatus;
}) => {
  const isLoading = status === "submitted" || status === "streaming";

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message, index) => (
          <ChatMessage
            isLoading={
              isLoading &&
              index === messages.length - 1 &&
              message.role === "assistant"
            }
            key={message.id}
            message={message}
          />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();

  const [input, setInput] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { messages, status, sendMessage } = useChat({ id: chatId });
  const sentInitialRef = useRef(false);

  useEffect(() => {
    if (sentInitialRef.current) return;
    sentInitialRef.current = true;

    const key = `chat-initial-${chatId}`;
    const stashed = sessionStorage.getItem(key);
    if (stashed) {
      sessionStorage.removeItem(key);
      sendMessage({ text: stashed });
    }
  }, [chatId, sendMessage]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <BackgroundBlobs />

      <div className="relative z-10 flex h-screen">
        <aside
          className={cn(
            "hidden border-border/50 border-r bg-card/30 backdrop-blur-xl transition-all duration-200 md:flex md:flex-col",
            desktopCollapsed ? "md:w-0 md:overflow-hidden" : "md:w-80"
          )}
        >
          <SourcesPanel />
        </aside>

        {sourcesOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <aside className="flex w-80 max-w-[85vw] flex-col border-border/50 border-r bg-card backdrop-blur-xl">
              <SourcesPanel onClose={() => setSourcesOpen(false)} />
            </aside>
            <button
              aria-label="Close sources panel"
              className="flex-1 bg-black/50"
              onClick={() => setSourcesOpen(false)}
              type="button"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-border/50 border-b px-4 py-3 md:px-6">
            <button
              aria-label="Toggle sources panel"
              className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
              onClick={() => setDesktopCollapsed((v) => !v)}
              type="button"
            >
              {desktopCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
            <button
              aria-label="Open sources"
              className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground md:hidden"
              onClick={() => setSourcesOpen(true)}
              type="button"
            >
              <FileText className="size-3.5" />
              Sources
            </button>
            <h1 className="ml-auto truncate font-medium text-muted-foreground text-xs">
              Chat
            </h1>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-6 md:px-6">
            <MessagesList messages={messages} status={status} />

            <ChatComposer
              allowAttachments={false}
              className="mt-4"
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              placeholder="Ask about your documents…"
              status={status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
