import { openai } from "@ai-sdk/openai";
import {
  InferUITools,
  UIDataTypes,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  validateUIMessages,
} from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { chatSources } from "@/lib/db/schema";
import { loadChat, saveChat } from "@/lib/chat-store";
import { searchDocuments } from "@/lib/rag/search";
import { createClient } from "@/lib/supabase/server";

function buildSearchTool(userId: string, sourceIds: string[]) {
  return {
    searchKnowledgeBase: tool({
      description:
        "Search the knowledge base for relevant information. " +
        "Use concise natural-language queries; the embedding model handles paraphrasing.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "The search query to find relevant information in the documents.",
          ),
      }),
      execute: async ({ query }) => {
        try {
          if (sourceIds.length === 0) {
            return {
              results: [],
              message:
                "No sources are attached to this chat. Ask the user to attach sources from the sidebar.",
            };
          }

          const results = await searchDocuments(query, userId, sourceIds);

          if (results.length === 0) {
            return {
              results: [],
              message: "No relevant information found in the knowledge base.",
            };
          }
          return results
            .map((r, i) => `[${i + 1}] (${r.sourceName}) ${r.content}`)
            .join("\n\n");
        } catch (error) {
          console.error("Error executing searchKnowledgeBase tool:", error);
          return { error: "Failed to search knowledge base", results: [] };
        }
      },
    }),
  };
}

export type ChatTools = InferUITools<ReturnType<typeof buildSearchTool>>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions about the user's uploaded documents.

When the user asks about content that might be in their docs, call the \`searchKnowledgeBase\` tool with a focused natural-language query.
- Rewrite short or ambiguous user questions into a fuller query before searching (e.g. "Future of A" → "future of AI").
- If the first search returns no results, try ONE more search with a reworded / broader query before giving up.
- When answering, cite the source filename from the tool output (e.g. "(resume.pdf)").
- If both searches return nothing, say so plainly instead of guessing.`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const {
      id,
      message,
      model = "gpt-4o-mini",
    }: { id: string; message: ChatMessage; model?: string } = await req.json();

    if (!id || !message) {
      return new Response("Missing id or message", { status: 400 });
    }

    const previous = await loadChat(id, user.id);
    if (previous === null) {
      return new Response("Chat not found", { status: 404 });
    }

    const attached = await db
      .select({ sourceId: chatSources.sourceId })
      .from(chatSources)
      .where(eq(chatSources.chatId, id));
    const sourceIds = attached.map((r) => r.sourceId);

    const tools = buildSearchTool(user.id, sourceIds);

    const validated = await validateUIMessages<ChatMessage>({
      messages: [...previous, message],
      tools,
    });

    const result = streamText({
      model: openai(model),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(validated),
      tools,
      stopWhen: stepCountIs(4),
    });

    // Keep consuming the stream even if the client disconnects, so onFinish
    // still runs and we persist the assistant turn.
    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: validated,
      onFinish: ({ messages }) => {
        saveChat({ chatId: id, userId: user.id, messages }).catch((err) => {
          console.error("saveChat failed:", err);
        });
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
