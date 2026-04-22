"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
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
import { Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, ChatStatus } from "ai";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Background Blobs ────────────────────────────────────────────────────────

const BackgroundBlobs = () => (
  <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px]" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px]" />
    <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px]" />
  </div>
);

// ─── Attachments Display ─────────────────────────────────────────────────────

const AttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) return null;

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

// ─── Chat Message ────────────────────────────────────────────────────────────

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
        if (part.type === "text") {
          return (
            <MessageResponse key={`${message.id}-${i}`}>
              {part.text}
            </MessageResponse>
          );
        }
        return null;
      })}
      {isLoading && (
        <div className="flex items-center p-2">
          <Loader className="animate-spin size-4" />
        </div>
      )}
    </MessageContent>
  </Message>
);

// ─── Messages List ───────────────────────────────────────────────────────────

const MessagesList = ({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: ChatStatus;
}) => {
  const isLoading = status === "submitted" || status === "streaming";

  return (
    <Conversation className="">
      <ConversationContent>
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLoading={
              isLoading &&
              index === messages.length - 1 &&
              message.role === "assistant"
            }
          />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};

// ─── Chat Input ──────────────────────────────────────────────────────────────

const ChatInput = ({
  input,
  setInput,
  status,
  onSubmit,
}: {
  input: string;
  setInput: (v: string) => void;
  status: ChatStatus;
  onSubmit: (message: PromptInputMessage) => void;
}) => (
  <PromptInput
    onSubmit={onSubmit}
    className="mt-4 backdrop-blur-2xl bg-card rounded-2xl border border-border shadow-2xl"
    globalDrop
    multiple
  >
    <PromptInputHeader>
      <AttachmentsDisplay />
    </PromptInputHeader>

    <PromptInputBody>
      <PromptInputTextarea
        onChange={(e) => setInput(e.target.value)}
        value={input}
        className="bg-transparent border-none focus:outline-none focus-visible:ring-0"
      />
    </PromptInputBody>

    <PromptInputFooter className="border-t border-border">
      <PromptInputTools>
        <PromptInputActionMenu>
          <PromptInputActionMenuTrigger />
          <PromptInputActionMenuContent>
            <PromptInputActionAddAttachments />
            <PromptInputActionAddScreenshot />
          </PromptInputActionMenuContent>
        </PromptInputActionMenu>
      </PromptInputTools>

      <PromptInputSubmit disabled={!input && !status} status={status} />
    </PromptInputFooter>
  </PromptInput>
);

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();

  const [input, setInput] = useState("");
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

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text && !message.files?.length) return;

    sendMessage({ text: message.text, files: message.files });
    setInput("");
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto flex h-screen max-w-4xl flex-col p-6">
        <MessagesList messages={messages} status={status} />

        <ChatInput
          input={input}
          setInput={setInput}
          status={status}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
