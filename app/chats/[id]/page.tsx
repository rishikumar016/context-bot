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
import { cn } from "@/lib/utils";
import { ingestFiles } from "@/lib/ingest-client";
import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { Loader } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const BackgroundBlobs = () => (
  <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
    <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-violet-500/10 mix-blend-normal blur-[128px]" />
    <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-500/10 mix-blend-normal blur-[128px]" />
    <div className="absolute top-1/4 right-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 mix-blend-normal blur-[96px]" />
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

        if (part.type === "tool-searchDocs") {
          return (
            <Tool defaultOpen={false} key={key}>
              <ToolHeader
                state={part.state}
                title="Searching your documents"
                type="tool-searchDocs"
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
  const [ingesting, setIngesting] = useState(false);
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
    if (!message.text && !message.files?.length) return;

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

    if (text) sendMessage({ text });
    setInput("");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto flex h-screen max-w-4xl flex-col p-6">
        <MessagesList messages={messages} status={status} />

        <ChatComposer
          busy={ingesting}
          busyLabel="Ingesting documents…"
          className="mt-4"
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          status={status}
        />
      </div>
    </div>
  );
}
