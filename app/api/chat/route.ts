import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  InferUITools,
  UIDataTypes,
  UIMessage
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { searchDocuments } from "@/lib/rag/search";




function buildSearchTool(userId: string) {
  return {
    searchKnowledgeBase: tool({
      description:
        "Search the knowledge base for relevant information. " +
        "Use concise natural-language queries; the embedding model handles paraphrasing.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("The search query to find relevant information in the documents."),
      }),
      execute: async ({ query }) => {
        try {
          const results = await searchDocuments(query, userId);

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
export type ChatMessages = UIMessage<never, UIDataTypes, ChatTools>;



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
      messages,
      model = "gpt-4o-mini",
    }: { messages: ChatMessages[]; model?: string } = await req.json();

    const result = streamText({
      model: openai(model),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: buildSearchTool(user.id),
      stopWhen: stepCountIs(4),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
