
import "dotenv/config";
import OpenAI from "openai";

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (client) {
    return client;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Falta OPENROUTER_API_KEY");
  }

  client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  return client;
}

export async function createEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const response = await getClient().embeddings.create({
    model: "openai/text-embedding-3-small",
    input: texts,
  });

  const results = [...response.data].sort(
    (a, b) => a.index - b.index,
  );

  if (results.length !== texts.length) {
    throw new Error("La cantidad de embeddings no coincide");
  }

  return results.map((result) => result.embedding);
}
