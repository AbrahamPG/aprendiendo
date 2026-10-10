
import "dotenv/config";
import OpenAI from "openai";
import { cosineSimilarity } from "./cosineSimilarity.js";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const texts = [
  "El propietario prefiere reportes breves.",
  "Hazme un resumen conciso de las ventas.",
];

async function main() {
  const response = await client.embeddings.create({
    model: "openai/text-embedding-3-small",
    input: texts,
  });

  const resultA = response.data[0]
  const resultB = response.data[1]

  if (resultA === undefined || resultB === undefined) {
    throw new Error("La API no devolvió los dos embeddings");
    }

  const vectorA = resultA.embedding;
  const vectorB = resultB.embedding;

  const similarity = cosineSimilarity(vectorA, vectorB);

  console.log("Texto A:", texts[0]);
  console.log("Texto B:", texts[1]);
  console.log("Dimensiones:", vectorA.length);
  console.log("Similitud coseno:", similarity.toFixed(4));
}

main().catch(console.error);
