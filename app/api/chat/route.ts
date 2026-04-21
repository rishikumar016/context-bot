import {streamText, UIMessage, convertToModelMessages} from "ai";
import{openai} from "@ai-sdk/openai";

export async function POST(req: Request) {
  try{const {messages}: {messages: UIMessage[]} = await req.json();
   const result = streamText({
    model: openai("gpt-5-mini"),
    messages: await convertToModelMessages(messages)
});

return result.toUIMessageStreamResponse();

 } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}


