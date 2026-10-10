
import "dotenv/config";
import OpenAI from "openai";

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

  for (const item of response.data) {
    console.log(`\nTexto ${item.index + 1}: ${texts[item.index]}`);
    console.log(`Dimensiones: ${item.embedding.length}`);
    console.log("Primeros 5 números:", item.embedding.slice(0, 5));
  }
}

main().catch(console.error);
