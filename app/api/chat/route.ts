import {
  streamText,
  tool,
  embed,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    }: { messages: UIMessage[]; model?: string } = await req.json();

    const result = streamText({
      model: openai(model),
      system:
        "You are a helpful assistant that answers questions about the user's uploaded documents. " +
        "When the user asks about content that might be in their docs, call the `searchDocs` tool " +
        "with a focused natural-language query. Cite the `source_name` of chunks you used in your answer. " +
        "If the tool returns no relevant results, say so plainly instead of guessing.",
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        searchDocs: tool({
          description:
            "Search the user's uploaded documents for chunks relevant to a query. " +
            "Use concise natural-language queries; the embedding model handles paraphrasing.",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
            k: z
              .number()
              .int()
              .min(1)
              .max(10)
              .default(5)
              .describe("How many chunks to return"),
          }),
          execute: async ({ query, k }) => {
            const { embedding } = await embed({
              model: openai.textEmbeddingModel("text-embedding-3-small"),
              value: query,
            });
            const { data, error } = await supabase.rpc("match_documents", {
              query_embedding: embedding,
              match_count: k,
              filter_user: user.id,
            });
            if (error) return { error: error.message, results: [] };
            return { results: data ?? [] };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
