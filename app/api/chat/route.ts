import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  try {
    const { messages, model = "gpt-4o-mini" }: { messages: UIMessage[]; model?: string } =
      await req.json();

    const result = streamText({
      model: openai(model),
      messages: await convertToModelMessages(messages),
    });

return result.toUIMessageStreamResponse();

 } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}


