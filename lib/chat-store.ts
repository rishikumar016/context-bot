import "server-only";

import type { UIMessage } from "ai";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

export type ChatSummary = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastAssistantPreview: string | null;
  sourceNames: string[];
};

export async function createChat(userId: string): Promise<string> {
  const [row] = await db
    .insert(chats)
    .values({ userId, messages: [] })
    .returning({ id: chats.id });
  return row.id;
}

export async function loadChat(
  chatId: string,
  userId: string,
): Promise<UIMessage[] | null> {
  const [row] = await db
    .select({ messages: chats.messages })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);
  return row ? row.messages : null;
}

export async function saveChat({
  chatId,
  userId,
  messages,
}: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
}): Promise<void> {
  const title = deriveTitle(messages);
  await db
    .update(chats)
    .set({
      messages,
      title,
      updatedAt: new Date(),
    })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
}

export async function listChats(userId: string): Promise<ChatSummary[]> {
  const rows = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    messageCount: row.messages.length,
    lastAssistantPreview: extractLastAssistantPreview(row.messages),
    sourceNames: extractSourceNames(row.messages),
  }));
}

export async function deleteChat(
  chatId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
}

function deriveTitle(messages: UIMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return null;
  const text = extractText(firstUser).trim();
  if (!text) return null;
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function extractLastAssistantPreview(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const text = extractText(m).trim();
    if (!text) continue;
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  }
  return null;
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

function extractSourceNames(messages: UIMessage[]): string[] {
  const names = new Set<string>();
  for (const m of messages) {
    for (const part of m.parts) {
      if (
        part.type === "tool-searchKnowledgeBase" &&
        part.state === "output-available"
      ) {
        const output = part.output;
        if (typeof output === "string") {
          for (const match of output.matchAll(/\(([^)]+\.[^)]+)\)/g)) {
            names.add(match[1]);
          }
        }
      }
    }
  }
  return [...names];
}
