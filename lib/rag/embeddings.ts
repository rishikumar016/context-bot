import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.textEmbeddingModel("text-embedding-3-small");

export async function generateEmbedding(text: string) {
  const input = text.replace(/\n/g, " ");

  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
}

export async function generateEmbeddings(texts: string[]) {
  const inputs = texts.map((t) => t.replace(/\n/g, " "));

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: inputs,
  });
  return embeddings;
}
